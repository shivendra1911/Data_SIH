/**
 * NeerNetra Real Bluetooth Mesh Engine
 * =====================================
 * Implements BitChat-style BLE mesh networking for Android.
 *
 * Architecture:
 *  - Each phone acts as BOTH a BLE Central (scanner) AND Peripheral (advertiser)
 *  - Custom GATT Service with two characteristics:
 *    • WRITE_CHAR  → other phones write messages to this phone
 *    • NOTIFY_CHAR → this phone notifies connected phones of new messages
 *  - Multi-hop relay: TTL-based flooding (max 7 hops, like BitChat)
 *  - Message deduplication via message ID cache
 *  - Packet format: [type(1)][msgId(16)][senderId(16)][ttl(1)][payload(N)]
 */

import { BleManager, Device, Characteristic, State } from 'react-native-ble-plx';
import { Alert, Platform, PermissionsAndroid } from 'react-native';
// Use global atob/btoa for base64 (available in RN)
import { MeshPeer, MeshChatMessage, SOSPayload } from '../types';
import { saveSOSToOfflineQueue } from './offlineStorage';
import { startGattServer, notifyAllCentrals } from './gattServerBridge';

// ─── NeerNetra BLE Service UUIDs ────────────────────────────────────────────
export const NEERNETRA_SERVICE_UUID = '4E656572-4E65-7472-6100-000000000001';
export const WRITE_CHAR_UUID        = '4E656572-4E65-7472-6100-000000000002'; // writable
export const NOTIFY_CHAR_UUID       = '4E656572-4E65-7472-6100-000000000003'; // notify

// ─── Message Types ───────────────────────────────────────────────────────────
export enum BLEMsgType {
  HELLO   = 0x01,  // peer announcement
  CHAT    = 0x02,  // broadcast chat
  SOS     = 0x03,  // emergency SOS
  SAFE    = 0x04,  // "I am safe" confirmation
  RELAY   = 0x05,  // multi-hop relay packet
  ACK     = 0x06,  // acknowledgement
}

// ─── Packet Encoder/Decoder ──────────────────────────────────────────────────
function encodePacket(type: BLEMsgType, senderId: string, payload: string, ttl: number = 7): string {
  const msgId = Math.random().toString(36).substring(2, 18).padEnd(16, '0');
  const senderPad = senderId.substring(0, 16).padEnd(16, '0');
  const header = `${String.fromCharCode(type)}${msgId}${senderPad}${String.fromCharCode(ttl)}`;
  const raw = header + payload;
  return btoa(unescape(encodeURIComponent(raw)));
}

function decodePacket(base64: string): {
  type: BLEMsgType;
  msgId: string;
  senderId: string;
  ttl: number;
  payload: string;
} | null {
  try {
    const raw = decodeURIComponent(escape(atob(base64)));
    if (raw.length < 34) return null;
    return {
      type: raw.charCodeAt(0) as BLEMsgType,
      msgId: raw.substring(1, 17),
      senderId: raw.substring(17, 33).replace(/\0/g, ''),
      ttl: raw.charCodeAt(33),
      payload: raw.substring(34),
    };
  } catch {
    return null;
  }
}

// ─── Core BLE Mesh Manager ───────────────────────────────────────────────────
class NeerNetraBLEMesh {
  private manager: BleManager;
  private connectedDevices: Map<string, Device> = new Map();
  private activePeers: Map<string, MeshPeer> = new Map();
  private chatMessages: MeshChatMessage[] = [];
  private seenMsgIds: Set<string> = new Set();
  private myDeviceId: string = '';
  private myName: string = '';
  private isScanning: boolean = false;
  private scanTimer: any = null;

  // Callbacks for UI updates
  public onPeersChanged?: (peers: MeshPeer[]) => void;
  public onMessageReceived?: (msg: MeshChatMessage) => void;
  public onSOSReceived?: (senderId: string, lat: number, lng: number) => void;
  public onStateChange?: (state: string) => void;

  constructor() {
    this.manager = new BleManager();
    this.setupStateListener();
  }

  private setupStateListener() {
    this.manager.onStateChange((state) => {
      console.log('[BLE Mesh] Bluetooth state:', state);
      if (this.onStateChange) this.onStateChange(state);
      if (state === State.PoweredOn) {
        this.startMesh();
      }
    }, true);
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    const apiLevel = parseInt(String(Platform.Version), 10);

    if (apiLevel >= 31) {
      // Android 12+
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const allGranted = Object.values(results).every(
        (r) => r === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        Alert.alert(
          'Bluetooth Required',
          'NeerNetra needs Bluetooth permissions to connect with nearby phones in emergencies. Please grant all permissions.',
          [{ text: 'OK' }]
        );
      }
      return allGranted;
    } else {
      // Android < 12
      const locationGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
    }
  }

