package com.neernetra.disaster;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.WifiManager;
import android.net.wifi.aware.AttachCallback;
import android.net.wifi.aware.DiscoverySessionCallback;
import android.net.wifi.aware.PeerHandle;
import android.net.wifi.aware.PublishConfig;
import android.net.wifi.aware.PublishDiscoverySession;
import android.net.wifi.aware.SubscribeConfig;
import android.net.wifi.aware.SubscribeDiscoverySession;
import android.net.wifi.aware.WifiAwareManager;
import android.net.wifi.aware.WifiAwareSession;
import android.net.wifi.p2p.WifiP2pManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.InterfaceAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * NeerNetraWifiMeshManager
 * ========================
 * High-speed, zero-infrastructure long-range mesh extension utilizing:
 *  1. Wi-Fi Aware (NAN - Neighbor Awareness Networking) for direct 150m-300m discovery on supported hardware.
 *  2. Wi-Fi Direct (P2P - WifiP2pManager) for zero-infrastructure autonomous discovery on all Android chipsets.
 *  3. High-throughput zero-latency UDP broadcast socket mesh (Port 8765) with WifiManager.MulticastLock
 *     allowing uncompressed/compressed voice packet streaming and multi-hop linked list forwarding with NO NETWORK.
 */
public class NeerNetraWifiMeshManager {

    private static final String TAG = "NeerNetraWifiMesh";
    public static final int MESH_PORT = 8765;
    private static final String WIFI_AWARE_SERVICE_NAME = "NeerNetraDisasterMesh";

    private static NeerNetraWifiMeshManager instance;
    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newCachedThreadPool();

    // Multicast lock to prevent Android Wi-Fi power-saving from dropping UDP broadcast packets
    private WifiManager.MulticastLock multicastLock;

    // Wi-Fi Aware state
    private WifiAwareManager wifiAwareManager;
    private WifiAwareSession awareSession;
    private PublishDiscoverySession publishSession;
    private SubscribeDiscoverySession subscribeSession;
    private volatile boolean isAwareAttached = false;
    private final Map<Integer, PeerHandle> discoveredSubscribePeers = new ConcurrentHashMap<>();
    private final Map<Integer, PeerHandle> discoveredPublishPeers = new ConcurrentHashMap<>();

    // Wi-Fi Direct (P2P) state
    private WifiP2pManager wifiP2pManager;
    private WifiP2pManager.Channel wifiP2pChannel;

    // UDP Broadcast Socket state
    private DatagramSocket udpSocket;
    private volatile boolean isUdpListening = false;
    private Thread udpListenerThread;

