import { describe,expect,it } from "vitest";
import { simulateDirectHostPing } from "./packetJourney";
const a={id:"a",name:"PC 1",ipv4:"192.168.1.2",maskBits:24};
const b={id:"b",name:"PC 2",ipv4:"192.168.1.3",maskBits:24};
describe("educational packet journey",()=>{
  it("shows ARP before ICMP on a directly connected LAN",()=>expect(simulateDirectHostPing(a,b,true).map(e=>e.protocol)).toEqual(["ARP","ARP","ICMP","ICMP","CHECK"]));
  it("stops when cable is disconnected",()=>expect(simulateDirectHostPing(a,b,false).every(e=>e.protocol==="CHECK")).toBe(true));
  it("does not imply routing for different subnets",()=>expect(simulateDirectHostPing(a,{...b,ipv4:"192.168.2.3"},true)[0].explanation).toMatch(/subnet/));
});
