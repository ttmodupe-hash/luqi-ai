/**
 * LUQI AI — Tenders
 * =================
 * Government and private sector tenders in South Africa.
 */

import { useState } from "react";
import { FileText, Search, Calendar, MapPin, Building2, ExternalLink } from "lucide-react";

const TENDERS = [
  { id: 1, title: "Supply of ICT Equipment — Department of Education", department: "Dept of Basic Education", value: "R12.5M", closing: "2026-08-15", province: "National", category: "ICT" },
  { id: 2, title: "Road Maintenance — N2 Highway Section", department: "SANRAL", value: "R85M", closing: "2026-09-01", province: "KZN", category: "Construction" },
  { id: 3, title: "Medical Supplies for Public Hospitals", department: "Dept of Health", value: "R45M", closing: "2026-08-30", province: "National", category: "Health" },
  { id: 4, title: "Solar Installation for Government Buildings", department: "Dept of Energy", value: "R28M", closing: "2026-09-15", province: "Gauteng", category: "Energy" },
  { id: 5, title: "School Nutrition Programme Catering", department: "Dept of Education", value: "R8.2M", closing: "2026-08-20", province: "Western Cape", category: "Catering" },
  { id: 6, title: "Security Services for SARS Offices", department: "SARS", value: "R15M", closing: "2026-09-10", province: "National", category: "Security" },
];

const CATEGORIES = ["All", "ICT", "Construction", "Health", "Energy", "Catering", "Security"];

export default function TenderPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = TENDERS.filter((t) => {
    const matchCat = activeCategory === "All" || t.category === activeCategory;
    const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <FileText size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Government Tenders</h1>
            <p className="text-sm text-neutral-400">Find and apply for public sector tenders in SA</p>
          </div>
        </div>

        {/* How to Apply */}
        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4">
          <h3 className="font-medium text-sm mb-2">How to Apply for Tenders</h3>
          <ol className="text-xs text-neutral-400 space-y-1 list-decimal list-inside">
            <li>Register on the Central Supplier Database (CSD) at csdr.gov.za</li>
            <li>Get your tax compliance status from SARS eFiling</li>
            <li>Prepare your B-BBEE certificate</li>
            <li>Submit your bid before the closing date and time</li>
          </ol>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search tenders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
        />

        {/* Categories */}
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === c ? "bg-cyan-500 text-black" : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Tender List */}
        <div className="space-y-3">
          {filtered.map((t) => (
            <div key={t.id} className="p-4 rounded-xl bg-card border border-border hover:border-cyan-500/30 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded">{t.category}</span>
                    <span className="text-xs text-neutral-500">{t.value}</span>
                  </div>
                  <h3 className="font-medium text-sm mt-2">{t.title}</h3>
                  <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><Building2 size={12} /> {t.department}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Closes: {t.closing}</span>
                    <span className="flex items-center gap-1"><MapPin size={12} /> {t.province}</span>
                  </div>
                </div>
                <button
                  onClick={() => window.open("https://etenders.treasury.gov.za", "_blank")}
                  className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