  // ── Initialise ─────────────────────────────────────────────────────────────
  async init(deviceId: string, userName: string): Promise<boolean> {
    this.myDeviceId = deviceId.substring(0, 16);
    this.myName = userName;

    const permOk = await this.requestAndroidPermissions();
    if (!permOk) {
      console.warn('[BLE Mesh] Permissions not granted — mesh will not work.');
      return false;
    }

    const state = await this.manager.state();
    if (state === State.PoweredOn) {
      await this.startMesh();
    }

    return true;
  }

  // ── Start Mesh (Scan + Advertise cycle) ────────────────────────────────────
  async startMesh() {
    console.log('[BLE Mesh] Starting NeerNetra mesh network...');

    // 1. Start native GATT Server + Advertising (Peripheral mode)
    await startGattServer(this.myName, (fromDevice, data) => {
      this.handleIncomingPacket(fromDevice, data);
    });

    // 2. Start GATT Client scanning (Central mode)
    await this.startScanning();
  }

  // ── Central: Scan for NeerNetra peers ─────────────────────────────────────
  private async startScanning() {
    if (this.isScanning) return;
    this.isScanning = true;

    console.log('[BLE Mesh] Scanning for NeerNetra peers...');

    this.manager.startDeviceScan(
      [NEERNETRA_SERVICE_UUID],
      { allowDuplicates: false },
      async (error, device) => {
        if (error) {
          console.warn('[BLE Mesh] Scan error:', error.message);
          this.isScanning = false;
          // Auto-restart scan after 3 seconds
          setTimeout(() => this.startScanning(), 3000);
          return;
        }

        if (!device || this.connectedDevices.has(device.id)) return;

        console.log(`[BLE Mesh] Discovered NeerNetra peer: ${device.name || device.id}`);
        await this.connectToPeer(device);
      }
    );

    // Restart scan every 30 seconds to find new peers
    this.scanTimer = setInterval(() => {
      this.manager.stopDeviceScan();
      this.isScanning = false;
      setTimeout(() => this.startScanning(), 1000);
    }, 30000);
  }

  stopScanning() {
    this.manager.stopDeviceScan();
    this.isScanning = false;
    if (this.scanTimer) {
      clearInterval(this.scanTimer);
      this.scanTimer = null;
    }
  }

  // ── Connect to a discovered peer ───────────────────────────────────────────
  private async connectToPeer(device: Device) {
    try {
      console.log(`[BLE Mesh] Connecting to ${device.id}...`);

      const connected = await device.connect({ timeout: 8000 });
      const discovered = await connected.discoverAllServicesAndCharacteristics();

      const services = await discovered.services();
      const neerNetraService = services.find((s) => s.uuid === NEERNETRA_SERVICE_UUID.toLowerCase());

      if (!neerNetraService) {
        console.warn(`[BLE Mesh] Device ${device.id} has no NeerNetra service — skipping.`);
        await device.cancelConnection();
        return;
      }

      this.connectedDevices.set(device.id, connected);

      // Register as peer
      const peer: MeshPeer = {
        id: device.id,
        name: device.name || `Peer_${device.id.substring(0, 6)}`,
        signalStrength: device.rssi || -70,
        relayedPacketsCount: 0,
        role: 'Citizen Node',
        distanceMeters: this.rssiToDistance(device.rssi || -70),
        status: 'SAFE',
      };

      this.activePeers.set(device.id, peer);
      this.emitPeersUpdate();

      // Subscribe to notify characteristic (incoming messages from this peer)
      await this.subscribeToNotifications(connected);

      // Send HELLO packet to announce ourselves
      await this.sendToPeer(connected, BLEMsgType.HELLO, JSON.stringify({
        name: this.myName,
        id: this.myDeviceId,
      }));

      // Handle disconnection
      connected.onDisconnected(() => {
        console.log(`[BLE Mesh] Peer disconnected: ${device.id}`);
        this.connectedDevices.delete(device.id);
        this.activePeers.delete(device.id);
        this.emitPeersUpdate();
      });

    } catch (err: any) {
      console.warn(`[BLE Mesh] Failed to connect to ${device.id}:`, err?.message);
    }
  }

