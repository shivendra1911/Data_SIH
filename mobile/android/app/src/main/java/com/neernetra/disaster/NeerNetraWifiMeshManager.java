package com.neernetra.disaster;

import android.content.Context;
import android.content.pm.PackageManager;
import android.net.wifi.aware.AttachCallback;
import android.net.wifi.aware.DiscoverySessionCallback;
import android.net.wifi.aware.PeerHandle;
import android.net.wifi.aware.PublishConfig;
import android.net.wifi.aware.PublishDiscoverySession;
import android.net.wifi.aware.SubscribeConfig;
import android.net.wifi.aware.SubscribeDiscoverySession;
import android.net.wifi.aware.WifiAwareManager;
import android.net.wifi.aware.WifiAwareSession;
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
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * NeerNetraWifiMeshManager
 * ========================
 * High-speed, zero-infrastructure long-range mesh extension utilizing:
 *  1. Wi-Fi Aware (NAN - Neighbor Awareness Networking) for direct 150m-300m discovery.
 *  2. High-throughput zero-latency UDP/TCP socket mesh (Port 8765) allowing uncompressed/compressed
 *     voice packet streaming and multi-hop linked list forwarding without cellular/routers.
 */
public class NeerNetraWifiMeshManager {

    private static final String TAG = "NeerNetraWifiMesh";
    public static final int MESH_PORT = 8765;
    private static final String WIFI_AWARE_SERVICE_NAME = "NeerNetraDisasterMesh";

    private static NeerNetraWifiMeshManager instance;
    private final Context appContext;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final ExecutorService executor = Executors.newCachedThreadPool();

    // Wi-Fi Aware state
    private WifiAwareManager wifiAwareManager;
    private WifiAwareSession awareSession;
    private PublishDiscoverySession publishSession;
    private SubscribeDiscoverySession subscribeSession;
    private volatile boolean isAwareAttached = false;
    private final Map<Integer, PeerHandle> discoveredAwarePeers = new ConcurrentHashMap<>();

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

    /**
     * Bootstraps Wi-Fi Aware NAN and Local Socket Mesh engine.
     */
    public synchronized void startWifiMesh() {
        Log.i(TAG, "Starting NeerNetra High-Speed Long-Range Wi-Fi Mesh Subsystem...");
        startUdpSocketListener();
        initWifiAware();
    }

    /**
     * Initializes Wi-Fi Aware NAN (150m-300m zero-infrastructure discovery).
     */
    private void initWifiAware() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || wifiAwareManager == null) {
            Log.i(TAG, "Wi-Fi Aware (NAN) hardware not supported on this chipset. Relying on High-Performance UDP Socket Mesh.");
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
                    Log.i(TAG, "⚡ Wi-Fi Aware message received (" + (message != null ? message.length : 0) + " bytes)");
                    if (message != null && message.length > 0) {
                        NeerNetraNativeMeshManager.getInstance(appContext)
                            .handleIncomingPacketFromAnyTransport("wifi_aware", message);
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
                    discoveredAwarePeers.put(peerHandle.hashCode(), peerHandle);
                    Log.i(TAG, "🎯 Wi-Fi Aware discovered long-range peer (PeerHandle #" + peerHandle.hashCode() + ")!");
                }

                @Override
                public void onMessageReceived(PeerHandle peerHandle, byte[] message) {
                    super.onMessageReceived(peerHandle, message);
                    if (message != null && message.length > 0) {
                        NeerNetraNativeMeshManager.getInstance(appContext)
                            .handleIncomingPacketFromAnyTransport("wifi_aware", message);
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
                        byte[] receivedBytes = new byte[length];
                        System.arraycopy(packet.getData(), packet.getOffset(), receivedBytes, 0, length);
                        String senderIp = packet.getAddress().getHostAddress();

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
     * Broadcasts a mesh packet over local Wi-Fi, Wi-Fi Aware, and Local-Only Hotspot networks.
     */
    public void broadcastPacketOverWifi(byte[] data) {
        if (data == null || data.length == 0) return;

        executor.execute(() -> {
            // 1. Send via Wi-Fi Aware NAN to all discovered peers
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && isAwareAttached) {
                for (PeerHandle handle : discoveredAwarePeers.values()) {
                    try {
                        if (publishSession != null) {
                            publishSession.sendMessage(handle, 1, data);
                        } else if (subscribeSession != null) {
                            subscribeSession.sendMessage(handle, 1, data);
                        }
                    } catch (Exception ignored) {}
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
        List<InetAddress> broadcastList = new ArrayList<>();
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface networkInterface = interfaces.nextElement();
                if (networkInterface.isLoopback() || !networkInterface.isUp()) continue;

                for (InterfaceAddress interfaceAddress : networkInterface.getInterfaceAddresses()) {
                    InetAddress broadcast = interfaceAddress.getBroadcast();
                    if (broadcast != null) {
                        broadcastList.add(broadcast);
                    }
                }
            }
        } catch (Exception ignored) {}
        return broadcastList;
    }

    public boolean isWifiAwareAvailable() {
        return isAwareAttached;
    }

    public int getDiscoveredWifiPeersCount() {
        return discoveredAwarePeers.size();
    }

    public synchronized void stopWifiMesh() {
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
            discoveredAwarePeers.clear();
        }
        Log.i(TAG, "Wi-Fi Mesh subsystem stopped");
    }
}
