import React from 'react';

// Show no monetary amount until an authenticated, reconciled billing source
// exists. An unavailable backend must never become a demo total or a zero bill.
export const ApiMonitorDashboard: React.FC = () => (
  <section className="p-6 max-w-4xl mx-auto bg-slate-950 border border-slate-900 rounded-3xl text-slate-100 shadow-2xl"
    aria-labelledby="billing-dashboard-title">
    <h2 id="billing-dashboard-title" className="text-lg font-bold text-white">
      Provider billing
    </h2>
    <div className="mt-5 p-6 bg-slate-900 border border-slate-800 rounded-2xl" role="status">
      <p className="text-lg font-semibold text-amber-300">Actual spending unavailable</p>
      <p className="mt-2 text-sm text-slate-400">
        Verified provider billing data is not connected. There is no confirmed
        spending total or invoice schedule to display.
      </p>
      <p className="mt-3 text-xs text-slate-500">
        AI budget allocations and reserved usage do not represent provider charges.
      </p>
    </div>
  </section>
);
