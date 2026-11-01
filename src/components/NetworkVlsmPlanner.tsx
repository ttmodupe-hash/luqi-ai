import { useMemo, useState } from 'react';
import { parseHostRequirements, planIPv4Vlsm, vlsmCsv } from '../lib/network-planner';

export default function NetworkVlsmPlanner() {
  const [network, setNetwork] = useState('192.168.10.0/24');
  const [hosts, setHosts] = useState('80, 35, 12');
  const [notice, setNotice] = useState('');
  const requirements = parseHostRequirements(hosts);
  const plan = useMemo(() => requirements ? planIPv4Vlsm(network, requirements) :
    { ok: false as const, error: 'Enter 1–8 comma-separated host counts between 1 and 65,534.' }, [network, requirements?.join(',')]);

  function downloadCsv() {
    if (!plan.ok) return;
    const blob = new Blob([vlsmCsv(plan)], { type: 'text/csv;charset=utf-8' });
    let url: string | undefined;
    try {
      url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'luqi-network-vlsm.csv'; anchor.click();
      setNotice('VLSM plan downloaded locally. Review with your network administrator before use.');
    } catch {
      setNotice('This browser could not download the plan. Your calculations remain on this page.');
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }
  }
  return <section aria-label="Luqi VLSM network planner" className="min-w-0 rounded-2xl border border-emerald-700 bg-slate-900 p-4 sm:p-6 space-y-4">
    <div>
      <h2 className="text-xl font-semibold text-white">Luqi Network Intelligence · VLSM Planner</h2>
      <p className="mt-2 text-sm text-slate-300">Allocate LANs with largest-first binary alignment and calculate actual IPv4 network ranges. Everything runs in your browser, without AI requests or router changes.</p>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label htmlFor="vlsm-base" className="block text-sm text-slate-200">Parent network (CIDR)
        <input id="vlsm-base" maxLength={19} value={network} onChange={e => { setNetwork(e.target.value); setNotice(''); }}
          className="mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 font-mono text-white" spellCheck={false}/>
      </label>
      <label htmlFor="vlsm-requirements" className="block text-sm text-slate-200">Hosts needed per LAN (comma-separated)
        <input id="vlsm-requirements" maxLength={90} value={hosts} onChange={e => { setHosts(e.target.value); setNotice(''); }}
          className="mt-2 w-full min-w-0 rounded-lg border border-slate-500 bg-slate-950 px-3 py-3 font-mono text-white" spellCheck={false}/>
      </label>
    </div>
    {!plan.ok ? <p role="status" className="rounded-lg border border-amber-600 p-3 text-sm text-amber-200">{plan.error}</p> :
      <>
        <p role="status" className="text-sm text-emerald-200">Plan fits within {plan.baseCidr}. {plan.unallocatedAddresses.toLocaleString()} addresses remain unallocated.
          {plan.normalizedBase && ' The entered host address was normalized to its parent network.'}</p>
        <div className="max-w-full overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full min-w-[690px] text-left text-sm">
            <thead className="bg-slate-800 text-slate-100"><tr>
              {['LAN','Hosts needed','Assigned network','First usable','Last usable','Broadcast','Spare'].map(label => <th key={label} scope="col" className="p-3">{label}</th>)}
            </tr></thead>
            <tbody>{plan.allocations.map(a => <tr key={a.label} className="border-t border-slate-700 text-slate-200">
              <th scope="row" className="p-3">{a.label}</th><td className="p-3">{a.hostsRequested}</td>
              <td className="p-3 font-mono">{a.cidr}</td><td className="p-3 font-mono">{a.firstHost}</td>
              <td className="p-3 font-mono">{a.lastHost}</td><td className="p-3 font-mono">{a.broadcast}</td>
              <td className="p-3">{a.spareHosts}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <button type="button" onClick={downloadCsv} className="min-h-11 rounded-lg border border-emerald-500 bg-emerald-800 px-4 py-3 text-white hover:bg-emerald-700">Download VLSM plan (CSV)</button>
      </>}
    <p role="status" aria-live="polite" className="text-xs text-slate-300">{notice || 'LAN calculations reserve network and broadcast addresses. For /31 links or /32 host routes, use the CIDR calculator above. No router is configured.'}</p>
  </section>;
}
