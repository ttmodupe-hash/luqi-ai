/** Educational ARP/ICMP event trace for two directly connected IPv4 hosts.
 * No actual network traffic, switching, routing or Cisco command execution. */
import { diagnoseSimpleLan, type NetworkNode } from "./masteryEngine";
export interface PacketEvent { step: number; actor: "PC 1" | "PC 2" | "Link"; protocol: "ARP" | "ICMP" | "CHECK"; explanation: string; }
export function simulateDirectHostPing(source: NetworkNode, target: NetworkNode, linkConnected: boolean): PacketEvent[] {
  const issues = diagnoseSimpleLan([source,target],linkConnected?[{from:source.id,to:target.id}]:[],source.id,target.id);
  if (issues.length) return issues.map((explanation,index)=>({step:index+1,actor:"Link" as const,protocol:"CHECK" as const,explanation}));
  return [
    {step:1,actor:"PC 1",protocol:"ARP",explanation:`The source broadcasts an ARP request to resolve the local IPv4 address ${target.ipv4} to a MAC address (assumes an empty ARP cache).`},
    {step:2,actor:"PC 2",protocol:"ARP",explanation:"The destination sends an ARP reply containing its MAC address. MAC values are not modeled."},
    {step:3,actor:"PC 1",protocol:"ICMP",explanation:"The source sends an ICMP Echo Request inside an IPv4 packet addressed to the destination."},
    {step:4,actor:"PC 2",protocol:"ICMP",explanation:"The destination responds with an ICMP Echo Reply, assuming both hosts permit ICMP."},
    {step:5,actor:"PC 1",protocol:"CHECK",explanation:"The illustrative ping exchange completes. No actual packets were transmitted."},
  ];
}
