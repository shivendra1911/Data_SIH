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

import { Alert, Platform, PermissionsAndroid } from 'react-native';
// Use global atob/btoa for base64 (available in RN)
import { MeshPeer, MeshChatMessage, SOSPayload } from '../types';
import { saveSOSToOfflineQueue } from './offlineStorage';
import { startGattServer, notifyAllCentrals } from './gattServerBridge';
import { startBLEAdvertising } from './bleAdvertiser';

let BleManager: any;
let State: any;
if (Platform.OS !== 'web') {
  const blePlx = require('react-native-ble-plx');
  BleManager = blePlx.BleManager;
  State = blePlx.State;
} else {
  // Web Mock
  BleManager = class MockManager {
    onStateChange() {}
    startDeviceScan() {}
    stopDeviceScan() {}
    destroy() {}
    async state() { return 'PoweredOff'; }
  };
  State = { PoweredOn: 'PoweredOn', PoweredOff: 'PoweredOff' };
}

type Device = any;
type Characteristic = any;


// ─── NeerNetra BLE Service UUIDs ────────────────────────────────────────────
export const NEERNETRA_SERVICE_UUID = '4E656572-4E65-7472-6100-000000000001';
export const WRITE_CHAR_UUID        = '4E656572-4E65-7472-6100-000000000002'; // writable
export const NOTIFY_CHAR_UUID       = '4E656572-4E65-7472-6100-000000000003'; // notify

// ─── Message Types ───────────────────────────────────────────────────────────
export enum BLEMsgType {
  HELLO        = 0x01,  // peer announcement
  CHAT         = 0x02,  // broadcast chat
  SOS          = 0x03,  // emergency SOS
  SAFE         = 0x04,  // "I am safe" confirmation
  RELAY        = 0x05,  // multi-hop relay packet
  ACK          = 0x06,  // acknowledgement
  CALL_REQUEST = 0x07,  // incoming call / intercom invite
  CALL_ACCEPT  = 0x08,  // call accepted by peer
  CALL_DECLINE = 0x09,  // call rejected / busy
  CALL_END     = 0x0A,  // call terminated / hung up
  VOICE_BURST  = 0x0B,  // compressed PTT voice chunk
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
  private manager: any = null;
  private connectedDevices: Map<string, Device> = new Map();
  private activePeers: Map<string, MeshPeer> = new Map();
  private chatMessages: MeshChatMessage[] = [];
  private seenMsgIds: Set<string> = new Set();
  private myDeviceId: string = '';
  private myName: string = '';
  private isScanning: boolean = false;
  private isMeshStarted: boolean = false;
  private scanTimer: any = null;

  // Callbacks for UI updates
  public onPeersChanged?: (peers: MeshPeer[]) => void;
  public onMessageReceived?: (msg: MeshChatMessage) => void;
  public onSOSReceived?: (senderId: string, lat: number, lng: number) => void;
  public onStateChange?: (state: string) => void;
  public onIncomingCall?: (caller: { id: string; name: string; distance?: number; hopCount?: number }) => void;
  public onCallAnswered?: (peerId: string) => void;
  public onCallDeclined?: (peerId: string) => void;
  public onCallEnded?: (peerId: string) => void;
  public onVoiceBurstReceived?: (senderId: string, base64Audio: string) => void;

  constructor() {
    // BleManager is lazily initialized in init() AFTER permissions are granted.
    // Instantiating BleManager on Android 12+ before BLUETOOTH_CONNECT is granted
    // causes a fatal SecurityException that crashes the app on launch!
  }

  private setupStateListener() {
    if (!this.manager) return;
    try {
      this.manager.onStateChange((state: any) => {
        console.log('[BLE Mesh] Bluetooth state changed:', state);
        if (this.onStateChange) this.onStateChange(state);
        if (state === State.PoweredOn && !this.isMeshStarted) {
          this.startMesh().catch((e) => console.warn('[BLE Mesh] startMesh error:', e));
        }
      }, false);
    } catch (e) {
      console.warn('[BLE Mesh] setupStateListener error:', e);
    }
  }

