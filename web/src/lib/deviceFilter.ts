export function isGenuineDevice(device_uuid?: string, name?: string): boolean {
  if (!device_uuid && !name) return false;
  const d = (device_uuid || "").toLowerCase();
  const n = (name || "").toLowerCase();

  const mockKeywords = [
    "mock",
    "demo",
    "dummy",
    "synthetic",
    "audit",
    "fake",
    "cloud_device",
    "ramesh",
    "anita",
    "katy",
    "seed",
    "sample",
    "priyanshu (citizen node 01)",
    "dev_priyanshu_phone",
    "dev_ramesh_kumar",
    "dev_katy_fuller",
    "dev_anita_sharma",
    "dev_node_b_relay",
    "dev_node_c_dist",
    "dev_node_d_shelter",
    "dev_node_x_relay",
    "dev_node_l_2400m",
    "dev_initiator_node",
    "ndrf rescue ops",
    "cell broadcast",
    "emergency cell siren",
    "cell-broadcast",
    "admin_siren_dispatch",
    "govt_directive",
    "command_directive",
    "broadcast_all",
  ];

  for (const kw of mockKeywords) {
    if (d.includes(kw) || n.includes(kw)) {
      return false;
    }
  }
  return true;
}
