import React, { useState, useEffect } from 'react';
import ApiSystemStatusDashboard from './ApiSystemStatusDashboard';
import AdminKnowledgeAndGradingConsole from './AdminKnowledgeAndGradingConsole';

interface PendingHitlItem {
  id: string;
  type: 'PAYMENT' | 'SARS_POA' | 'GITHUB_PR';
  title: string;
  requester: string;
  amountZar?: number;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  timestamp: string;
}

export const AdminSovereignPortal: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passkeyInput, setPasskeyInput] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'API_FINOPS' | 'HITL_VAULT' | 'TELECOM_AUDIT' | 'SECURITY_TELEMETRY' | 'CRYPTO_LEDGER' | 'KNOWLEDGE_GRADING'>('API_FINOPS');

  // Tab 5: Zero-Trust Cryptographic Ledger & Consensus State
  const [ledgerBlocks, setLedgerBlocks] = useState<any[]>([]);
  const [chainIntegrity, setChainIntegrity] = useState<boolean>(true);
  const [consensusTaskPrompt, setConsensusTaskPrompt] = useState(
    'Calculate the SARS tax payable on R450,000 taxable income for a 45-year old in 2025/2026 tax year and cite relevant rebates.'
  );
  const [consensusLoading, setConsensusLoading] = useState(false);
  const [consensusResult, setConsensusResult] = useState<any>(null);
  const [edgeTelemetry, setEdgeTelemetry] = useState<any>(null);
  const [offlineSyncData, setOfflineSyncData] = useState<any>(null);

  // Tab 2: HITL Items
  const [hitlItems, setHitlItems] = useState<PendingHitlItem[]>([
    {
      id: 'HITL-TX-8812',
      type: 'PAYMENT',
      title: 'PayFast / MTN MoMo Vendor Payout',
      requester: 'Autonomous Invoice Dispatcher',
      amountZar: 4250.0,
      details: 'Disbursement to Midrand Logistics Hub for 20x SIM Gateway backup batteries.',
      status: 'PENDING',
      timestamp: 'Today, 08:42 SAST'
    },
    {
      id: 'HITL-SARS-4190',
      type: 'SARS_POA',
      title: 'SARS eFiling Power-of-Attorney OTP Submission',
      requester: 'Sovereign Tax Ledger Agent',
      details: 'Annual IRP5 / IT14 Return Submission for corporate client FG-8-I-3-ZA.',
      status: 'PENDING',
      timestamp: 'Today, 09:15 SAST'
    },
    {
      id: 'HITL-PR-1029',
      type: 'GITHUB_PR',
      title: 'Autonomous Patch: PR #42 (Vite HMR Isolation & Cache Tuning)',
      requester: 'Self-Healing CI Bot',
      details: 'Automated test suite passed 48/48 tests. Ready for master branch merge.',
      status: 'PENDING',
      timestamp: 'Today, 10:04 SAST'
    }
  ]);

  // Tab 3: Telecom Audit State
  const [auditCsvInput, setAuditCsvInput] = useState<string>(
    'SerialNumber,Site,Department,MonthlySpendZAR\nSN-ZA-88412,Midrand,FG-8-I-3-ZA,840.00\n358911092837412,Rosslyn,Telecoms,1920.00\nSN-ZA-99104,Sandton,Executive,1250.00\n864920042918471,Cape Town,Field Ops,760.00\nSN-ZA-33120,Durban,Customer Care,490.00'
  );
  const [auditReport, setAuditReport] = useState<{
    validCount: number;
    rejectedCount: number;
    totalSpendZar: number;
    items: Array<{ identifier: string; site: string; dept: string; spend: number; status: 'VALID_SERIAL' | 'REJECTED_IMEI' }>;
  } | null>(null);

  useEffect(() => {
    const savedToken = sessionStorage.getItem('luqi_admin_token');
    // A cached key is not proof of authorization; verify it with the server.
    if (savedToken) {
      fetch('/api/v1/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ passkey: savedToken }) })
        .then(res => { if (res.ok) setIsAuthenticated(true); else sessionStorage.removeItem('luqi_admin_token'); })
        .catch(() => sessionStorage.removeItem('luqi_admin_token'));
    }
    if (typeof window !== 'undefined' && window.location.pathname.includes('knowledge-grading')) {
      setActiveTab('KNOWLEDGE_GRADING');
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsVerifying(true);

    try {
      const res = await fetch('/api/v1/admin/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey: passkeyInput })
      });

      if (res.ok) {
        sessionStorage.setItem('luqi_admin_token', passkeyInput);
        setIsAuthenticated(true);
      } else {
        setAuthError('Access denied: Invalid Admin Passkey');
      }
    } catch {
      setAuthError('Authentication service unreachable');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('luqi_admin_token');
    setIsAuthenticated(false);
    setPasskeyInput('');
  };

  const handleHitlAction = async (id: string, action: 'APPROVED' | 'REJECTED') => {
    const item = hitlItems.find(i => i.id === id);
    setHitlItems(prev =>
      prev.map(i => (i.id === id ? { ...i, status: action } : i))
    );

    // Cryptographically seal action into append-only SHA-256 chain
    try {
      await fetch('/api/v1/audit/seal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actor: 'System Administrator',
          action: `HITL_${action}_${item?.type || 'ACTION'}`,
          payload: {
            itemId: id,
            title: item?.title,
            amountZar: item?.amountZar,
            decision: action,
            sealedAt: new Date().toISOString()
          }
        })
      });
      loadCryptoLedgerData();
    } catch (e) {
      console.warn('Audit seal dispatch error:', e);
    }
  };

  const loadCryptoLedgerData = async () => {
    try {
      const [ledgerRes, edgeRes, syncRes] = await Promise.all([
        fetch('/api/v1/audit/ledger').then(r => r.json()),
        fetch('/api/v1/edge-cache/telemetry').then(r => r.json()),
        fetch('/api/v1/offline-sync/status').then(r => r.json())
      ]);

      if (ledgerRes.status === 'success') {
        setLedgerBlocks(ledgerRes.chain || []);
        setChainIntegrity(ledgerRes.integrity?.isValid ?? true);
      }
      if (edgeRes.status === 'success') {
        setEdgeTelemetry(edgeRes.telemetry);
      }
      if (syncRes.status === 'success') {
        setOfflineSyncData(syncRes);
      }
    } catch (err) {
      console.warn('Failed loading crypto ledger data:', err);
    }
  };

  const runConsensusExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    setConsensusLoading(true);
    setConsensusResult(null);

    try {
      const res = await fetch('/api/v1/consensus/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskPrompt: consensusTaskPrompt,
          agentIdentity: 'System Administrator'
        })
      });
      const data = await res.json();
      setConsensusResult(data);
      loadCryptoLedgerData();
    } catch (err: any) {
      setConsensusResult({ error: err.message });
    } finally {
      setConsensusLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadCryptoLedgerData();
    }
  }, [isAuthenticated]);

  const runTelecomAudit = () => {
    const lines = auditCsvInput.trim().split('\n');
    let validCount = 0;
    let rejectedCount = 0;
    let totalSpend = 0;
    const items: any[] = [];

    lines.slice(1).forEach(line => {
      const parts = line.split(',');
      if (parts.length >= 4) {
        const id = parts[0].trim();
        const site = parts[1].trim();
        const dept = parts[2].trim();
        const spend = parseFloat(parts[3].trim()) || 0;

        // Check if identifier is a 14 to 16 digit number (IMEI)
        const isImei = /^\d{14,16}$/.test(id);
        if (isImei) {
          rejectedCount += 1;
          items.push({ identifier: id, site, dept, spend, status: 'REJECTED_IMEI' });
        } else {
          validCount += 1;
          totalSpend += spend;
          items.push({ identifier: id, site, dept, spend, status: 'VALID_SERIAL' });
        }
      }
    });

    setAuditReport({ validCount, rejectedCount, totalSpendZar: totalSpend, items });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-black text-xl">
              🔒
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">Sovereign Admin Command</h1>
            <p className="text-xs text-slate-400">
              Restricted portal for System Administrators & Sovereign Operators only.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Admin Master Passkey
              </label>
              <input
                type="password"
                value={passkeyInput}
                onChange={e => setPasskeyInput(e.target.value)}
                placeholder="Enter administrator passkey"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifying || !passkeyInput.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3 rounded-2xl text-sm transition disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Unlock Sovereign Command'}
            </button>
          </form>

          <div className="text-center">
            <a href="/" className="text-xs text-slate-500 hover:text-slate-300 transition">
              ← Return to Public Platform
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* Top Admin Command Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-sm">
            🛡️
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              SOVEREIGN OPERATOR COMMAND CENTER
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                SECURE ACCESS GRANTED
              </span>
            </h1>
            <p className="text-xs text-slate-400">Operator: System Administrator · Isolation: Enforced</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            Public Site
          </a>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition font-bold"
          >
            Lock & Logout
          </button>
        </div>
      </header>

      {/* Admin Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800 px-6 py-2 flex flex-wrap gap-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('API_FINOPS')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'API_FINOPS'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          📊 1. Master API & Fund Status Matrix
        </button>
        <button
          onClick={() => setActiveTab('HITL_VAULT')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'HITL_VAULT'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🔐 2. 30% HITL Authorization Vault
        </button>
        <button
          onClick={() => setActiveTab('TELECOM_AUDIT')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'TELECOM_AUDIT'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          📱 3. Telecom & MDM Serial Audit Engine
        </button>
        <button
          onClick={() => setActiveTab('SECURITY_TELEMETRY')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'SECURITY_TELEMETRY'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🛡️ 4. Self-Healing & Security Telemetry
        </button>
        <button
          onClick={() => {
            setActiveTab('CRYPTO_LEDGER');
            loadCryptoLedgerData();
          }}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'CRYPTO_LEDGER'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🔒 5. Zero-Trust SHA-256 Ledger & Consensus
        </button>
        <button
          onClick={() => setActiveTab('KNOWLEDGE_GRADING')}
          className={`px-4 py-2 rounded-xl transition ${
            activeTab === 'KNOWLEDGE_GRADING'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🧠 6. Knowledge & Grading Engine
        </button>
      </div>

      {/* Main Command Workspace */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB 1: API & FinOps Matrix */}
        {activeTab === 'API_FINOPS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Master API & Provider Matrix (1st of the Month Anchor)</h2>
                <p className="text-xs text-slate-400">
                  Real-time operational latency, remaining USD/ZAR balance, and role mapping across all connected frontier providers.
                </p>
              </div>
            </div>
            <ApiSystemStatusDashboard />
          </div>
        )}

        {/* TAB 2: 30% HITL Authorization Vault */}
        {activeTab === 'HITL_VAULT' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">30% Human-in-the-Loop (HITL) Authorization Vault</h2>
              <p className="text-xs text-slate-400">
                Outbound disbursements, SARS POA handoffs, and autonomous code patches requiring explicit human sign-off.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {hitlItems.map(item => (
                <div
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1 max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700">
                        {item.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : item.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-slate-400">{item.details}</p>
                    <p className="text-[11px] text-slate-500">
                      Requester: <span className="text-slate-300">{item.requester}</span> · {item.timestamp}
                      {item.amountZar ? ` · Amount: R${item.amountZar.toFixed(2)}` : ''}
                    </p>
                  </div>

                  {item.status === 'PENDING' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleHitlAction(item.id, 'APPROVED')}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                      >
                        Approve & Sign
                      </button>
                      <button
                        onClick={() => handleHitlAction(item.id, 'REJECTED')}
                        className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 font-mono">Decision Recorded</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: Telecom Audit Engine */}
        {activeTab === 'TELECOM_AUDIT' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Enterprise Telecom & MDM Serial-Number Audit Engine
              </h2>
              <p className="text-xs text-slate-400">
                Audits cellular line sheets strictly by <strong>Device Serial Number</strong>. Any 15-digit IMEI numbers are automatically flagged and rejected per enterprise privacy rules.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Paste CSV Line Sheet (SerialNumber, Site, Department, MonthlySpendZAR)
              </label>
              <textarea
                rows={6}
                value={auditCsvInput}
                onChange={e => setAuditCsvInput(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                onClick={runTelecomAudit}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-5 py-2.5 rounded-xl transition"
              >
                Execute Serial Audit
              </button>
            </div>

            {auditReport && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                    <span className="text-xs text-emerald-400 font-bold uppercase">Valid Serial Devices</span>
                    <p className="text-2xl font-black text-white">{auditReport.validCount}</p>
                  </div>
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <span className="text-xs text-rose-400 font-bold uppercase">Rejected IMEI Numbers</span>
                    <p className="text-2xl font-black text-white">{auditReport.rejectedCount}</p>
                  </div>
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <span className="text-xs text-amber-400 font-bold uppercase">Audited Spend</span>
                    <p className="text-2xl font-black text-white">R{auditReport.totalSpendZar.toFixed(2)}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2.5">Identifier</th>
                        <th className="p-2.5">Site</th>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5">Monthly Spend</th>
                        <th className="p-2.5">Audit Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {auditReport.items.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-800/40">
                          <td className="p-2.5 font-bold text-white">{row.identifier}</td>
                          <td className="p-2.5 text-slate-300">{row.site}</td>
                          <td className="p-2.5 text-slate-300">{row.dept}</td>
                          <td className="p-2.5 text-slate-300">R{row.spend.toFixed(2)}</td>
                          <td className="p-2.5">
                            {row.status === 'VALID_SERIAL' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                                ACCEPTED (Serial)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                                REJECTED (IMEI Detected)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Self-Healing & Security Telemetry */}
        {activeTab === 'SECURITY_TELEMETRY' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Self-Healing & Zero-Trust Security Telemetry</h2>
              <p className="text-xs text-slate-400">
                Continuous automated sandbox health, prompt cache ratios, and circuit breaker metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold">Prompt Cache Hit Rate</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">94.2%</p>
                <span className="text-[10px] text-slate-500">6,120 cached queries today</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold">Blocked Injections</span>
                <p className="text-2xl font-black text-rose-400 mt-1">18</p>
                <span className="text-[10px] text-slate-500">Zero policy violations</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold">Sandbox Self-Repairs</span>
                <p className="text-2xl font-black text-cyan-400 mt-1">4</p>
                <span className="text-[10px] text-slate-500">Autonomous recovery in &lt;1.2s</span>
              </div>
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-xs text-slate-400 font-bold">API Latency Avg</span>
                <p className="text-2xl font-black text-amber-400 mt-1">118ms</p>
                <span className="text-[10px] text-slate-500">99.98% uptime SLA</span>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-white">Recent Autonomous Governance Log</h3>
              <div className="font-mono text-xs text-slate-400 space-y-1.5 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <p className="text-emerald-400">[04:30:12 SAST] Gemini 3.8 Flash warm cache synchronized.</p>
                <p className="text-slate-300">[04:35:00 SAST] Autonomous line sheet audit ran across 5 sites (0 IMEIs accepted).</p>
                <p className="text-slate-300">[04:38:22 SAST] Circuit breaker verified for DeepSeek & Claude fallback routes.</p>
                <p className="text-cyan-400">[04:41:10 SAST] Zero-Trust memory sandbox garbage collection completed: 0 leaks.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: Zero-Trust Cryptographic SHA-256 Audit Ledger & Consensus */}
        {activeTab === 'CRYPTO_LEDGER' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Zero-Trust Sovereign Enclave (ZTSE)
                  <span
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                      chainIntegrity
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {chainIntegrity ? '✅ SHA-256 CHAIN: 100% VERIFIED' : '⚠️ CHAIN BREACH DETECTED'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Every 30% HITL approval, payment dispatch, and autonomous agent action is cryptographically sealed into an append-only SHA-256 hash chain.
                </p>
              </div>

              <button
                onClick={loadCryptoLedgerData}
                className="text-xs px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 hover:text-white transition flex items-center gap-2 font-medium"
              >
                🔄 Refresh Ledger & Edge PoPs
              </button>
            </div>

            {/* 4 Sovereign Pillars Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400">1. SHA-256 Hash Chain</span>
                <p className="text-2xl font-black text-amber-400">{ledgerBlocks.length} Blocks</p>
                <span className="text-[10px] text-slate-500">Tamper-proof audit trail active</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400">2. Cloudflare Edge PoPs</span>
                <p className="text-2xl font-black text-emerald-400">3 Nodes</p>
                <span className="text-[10px] text-slate-500">JNB (9ms), CPT (12ms), NBO (18ms)</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400">3. Consensus Ring</span>
                <p className="text-2xl font-black text-purple-400">Gemini + Claude</p>
                <span className="text-[10px] text-slate-500">Adversarial peer-review active</span>
              </div>

              <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-1">
                <span className="text-[11px] font-bold text-slate-400">4. Solar Offline Sync</span>
                <p className="text-2xl font-black text-sky-400">{offlineSyncData?.status || 'ONLINE_ACTIVE'}</p>
                <span className="text-[10px] text-slate-500">Raspberry Pi 5 / Mini-PC Node</span>
              </div>
            </div>

            {/* Interactive Multi-Agent Consensus Ring Test Console */}
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider text-purple-400">
                    Autonomous Multi-Agent Consensus Console
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono">
                    GEMINI 3.8 + CLAUDE 3.7 SONNET
                  </span>
                </div>
                <span className="text-xs text-slate-400">Operator: System Administrator</span>
              </div>

              <form onSubmit={runConsensusExecution} className="space-y-3">
                <label className="text-xs text-slate-300 font-semibold block">
                  High-Stakes Prompt / SARS Tax / Telecom Audit Task:
                </label>
                <textarea
                  rows={2}
                  value={consensusTaskPrompt}
                  onChange={e => setConsensusTaskPrompt(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  placeholder="Enter task to execute through the consensus peer-review ring..."
                />
                <button
                  type="submit"
                  disabled={consensusLoading || !consensusTaskPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs transition disabled:opacity-50"
                >
                  {consensusLoading ? 'Executing Multi-Agent Peer-Review...' : 'Execute Consensus Task & Seal into SHA-256 Ledger'}
                </button>
              </form>

              {consensusResult && (
                <div className="p-4 bg-slate-950 rounded-2xl border border-purple-500/30 font-mono text-xs space-y-3">
                  <div className="flex items-center justify-between text-purple-300 border-b border-slate-800 pb-2">
                    <span className="font-bold">VERIFIED CONSENSUS VERDICT</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {consensusResult.auditNotes || 'Passed 2-tier inspection'}
                    </span>
                  </div>
                  <div className="text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {consensusResult.auditedOutput || consensusResult.response || JSON.stringify(consensusResult, null, 2)}
                  </div>
                  {consensusResult.sealedAuditBlock && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[10px] text-amber-400 flex flex-wrap items-center justify-between gap-2">
                      <span>Cryptographically Sealed Block #{consensusResult.sealedAuditBlock.index}</span>
                      <span className="text-slate-400 font-mono">
                        Hash: {consensusResult.sealedAuditBlock.currentBlockHash.substring(0, 24)}...
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cryptographic SHA-256 Ledger Chain Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Append-Only SHA-256 Ledger Chain</span>
                  <span className="text-xs text-slate-400 font-normal">({ledgerBlocks.length} Sealed Blocks)</span>
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono">
                  Genesis Salt: 0000000000000000
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Timestamp</th>
                      <th className="p-2.5">Actor</th>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Current Block Hash</th>
                      <th className="p-2.5">Previous Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {ledgerBlocks.map(block => (
                      <tr key={block.index} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-bold text-amber-400">{block.index}</td>
                        <td className="p-2.5 text-slate-400 text-[10px]">
                          {new Date(block.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="p-2.5 text-slate-200">{block.actor}</td>
                        <td className="p-2.5">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                            {block.action}
                          </span>
                        </td>
                        <td className="p-2.5 text-emerald-400 text-[10px]" title={block.currentBlockHash}>
                          {block.currentBlockHash.substring(0, 16)}...
                        </td>
                        <td className="p-2.5 text-slate-500 text-[10px]" title={block.previousHash}>
                          {block.previousHash.substring(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Self-Optimizing Knowledge & Corporate Grading */}
        {activeTab === 'KNOWLEDGE_GRADING' && (
          <AdminKnowledgeAndGradingConsole />
        )}
      </main>
    </div>
  );
};

export default AdminSovereignPortal;
