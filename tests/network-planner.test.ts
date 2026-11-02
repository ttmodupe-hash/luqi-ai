import { describe, expect, it } from 'vitest';
import { parseIPv4, calculateIPv4Subnet, ipv4Text, parseHostRequirements, planIPv4Vlsm, vlsmCsv } from '../src/lib/network-planner';

describe('Luqi Network Intelligence — deterministic CIDR', () => {
  it('rejects partial parses, leading zeros, hostnames, malformed prefixes and octet overflow', () => {
    for (const bad of ['192.168.1.1foo','1.2.3','192.168.1.999','01.2.3.4','-1.2.3.4','1..2.3','1.2.3.4/24','1.2.3. 4']) {
      expect(parseIPv4(bad)).toBeNull();
    }
    for (const mask of [-1, 33, 24.5, NaN, Infinity]) expect(calculateIPv4Subnet('192.168.10.10',mask)).toBeNull();
  });
  it('computes CCNA sample and cross-octet masks exactly', () => {
    const a=calculateIPv4Subnet('192.168.10.45',26)!;
    expect([a.networkAddress,a.broadcastAddress,a.subnetMask,a.wildcardMask,a.firstUsable,a.lastUsable,a.usableHosts])
      .toEqual(['192.168.10.0','192.168.10.63','255.255.255.192','0.0.0.63','192.168.10.1','192.168.10.62',62]);
    const b=calculateIPv4Subnet('172.16.85.45',22)!;
    expect([b.networkAddress,b.broadcastAddress,b.subnetMask,b.usableHosts]).toEqual(['172.16.84.0','172.16.87.255','255.255.252.0',1022]);
    expect(calculateIPv4Subnet('10.42.1.8',8)?.subnetMask).toBe('255.0.0.0');
    expect(calculateIPv4Subnet('10.42.1.8',16)?.subnetMask).toBe('255.255.0.0');
  });
  it('handles /0, /30, RFC3021 /31 and /32 host routes without fabricated broadcast', () => {
    expect(calculateIPv4Subnet('255.255.255.255',0)?.totalHosts).toBe(4294967296);
    expect(calculateIPv4Subnet('255.255.255.255',0)?.networkAddress).toBe('0.0.0.0');
    expect(calculateIPv4Subnet('10.1.1.1',30)?.usableHosts).toBe(2);
    const p2p=calculateIPv4Subnet('203.0.113.11',31)!;
    expect([p2p.firstUsable,p2p.lastUsable,p2p.usableHosts,p2p.broadcastAddress])
      .toEqual(['203.0.113.10','203.0.113.11',2,'Not applicable']);
    const host=calculateIPv4Subnet('203.0.113.11',32)!;
    expect([host.firstUsable,host.lastUsable,host.usableHosts,host.broadcastAddress])
      .toEqual(['203.0.113.11','203.0.113.11',1,'Not applicable']);
    expect(ipv4Text(parseIPv4('0.0.0.0')!)).toBe('0.0.0.0');
    expect(ipv4Text(parseIPv4('255.255.255.255')!)).toBe('255.255.255.255');
  });
});
describe('Luqi Network Intelligence — VLSM', () => {
  it('allocates largest-first without overlaps and returns results in request order', () => {
    const result=planIPv4Vlsm('192.168.10.0/24',[80,35,12]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.allocations.map(a=>[a.cidr,a.firstHost,a.lastHost,a.broadcast])).toEqual([
      ['192.168.10.0/25','192.168.10.1','192.168.10.126','192.168.10.127'],
      ['192.168.10.128/26','192.168.10.129','192.168.10.190','192.168.10.191'],
      ['192.168.10.192/28','192.168.10.193','192.168.10.206','192.168.10.207'],
    ]);
    expect(result.unallocatedAddresses).toBe(48);
    expect(vlsmCsv(result)).toContain('"192.168.10.128/26"');
  });
  it('validates input and fails closed on impossible VLSM without invented allocations', () => {
    for (const s of ['4,0','1,','1e2','10;20','65535','1,'.repeat(10),'=cmd']) expect(parseHostRequirements(s)).toBeNull();
    expect(parseHostRequirements('80, 35, 12')).toEqual([80,35,12]);
    const impossible=planIPv4Vlsm('10.2.3.0/26',[80,35]);
    expect(impossible.ok).toBe(false);
    expect(planIPv4Vlsm('10.2.3.1/99',[10]).ok).toBe(false);
    expect(planIPv4Vlsm('10.2.3.1foo/24',[10]).ok).toBe(false);
  });
  it('rejects mismatched subnets, preserves host order and reports normalized parent networks', () => {
    const result=planIPv4Vlsm('172.16.85.45/22',[10,50]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.baseCidr).toBe('172.16.84.0/22');
    expect(result.normalizedBase).toBe(true);
    expect(result.allocations.map(x=>x.label)).toEqual(['LAN 1','LAN 2']);
    expect(result.allocations[1].hostsRequested).toBe(50);
  });
});