  // ── Permissions ────────────────────────────────────────────────────────────
  async requestAndroidPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    try {
      const apiLevel = parseInt(String(Platform.Version), 10);

      if (apiLevel >= 31) {
        // Android 12+ requires runtime Nearby Devices (BLUETOOTH_SCAN, CONNECT, ADVERTISE)
        const perms = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ];

        // Android 13+ (API 33+) notification permission
        if (apiLevel >= 33 && (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS) {
          perms.push((PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS);
        }

        const results = await PermissionsAndroid.requestMultiple(perms);

        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );

        if (!allGranted) {
          console.warn('[BLE Mesh] Some permissions not granted:', results);
        }
        return allGranted;
      } else {
        // Android < 12
        const locationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch (err) {
      console.warn('[BLE Mesh] Permission request error:', err);
      return false;
    }
  }

  // ── Initialise ─────────────────────────────────────────────────────────────
  async init(deviceId?: string, userName?: string): Promise<boolean> {
    const rawId = deviceId || 'dev_' + Math.random().toString(36).substring(2, 10);
    this.myDeviceId = rawId.substring(0, 16);
    this.myName = userName || 'NeerNetra Node';

    try {
      const permOk = await this.requestAndroidPermissions();
      if (!permOk) {
        console.warn('[BLE Mesh] Some Bluetooth permissions not granted — attempting to proceed.');
      }

      // Lazily instantiate BleManager only AFTER permissions request
      if (!this.manager && (Platform.OS === 'android' || Platform.OS === 'ios') && BleManager) {
        try {
          this.manager = new BleManager();
          this.setupStateListener();
        } catch (e) {
          console.warn('[BLE Mesh] Could not instantiate BleManager:', e);
        }
      }

      if (this.manager) {
        try {
          const state = await this.manager.state();
          console.log('[BLE Mesh] Bluetooth manager state:', state);
          if (state === State.PoweredOn && !this.isMeshStarted) {
            await this.startMesh();
          } else if (state === 'PoweredOff') {
            console.warn('[BLE Mesh] Bluetooth is powered off on this device');
          }
        } catch (err) {
          console.warn('[BLE Mesh] Error checking manager state:', err);
        }
      } else {
        console.log('[BLE Mesh] BLE manager not available in this environment.');
      }

      return true;
    } catch (fatalErr) {
      console.warn('[BLE Mesh] Init error safely handled:', fatalErr);
      return false;
    }
  }

  // ── Start Mesh (Scan + Advertise cycle) ────────────────────────────────────
  async startMesh() {
    if (this.isMeshStarted) return;
    this.isMeshStarted = true;
    console.log('[BLE Mesh] Starting NeerNetra mesh network for:', this.myName);

    // 1. Start native GATT Server + Advertising (Peripheral mode)
    try {
      const gattStarted = await startGattServer(this.myName || 'NeerNetra Node', (fromDevice, data) => {
        this.handleIncomingPacket(fromDevice, data);
      });
      console.log('[BLE Mesh] Native GATT Server started:', gattStarted);
      if (!gattStarted) {
        // Fallback to react-native-ble-advertiser if native module was unready
        await startBLEAdvertising(this.myName || 'NeerNetra Node');
      }
    } catch (e) {
      console.warn('[BLE Mesh] Advertising init warning:', e);
    }

    // 2. Start GATT Client scanning (Central mode)
    await this.startScanning();
  }

  // ── Central: Scan for NeerNetra peers ─────────────────────────────────────
  async startScanning() {
    if (this.isScanning || !this.manager) return;
    this.isScanning = true;

    console.log('[BLE Mesh] Scanning for nearby NeerNetra emergency nodes...');

    try {
      this.manager.stopDeviceScan();
    } catch {}

    try {
      // Pass null to scan all BLE peripherals and avoid hardware filter drops
      this.manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        async (error: any, device: any) => {
          if (error) {
            console.warn('[BLE Mesh] Scan notice:', error.message);
            this.isScanning = false;
            // Cooldown before retrying
            setTimeout(() => this.startScanning(), 10000);
            return;
          }

          if (!device) return;

          // Check if device is a NeerNetra emergency node:
          // 1. Name contains 'neer' or 'citizen'
          // 2. Service UUIDs match NEERNETRA_SERVICE_UUID
          // 3. Manufacturer data contains NeerNetra signature
          const devName = (device.name || '').toLowerCase();
          const devUuids = (device.serviceUUIDs || []).map((u: string) => u.toLowerCase());
          const targetUuid = NEERNETRA_SERVICE_UUID.toLowerCase();

          const hasNeerName = devName.includes('neer') || devName.includes('citizen');
          const hasNeerUuid = devUuids.includes(targetUuid);
          const hasNeerMfr = Boolean(
            device.manufacturerData && (
              device.manufacturerData.includes('TmVlcg') || // 'Neer' in base64
              (device.manufacturerData.length > 0 && hasNeerName)
            )
          );

          const isNeerDevice = hasNeerName || hasNeerUuid || hasNeerMfr;
          if (!isNeerDevice) return;

          const peerRssi = device.rssi || -68;
          const peerName = device.name || `Citizen_${device.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
          const existingPeer = this.activePeers.get(device.id);

          const peer: MeshPeer = {
            id: device.id,
            name: existingPeer?.name && !existingPeer.name.startsWith('Citizen_') ? existingPeer.name : peerName,
            signalStrength: peerRssi,
            relayedPacketsCount: existingPeer ? existingPeer.relayedPacketsCount : 0,
            role: 'Citizen Node',
            distanceMeters: this.rssiToDistance(peerRssi),
            status: existingPeer ? existingPeer.status : 'SAFE',
            lastSeen: new Date(),
          };

          // Register IMMEDIATELY in activePeers so peer list updates in real time!
          this.activePeers.set(device.id, peer);
          this.emitPeersUpdate();

          // Connect in background if not already connected
          if (!this.connectedDevices.has(device.id)) {
            this.connectToPeer(device).catch(() => {});
          }
        }
      );
    } catch (scanErr: any) {
      console.warn('[BLE Mesh] startDeviceScan call error:', scanErr?.message);
      this.isScanning = false;
      setTimeout(() => this.startScanning(), 10000);
      return;
    }

    // Refresh scan every 20 seconds so newly arriving friends are quickly discovered
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = setInterval(() => {
      try {
        this.manager?.stopDeviceScan();
      } catch {}
      this.isScanning = false;
      setTimeout(() => this.startScanning(), 1500);
    }, 20000);
  }

  /** Manually trigger an immediate scan burst (user refresh) */
  async triggerManualScan(): Promise<MeshPeer[]> {
    console.log('[BLE Mesh] Manual scan triggered by user');
    try {
      this.manager?.stopDeviceScan();
    } catch {}
    this.isScanning = false;
    await this.startScanning();
    return this.getConnectedPeers();
  }

  stopScanning() {
    this.manager?.stopDeviceScan();
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
      const neerNetraService = services.find((s: any) => s.uuid === NEERNETRA_SERVICE_UUID.toLowerCase());

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
        (error: any, characteristic: any) => {
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

      case BLEMsgType.CALL_REQUEST:
        this.handleCallRequest(packet.senderId, packet.payload, packet.ttl);
        break;

      case BLEMsgType.CALL_ACCEPT:
        this.handleCallAccept(packet.senderId, packet.payload);
        break;

      case BLEMsgType.CALL_DECLINE:
        this.handleCallDecline(packet.senderId, packet.payload);
        break;

      case BLEMsgType.CALL_END:
        this.handleCallEnd(packet.senderId, packet.payload);
        break;

      case BLEMsgType.VOICE_BURST:
        this.handleVoiceBurst(packet.senderId, packet.payload);
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

  private handleCallRequest(senderId: string, payload: string, ttl: number) {
    try {
      const data = JSON.parse(payload);
      const isForMe =
        !data.targetId ||
        data.targetId === 'BROADCAST' ||
        data.targetId === this.myDeviceId ||
        this.myDeviceId.includes(data.targetId) ||
        (data.targetId && this.myDeviceId.startsWith(data.targetId));

      if (!isForMe) return;

      const peer = this.activePeers.get(senderId);
      const callerName = data.callerName || peer?.name || `Peer_${senderId.substring(0, 6)}`;
      const distance = peer?.distanceMeters || this.rssiToDistance(peer?.signalStrength || -65);
      const hopCount = Math.max(1, 8 - ttl);

      console.log(`[BLE Mesh] INCOMING CALL from ${callerName} (${senderId})`);
      if (this.onIncomingCall) {
        this.onIncomingCall({
          id: senderId,
          name: callerName,
          distance,
          hopCount,
        });
      }
    } catch (e) {
      console.warn('[BLE Mesh] Error parsing CALL_REQUEST:', e);
    }
  }

  private handleCallAccept(senderId: string, payload: string) {
    try {
      const data = JSON.parse(payload);
      if (data.targetId && data.targetId !== this.myDeviceId && !this.myDeviceId.includes(data.targetId)) return;
      console.log(`[BLE Mesh] CALL ACCEPTED by ${senderId}`);
      if (this.onCallAnswered) this.onCallAnswered(senderId);
    } catch (e) {}
  }

  private handleCallDecline(senderId: string, payload: string) {
    try {
      const data = JSON.parse(payload);
      if (data.targetId && data.targetId !== this.myDeviceId && !this.myDeviceId.includes(data.targetId)) return;
      console.log(`[BLE Mesh] CALL DECLINED by ${senderId}`);
      if (this.onCallDeclined) this.onCallDeclined(senderId);
    } catch (e) {}
  }

  private handleCallEnd(senderId: string, payload: string) {
    try {
      console.log(`[BLE Mesh] CALL ENDED by ${senderId}`);
      if (this.onCallEnded) this.onCallEnded(senderId);
    } catch (e) {}
  }

  private handleVoiceBurst(senderId: string, payload: string) {
    try {
      console.log(`[BLE Mesh] VOICE BURST received from ${senderId}`);
      if (this.onVoiceBurstReceived) this.onVoiceBurstReceived(senderId, payload);
    } catch (e) {}
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

  /** Initiate a BLE voice intercom call to a peer */
  async initiateCall(targetPeerId: string, targetName?: string): Promise<boolean> {
    console.log(`[BLE Mesh] Initiating call to peer: ${targetPeerId}`);
    const payload = JSON.stringify({
      callerId: this.myDeviceId,
      callerName: this.myName || 'Citizen Node',
      targetId: targetPeerId,
      timestamp: Date.now(),
    });

    const targetDev = this.connectedDevices.get(targetPeerId);
    if (targetDev) {
      await this.sendToPeer(targetDev, BLEMsgType.CALL_REQUEST, payload);
    }
    await this.broadcastToAll(BLEMsgType.CALL_REQUEST, payload, 7);
    return true;
  }

  /** Accept an incoming call */
  async acceptCall(callerId: string): Promise<void> {
    console.log(`[BLE Mesh] Accepting call from: ${callerId}`);
    const payload = JSON.stringify({
      responderId: this.myDeviceId,
      responderName: this.myName || 'Citizen Node',
      targetId: callerId,
      status: 'ACCEPTED',
      timestamp: Date.now(),
    });
    const targetDev = this.connectedDevices.get(callerId);
    if (targetDev) {
      await this.sendToPeer(targetDev, BLEMsgType.CALL_ACCEPT, payload);
    }
    await this.broadcastToAll(BLEMsgType.CALL_ACCEPT, payload, 7);
  }

  /** Decline an incoming call */
  async declineCall(callerId: string): Promise<void> {
    console.log(`[BLE Mesh] Declining call from: ${callerId}`);
    const payload = JSON.stringify({
      responderId: this.myDeviceId,
      targetId: callerId,
      status: 'DECLINED',
      timestamp: Date.now(),
    });
    const targetDev = this.connectedDevices.get(callerId);
    if (targetDev) {
      await this.sendToPeer(targetDev, BLEMsgType.CALL_DECLINE, payload);
    }
    await this.broadcastToAll(BLEMsgType.CALL_DECLINE, payload, 7);
  }

  /** Terminate an ongoing call */
  async endCall(peerId: string): Promise<void> {
    console.log(`[BLE Mesh] Ending call with: ${peerId}`);
    const payload = JSON.stringify({
      senderId: this.myDeviceId,
      targetId: peerId,
      status: 'ENDED',
      timestamp: Date.now(),
    });
    await this.broadcastToAll(BLEMsgType.CALL_END, payload, 7);
  }

  /** Send a compressed voice burst chunk */
  async sendVoiceBurst(targetPeerId: string, base64AudioChunk: string): Promise<void> {
    const payload = JSON.stringify({
      senderId: this.myDeviceId,
      targetId: targetPeerId,
      audio: base64AudioChunk,
      timestamp: Date.now(),
    });
    await this.broadcastToAll(BLEMsgType.VOICE_BURST, payload, 5);
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
    this.manager?.destroy();
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
