import { ipv4, type TrackId } from './academy-engine';
export type TerminalState = { mode: 'user' | 'privileged' | 'global' | 'interface' | 'ospf'; hostname: string; selectedInterface: string;
  interfaces: Record<string, { address?: string; mask?: string; enabled: boolean; vlan?: number }>; ospf: string[]; vlans: number[]; firewall: Record<string, 'allow' | 'deny'> };
export const initialTerminal = (): TerminalState => ({ mode: 'user', hostname: 'LuqiLab', selectedInterface: '', interfaces: {}, ospf: [], vlans: [], firewall: { '22': 'deny', '443': 'allow' } });
export function terminalPrompt(state: TerminalState) {
  const suffix = { user: '>', privileged: '#', global: '(config)#', interface: '(config-if)#', ospf: '(config-router)#' }[state.mode];
  return state.hostname + suffix;
}
/** Small teaching grammar, NOT Python, JS evaluation or a shell. */
export function traceArithmetic(source: string): number {
  if (!source || source.length > 160) throw new Error('Use a short arithmetic expression (up to 160 characters).');
  const compact = source.replace(/\s+/g, '');
  const tokens = compact.match(/\d+(?:\.\d+)?|[()+*/-]/g) || [];
  if (tokens.join('') !== compact || tokens.length > 100) throw new Error('Only decimal numbers, parentheses and + - * / are supported.');
  let index = 0;
  function atom(depth: number): number {
    if (depth > 20) throw new Error('Expression is nested too deeply.');
    const token = tokens[index++];
    if (token === '+' || token === '-') return (token === '-' ? -1 : 1) * atom(depth + 1);
    if (token === '(') { const value = expression(depth + 1); if (tokens[index++] !== ')') throw new Error('Close each parenthesis.'); return value; }
    if (!token || !/^\d+(?:\.\d+)?$/.test(token)) throw new Error('Expected a number.');
    return Number(token);
  }
  function product(depth: number): number {
    let value = atom(depth);
    while (tokens[index] === '*' || tokens[index] === '/') { const op = tokens[index++]; const right = atom(depth);
      if (op === '/' && right === 0) throw new Error('Division by zero.'); value = op === '*' ? value * right : value / right; }
    return value;
  }
  function expression(depth: number): number {
    let value = product(depth);
    while (tokens[index] === '+' || tokens[index] === '-') { const op = tokens[index++]; const right = product(depth); value = op === '+' ? value + right : value - right; }
    return value;
  }
  const value = expression(0);
  if (index !== tokens.length || !Number.isFinite(value)) throw new Error('Invalid or non-finite expression.');
  return value;
}
export function runAcademyCommand(track: TrackId, original: TerminalState, input: string): { state: TerminalState; output: string } {
  const state: TerminalState = { ...original, interfaces: Object.fromEntries(Object.entries(original.interfaces).map(([k,v]) => [k,{...v}])), ospf: [...original.ospf], vlans: [...original.vlans], firewall: {...original.firewall} };
  const command = input.trim(); const lower = command.toLowerCase();
  const reply = (output: string) => ({ state, output });
  if (!command || command.length > 300) return reply('Enter a command of 1-300 characters. No external command will run.');
  if (lower === 'help') return reply(track === 'ccna' ? 'Local IOS-style subset: enable; disable; configure terminal / conf t; hostname NAME; vlan 1-4094; interface GigabitEthernet0/1 or 0/2; ip address IP MASK; shutdown; no shutdown; switchport access vlan ID; router ospf 1; network IP WILDCARD area 0; exit; end; show running-config; show ip interface brief. No packet forwarding or OSPF adjacency emulation.' : track === 'security' ? 'Fixture only: ufw status; ufw allow PORT; ufw deny PORT; nmap 192.0.2.10. No network traffic or host changes.' : track === 'aws' ? 'Fixture only: aws s3 ls; aws ec2 describe-instances; aws iam list-policies. No AWS calls or credentials.' : track === 'python' ? 'Python-output teaching subset: print(ARITHMETIC), arithmetic with + - * / and parentheses, sum([NUMBERS]). No assignment, imports, IO, packages or real Python runtime.' : 'This track uses the numerical labs and practical checklists, not a terminal.');
  if (track === 'python') {
    try {
      const sum = command.match(/^sum\(\[([^\]]*)\]\)$/);
      if (sum) {
        const items = sum[1].trim() ? sum[1].split(',').map(s => s.trim()) : [];
        if (items.length > 30 || items.some(s => !/^[+-]?\d+(?:\.\d+)?$/.test(s))) throw new Error('Use up to 30 numeric list items.');
        const value = items.reduce((total, s) => total + Number(s), 0);
        if (!Number.isFinite(value)) throw new Error('Numeric overflow.');
        return reply(`Teaching trace result: ${value}`);
      }
      const print = command.match(/^print\((.*)\)$/);
      return reply(`Teaching trace result: ${traceArithmetic(print ? print[1] : command)}`);
    } catch (error) { return reply(error instanceof Error ? error.message : 'Unsupported expression.'); }
  }
  if (track === 'security') {
    if (lower === 'ufw status') return reply('Synthetic firewall policy (not your device):\n' + Object.entries(state.firewall).map(([port,rule]) => `${port}/tcp ${rule}`).join('\n'));
    const rule = lower.match(/^ufw (allow|deny) (\d{1,5})$/);
    if (rule && Number(rule[2]) >= 1 && Number(rule[2]) <= 65535) { state.firewall[String(Number(rule[2]))] = rule[1] as 'allow' | 'deny'; return reply('Synthetic rule updated only.'); }
    if (lower === 'nmap 192.0.2.10') return reply('FIXTURE host 192.0.2.10. No scan performed.\n' + ['22','443'].map(port => `${port}/tcp ${state.firewall[port] === 'allow' ? 'reachable in fixture' : 'blocked in fixture'}`).join('\n'));
    return reply('Unsupported command. Only the documented local fixture is available; no external scans run.');
  }
  if (track === 'aws') {
    const fixtures: Record<string,string> = { 'aws s3 ls': 'SYNTHETIC: luqi-training-bucket (not a real AWS resource)', 'aws ec2 describe-instances': 'SYNTHETIC: {"Instances":[{"InstanceId":"training-instance","State":"stopped"}]}', 'aws iam list-policies': 'SYNTHETIC policy: allow s3:GetObject for arn:aws:s3:::luqi-training-bucket/lessons/* only. Not a complete IAM evaluator.' };
    return reply(fixtures[lower] || 'Unsupported fixture command. No AWS operation or billing occurs.');
  }
  if (track !== 'ccna') return reply('Use this track\'s calculator and safe practical checklist.');
  if (lower === 'enable' && state.mode === 'user') { state.mode = 'privileged'; return reply('Entered simulated privileged EXEC.'); }
  if (lower === 'disable' && state.mode === 'privileged') { state.mode = 'user'; return reply('Returned to simulated user EXEC.'); }
  if (['configure terminal','conf t'].includes(lower) && state.mode === 'privileged') { state.mode = 'global'; return reply('Entered simulated global configuration.'); }
  if (lower === 'end' && !['user','privileged'].includes(state.mode)) { state.mode = 'privileged'; return reply('Left simulated configuration.'); }
  if (lower === 'exit') { state.mode = state.mode === 'interface' || state.mode === 'ospf' ? 'global' : state.mode === 'global' ? 'privileged' : 'user'; return reply('Mode changed locally.'); }
  if (lower.startsWith('show ') && state.mode !== 'privileged') return reply('Use privileged EXEC for these simulated show commands.');
  if (lower === 'show running-config') return reply(JSON.stringify({ hostname: state.hostname, interfaces: state.interfaces, vlans: state.vlans, ospf: state.ospf }, null, 2));
  if (lower === 'show ip interface brief') return reply(Object.entries(state.interfaces).map(([name, value]) => `${name} ${value.address || 'unassigned'} ${value.enabled ? 'admin enabled (link not simulated)' : 'administratively down'}`).join('\n') || 'No interfaces configured in this fixture.');
  let match: RegExpMatchArray | null;
  if (state.mode === 'global') {
    if ((match = command.match(/^hostname ([A-Za-z][A-Za-z0-9-]{0,30})$/i))) { state.hostname = match[1]; return reply('Simulated hostname set.'); }
    if ((match = lower.match(/^vlan (\d{1,4})$/)) && Number(match[1]) >= 1 && Number(match[1]) <= 4094) { state.vlans = [...new Set([...state.vlans, Number(match[1])])]; return reply('VLAN added locally; VLAN sub-mode is not implemented.'); }
    if ((match = lower.match(/^interface (?:gigabitethernet|gi)0\/([12])$/))) { const name = `GigabitEthernet0/${match[1]}`; state.selectedInterface = name; state.interfaces[name] ||= { enabled: false }; state.mode = 'interface'; return reply('Selected local interface fixture.'); }
    if (lower === 'router ospf 1') { state.mode = 'ospf'; return reply('OSPF configuration subset; no neighbor or packet simulation.'); }
  }
  if (state.mode === 'interface') {
    const iface = state.interfaces[state.selectedInterface];
    if (lower === 'no shutdown' || lower === 'shutdown') { iface.enabled = lower === 'no shutdown'; return reply('Administrative state changed; physical link not simulated.'); }
    if ((match = lower.match(/^ip address ([\d.]+) ([\d.]+)$/))) {
      try {
        ipv4(match[1], 32); ipv4(match[2], 32);
        const maskBits = match[2].split('.').map(o => Number(o).toString(2).padStart(8,'0')).join('');
        if (!/^1*0*$/.test(maskBits)) throw new Error('Mask must be contiguous.');
        const prefix = maskBits.indexOf('0') === -1 ? 32 : maskBits.indexOf('0');
        const subnet = ipv4(match[1], prefix);
        if (prefix < 31 && [subnet.network, subnet.broadcast].includes(match[1])) throw new Error('Use an ordinary usable host address.');
        iface.address = match[1]; iface.mask = match[2]; return reply('Address stored locally. No real device changed.');
      } catch (e) { return reply(e instanceof Error ? e.message : 'Invalid address.'); }
    }
    if ((match = lower.match(/^switchport access vlan (\d{1,4})$/)) && state.vlans.includes(Number(match[1]))) { iface.vlan = Number(match[1]); return reply('Access VLAN associated in fixture only.'); }
  }
  if (state.mode === 'ospf' && (match = lower.match(/^network ([\d.]+) ([\d.]+) area 0$/))) {
    try { ipv4(match[1],32); ipv4(match[2],32); state.ospf = [...new Set([...state.ospf, command])].slice(-20); return reply('Statement recorded, not validated for topology or adjacency.'); } catch { return reply('Use valid IPv4 values.'); }
  }
  return reply('Unsupported command or wrong mode. Use help; no real command was executed.');
}
