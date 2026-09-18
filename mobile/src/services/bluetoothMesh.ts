/**
 * NeerNetra Real Bluetooth Mesh Engine
 * =====================================
 * Implements BitChat-style BLE mesh networking for Android:
 *  - Full-duplex BLE Central (scanner) AND Peripheral (GATT Server + Advertiser)
 *  - Custom GATT Service with WRITE + NOTIFY characteristics
 *  - Collision-free connection tie-breaking by Device ID / MAC
 *  - MTU 512 negotiation for zero packet truncation
 *  - Native Audio Walkie-Talkie (AMR-NB 8kHz hardware recording & direct speaker playback)
 *  - Multi-hop TTL flooding relay (up to 7 hops)
 *  - Dedup cache and instant UI state dispatch
 */

import { Alert, Platform, PermissionsAndroid } from 'react-native';
import { MeshPeer, MeshChatMessage, SOSPayload } from '../types';
import { saveSOSToOfflineQueue } from './offlineStorage';
import {
  startGattServer,
  notifyAllCentrals,
  playVoiceAudio,
  playPttTone,
  startMeshForegroundService,
  wakeUpScreenAndShowCall,
  triggerNativeSosAlert,
  dismissIncomingCall,
} from './gattServerBridge';
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
function cleanBase64(str: string): string {
  return (str || '').replace(/[\r\n\t\s]/g, '');
}

/**
 * Robustly detect NeerNetra manufacturer data across Android OEM chipsets.
 * Matches 0x4E65 ("Ne"), "NEER", "Neer", or 0xFFFF company codes.
 */
function isNeerManufacturerData(b64?: string | null): boolean {
  if (!b64) return false;
  // Direct Base64 signature substring checks
  if (
    b64.includes('ZU5O') || // 0x4E65 + 'NEER'
    b64.includes('TmVl') || // 'Neer'
    b64.includes('TkVF') || // 'NEER'
    b64.includes('RU5O') ||
    b64.includes('//9O') || // 0xFFFF + 'Neer'
    b64.includes('4E65')
  ) {
    return true;
  }
  try {
    const raw = atob(cleanBase64(b64));
    if (raw.toLowerCase().includes('neer')) return true;
    for (let i = 0; i < raw.length - 1; i++) {
      const b1 = raw.charCodeAt(i);
      const b2 = raw.charCodeAt(i + 1);
      // 0x4E ('N') + 0x65 ('e') in little or big endian
      if ((b1 === 0x4E && b2 === 0x65) || (b1 === 0x65 && b2 === 0x4E)) return true;
    }
  } catch {}
  return false;
}

function encodePacket(
  type: BLEMsgType,
  senderId: string,
  payload: string,
  ttl: number = 7,
  msgId?: string
): string {
  const m = msgId || (Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4));
  const envelope = {
    t: type,
    m,
    s: senderId.substring(0, 16),
    ttl,
    p: payload,
  };
  const raw = JSON.stringify(envelope);
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
    const cleaned = cleanBase64(base64);
    if (!cleaned) return null;
    const raw = decodeURIComponent(escape(atob(cleaned)));

    // 1. JSON envelope format (Modern robust)
    if (raw.startsWith('{') && raw.endsWith('}')) {
      const obj = JSON.parse(raw);
      if (obj.t !== undefined && obj.m && obj.s) {
        return {
          type: obj.t as BLEMsgType,
          msgId: obj.m,
          senderId: obj.s,
          ttl: obj.ttl || 1,
          payload: typeof obj.p === 'string' ? obj.p : JSON.stringify(obj.p),
        };
      }
    }

    // 2. Legacy fixed-offset format fallback
    if (raw.length >= 34) {
      return {
        type: raw.charCodeAt(0) as BLEMsgType,
        msgId: raw.substring(1, 17),
        senderId: raw.substring(17, 33).replace(/\0/g, ''),
        ttl: raw.charCodeAt(33),
        payload: raw.substring(34),
      };
    }
    return null;
  } catch {
    return null;
  }
}

// ─── Core BLE Mesh Manager ───────────────────────────────────────────────────
class NeerNetraBLEMesh {
  private manager: any = null;
  private connectedDevices: Map<string, Device> = new Map();
  private connectingDevices: Set<string> = new Set();
  private activePeers: Map<string, MeshPeer> = new Map();
  private chatMessages: MeshChatMessage[] = [];
  private seenMsgIds: Set<string> = new Set();
  private myDeviceId: string = '';
  private myName: string = '';
  private isScanning: boolean = false;
  private isMeshStarted: boolean = false;
  private scanTimer: any = null;
  private voiceBuffers: Map<string, { total: number; chunks: Map<number, string>; timer: any }> = new Map();
  private notifySlices: Map<string, { total: number; chunks: Map<number, string>; timer: any }> = new Map();
  private peripheralClients: Set<string> = new Set();
  private peersListeners: Set<(peers: MeshPeer[]) => void> = new Set();
  private peerNodeIdToMac: Map<string, string> = new Map();
  private macToNodeId: Map<string, string> = new Map();

