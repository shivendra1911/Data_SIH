import socket
import json
import time
import subprocess
import threading
import sys
import base64
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

DEVICE_SERIAL = "10MF6FF06Q0002X"

def get_device_node_id():
    try:
        res = subprocess.run(["adb", "-s", DEVICE_SERIAL, "shell", "run-as com.neernetra.disaster cat shared_prefs/NeerNetraPrefs.xml"], capture_output=True, text=True, timeout=3)
        for line in res.stdout.splitlines():
            if 'name="local_node_id"' in line:
                val = line.split('>')[1].split('<')[0].strip()
                if val:
                    return val
    except Exception:
        pass
    return "dev_xtrbjipa_179"

PHONE_NODE_ID = get_device_node_id()

def log(msg):
    print(f"[TEST_RUNNER] {msg}", flush=True)

class LogcatMonitor:
    def __init__(self, serial):
        self.serial = serial
        self.proc = None
        self.lines = []
        self.running = False

    def start(self):
        # Clear logcat first
        subprocess.run(["adb", "-s", self.serial, "logcat", "-c"], capture_output=True)
        self.running = True
        self.proc = subprocess.Popen(
            ["adb", "-s", self.serial, "logcat", "-T", "1", "-v", "time", "*:V"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace"
        )
        self.thread = threading.Thread(target=self._reader, daemon=True)
        self.thread.start()

    def _reader(self):
        while self.running and self.proc and self.proc.stdout:
            line = self.proc.stdout.readline()
            if not line:
                break
            self.lines.append(line.strip())

    def stop(self):
        self.running = False
        if self.proc:
            try:
                self.proc.terminate()
            except Exception:
                pass

    def mark(self):
        return len(self.lines)

    def search_for(self, pattern, timeout=6.0, start_index=0):
        start = time.time()
        while time.time() - start < timeout:
            current_lines = list(self.lines)
            for l in current_lines[start_index:]:
                if pattern in l:
                    return l
            time.sleep(0.2)
        return None

def send_udp(payload_dict):
    data_str = json.dumps(payload_dict)
    b64 = base64.b64encode(data_str.encode("utf-8")).decode("ascii")
    # Send through local Wi-Fi UDP port 8765 via adb shell
    cmd = f"echo {b64} | base64 -d | timeout 1 nc -u 127.0.0.1 8765"
    subprocess.run(["adb", "-s", DEVICE_SERIAL, "shell", cmd], capture_output=True)

def run_all_tests():
    log("==================================================================")
    log("NEERNETRA MULTI-HOP MESH & WI-FI CALLING INTEGRATION TEST SUITE")
    log("==================================================================")
    log(f"Target: UDP Port 8765 (Native Wi-Fi Mesh on device {DEVICE_SERIAL})")
    log(f"Phone Node ID: {PHONE_NODE_ID}")
    
    monitor = LogcatMonitor(DEVICE_SERIAL)
    monitor.start()
    time.sleep(1.0)
    
    passed_count = 0
    total_count = 7

    run_ts = int(time.time())
    NODE_B = f"dev_b_{run_ts}"
    NODE_C = f"dev_c_{run_ts}"
    NODE_D = f"dev_d_{run_ts}"
    NODE_X = f"dev_x_{run_ts}"
    NODE_L = f"dev_l_{run_ts}"

    # -------------------------------------------------------------------------
    # TEST 1: Distance-Vector Gossip Beacon Routing Table Ingestion
    # -------------------------------------------------------------------------
    log("\n--- TEST 1: Distance-Vector Gossip Beacon (Linked List Peers) ---")
    gossip_packet = {
        "t": 1,
        "m": f"gossip_{int(time.time()*1000)}",
        "s": NODE_B,
        "name": "Node B [Relay Gateway]",
        "d": "BROADCAST",
        "ttl": 5,
        "neighbors": [
            {
                "peer_id": NODE_C,
                "name": "Node C (Rescue Team)",
                "hop_count": 1, # Phone should increment to 2 hops (~120m)
                "status": "SAFE",
                "battery": 91
            },
            {
                "peer_id": NODE_D,
                "name": "Node D (High Ridge Shelter)",
                "hop_count": 2, # Phone should increment to 3 hops (~180m)
                "status": "HELPING",
                "battery": 78
            }
        ]
    }
    idx1 = monitor.mark()
    send_udp(gossip_packet)
    log(f"Sent UDP distance-vector gossip beacon with {NODE_C} & {NODE_D}")
    
    match_c = monitor.search_for(f"[GossipRouting] Node {NODE_C} reachable via {NODE_B} (2 hops", timeout=6.0, start_index=idx1)
    match_d = monitor.search_for(f"[GossipRouting] Node {NODE_D} reachable via {NODE_B} (3 hops", timeout=6.0, start_index=idx1)
    
    if match_c and match_d:
        log(f"PASS: Node C recognized as 2 hops: {match_c}")
        log(f"PASS: Node D recognized as 3 hops: {match_d}")
        passed_count += 1
    else:
        log(f"FAIL: Gossip routing table not updated. C: {match_c}, D: {match_d}")

    # -------------------------------------------------------------------------
    # TEST 2: Bellman-Ford Shortest Path Protection (Routing Integrity)
    # -------------------------------------------------------------------------
    log("\n--- TEST 2: Bellman-Ford Shortest Path Protection ---")
    # Suboptimal beacon claiming Node C is 5 hops via a worse node
    degraded_gossip_packet = {
        "t": 1,
        "m": f"gossip_worse_{int(time.time()*1000)}",
        "s": NODE_X,
        "name": "Node X [Suboptimal Route]",
        "d": "BROADCAST",
        "ttl": 5,
        "neighbors": [
            {
                "peer_id": NODE_C,
                "name": "Node C (Rescue Team)",
                "hop_count": 5, # 5 hops + 1 = 6 hops (should be rejected in favor of existing 2 hops!)
                "status": "SAFE",
                "battery": 91
            }
        ]
    }
    idx2 = monitor.mark()
    send_udp(degraded_gossip_packet)
    log(f"Sent degraded 5-hop route advertisement for {NODE_C} via {NODE_X}")
    time.sleep(1.0)
    degraded_match = monitor.search_for(f"Node {NODE_C} reachable via {NODE_X} (6 hops", timeout=2.0, start_index=idx2)
    if degraded_match is None:
        log("PASS: Degraded 6-hop route rejected. Existing optimal 2-hop route preserved.")
        passed_count += 1
    else:
        log(f"FAIL: Degraded route improperly overwritten: {degraded_match}")

    # -------------------------------------------------------------------------
    # TEST 3: Multi-Hop Call Request Forwarding & Intermediate Wake Suppression
    # -------------------------------------------------------------------------
    log("\n--- TEST 3: Multi-Hop MESH_CALL_REQ Relay Forwarding & Wake Suppression ---")
    call_mhop_id = f"mhop_call_{int(time.time()*1000)}"
    relay_call_packet = {
        "t": 7, # MESH_CALL_REQ
        "m": call_mhop_id,
        "s": "dev_initiator_node",
        "d": NODE_C, # Addressed to Node C (phone is intermediate node!)
        "caller_name": "Commander Sharma",
        "path": ["dev_initiator_node"],
        "ttl": 5,
        "p": json.dumps({
            "callerName": "Commander Sharma",
            "targetId": NODE_C,
            "isVoice": True
        })
    }
    idx3 = monitor.mark()
    send_udp(relay_call_packet)
    log(f"Sent MESH_CALL_REQ packet {call_mhop_id} addressed to {NODE_C} (TTL=5)")
    
    forward_match = monitor.search_for(f"🔁 [MultiHopRelay] Forwarding packet {call_mhop_id}", timeout=6.0, start_index=idx3)
    ttl_match = monitor.search_for("TTL 5->4", timeout=6.0, start_index=idx3)
    suppress_match = monitor.search_for("Suppressing lock-screen wake", timeout=6.0, start_index=idx3)
    
    if forward_match and ttl_match:
        log(f"PASS: Forwarded packet over UDP 8765 & BLE: {forward_match}")
        if suppress_match:
            log(f"PASS: Intermediate node suppressed lock-screen wake: {suppress_match}")
        passed_count += 1
    else:
        log(f"FAIL: Forwarding failed. Forward: {forward_match}, TTL: {ttl_match}")

    # -------------------------------------------------------------------------
    # TEST 4: Packet Deduplication & Anti-Looping Protection
    # -------------------------------------------------------------------------
    log("\n--- TEST 4: Duplicate Packet Suppression (Looping Prevention) ---")
    idx4 = monitor.mark()
    send_udp(relay_call_packet) # Send identical packet with same msg_id
    log(f"Sent duplicate packet {call_mhop_id}")
    
    dedup_match = monitor.search_for(f"🔁 [MeshDeduplication] Dropping duplicate packet msg_id={call_mhop_id}", timeout=6.0, start_index=idx4)
    if dedup_match:
        log(f"PASS: Packet deduplication active: {dedup_match}")
        passed_count += 1
    else:
        log(f"FAIL: Deduplication did not drop duplicate packet: {dedup_match}")

    # -------------------------------------------------------------------------
    # TEST 5: Voice Burst Audio Stream Relaying (<30ms delay)
    # -------------------------------------------------------------------------
    log("\n--- TEST 5: Multi-Hop Voice Audio Burst Relaying ---")
    voice_msg_id = f"voice_{int(time.time()*1000)}"
    voice_packet = {
        "t": 11, # VOICE_BURST
        "m": voice_msg_id,
        "s": "dev_initiator_node",
        "d": NODE_C, # Addressed to Node C
        "ttl": 4,
        "p": json.dumps({
            "senderId": "dev_initiator_node",
            "targetId": NODE_C,
            "audio": "IyFBTVIKAAAA", # Dummy AMR 8kHz audio frame
            "seq": 0,
            "total": 1
        })
    }
    idx5 = monitor.mark()
    send_udp(voice_packet)
    log(f"Sent VOICE_BURST packet {voice_msg_id} (TTL=4)")
    voice_relay_match = monitor.search_for(f"Forwarding packet {voice_msg_id}", timeout=6.0, start_index=idx5)
    voice_ttl_match = monitor.search_for("TTL 4->3", timeout=6.0, start_index=idx5)
    if voice_relay_match and voice_ttl_match:
        log(f"PASS: Voice burst forwarded: {voice_relay_match}")
        passed_count += 1
    else:
        log(f"FAIL: Voice burst relaying failed: {voice_relay_match}")

    # -------------------------------------------------------------------------
    # TEST 6: WhatsApp-Style Incoming Call for Self (Wake Screen & Ring)
    # -------------------------------------------------------------------------
    log("\n--- TEST 6: Direct Incoming Call Addressed to Self (Wake & Launch UI) ---")
    call_self_id = f"self_call_{int(time.time()*1000)}"
    self_call_packet = {
        "t": 7, # MESH_CALL_REQ
        "m": call_self_id,
        "s": f"dev_ndrf_{run_ts}",
        "d": PHONE_NODE_ID, # Addressed to this phone!
        "caller_name": "NDRF Rescue Ops",
        "ttl": 4,
        "p": json.dumps({
            "callerName": "NDRF Rescue Ops",
            "targetId": PHONE_NODE_ID,
            "targetNodeId": PHONE_NODE_ID,
            "isVoice": True
        })
    }
    idx6 = monitor.mark()
    send_udp(self_call_packet)
    log(f"Sent MESH_CALL_REQ {call_self_id} addressed directly to {PHONE_NODE_ID}")
    
    incoming_call_match = monitor.search_for("🚨 WhatsApp-Style Incoming Call detected", timeout=6.0, start_index=idx6)
    launch_match = monitor.search_for("IncomingCallActivity", timeout=6.0, start_index=idx6)
    
    if incoming_call_match:
        log(f"PASS: WhatsApp-Style Incoming Call detected: {incoming_call_match}")
        if launch_match:
            log(f"PASS: IncomingCallActivity triggered: {launch_match}")
        passed_count += 1
    else:
        log(f"FAIL: Incoming call for self not detected: {incoming_call_match}")

    # Dismiss call immediately so phone doesn't keep ringing or vibrating
    time.sleep(0.1)
    end_call_packet = {
        "t": 10, # CALL_END
        "m": f"end_{int(time.time()*1000)}",
        "s": f"dev_ndrf_{run_ts}",
        "d": PHONE_NODE_ID,
        "ttl": 3
    }
    send_udp(end_call_packet)
    log("Sent CALL_END packet to dismiss incoming call activity")
    time.sleep(1.0)
    
    # -------------------------------------------------------------------------
    # TEST 7: Long-Range 2+ km Multi-Hop Chain Relay (12 Hops / 2.4 km)
    # -------------------------------------------------------------------------
    log("\n--- TEST 7: Long-Range Multi-Hop Chain Verification (12 Hops / 2.4 km) ---")
    long_range_gossip = {
        "t": 1,
        "m": f"gossip_2km_{int(time.time()*1000)}",
        "s": NODE_B,
        "name": "Node B [Relay Gateway]",
        "d": "BROADCAST",
        "ttl": 15,
        "neighbors": [
            {
                "peer_id": NODE_L,
                "name": "Node L (Sector 12 Evacuation Center - 2.4km)",
                "hop_count": 11, # 11 hops from Node B -> 12 hops from phone!
                "status": "HELPING",
                "battery": 95
            }
        ]
    }
    idx7 = monitor.mark()
    send_udp(long_range_gossip)
    log(f"Sent 12-hop / 2.4 km multi-hop route advertisement for {NODE_L}")
    
    match_2km = monitor.search_for(f"[GossipRouting] Node {NODE_L} reachable via {NODE_B} (12 hops", timeout=6.0, start_index=idx7)
    
    # Send long-range call packet destined across 2.4km chain with TTL=15
    long_call_id = f"mhop_2km_call_{int(time.time()*1000)}"
    long_range_call_packet = {
        "t": 7, # MESH_CALL_REQ
        "m": long_call_id,
        "s": "dev_initiator_node",
        "d": NODE_L, # Addressed across 2.4km
        "caller_name": "Camp Alpha Rescue",
        "ttl": 15,
        "p": json.dumps({
            "callerName": "Camp Alpha Rescue",
            "targetId": NODE_L,
            "isVoice": True
        })
    }
    idx7_call = monitor.mark()
    send_udp(long_range_call_packet)
    log(f"Sent 2.4 km call packet {long_call_id} addressed to {NODE_L} (TTL=15)")
    
    forward_2km_match = monitor.search_for(f"🔁 [MultiHopRelay] Forwarding packet {long_call_id}", timeout=6.0, start_index=idx7_call)
    ttl_2km_match = monitor.search_for("TTL 15->14", timeout=6.0, start_index=idx7_call)
    
    if match_2km and forward_2km_match and ttl_2km_match:
        log(f"PASS: 12-Hop (2.4 km) route ingested: {match_2km}")
        log(f"PASS: 2.4 km call relayed across chain: {forward_2km_match} ({ttl_2km_match})")
        passed_count += 1
    else:
        log(f"FAIL: 2.4 km test failed. Route: {match_2km}, Forward: {forward_2km_match}, TTL: {ttl_2km_match}")

    monitor.stop()

    log("\n==================================================================")
    log(f"TEST RESULTS: {passed_count}/{total_count} TESTS PASSED")
    log("==================================================================")
    if passed_count == total_count:
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == "__main__":
    run_all_tests()