  // ── Subscribe to notifications from a peer ─────────────────────────────────
  private async subscribeToNotifications(device: Device) {
    try {
      device.monitorCharacteristicForService(
        NEERNETRA_SERVICE_UUID,
        NOTIFY_CHAR_UUID,
        (error, characteristic) => {
          if (error) {
            console.warn('[BLE Mesh] Monitor error:', error.message);
            return;
          }
          if (!characteristic?.value) return;
          this.handleIncomingPacket(device.id, characteristic.value);
        }
      );
    } catch (err: any) {
      console.warn('[BLE Mesh] Subscribe failed:', err?.message);
    }
  }

  // ── Send a packet to a single connected peer ───────────────────────────────
  private async sendToPeer(device: Device, type: BLEMsgType, payload: string, ttl: number = 7) {
    try {
      const packet = encodePacket(type, this.myDeviceId, payload, ttl);
      await device.writeCharacteristicWithoutResponseForService(
        NEERNETRA_SERVICE_UUID,
        WRITE_CHAR_UUID,
        packet
      );
    } catch (err: any) {
      console.warn('[BLE Mesh] Send failed:', err?.message);
    }
  }

  // ── Broadcast a packet to ALL connected peers (mesh flood) ─────────────────
  private async broadcastToAll(type: BLEMsgType, payload: string, ttl: number = 7) {
    const packet = encodePacket(type, this.myDeviceId, payload, ttl);
    const promises = Array.from(this.connectedDevices.values()).map((d) =>
      this.sendToPeer(d, type, payload, ttl)
    );
    notifyAllCentrals(packet).catch(() => {});
    await Promise.allSettled(promises);
  }

  // ── Handle an incoming BLE packet ──────────────────────────────────────────
  private handleIncomingPacket(fromDeviceId: string, base64Value: string) {
    const packet = decodePacket(base64Value);
    if (!packet) return;

    // Deduplication — drop already-seen message IDs
    if (this.seenMsgIds.has(packet.msgId)) return;
    this.seenMsgIds.add(packet.msgId);

    // Prune dedup cache (keep last 500)
    if (this.seenMsgIds.size > 500) {
      const oldest = this.seenMsgIds.values().next().value as string | undefined;
      if (oldest) this.seenMsgIds.delete(oldest);
    }

    console.log(`[BLE Mesh] Packet type=${packet.type} from=${packet.senderId} ttl=${packet.ttl}`);

    switch (packet.type) {
      case BLEMsgType.HELLO:
        this.handleHello(fromDeviceId, packet.senderId, packet.payload);
        break;

      case BLEMsgType.CHAT:
        this.handleChatMessage(packet.senderId, packet.payload, packet.ttl);
        break;

      case BLEMsgType.SOS:
        this.handleSOSPacket(packet.senderId, packet.payload, packet.ttl);
        break;

      case BLEMsgType.SAFE:
        this.handleSafeConfirmation(packet.senderId, packet.payload);
        break;

      case BLEMsgType.RELAY:
        // Relay to others if TTL allows
        if (packet.ttl > 1) {
          this.broadcastToAll(BLEMsgType.RELAY, packet.payload, packet.ttl - 1);
        }
        break;
    }

    // Multi-hop relay: re-broadcast with decremented TTL
    if (packet.ttl > 1 && packet.type !== BLEMsgType.ACK) {
      this.broadcastToAll(packet.type, packet.payload, packet.ttl - 1).then(() => {
        // Update relay count for the forwarding peer
        const peer = this.activePeers.get(fromDeviceId);
        if (peer) {
          peer.relayedPacketsCount = (peer.relayedPacketsCount || 0) + 1;
          this.activePeers.set(fromDeviceId, peer);
        }
      });
    }
  }

  // ── Message Handlers ───────────────────────────────────────────────────────
  private handleHello(deviceId: string, senderId: string, payload: string) {
    try {
      const info = JSON.parse(payload);
      const peer = this.activePeers.get(deviceId);
      if (peer) {
        peer.name = info.name || peer.name;
        this.activePeers.set(deviceId, peer);
        this.emitPeersUpdate();
      }
      console.log(`[BLE Mesh] HELLO from ${info.name} (${senderId})`);
    } catch {/* ignore */ }
  }

  private handleChatMessage(senderId: string, payload: string, ttl: number) {
    try {
      const data = JSON.parse(payload);
      const msg: MeshChatMessage = {
        id: `msg_${Date.now()}_${senderId}`,
        senderId,
        senderName: data.senderName || `Peer_${senderId.substring(0, 6)}`,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMeshRelayed: true,
        hopCount: 7 - ttl + 1,
      };

      this.chatMessages.push(msg);
      if (this.chatMessages.length > 100) this.chatMessages.shift();

      if (this.onMessageReceived) this.onMessageReceived(msg);
      console.log(`[BLE Mesh] CHAT from ${msg.senderName}: ${msg.text}`);
    } catch {/* ignore */ }
  }

