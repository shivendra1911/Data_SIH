import { MeshPeer, SOSPayload } from '../types';
import { saveSOSToOfflineQueue } from './offlineStorage';

class BluetoothMeshManager {
  private isAdvertising: boolean = false;
  private isDiscovering: boolean = false;
  private connectedPeers: MeshPeer[] = [
    { id: 'peer_node_01', name: 'Rescue-Relay-Alpha', signalStrength: -58, relayedPacketsCount: 14 },
    { id: 'peer_node_02', name: 'Citizen-Edge-Node', signalStrength: -72, relayedPacketsCount: 3 },
    { id: 'peer_node_03', name: 'Govt-Helipad-Node', signalStrength: -45, relayedPacketsCount: 89 },
  ];

  public getActivePeersCount(): number {
    return this.connectedPeers.length;
  }

  public getConnectedPeers(): MeshPeer[] {
    return [...this.connectedPeers];
  }

  public async broadcastPacketOverMesh(payload: SOSPayload): Promise<{ success: boolean; relayedByCount: number }> {
    console.log('[BLE Mesh] Broadcasting SOS packet over Bluetooth Low Energy / WiFi Direct...');
    
    // Flag payload as mesh relayed
    const meshPayload: SOSPayload = {
      ...payload,
      is_mesh_relayed: true,
    };

    // Save to offline storage queue so it syncs when ANY peer reaches cellular signal
    await saveSOSToOfflineQueue(meshPayload);

    // Simulate multi-hop P2P acknowledgment
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          relayedByCount: this.connectedPeers.length,
        });
      }, 1200);
    });
  }
}

export const meshManager = new BluetoothMeshManager();
