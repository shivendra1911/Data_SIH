import { MeshPeer, MeshChatMessage, SOSPayload } from '../types';
import { saveSOSToOfflineQueue } from './offlineStorage';

class BluetoothMeshEngine {
  private activePeers: MeshPeer[] = [
    {
      id: 'peer_1',
      name: 'Ramesh Kumar (Citizen)',
      signalStrength: -48,
      relayedPacketsCount: 28,
      role: 'Citizen Node',
      location: 'Chamoli Ridge (120m away)',
      flag: '🇮🇳',
      lat: 30.5580,
      lng: 79.5650,
      status: 'SAFE',
      distanceMeters: 120,
    },
    {
      id: 'peer_2',
      name: 'NDRF Unit Alpha (Rescue)',
      signalStrength: -54,
      relayedPacketsCount: 142,
      role: 'Rescue Commander',
      location: 'Chamoli Bridge (350m away)',
      flag: '🇮🇳',
      lat: 30.5560,
      lng: 79.5630,
      status: 'HELPING',
      distanceMeters: 350,
    },
    {
      id: 'peer_3',
      name: 'Priyanshu (Emergency Node)',
      signalStrength: -62,
      relayedPacketsCount: 19,
      role: 'Mesh Repeater',
      location: 'Joshimath Base (850m away)',
      flag: '🇮🇳',
      lat: 30.5595,
      lng: 79.5690,
      status: 'SOS',
      distanceMeters: 850,
    },
  ];

  private chatMessages: MeshChatMessage[] = [
    {
      id: 'msg_1',
      senderId: 'peer_2',
      senderName: 'NDRF Unit Alpha',
      text: 'NDRF Chopper 1 deploying to Chamoli Sector 1. Remain on high ground!',
      timestamp: '14:25',
      isMeshRelayed: true,
      hopCount: 1,
    },
    {
      id: 'msg_2',
      senderId: 'peer_1',
      senderName: 'Ramesh Kumar',
      text: 'Water rising near riverbank bridge. 12 people safe on hilltop.',
      timestamp: '14:28',
      isMeshRelayed: true,
      hopCount: 2,
    },
  ];

  public getConnectedPeers(): MeshPeer[] {
    return [...this.activePeers];
  }

  public getActivePeersCount(): number {
    return this.activePeers.length;
  }

  public getMeshChatMessages(): MeshChatMessage[] {
    return [...this.chatMessages];
  }

  public sendMeshMessage(senderId: string, senderName: string, text: string): MeshChatMessage {
    const newMsg: MeshChatMessage = {
      id: `msg_${Date.now()}`,
      senderId,
      senderName,
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMeshRelayed: true,
      hopCount: 1,
    };
    this.chatMessages.push(newMsg);
    console.log('[BLE Mesh Engine] Message broadcasted across P2P Bluetooth chain:', newMsg);
    return newMsg;
  }

  public async broadcastMultiHopSOS(payload: SOSPayload): Promise<{ hops: number; peersReached: number }> {
    console.log('[BLE Mesh Engine] Multi-hop P2P SOS packet broadcasted across chain...');
    await saveSOSToOfflineQueue({ ...payload, is_mesh_relayed: true });

    return {
      hops: Math.floor(Math.random() * 3) + 2, // e.g. 2 to 4 hops
      peersReached: this.activePeers.length,
    };
  }
}

export const meshEngine = new BluetoothMeshEngine();
export const meshManager = meshEngine;