  // Callbacks for UI updates
  public onPeersChanged?: (peers: MeshPeer[]) => void;
  public onPeerDiscovered?: (peer: MeshPeer) => void;
  public onSOSRelayed?: () => void;
  public onMessageReceived?: (msg: MeshChatMessage) => void;
  public onSOSReceived?: (senderId: string, lat: number, lng: number) => void;
  public onStateChange?: (state: string) => void;
  public onIncomingCall?: (caller: {
    id: string;
    name: string;
    distance?: number;
    hopCount?: number;
    isGroupCall?: boolean;
  }) => void;
  public onCallAnswered?: (peerId: string, peerName?: string) => void;
  public onCallDeclined?: (peerId: string) => void;
  public onCallEnded?: (peerId: string) => void;
  public onVoiceBurstReceived?: (senderId: string, base64Audio: string) => void;

  constructor() {}

  /** Subscribe to peer updates (supports multiple concurrent UI listeners) */
  public subscribePeers(callback: (peers: MeshPeer[]) => void): () => void {
    this.peersListeners.add(callback);
    callback(this.getConnectedPeers());
    return () => {
      this.peersListeners.delete(callback);
    };
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
      }, true);
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
        // Android 12+ requires runtime Nearby Devices + Mic + Location
        const perms = [
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];

        if (apiLevel >= 33 && (PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS) {
          perms.push((PermissionsAndroid.PERMISSIONS as any).POST_NOTIFICATIONS);
        }

        const results = await PermissionsAndroid.requestMultiple(perms);
        const allGranted = Object.values(results).every(
          (r) => r === PermissionsAndroid.RESULTS.GRANTED
        );
        return allGranted;
      } else {
        // Android < 12
        const perms = [
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        ];
        const results = await PermissionsAndroid.requestMultiple(perms);
        return Object.values(results).every((r) => r === PermissionsAndroid.RESULTS.GRANTED);
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
      await this.requestAndroidPermissions();

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
          }
        } catch (err) {
          console.warn('[BLE Mesh] Error checking manager state:', err);
        }
      }

      // Automatically kick off mesh on Android to begin advertising and scanning
      if (Platform.OS === 'android' && !this.isMeshStarted) {
        await this.startMesh();
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
      const gattStarted = await startGattServer(
        this.myName || 'NeerNetra Node',
        (fromDevice, data) => {
          this.handleIncomingPacket(fromDevice, data);
        },
        (clientAddress) => {
          console.log('[BLE Mesh] Remote device connected as Central to us:', clientAddress);
          this.peripheralClients.add(clientAddress);
          if (!this.activePeers.has(clientAddress)) {
            const peer: MeshPeer = {
              id: clientAddress,
              name: `Citizen [${clientAddress.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}]`,
              signalStrength: -60,
              relayedPacketsCount: 0,
              role: 'Citizen Node',
              distanceMeters: 5,
              status: 'SAFE',
              lastSeen: new Date(),
            };
            this.activePeers.set(clientAddress, peer);
            this.emitPeersUpdate();
          }

          // Immediately send a HELLO via GATT notify so the peer knows we exist
          // even if their Central→us connection failed or is still pending.
          setTimeout(() => {
            const helloPayload = JSON.stringify({ name: this.myName, id: this.myDeviceId, isAck: false });
            const helloPkt = encodePacket(BLEMsgType.HELLO, this.myDeviceId, helloPayload, 1);
            notifyAllCentrals(helloPkt).catch(() => {});
            console.log(`[BLE Mesh] Sent HELLO-notify to newly connected Central: ${clientAddress}`);
          }, 500);

          // Bidirectional: Connect back as Central ONLY if we haven't already AND
          // our MAC is "lower" (prevents both sides connecting simultaneously → GATT 133).
          // Lower MAC connects as Central; higher MAC stays as Peripheral only.
          const myMac = this.myDeviceId;
          const shouldWeConnect = !this.connectedDevices.has(clientAddress) &&
                                  !this.connectingDevices.has(clientAddress) &&
                                  myMac.toLowerCase() < clientAddress.toLowerCase();
          if (shouldWeConnect) {
            // Small delay to let the peer finish their connection setup
            setTimeout(() => {
              this.connectToPeer(clientAddress).catch(() => {});
            }, 1200);
          }
        },
        (clientAddress) => {
          console.log('[BLE Mesh] Remote Central disconnected from our server:', clientAddress);
          this.peripheralClients.delete(clientAddress);
        }
      );
      console.log('[BLE Mesh] Native GATT Server started:', gattStarted);
      await startMeshForegroundService();
      if (!gattStarted) {
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
      this.manager.startDeviceScan(
        null,
        { allowDuplicates: true },
        async (error: any, device: any) => {
          if (error) {
            this.isScanning = false;
            setTimeout(() => this.startScanning(), 8000);
            return;
          }

          if (!device) return;

          const devName = (device.name || (device as any).localName || '').toLowerCase();
          const devUuids = (device.serviceUUIDs || []).map((u: string) => u.toLowerCase().replace(/-/g, ''));
          const targetUuid = NEERNETRA_SERVICE_UUID.toLowerCase().replace(/-/g, '');

          const hasNeerName = devName.includes('neer') || devName.includes('citizen');
          const hasNeerUuid = devUuids.some((u: string) => u === targetUuid || u.includes('4e656572') || u.includes('4e65'));
          const hasNeerMfr = isNeerManufacturerData(device.manufacturerData);
          const hasNeerServiceData = Boolean(
            device.serviceData &&
            Object.keys(device.serviceData).some((k) => k.toLowerCase().replace(/-/g, '').includes('4e65'))
          );

          const isNeerDevice = hasNeerName || hasNeerUuid || hasNeerMfr || hasNeerServiceData;
          if (!isNeerDevice) return;

          const peerRssi = device.rssi || -68;
          const rawName = device.name || (device as any).localName;
          const peerName = rawName && rawName.trim().length > 0
            ? rawName
            : `Citizen_${device.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
          const existingPeer = this.activePeers.get(device.id);

          console.log(`[BLE Mesh] 🎯 Verified NeerNetra peer found: ${device.id} (${peerName}) [RSSI: ${peerRssi}dBm]`);

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

          this.activePeers.set(device.id, peer);
          this.emitPeersUpdate();

          // Connect in background if not already connected and not currently in progress
          if (!this.connectedDevices.has(device.id) && !this.connectingDevices.has(device.id)) {
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

    // Refresh scan every 25 seconds
    if (this.scanTimer) clearInterval(this.scanTimer);
    this.scanTimer = setInterval(() => {
      try {
        this.manager?.stopDeviceScan();
      } catch {}
      this.isScanning = false;
      setTimeout(() => this.startScanning(), 1500);
    }, 25000);
  }

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
  private async connectToPeer(deviceOrId: Device | string) {
    const devId = typeof deviceOrId === 'string' ? deviceOrId : deviceOrId.id;
    if (
      this.connectingDevices.has(devId) ||
      this.connectedDevices.has(devId)
    ) {
      return;
    }

    // Anti-collision jitter: prevent simultaneous connection collision (GATT 133)
    const jitter = ((devId.charCodeAt(devId.length - 1) || 0) % 4) * 350;
    if (jitter > 0) {
      await new Promise((r) => setTimeout(r, jitter));
    }
    if (this.connectedDevices.has(devId)) {
      return;
    }

    this.connectingDevices.add(devId);

    try {
      console.log(`[BLE Mesh] Handshaking connection to ${devId}...`);

      // Briefly pause scan to ensure rock-solid connection stability
      try {
        this.manager?.stopDeviceScan();
        this.isScanning = false;
      } catch {}

      let connected: Device;
      if (typeof deviceOrId === 'string') {
        connected = await this.manager.connectToDevice(deviceOrId, { autoConnect: false, timeout: 8000 });
      } else {
        connected = await deviceOrId.connect({ timeout: 8000 });
      }

      // Request MTU 512 for large packet & audio throughput
      try {
        const withMtu = await connected.requestMTU(512);
        if (withMtu) {
          connected = withMtu;
        }
        (connected as any).mtu = 512;
      } catch (mtuErr) {
        (connected as any).mtu = 512;
      }

      const discovered = await connected.discoverAllServicesAndCharacteristics();
      const services = await discovered.services();
      const targetUuid = NEERNETRA_SERVICE_UUID.toLowerCase().replace(/-/g, '');
      const neerNetraService = services.find(
        (s: any) => s.uuid.toLowerCase().replace(/-/g, '') === targetUuid
      );

      if (!neerNetraService) {
        // Service not found yet — peer GATT server may still be starting.
        // Retry once after a short delay before giving up.
        console.log(`[BLE Mesh] NeerNetra service not found on ${devId}, retrying in 2s...`);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          const discovered2 = await connected.discoverAllServicesAndCharacteristics();
          const services2 = await discovered2.services();
          const service2 = services2.find(
            (s: any) => s.uuid.toLowerCase().replace(/-/g, '') === targetUuid
          );
          if (!service2) {
            console.log(`[BLE Mesh] Device ${devId} confirmed non-NeerNetra after retry — cancelling.`);
            await connected.cancelConnection();
            return;
          }
        } catch {
          console.log(`[BLE Mesh] Device ${devId} retry discovery failed — keeping notify path.`);
          // Don't cancel — peripheral→central notify still works even without Central→peripheral writes
          this.connectedDevices.set(devId, connected);
        }
      }

      this.connectedDevices.set(devId, connected);

      const existingPeer = this.activePeers.get(devId);
      const peer: MeshPeer = {
        id: devId,
        name: existingPeer?.name || connected.name || `Peer_${devId.substring(0, 6)}`,
        signalStrength: connected.rssi || -70,
        relayedPacketsCount: 0,
        role: 'Citizen Node',
        distanceMeters: this.rssiToDistance(connected.rssi || -70),
        status: 'SAFE',
      };

      this.activePeers.set(devId, peer);
      this.emitPeersUpdate();

      // Subscribe to notify characteristic
      await this.subscribeToNotifications(connected);

      // Send HELLO packet to announce ourselves
      await this.sendToPeer(connected, BLEMsgType.HELLO, JSON.stringify({
        name: this.myName,
        id: this.myDeviceId,
      }));

      connected.onDisconnected(() => {
        console.log(`[BLE Mesh] Peer disconnected: ${devId}`);
        this.connectedDevices.delete(devId);
        // Keep in activePeers so notify path still works if they reconnect as Central
        // Trigger re-scan to reconnect
        setTimeout(() => {
          if (!this.isScanning) this.startScanning();
        }, 3000);
        this.emitPeersUpdate();
      });

    } catch (err: any) {
      console.log(`[BLE Mesh] Connection to ${devId} notice:`, err?.message);
    } finally {
      this.connectingDevices.delete(devId);
      setTimeout(() => {
        if (!this.isScanning) this.startScanning();
      }, 1000);
    }
  }

  // ── Subscribe to notifications from a peer ─────────────────────────────────
  private async subscribeToNotifications(device: Device) {
    try {
      device.monitorCharacteristicForService(
        NEERNETRA_SERVICE_UUID,
        NOTIFY_CHAR_UUID,
        (error: any, characteristic: any) => {
          if (error) return;
          if (!characteristic?.value) return;
          this.handleIncomingPacket(device.id, characteristic.value);
        }
      );
    } catch (err: any) {
      console.warn('[BLE Mesh] Subscribe failed:', err?.message);
    }
  }

  // ── Send a packet to a single connected peer (MTU-Safe Slicing) ───────────
  private async sendToPeer(
    device: Device,
    type: BLEMsgType,
    payload: string,
    ttl: number = 7,
    msgId?: string,
    originSenderId?: string
  ) {
    try {
      const sender = originSenderId || this.myDeviceId;
      const packet = encodePacket(type, sender, payload, ttl, msgId);
      let raw = '';
      try {
        raw = atob(cleanBase64(packet));
      } catch {
        raw = packet;
      }
      const rawLen = raw.length;
      const deviceMtu = (device as any).mtu || 512;
      const maxAttr = Math.max(20, Math.min(509, deviceMtu - 3));

      if (rawLen <= maxAttr) {
        // Fits within single packet (zero slicing with MTU 512)
        await device.writeCharacteristicWithoutResponseForService(
          NEERNETRA_SERVICE_UUID,
          WRITE_CHAR_UUID,
          packet
        );
      } else {
        // Exceeds safe MTU: slice into MTU-safe chunks
        const headerSize = 4;
        const sliceSize = Math.max(64, maxAttr - headerSize);
        const totalSlices = Math.ceil(rawLen / sliceSize);
        const pktId = Math.floor(Math.random() * 255);

        for (let i = 0; i < totalSlices; i++) {
          const start = i * sliceSize;
          const end = Math.min(start + sliceSize, rawLen);
          const chunkRaw = String.fromCharCode(0x53, pktId, i, totalSlices) + raw.substring(start, end);
          const chunkBase64 = btoa(chunkRaw);

          try {
            await device.writeCharacteristicWithoutResponseForService(
              NEERNETRA_SERVICE_UUID,
              WRITE_CHAR_UUID,
              chunkBase64
            );
          } catch (writeErr) {
            try {
              await new Promise((r) => setTimeout(r, 32));
              await device.writeCharacteristicWithoutResponseForService(
                NEERNETRA_SERVICE_UUID,
                WRITE_CHAR_UUID,
                chunkBase64
              );
            } catch {}
          }

          if (i < totalSlices - 1) {
            await new Promise((r) => setTimeout(r, 32));
          }
        }
      }
    } catch (err: any) {
      console.warn('[BLE Mesh] Send failed:', err?.message);
    }
  }

  // ── Broadcast a packet to ALL connected peers (mesh flood) ─────────────────
  private async broadcastToAll(
    type: BLEMsgType,
    payload: string,
    ttl: number = 7,
    existingMsgId?: string,
    originSenderId?: string
  ) {
    const sender = originSenderId || this.myDeviceId;
    const mId = existingMsgId || (Math.random().toString(36).substring(2, 10) + Date.now().toString(36).slice(-4));

    // Register msgId immediately so we never loop back our own broadcast
    this.seenMsgIds.add(mId);

    const packet = encodePacket(type, sender, payload, ttl, mId);
    const promises = Array.from(this.connectedDevices.values()).map((d) =>
      this.sendToPeer(d, type, payload, ttl, mId, sender)
    );
    // Notify centrals connected to our GATT Server (Peripheral -> Central)
    notifyAllCentrals(packet).catch(() => {});
    await Promise.allSettled(promises);
  }

  // ── Handle an incoming BLE packet ──────────────────────────────────────────
  public handleIncomingPacket(fromDeviceId: string, base64Value: string) {
    if (!base64Value) return;

    let packetBase64 = base64Value;

    // Check if this is a sliced packet frame: [0x53, pktId, seq, total, ...sliceData]
    try {
      const raw = atob(cleanBase64(base64Value));
      if (raw.length >= 4 && raw.charCodeAt(0) === 0x53) {
        const pktId = raw.charCodeAt(1);
        const seq = raw.charCodeAt(2);
        const total = raw.charCodeAt(3);
        const sliceData = raw.substring(4);
        const sliceKey = `${fromDeviceId}_${pktId}`;

        let buf = this.notifySlices.get(sliceKey);
        if (!buf) {
          buf = {
            total,
            chunks: new Map(),
            timer: setTimeout(() => {
              this.notifySlices.delete(sliceKey);
            }, 6000),
          };
          this.notifySlices.set(sliceKey, buf);
        }

        buf.chunks.set(seq, sliceData);

        if (buf.chunks.size >= total) {
          clearTimeout(buf.timer);
          this.notifySlices.delete(sliceKey);

          let fullRaw = '';
          for (let s = 0; s < total; s++) {
            fullRaw += buf.chunks.get(s) || '';
          }
          packetBase64 = btoa(fullRaw);
          console.log(`[BLE Mesh] Reassembled sliced notification from ${fromDeviceId} (${fullRaw.length} bytes across ${total} slices)`);
        } else {
          // Waiting for remaining slices
          return;
        }
      }
    } catch {}

    const packet = decodePacket(packetBase64);
    if (!packet) return;

    // 1. Ignore if sent or originated by ourselves
    if (packet.senderId === this.myDeviceId) return;

    // 2. Ignore if already seen this message ID
    if (this.seenMsgIds.has(packet.msgId)) return;
    this.seenMsgIds.add(packet.msgId);

    if (this.seenMsgIds.size > 500) {
      const oldest = this.seenMsgIds.values().next().value as string | undefined;
      if (oldest) this.seenMsgIds.delete(oldest);
    }

    console.log(`[BLE Mesh] 📥 Packet type=${packet.type} from=${packet.senderId} id=${packet.msgId} ttl=${packet.ttl}`);

    switch (packet.type) {
      case BLEMsgType.HELLO:
        this.handleHello(fromDeviceId, packet.senderId, packet.payload);
        break;

      case BLEMsgType.CHAT:
        this.handleChatMessage(packet.senderId, packet.payload, packet.ttl, packet.msgId);
        break;

      case BLEMsgType.SOS:
        this.handleSOSPacket(packet.senderId, packet.payload, packet.ttl);
        break;

      case BLEMsgType.SAFE:
        this.handleSafeConfirmation(packet.senderId, packet.payload);
        break;

      case BLEMsgType.RELAY:
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

    // Multi-hop relay: ONLY relay broadcast data (CHAT, SOS, SAFE, RELAY) with decremented TTL
    // Voice bursts, hello pings, and call signaling MUST NEVER be flood-relayed!
    const relayableTypes = [BLEMsgType.CHAT, BLEMsgType.SOS, BLEMsgType.SAFE, BLEMsgType.RELAY];
    if (packet.ttl > 1 && relayableTypes.includes(packet.type)) {
      this.broadcastToAll(packet.type, packet.payload, packet.ttl - 1, packet.msgId, packet.senderId).then(() => {
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
      const actualNodeId = senderId || info.id;
      if (actualNodeId) {
        this.peerNodeIdToMac.set(actualNodeId, deviceId);
        this.macToNodeId.set(deviceId, actualNodeId);
      }
      this.peerNodeIdToMac.set(deviceId, deviceId);

      const existing = this.activePeers.get(deviceId);
      const peerName = info.name || (existing ? existing.name : `Citizen [${deviceId.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}]`);
      const updatedPeer: MeshPeer = {
        id: deviceId,
        nodeId: actualNodeId || existing?.nodeId,
        name: peerName,
        signalStrength: existing ? existing.signalStrength : -60,
        relayedPacketsCount: existing ? existing.relayedPacketsCount : 0,
        role: 'Citizen Node',
        distanceMeters: existing ? existing.distanceMeters : 5,
        status: existing ? existing.status : 'SAFE',
        lastSeen: new Date(),
      };
      this.activePeers.set(deviceId, updatedPeer);
      this.emitPeersUpdate();
      if (this.onPeerDiscovered) {
        this.onPeerDiscovered(updatedPeer);
      }
      console.log(`[BLE Mesh] HELLO registered from ${peerName} (${senderId})`);

      // Bidirectional handshake: reply with our own identity so both nodes know each other
      if (!info.isAck) {
        const replyPayload = JSON.stringify({
          name: this.myName,
          id: this.myDeviceId,
          isAck: true,
        });
        const replyPkt = encodePacket(BLEMsgType.HELLO, this.myDeviceId, replyPayload, 1);
        notifyAllCentrals(replyPkt).catch(() => {});
        const targetDev = this.connectedDevices.get(deviceId);
        if (targetDev) {
          this.sendToPeer(targetDev, BLEMsgType.HELLO, replyPayload, 1).catch(() => {});
        }
      }
    } catch {}
  }

  private handleChatMessage(senderId: string, payload: string, ttl: number, msgId?: string) {
    try {
      const data = JSON.parse(payload);
      // Skip if originated by ourselves
      if (senderId === this.myDeviceId || data.senderId === this.myDeviceId) {
        return;
      }

      const now = Date.now();
      // Deduplicate: check if this message already exists in chatMessages
      const isDuplicate = this.chatMessages.some((m) => {
        if (msgId && m.id === msgId) return true;
        if (m.text === data.text && (m.senderId === senderId || m.senderName === data.senderName)) {
          const mTime = m.timestampMs || 0;
          if (now - mTime < 4000) return true;
        }
        return false;
      });
      if (isDuplicate) {
        console.log(`[BLE Mesh] Duplicate chat dropped: "${data.text}"`);
        return;
      }

      const msg: MeshChatMessage = {
        id: msgId || `msg_${now}_${senderId}`,
        senderId,
        senderName: data.senderName || `Peer_${senderId.substring(0, 6)}`,
        text: data.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMeshRelayed: ttl < 7,
        hopCount: Math.max(1, 8 - ttl),
        timestampMs: now,
      };

      this.chatMessages.push(msg);
      if (this.chatMessages.length > 100) this.chatMessages.shift();

      // Play audio chime on receiving mesh chat message
      playPttTone('incoming').catch(() => {});

      if (this.onMessageReceived) this.onMessageReceived(msg);
      console.log(`[BLE Mesh] 💬 CHAT received from ${msg.senderName}: "${msg.text}" (hop ${msg.hopCount})`);
    } catch {}
  }

  private handleSOSPacket(senderId: string, payload: string, ttl: number) {
    try {
      const data = JSON.parse(payload);
      console.warn(`[BLE Mesh] 🚨 SOS RECEIVED from ${senderId}! Type: ${data.sosType}`);

      const targetMac = this.peerNodeIdToMac.get(senderId);

      this.activePeers.forEach((peer, id) => {
        if (peer.id === senderId || id === targetMac || (targetMac && peer.id === targetMac)) {
          peer.status = 'SOS';
          if (data.lat && data.lng) {
            peer.lat = data.lat;
            peer.lng = data.lng;
          }
          this.activePeers.set(id, peer);
        }
      });
      this.emitPeersUpdate();

      if (this.onSOSReceived) {
        this.onSOSReceived(senderId, data.lat || 0, data.lng || 0);
      }
      triggerNativeSosAlert(
        data.senderName || `Citizen (${senderId.substring(0, 6)})`,
        `🚨 Critical Emergency Distress Beacon received! Lat: ${data.lat || 0}, Lng: ${data.lng || 0}`,
        data.lat || 0,
        data.lng || 0
      );
      if (this.onSOSRelayed) {
        this.onSOSRelayed();
      }
    } catch {}
  }

  private handleSafeConfirmation(senderId: string, payload: string) {
    const targetMac = this.peerNodeIdToMac.get(senderId);
    this.activePeers.forEach((peer, id) => {
      if (peer.id === senderId || id === targetMac || (targetMac && peer.id === targetMac)) {
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
      // Don't ring if the call request was sent by me
      if (senderId === this.myDeviceId || (data.callerId && data.callerId === this.myDeviceId)) return;

      const isGroup = Boolean(data.isGroupCall || data.targetId === 'GROUP_CALL' || data.targetId === 'BROADCAST');

      if (!isGroup) {
        // Robust 1-to-1 targeting:
        const isDirectIdMatch =
          data.targetNodeId === this.myDeviceId ||
          data.targetId === this.myDeviceId ||
          (this.macToNodeId.get(data.targetId) === this.myDeviceId) ||
          (this.peerNodeIdToMac.get(data.targetNodeId) === this.myDeviceId);

        const isNameMatch = Boolean(
          this.myName && data.targetName &&
          (this.myName.trim().toLowerCase() === data.targetName.trim().toLowerCase() ||
           data.targetName.toLowerCase().includes(this.myDeviceId.slice(-4).toLowerCase()) ||
           (this.myName.includes('[') && data.targetName.includes(this.myName.split('[')[1]?.replace(']', ''))))
        );

        const isIntendedRecipient = isDirectIdMatch || isNameMatch || (
          // Direct 1-hop link where the target is not another known device in our mesh
          ttl >= 6 && (!data.targetId || !this.activePeers.has(data.targetId) || this.connectedDevices.has(senderId) || this.peripheralClients.has(senderId))
        );

        if (!isIntendedRecipient) {
          console.log(`[BLE Mesh] 📞 Ignoring private 1-to-1 call from ${data.callerName || senderId} (intended for ${data.targetName || data.targetId})`);
          return;
        }
      }

      const targetMac = this.peerNodeIdToMac.get(senderId);
      const peer = (targetMac && this.activePeers.get(targetMac)) || this.activePeers.get(senderId);
      const baseCallerName = data.callerName || peer?.name || `Citizen_${senderId.substring(0, 6)}`;
      const callerName = isGroup ? `🚨 GROUP: ${baseCallerName}` : baseCallerName;
      const distance = peer?.distanceMeters || this.rssiToDistance(peer?.signalStrength || -65);
      const hopCount = Math.max(1, 8 - ttl);

      console.log(`[BLE Mesh] 📞 ${isGroup ? '🚨 INCOMING GROUP EMERGENCY CALL' : 'INCOMING 1-TO-1 CALL'} from ${callerName} (${senderId})`);
      wakeUpScreenAndShowCall(callerName, isGroup, senderId);
      if (this.onIncomingCall) {
        this.onIncomingCall({
          id: senderId,
          name: callerName,
          distance,
          hopCount,
          isGroupCall: isGroup,
        });
      }
    } catch (e) {
      console.warn('[BLE Mesh] Error parsing CALL_REQUEST:', e);
    }
  }

  private handleCallAccept(senderId: string, payload: string) {
    try {
      const data = JSON.parse(payload);
      if (senderId === this.myDeviceId) return;
      console.log(`[BLE Mesh] 📞 CALL ACCEPTED by ${senderId}`);
      if (this.onCallAnswered) this.onCallAnswered(senderId, data.responderName);
    } catch (e) {}
  }

  private handleCallDecline(senderId: string, payload: string) {
    try {
      if (senderId === this.myDeviceId) return;
      console.log(`[BLE Mesh] 📞 CALL DECLINED by ${senderId}`);
      if (this.onCallDeclined) this.onCallDeclined(senderId);
    } catch (e) {}
  }

  private handleCallEnd(senderId: string, payload: string) {
    try {
      if (senderId === this.myDeviceId) return;
      console.log(`[BLE Mesh] 📞 CALL ENDED by ${senderId}`);
      if (this.onCallEnded) this.onCallEnded(senderId);
    } catch (e) {}
  }

  private handleVoiceBurst(senderId: string, payload: string) {
    try {
      const data = JSON.parse(payload);
      // Echo cancellation: skip our own transmitted voice bursts
      if (senderId === this.myDeviceId || (data.senderId && data.senderId === this.myDeviceId)) {
        return;
      }

      const isGroup = Boolean(data.isGroupCall || data.targetId === 'GROUP_CALL' || data.targetId === 'BROADCAST' || !data.targetId);

      if (!isGroup) {
        // Strict 1-to-1 audio filtering: only play audio if targeted to us
        const isForMe =
          data.targetNodeId === this.myDeviceId ||
          data.targetId === this.myDeviceId ||
          (this.myName && data.targetName && this.myName.trim().toLowerCase() === data.targetName.trim().toLowerCase());

        if (!isForMe) {
          console.log(`[BLE Mesh] 🔇 Ignoring private 1-to-1 voice burst meant for ${data.targetName || data.targetId}`);
          return;
        }
      }

      // Fast-path: Single complete voice burst
      if (data.audio && (!data.total || data.total <= 1)) {
        let fullAudio = data.audio.trim();
        if (!fullAudio.startsWith('IyFBTVI')) {
          fullAudio = 'IyFBTVIK' + fullAudio;
        }

        console.log(`[BLE Mesh] 🔊 Direct voice burst received from ${senderId} (${fullAudio.length} chars)! Playing on loudspeaker...`);
        playPttTone('incoming').catch(() => {});
        setTimeout(() => {
          playVoiceAudio(fullAudio).catch((e) => console.warn('[BLE Mesh] Audio playback error:', e));
        }, 220);

        if (this.onVoiceBurstReceived) {
          this.onVoiceBurstReceived(senderId, fullAudio);
        }
        return;
      }

      const burstId = data.burstId || ('v_' + senderId);
      let buffer = this.voiceBuffers.get(burstId);
      if (!buffer) {
        buffer = {
          total: data.total || 1,
          chunks: new Map(),
          timer: setTimeout(() => {
            const currentBuf = this.voiceBuffers.get(burstId);
            if (currentBuf && currentBuf.chunks.size > 0) {
              let partialAudio = '';
              for (let i = 0; i < currentBuf.total; i++) {
                if (currentBuf.chunks.has(i)) partialAudio += currentBuf.chunks.get(i);
              }
              if (partialAudio.length > 0) {
                // Ensure AMR header is present
                if (!partialAudio.startsWith('IyFBTVI')) {
                  partialAudio = 'IyFBTVIK' + partialAudio;
                }
                console.log(`[BLE Mesh] Reassembled timed-out burst (${partialAudio.length} chars, ${currentBuf.chunks.size}/${currentBuf.total} chunks). Playing on speaker...`);
                playVoiceAudio(partialAudio).catch(() => {});
                if (this.onVoiceBurstReceived) this.onVoiceBurstReceived(senderId, partialAudio);
              }
            }
            this.voiceBuffers.delete(burstId);
          }, 1200),
        };
        this.voiceBuffers.set(burstId, buffer);
      }

      buffer.chunks.set(data.seq || 0, data.audio);

      if (buffer.chunks.size >= buffer.total) {
        clearTimeout(buffer.timer);
        this.voiceBuffers.delete(burstId);

        let fullAudio = '';
        for (let i = 0; i < buffer.total; i++) {
          fullAudio += buffer.chunks.get(i) || '';
        }

        if (fullAudio.length > 0) {
          // Ensure AMR header is present
          if (!fullAudio.startsWith('IyFBTVI')) {
            fullAudio = 'IyFBTVIK' + fullAudio;
          }
          console.log(`[BLE Mesh] 🔊 Full voice burst reassembled (${fullAudio.length} chars)! Playing on loudspeaker...`);
          // 1. Play radio chime followed by real native voice audio directly through the phone speaker
          playPttTone('incoming').catch(() => {});
          setTimeout(() => {
            playVoiceAudio(fullAudio).catch((e) => console.warn('[BLE Mesh] Audio playback error:', e));
          }, 80);

          // 2. Notify any active HUD/screen
          if (this.onVoiceBurstReceived) {
            this.onVoiceBurstReceived(senderId, fullAudio);
          }
        }
      }
    } catch (e) {
      console.warn('[BLE Mesh] Voice burst handler error:', e);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Send a text message to all nearby peers via mesh */
  async sendChatMessage(senderName: string, text: string, targetPeerId?: string): Promise<MeshChatMessage> {
    const now = Date.now();
    const msgId = `msg_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const msg: MeshChatMessage = {
      id: msgId,
      senderId: this.myDeviceId,
      senderName: 'You',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMeshRelayed: false,
      hopCount: 1,
      timestampMs: now,
    };

    this.chatMessages.push(msg);
    this.seenMsgIds.add(msgId);

    const payload = JSON.stringify({
      senderId: this.myDeviceId,
      senderName: this.myName || 'Citizen Node',
      text,
      targetId: targetPeerId || 'BROADCAST',
    });

    await this.broadcastToAll(BLEMsgType.CHAT, payload, 7, msgId, this.myDeviceId);

    console.log(`[BLE Mesh] Broadcast chat "${text}" across mesh (id=${msgId})`);
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

  /** Broadcast SOS alias for full cross-module compatibility */
  async broadcastSOS(payload: any): Promise<{ hops: number; peersReached: number }> {
    return this.broadcastMultiHopSOS(payload);
  }

  /** Broadcast "I AM SAFE" via mesh */
  async broadcastSafe(): Promise<void> {
    const data = JSON.stringify({ id: this.myDeviceId, timestamp: new Date().toISOString() });
    await this.broadcastToAll(BLEMsgType.SAFE, data, 5);
    console.log('[BLE Mesh] SAFE broadcast sent to all peers');
  }

  /** Initiate a BLE voice intercom call to a peer or group */
  async initiateCall(targetPeerId: string, targetName?: string, isGroupCall: boolean = false): Promise<boolean> {
    const isGroup = Boolean(isGroupCall || targetPeerId === 'GROUP_CALL');
    console.log(`[BLE Mesh] Initiating ${isGroup ? '🚨 GROUP EMERGENCY CALL' : '1-to-1 call'} to: ${targetPeerId}`);

    const peer = this.activePeers.get(targetPeerId) || Array.from(this.activePeers.values()).find((p) => p.id === targetPeerId || p.nodeId === targetPeerId);
    const targetNodeId = isGroup ? 'GROUP_CALL' : (peer?.nodeId || this.macToNodeId.get(targetPeerId) || targetPeerId);

    const payload = JSON.stringify({
      callerId: this.myDeviceId,
      callerName: this.myName || 'Citizen Node',
      targetId: isGroup ? 'GROUP_CALL' : targetPeerId,
      targetNodeId,
      targetName: isGroup ? 'ALL NEARBY CITIZENS (GROUP CALL)' : (targetName || peer?.name || 'Citizen Node'),
      isGroupCall: isGroup,
      timestamp: Date.now(),
    });

    await this.broadcastToAll(BLEMsgType.CALL_REQUEST, payload, 1);
    return true;
  }

  /** Initiate a Broadcast Group Emergency Call to ALL nearby nodes */
  async initiateGroupCall(callerName?: string): Promise<boolean> {
    console.log('[BLE Mesh] 🚨 INITIATING GROUP EMERGENCY CALL TO ALL NEARBY CITIZENS!');
    return this.initiateCall('GROUP_CALL', callerName || 'ALL NEARBY CITIZENS', true);
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
    await this.broadcastToAll(BLEMsgType.CALL_ACCEPT, payload, 1);
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
    // Dismiss the IncomingCallActivity immediately on THIS device (no BLE roundtrip needed)
    dismissIncomingCall().catch(() => {});
    await this.broadcastToAll(BLEMsgType.CALL_DECLINE, payload, 1);
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
    // Dismiss IncomingCallActivity on THIS device immediately (prevents 20s hang-up)
    dismissIncomingCall().catch(() => {});
    await this.broadcastToAll(BLEMsgType.CALL_END, payload, 1);
  }

  /** Send real compressed microphone audio burst across BLE mesh */
  async sendVoiceBurst(targetPeerId: string, base64Audio: string, isGroupCall: boolean = false): Promise<void> {
    if (!base64Audio || base64Audio.trim().length === 0) return;

    let safeAudio = base64Audio.trim();
    if (!safeAudio.startsWith('IyFBTVI')) {
      safeAudio = 'IyFBTVIK' + safeAudio;
    }

    const isGroup = Boolean(isGroupCall || targetPeerId === 'GROUP_CALL' || targetPeerId === 'BROADCAST');
    const peer = this.activePeers.get(targetPeerId) || Array.from(this.activePeers.values()).find((p) => p.id === targetPeerId || p.nodeId === targetPeerId);
    const targetNodeId = isGroup ? 'GROUP_CALL' : (peer?.nodeId || this.macToNodeId.get(targetPeerId) || targetPeerId);

    const payload = JSON.stringify({
      audio: safeAudio,
      senderId: this.myDeviceId,
      senderName: this.myName,
      targetId: isGroup ? 'GROUP_CALL' : targetPeerId,
      targetNodeId,
      targetName: peer?.name,
      isGroupCall: isGroup,
      timestamp: Date.now(),
    });

    console.log(`[BLE Mesh] 🎙️ Transmitting voice burst (${safeAudio.length} chars) to ${isGroup ? '🚨 ALL NODES (GROUP)' : (peer?.name || targetPeerId)}`);

    // Broadcast to all connected devices and centrals with single unified packet ID
    await this.broadcastToAll(BLEMsgType.VOICE_BURST, payload, 1);
  }

  /** Get device's own mesh ID */
  getMyDeviceId(): string {
    return this.myDeviceId;
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
    const n = 2;
    const A = -59;
    const d = Math.pow(10, (A - rssi) / (10 * n));
    return Math.round(Math.min(d, 9999));
  }

  private emitPeersUpdate() {
    const list = Array.from(this.activePeers.values());
    if (this.onPeersChanged) {
      try {
        this.onPeersChanged(list);
      } catch {}
    }
    this.peersListeners.forEach((cb) => {
      try {
        cb(list);
      } catch {}
    });
  }
}

// ─── Singleton Export ─────────────────────────────────────────────────────────
export const bleEngine = new NeerNetraBLEMesh();
export const meshEngine = bleEngine;
export const meshManager = bleEngine;