  private handleSOSPacket(senderId: string, payload: string, ttl: number) {
    try {
      const data = JSON.parse(payload);
      console.warn(`[BLE Mesh] SOS RECEIVED from ${senderId}! Type: ${data.sosType}`);

      // Update peer status in list
      this.activePeers.forEach((peer, id) => {
        if (peer.id === senderId || id.startsWith(senderId)) {
          peer.status = 'SOS';
          this.activePeers.set(id, peer);
        }
      });
      this.emitPeersUpdate();

      if (this.onSOSReceived) {
        this.onSOSReceived(senderId, data.lat || 0, data.lng || 0);
      }
    } catch {/* ignore */ }
  }

  private handleSafeConfirmation(senderId: string, payload: string) {
    this.activePeers.forEach((peer, id) => {
      if (peer.id === senderId || id.startsWith(senderId)) {
        peer.status = 'SAFE';
        this.activePeers.set(id, peer);
      }
    });
    this.emitPeersUpdate();
    console.log(`[BLE Mesh] SAFE confirmation from ${senderId}`);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Send a text message to all nearby peers via mesh */
  async sendChatMessage(senderName: string, text: string): Promise<MeshChatMessage> {
    const msg: MeshChatMessage = {
      id: `msg_${Date.now()}`,
      senderId: this.myDeviceId,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMeshRelayed: true,
      hopCount: 1,
    };

    this.chatMessages.push(msg);
    this.seenMsgIds.add(msg.id);

    const payload = JSON.stringify({ senderName, text });
    await this.broadcastToAll(BLEMsgType.CHAT, payload, 7);

    console.log(`[BLE Mesh] Sent chat: "${text}" to ${this.connectedDevices.size} peers`);
    return msg;
  }

  /** Broadcast SOS beacon via BLE mesh (all hops) */
  async broadcastMultiHopSOS(payload: SOSPayload): Promise<{ hops: number; peersReached: number }> {
    console.warn('[BLE Mesh] Broadcasting SOS across full mesh...');
    await saveSOSToOfflineQueue({ ...payload, is_mesh_relayed: true });

    const data = JSON.stringify({
      deviceId: payload.device_uuid,
      lat: payload.lat,
      lng: payload.lng,
      sosType: payload.sos_type || 'GENERAL',
      notes: payload.notes || '',
      timestamp: payload.timestamp || new Date().toISOString(),
    });

    await this.broadcastToAll(BLEMsgType.SOS, data, 7);
    return { hops: 7, peersReached: this.connectedDevices.size };
  }

  /** Broadcast "I AM SAFE" via mesh */
  async broadcastSafe(): Promise<void> {
    const data = JSON.stringify({ id: this.myDeviceId, timestamp: new Date().toISOString() });
    await this.broadcastToAll(BLEMsgType.SAFE, data, 5);
    console.log('[BLE Mesh] SAFE broadcast sent to all peers');
  }

  /** Get all currently discovered/connected peers */
  getConnectedPeers(): MeshPeer[] {
    return Array.from(this.activePeers.values());
  }

  getActivePeersCount(): number {
    return this.activePeers.size;
  }

  getMeshChatMessages(): MeshChatMessage[] {
    return [...this.chatMessages];
  }

  /** Stop mesh and cleanup */
  destroy() {
    this.stopScanning();
    this.connectedDevices.forEach((d) => d.cancelConnection().catch(() => {}));
    this.connectedDevices.clear();
    this.activePeers.clear();
    this.manager.destroy();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private rssiToDistance(rssi: number): number {
    // Approximate BLE RSSI → distance in meters
    // RSSI = -10 * n * log10(d) + A
    // n ≈ 2, A (1m RSSI) ≈ -59
    const n = 2;
    const A = -59;
    const d = Math.pow(10, (A - rssi) / (10 * n));
    return Math.round(Math.min(d, 9999));
  }

  private emitPeersUpdate() {
    if (this.onPeersChanged) {
      this.onPeersChanged(Array.from(this.activePeers.values()));
    }
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────
export const bleEngine = new NeerNetraBLEMesh();

// Backward compat exports so existing code doesn't break
export const meshEngine = bleEngine;
export const meshManager = bleEngine;