    private NeerNetraWifiMeshManager(Context context) {
        this.appContext = context.getApplicationContext();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PackageManager pm = appContext.getPackageManager();
            if (pm.hasSystemFeature(PackageManager.FEATURE_WIFI_AWARE)) {
                this.wifiAwareManager = (WifiAwareManager) appContext.getSystemService(Context.WIFI_AWARE_SERVICE);
            }
        }
    }

    public static synchronized NeerNetraWifiMeshManager getInstance(Context context) {
        if (instance == null) {
            instance = new NeerNetraWifiMeshManager(context);
        }
        return instance;
    }

    private final Handler beaconHandler = new Handler(Looper.getMainLooper());
    private final Runnable beaconRunnable = new Runnable() {
        @Override
        public void run() {
            try {
                broadcastWifiHelloBeacon();
            } catch (Exception ignored) {}
            beaconHandler.postDelayed(this, 5000); // 5-second periodic long-range Wi-Fi discovery beacon
        }
    };

    /**
     * Bootstraps Wi-Fi Aware NAN, Wi-Fi Direct P2P, and Local UDP Socket Mesh engine.
     */
    public synchronized void startWifiMesh() {
        Log.i(TAG, "Starting NeerNetra High-Speed Long-Range Wi-Fi Mesh Subsystem...");
        acquireMulticastLock();
        startUdpSocketListener();
        initWifiAware();
        initWifiP2p();
        beaconHandler.postDelayed(beaconRunnable, 2000);
    }

    /**
     * Actively broadcasts a Wi-Fi HELLO beacon over UDP 8765 and Wi-Fi Aware to discover peers up to 250m away.
     */
    public void broadcastWifiHelloBeacon() {
        executor.execute(() -> {
            try {
                android.content.SharedPreferences sp = appContext.getSharedPreferences("NeerNetraPrefs", Context.MODE_PRIVATE);
                String myNodeId = sp.getString("local_node_id", "dev_node_" + Build.MODEL.replaceAll("[^a-zA-Z0-9]", ""));
                String myNodeName = sp.getString("local_node_name", Build.MODEL);

                org.json.JSONObject payload = new org.json.JSONObject();
                payload.put("id", myNodeId);
                payload.put("name", myNodeName);
                payload.put("transport", "wifi_direct");
                payload.put("range", 250);
                payload.put("isBeacon", true);
                payload.put("battery", 85);

                // Ingest active distance-vector gossip routing table for long-range multi-hop (up to kilometers)
                org.json.JSONArray neighborsArray = new org.json.JSONArray();
                try {
                    long nowMs = System.currentTimeMillis();
                    Map<String, NeerNetraNativeMeshManager.MeshRoute> routes = NeerNetraNativeMeshManager.getInstance(appContext).getRoutingTable();
                    for (NeerNetraNativeMeshManager.MeshRoute r : routes.values()) {
                        if (r != null && !myNodeId.equalsIgnoreCase(r.peerId) && (nowMs - r.lastSeen < 120000)) {
                            org.json.JSONObject nObj = new org.json.JSONObject();
                            nObj.put("peer_id", r.peerId);
                            nObj.put("name", r.name);
                            nObj.put("hop_count", r.hopCount);
                            nObj.put("next_hop", r.nextHop);
                            nObj.put("status", r.status != null ? r.status : "SAFE");
                            nObj.put("lat", r.lat);
                            nObj.put("lng", r.lng);
                            nObj.put("battery", r.battery > 0 ? r.battery : 85);
                            neighborsArray.put(nObj);
                        }
                    }
                } catch (Exception ignored) {}
                payload.put("neighbors", neighborsArray);

                org.json.JSONObject envelope = new org.json.JSONObject();
                envelope.put("t", 1); // BLEMsgType.HELLO
                envelope.put("m", "wb_" + System.currentTimeMillis() + "_" + (myNodeId.length() > 6 ? myNodeId.substring(0, 6) : myNodeId));
                envelope.put("s", myNodeId);
                envelope.put("name", myNodeName);
                envelope.put("d", "BROADCAST");
                envelope.put("ttl", 5);
                envelope.put("p", payload.toString());

                byte[] packetBytes = envelope.toString().getBytes(StandardCharsets.UTF_8);
                broadcastPacketOverWifi(packetBytes);
            } catch (Exception ignored) {}
        });
    }

    private void acquireMulticastLock() {
        try {
            if (multicastLock == null) {
                WifiManager wm = (WifiManager) appContext.getSystemService(Context.WIFI_SERVICE);
                if (wm != null) {
                    multicastLock = wm.createMulticastLock("neernetra:WifiMeshMulticast");
                    multicastLock.setReferenceCounted(false);
                    multicastLock.acquire();
                    Log.i(TAG, "⚡ Acquired WifiManager.MulticastLock for UDP broadcast mesh reception");
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not acquire MulticastLock: " + e.getMessage());
        }
    }

    private void releaseMulticastLock() {
        try {
            if (multicastLock != null && multicastLock.isHeld()) {
                multicastLock.release();
                multicastLock = null;
                Log.i(TAG, "Released WifiManager.MulticastLock");
            }
        } catch (Exception ignored) {}
    }

    /**
     * Initializes Wi-Fi Direct (P2P) for devices without Wi-Fi Aware hardware.
     */
    private void initWifiP2p() {
        try {
            PackageManager pm = appContext.getPackageManager();
            if (!pm.hasSystemFeature(PackageManager.FEATURE_WIFI_DIRECT)) {
                Log.i(TAG, "Wi-Fi Direct (P2P) hardware feature not available on this device.");
                return;
            }
            wifiP2pManager = (WifiP2pManager) appContext.getSystemService(Context.WIFI_P2P_SERVICE);
            if (wifiP2pManager != null) {
                wifiP2pChannel = wifiP2pManager.initialize(appContext, Looper.getMainLooper(), null);
                Log.i(TAG, "⚡ Wi-Fi Direct (P2P) subsystem initialized successfully!");
                startP2pPeerDiscovery();
            }
        } catch (Exception e) {
            Log.w(TAG, "Wi-Fi Direct init error: " + e.getMessage());
        }
    }

    public void startP2pPeerDiscovery() {
        if (wifiP2pManager == null || wifiP2pChannel == null) return;
        try {
            wifiP2pManager.discoverPeers(wifiP2pChannel, new WifiP2pManager.ActionListener() {
                @Override
                public void onSuccess() {
                    Log.i(TAG, "⚡ Wi-Fi Direct peer discovery active for zero-network long-range mesh");
                }

                @Override
                public void onFailure(int reason) {
                    Log.w(TAG, "Wi-Fi Direct discoverPeers failure reason: " + reason);
                }
            });
        } catch (SecurityException se) {
            Log.w(TAG, "Wi-Fi Direct discoverPeers SecurityException: " + se.getMessage());
        } catch (Exception ignored) {}
    }

    /**
     * Initializes Wi-Fi Aware NAN (150m-300m zero-infrastructure discovery).
     */
    private void initWifiAware() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || wifiAwareManager == null) {
            Log.i(TAG, "Wi-Fi Aware (NAN) hardware not supported on this chipset. Relying on Wi-Fi Direct P2P & High-Performance UDP Socket Mesh.");
            return;
        }

        try {
            if (!wifiAwareManager.isAvailable()) {
                Log.w(TAG, "Wi-Fi Aware currently unavailable (Wi-Fi turned off or radio in sleep)");
                return;
            }

            wifiAwareManager.attach(new AttachCallback() {
                @Override
                public void onAttached(WifiAwareSession session) {
                    super.onAttached(session);
                    awareSession = session;
                    isAwareAttached = true;
                    Log.i(TAG, "⚡ Wi-Fi Aware NAN attached successfully! Publishing & Subscribing service: " + WIFI_AWARE_SERVICE_NAME);
                    publishAwareService();
                    subscribeAwareService();
                }

                @Override
                public void onAttachFailed() {
                    super.onAttachFailed();
                    isAwareAttached = false;
                    Log.w(TAG, "Wi-Fi Aware attach failed. Auto-retrying in 30 seconds...");
                    mainHandler.postDelayed(() -> initWifiAware(), 30000);
                }
            }, mainHandler);

        } catch (SecurityException se) {
            Log.w(TAG, "Wi-Fi Aware SecurityException (NEARBY_WIFI_DEVICES permission needed): " + se.getMessage());
        } catch (Exception e) {
            Log.w(TAG, "Wi-Fi Aware init error: " + e.getMessage());
        }
    }

    private void publishAwareService() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || awareSession == null) return;
        try {
            PublishConfig config = new PublishConfig.Builder()
                .setServiceName(WIFI_AWARE_SERVICE_NAME)
                .build();

            awareSession.publish(config, new DiscoverySessionCallback() {
                @Override
                public void onPublishStarted(PublishDiscoverySession session) {
                    super.onPublishStarted(session);
                    publishSession = session;
                    Log.i(TAG, "⚡ Wi-Fi Aware NAN Publish active for: " + WIFI_AWARE_SERVICE_NAME);
                }

                @Override
                public void onMessageReceived(PeerHandle peerHandle, byte[] message) {
                    super.onMessageReceived(peerHandle, message);
                    if (peerHandle != null) {
                        discoveredPublishPeers.put(peerHandle.hashCode(), peerHandle);
                    }
                    Log.i(TAG, "⚡ Wi-Fi Aware publisher received message (" + (message != null ? message.length : 0) + " bytes)");
                    if (message != null && message.length > 0) {
                        NeerNetraNativeMeshManager.getInstance(appContext)
                            .handleIncomingPacketFromAnyTransport("wifi_aware_pub", message);
                    }
                }
            }, mainHandler);
        } catch (SecurityException se) {
            Log.w(TAG, "Publish SecurityException: " + se.getMessage());
        } catch (Exception e) {
            Log.w(TAG, "Publish error: " + e.getMessage());
        }
    }

    private void subscribeAwareService() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || awareSession == null) return;
        try {
            SubscribeConfig config = new SubscribeConfig.Builder()
                .setServiceName(WIFI_AWARE_SERVICE_NAME)
                .build();

            awareSession.subscribe(config, new DiscoverySessionCallback() {
                @Override
                public void onSubscribeStarted(SubscribeDiscoverySession session) {
                    super.onSubscribeStarted(session);
                    subscribeSession = session;
                    Log.i(TAG, "⚡ Wi-Fi Aware NAN Subscribe active for: " + WIFI_AWARE_SERVICE_NAME);
                }

                @Override
                public void onServiceDiscovered(PeerHandle peerHandle, byte[] serviceSpecificInfo, List<byte[]> matchFilter) {
                    super.onServiceDiscovered(peerHandle, serviceSpecificInfo, matchFilter);
                    if (peerHandle != null) {
                        discoveredSubscribePeers.put(peerHandle.hashCode(), peerHandle);
                    }
                    Log.i(TAG, "🎯 Wi-Fi Aware subscriber discovered long-range peer (PeerHandle #" + (peerHandle != null ? peerHandle.hashCode() : 0) + ")!");
                }

                @Override
                public void onMessageReceived(PeerHandle peerHandle, byte[] message) {
                    super.onMessageReceived(peerHandle, message);
                    if (peerHandle != null) {
                        discoveredSubscribePeers.put(peerHandle.hashCode(), peerHandle);
                    }
                    Log.i(TAG, "⚡ Wi-Fi Aware subscriber received message (" + (message != null ? message.length : 0) + " bytes)");
                    if (message != null && message.length > 0) {
                        NeerNetraNativeMeshManager.getInstance(appContext)
                            .handleIncomingPacketFromAnyTransport("wifi_aware_sub", message);
                    }
                }
            }, mainHandler);
        } catch (SecurityException se) {
            Log.w(TAG, "Subscribe SecurityException: " + se.getMessage());
        } catch (Exception e) {
            Log.w(TAG, "Subscribe error: " + e.getMessage());
        }
    }

    /**
     * Binds UDP Broadcast Server on 0.0.0.0:8765 to receive multi-hop voice & telemetry packets.
     */
    private void startUdpSocketListener() {
        if (isUdpListening) return;

        isUdpListening = true;
        udpListenerThread = new Thread(() -> {
            try {
                udpSocket = new DatagramSocket(null);
                udpSocket.setReuseAddress(true);
                udpSocket.bind(new InetSocketAddress(MESH_PORT));
                udpSocket.setBroadcast(true);
                Log.i(TAG, "📻 Native Wi-Fi Mesh UDP Socket listening on 0.0.0.0:" + MESH_PORT);

                byte[] buffer = new byte[65535];
                while (isUdpListening && !Thread.currentThread().isInterrupted()) {
                    DatagramPacket packet = new DatagramPacket(buffer, buffer.length);
                    udpSocket.receive(packet);

                    int length = packet.getLength();
                    if (length > 0) {
                        java.net.InetAddress srcAddr = packet.getAddress();
                        if (srcAddr != null) {
                            // Ignore loopback or packets sent from our own local network interface IP
                            if (srcAddr.isLoopbackAddress() || java.net.NetworkInterface.getByInetAddress(srcAddr) != null) {
                                continue;
                            }
                        }
                        byte[] receivedBytes = new byte[length];
                        System.arraycopy(packet.getData(), packet.getOffset(), receivedBytes, 0, length);
                        String senderIp = srcAddr != null ? srcAddr.getHostAddress() : "unknown";

                        // Dispatch to unified native mesh router
                        NeerNetraNativeMeshManager.getInstance(appContext)
                            .handleIncomingPacketFromAnyTransport("wifi:" + senderIp, receivedBytes);
                    }
                }
            } catch (Exception e) {
                if (isUdpListening) {
                    Log.w(TAG, "UDP listener encountered error: " + e.getMessage());
                }
            } finally {
                if (udpSocket != null && !udpSocket.isClosed()) {
                    try { udpSocket.close(); } catch (Exception ignored) {}
                }
                isUdpListening = false;
            }
        }, "NeerNetra-WifiMeshListener");
        udpListenerThread.start();
    }

    /**
     * Broadcasts a mesh packet over local Wi-Fi, Wi-Fi Aware, Wi-Fi Direct, and Local-Only Hotspot networks.
     */
    public void broadcastPacketOverWifi(byte[] data) {
        if (data == null || data.length == 0) return;

        executor.execute(() -> {
            // 1. Send via Wi-Fi Aware NAN to all discovered peers
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isAwareAttached) {
                // Send to peers discovered by subscribeSession
                if (subscribeSession != null) {
                    for (PeerHandle handle : discoveredSubscribePeers.values()) {
                        try {
                            subscribeSession.sendMessage(handle, 1, data);
                        } catch (Exception ignored) {}
                    }
                }
                // Send to peers who messaged publishSession
                if (publishSession != null) {
                    for (PeerHandle handle : discoveredPublishPeers.values()) {
                        try {
                            publishSession.sendMessage(handle, 1, data);
                        } catch (Exception ignored) {}
                    }
                }
            }

            // 2. Send via UDP Broadcast to 255.255.255.255 and all local subnet broadcast addresses
            try (DatagramSocket sendSocket = new DatagramSocket()) {
                sendSocket.setBroadcast(true);

                // Global broadcast
                InetAddress globalBroadcast = InetAddress.getByName("255.255.255.255");
                DatagramPacket globalPacket = new DatagramPacket(data, data.length, globalBroadcast, MESH_PORT);
                sendSocket.send(globalPacket);

                // Interface-specific broadcasts (hotspot, P2P, local Wi-Fi)
                List<InetAddress> broadcastAddresses = getBroadcastAddresses();
                for (InetAddress broadcastAddr : broadcastAddresses) {
                    try {
                        DatagramPacket ifPacket = new DatagramPacket(data, data.length, broadcastAddr, MESH_PORT);
                        sendSocket.send(ifPacket);
                    } catch (Exception ignored) {}
                }
            } catch (Exception e) {
                Log.w(TAG, "Failed to broadcast UDP packet over Wi-Fi: " + e.getMessage());
            }
        });
    }

    private List<InetAddress> getBroadcastAddresses() {
        Set<InetAddress> broadcastSet = new HashSet<>();
        try {
            // Explicit standard Wi-Fi Direct and Hotspot subnet broadcast targets
            try { broadcastSet.add(InetAddress.getByName("192.168.49.255")); } catch (Exception ignored) {}
            try { broadcastSet.add(InetAddress.getByName("192.168.49.1")); } catch (Exception ignored) {}
            try { broadcastSet.add(InetAddress.getByName("192.168.43.255")); } catch (Exception ignored) {}
            try { broadcastSet.add(InetAddress.getByName("192.168.137.255")); } catch (Exception ignored) {}

            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                if (networkInterface.isLoopback() || !networkInterface.isUp()) continue;

                for (InterfaceAddress interfaceAddress : networkInterface.getInterfaceAddresses()) {
                    InetAddress broadcast = interfaceAddress.getBroadcast();
                    if (broadcast != null) {
                        broadcastSet.add(broadcast);
                    } else {
                        // Compute subnet broadcast from address and prefix length
                        InetAddress ip = interfaceAddress.getAddress();
                        if (ip instanceof java.net.Inet4Address) {
                            short prefix = interfaceAddress.getNetworkPrefixLength();
                            if (prefix > 0 && prefix < 32) {
                                int ipInt = 0;
                                byte[] ipBytes = ip.getAddress();
                                for (byte b : ipBytes) {
                                    ipInt = (ipInt << 8) | (b & 0xFF);
                                }
                                int mask = ~((1 << (32 - prefix)) - 1);
                                int bcastInt = ipInt | (~mask);
                                byte[] bcastBytes = new byte[4];
                                bcastBytes[0] = (byte) ((bcastInt >> 24) & 0xFF);
                                bcastBytes[1] = (byte) ((bcastInt >> 16) & 0xFF);
                                bcastBytes[2] = (byte) ((bcastInt >> 8) & 0xFF);
                                bcastBytes[3] = (byte) (bcastInt & 0xFF);
                                broadcastSet.add(InetAddress.getByAddress(bcastBytes));
                            }
                        }
                    }
                }
            }
        } catch (Exception ignored) {}
        return new ArrayList<>(broadcastSet);
    }

    public boolean isWifiAwareAvailable() {
        return isAwareAttached;
    }

    public int getDiscoveredWifiPeersCount() {
        return discoveredSubscribePeers.size() + discoveredPublishPeers.size();
    }

    public synchronized void stopWifiMesh() {
        releaseMulticastLock();
        isUdpListening = false;
        if (udpSocket != null && !udpSocket.isClosed()) {
            try { udpSocket.close(); } catch (Exception ignored) {}
            udpSocket = null;
        }
        if (udpListenerThread != null) {
            udpListenerThread.interrupt();
            udpListenerThread = null;
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (publishSession != null) {
                try { publishSession.close(); } catch (Exception ignored) {}
                publishSession = null;
            }
            if (subscribeSession != null) {
                try { subscribeSession.close(); } catch (Exception ignored) {}
                subscribeSession = null;
            }
            if (awareSession != null) {
                try { awareSession.close(); } catch (Exception ignored) {}
                awareSession = null;
            }
            isAwareAttached = false;
            discoveredSubscribePeers.clear();
            discoveredPublishPeers.clear();
        }
        Log.i(TAG, "Wi-Fi Mesh subsystem stopped");
    }
}
