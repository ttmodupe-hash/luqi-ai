/**
 * LUQI AI — Opportunities
 * ========================
 * Grants, funding, tenders, and business opportunities in SA.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { Star, Filter, TrendingUp, Calendar, MapPin } from "lucide-react";

const OPPORTUNITIES = [
  { id: 1, title: "DTIC Black Industrialists Scheme", type: "Grant", amount: "R10M – R50M", deadline: "Rolling", province: "National", category: "Business" },
  { id: 2, title: "SEFA Debt Finance", type: "Loan", amount: "R250K – R25M", deadline: "Rolling", province: "National", category: "Business" },
  { id: 3, title: "NYDA Grant Programme", type: "Grant", amount: "Up to R200K", deadline: "2026-09-30", province: "National", category: "Youth" },
  { id: 4, title: "IDC Funding for Green Energy", type: "Funding", amount: "R1M – R1B", deadline: "Rolling", province: "National", category: "Green" },
  { id: 5, title: "Small Enterprise Finance Agency", type: "Loan", amount: "Up to R5M", deadline: "Rolling", province: "National", category: "SME" },
  { id: 6, title: "Department of Agriculture Bursary", type: "Bursary", amount: "Full tuition", deadline: "2026-08-15", province: "National", category: "Agriculture" },
  { id: 7, title: "Gauteng Township Economy Fund", type: "Grant", amount: "Up to R500K", deadline: "2026-10-31", province: "Gauteng", category: "Business" },
  { id: 8, title: "Western Cape Innovation Fund", type: "Grant", amount: "R100K – R2M", deadline: "2026-08-31", province: "Western Cape", category: "Tech" },
];

const FILTERS = ["All", "Grant", "Loan", "Bursary", "Funding"];

export default function OpportunityPage() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = OPPORTUNITIES.filter((o) => {
    const matchFilter = activeFilter === "All" || o.type === activeFilter;
    const matchSearch =
      !search ||
      o.title.toLowerCase().includes(search.toLowerCase()) ||
      o.category.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Star size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Opportunities</h1>
            <p className="text-sm text-neutral-400">Grants, funding, and tenders in South Africa</p>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search opportunities..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
        />

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeFilter === f
                  ? "bg-cyan-500 text-black"
                  : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Opportunities */}
        <div className="space-y-3">
          {filtered.map((o) => (
            <div
              key={o.id}
              className="p-4 rounded-xl bg-card border border-border hover:border-cyan-500/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs text-cyan-500 font-medium">{o.type}</span>
                  <h3 className="font-medium mt-1">{o.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><TrendingUp size={12} /> {o.amount}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> {o.deadline}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {o.province}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <Filter size={32} className="mx-auto mb-3" />
            <p>No opportunities match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}