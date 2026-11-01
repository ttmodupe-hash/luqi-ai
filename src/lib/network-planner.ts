/**
 * LUQI · on-device IPv4/CIDR network design.
 * Deterministic arithmetic only; no external calls, router configuration,
 * provider inference, customer data storage or fabricated connectivity.
 */
export type IPv4Subnet = {
  inputAddress: string; prefix: number; subnetMask: string; wildcardMask: string;
  networkAddress: string; broadcastAddress: string; firstUsable: string;
  lastUsable: string; totalHosts: number; usableHosts: number;
  binaryIp: string; binaryMask: string; networkNumber: number;
  lastNumber: number; note: string;
};

export function parseIPv4(address: string): number | null {
  if (typeof address !== 'string' || address.length > 15) return null;
  const parts = address.split('.');
  if (parts.length !== 4 || parts.some(p => !/^(?:0|[1-9][0-9]{0,2})$/.test(p) || Number(p) > 255))
    return null;
  const n = parts.map(Number);
  return ((n[0] * 16777216) + (n[1] << 16) + (n[2] << 8) + n[3]) >>> 0;
}
export function ipv4Text(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error('Invalid IPv4 integer');
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.');
}
export function calculateIPv4Subnet(address: string, prefix: number): IPv4Subnet | null {
  const ip = parseIPv4(address);
  if (ip === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const wildcard = (~mask) >>> 0;
  const network = (ip & mask) >>> 0;
  const last = (network | wildcard) >>> 0;
  const count = 2 ** (32 - prefix);
  const usable = prefix === 32 ? 1 : prefix === 31 ? 2 : count - 2;
  const first = prefix >= 31 ? network : network + 1;
  const final = prefix >= 31 ? last : last - 1;
  const special = prefix === 31 ? 'RFC 3021 point-to-point link: both endpoints are usable; no broadcast address.' :
    prefix === 32 ? 'Single-host route: no broadcast address.' : 'Traditional IPv4 subnet: network and broadcast addresses are reserved.';
  const binary = (value: number) => ipv4Text(value).split('.').map(x => Number(x).toString(2).padStart(8, '0')).join('.');
  return {
    inputAddress: address, prefix, subnetMask: ipv4Text(mask), wildcardMask: ipv4Text(wildcard),
    networkAddress: ipv4Text(network),
    broadcastAddress: prefix >= 31 ? 'Not applicable' : ipv4Text(last),
    firstUsable: ipv4Text(first), lastUsable: ipv4Text(final),
    totalHosts: count, usableHosts: usable, binaryIp: binary(ip), binaryMask: binary(mask),
    networkNumber: network, lastNumber: last, note: special,
  };
}
export type NetworkAllocation = {
  label: string; hostsRequested: number; cidr: string; network: string;
  firstHost: string; lastHost: string; broadcast: string;
  subnetMask: string; wildcardMask: string; usableHosts: number; spareHosts: number;
};
export type VlsmPlan =
  | { ok: true; baseCidr: string; normalizedBase: boolean; allocations: NetworkAllocation[]; unallocatedAddresses: number }
  | { ok: false; error: string };

export function parseHostRequirements(raw: string): number[] | null {
  if (typeof raw !== 'string' || raw.length > 90) return null;
  const entries = raw.split(',').map(s => s.trim());
  if (!entries.length || entries.length > 8 ||
      entries.some(s => !/^[1-9][0-9]{0,4}$/.test(s) || Number(s) > 65534)) return null;
  return entries.map(Number);
}
/** Largest-first aligned VLSM allocation for ordinary IPv4 LANs.
 * /31 and /32 point-to-point/host routes are deliberately not assigned as LANs.
 * This is design guidance, not a live router or allocation registry.
 */
export function planIPv4Vlsm(baseCidr: string, requests: readonly number[]): VlsmPlan {
  if (typeof baseCidr !== 'string' || baseCidr.length > 19) return { ok: false, error: 'Enter a valid IPv4 network such as 192.168.10.0/24.' };
  const parts = baseCidr.trim().split('/');
  if (parts.length !== 2 || !/^(?:[0-9]|[12][0-9]|3[0-2])$/.test(parts[1]))
    return { ok: false, error: 'Use a valid IPv4 CIDR prefix from /0 through /32.' };
  const prefix = Number(parts[1]);
  const base = calculateIPv4Subnet(parts[0], prefix);
  if (!base) return { ok: false, error: 'Invalid IPv4 network address.' };
  if (!requests.length || requests.length > 8 || requests.some(h => !Number.isInteger(h) || h < 1 || h > 65534))
    return { ok: false, error: 'Enter 1–8 LAN host requirements, each between 1 and 65,534.' };
  const indexed = requests.map((hostsRequested, i) => ({ hostsRequested, i }))
    .sort((a, b) => b.hostsRequested - a.hostsRequested || a.i - b.i);
  const allocations: (NetworkAllocation & {index: number})[] = [];
  let cursor = base.networkNumber;
  for (const request of indexed) {
    const needed = request.hostsRequested + 2;
    const capacity = 2 ** Math.ceil(Math.log2(Math.max(4, needed)));
    const cidrPrefix = 32 - Math.log2(capacity);
    const start = Math.ceil(cursor / capacity) * capacity;
    if (start + capacity - 1 > base.lastNumber) return {
      ok: false, error: 'These LANs do not fit inside ' + base.networkAddress + '/' + prefix +
        '. Reduce host requirements or choose a larger parent network.',
    };
    const detail = calculateIPv4Subnet(ipv4Text(start), cidrPrefix);
    if (!detail) return { ok: false, error: 'The network allocation could not be computed.' };
    allocations.push({
      index: request.i, label: 'LAN ' + (request.i + 1), hostsRequested: request.hostsRequested,
      cidr: detail.networkAddress + '/' + cidrPrefix, network: detail.networkAddress,
      firstHost: detail.firstUsable, lastHost: detail.lastUsable,
      broadcast: detail.broadcastAddress, subnetMask: detail.subnetMask,
      wildcardMask: detail.wildcardMask, usableHosts: detail.usableHosts,
      spareHosts: detail.usableHosts - request.hostsRequested,
    });
    cursor = start + capacity;
  }
  const sortedByInput = allocations.sort((a, b) => a.index - b.index);
  return {
    ok: true, baseCidr: base.networkAddress + '/' + prefix,
    normalizedBase: base.networkAddress !== parts[0],
    allocations: sortedByInput.map(({index: _index, ...rest}) => rest),
    unallocatedAddresses: base.lastNumber - cursor + 1,
  };
}
export function vlsmCsv(plan: Extract<VlsmPlan, {ok:true}>): string {
  const fields = ['LAN','Required hosts','Network/CIDR','Mask','Wildcard','First host','Last host','Broadcast','Usable hosts','Spare hosts'];
  const rows = plan.allocations.map(a => [
    a.label, a.hostsRequested, a.cidr, a.subnetMask, a.wildcardMask, a.firstHost, a.lastHost,
    a.broadcast, a.usableHosts, a.spareHosts,
  ].map(v => '"' + String(v).replaceAll('"', '""') + '"').join(','));
  return [fields.join(','), ...rows].join('\r\n') + '\r\n';
}
