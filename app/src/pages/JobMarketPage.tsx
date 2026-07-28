/**
 * LUQI AI — Job Market
 * ====================
 * Job search, CV builder, interview prep, and salary info for SA.
 */

import { useState } from "react";
import { Briefcase, Search, TrendingUp, MapPin, DollarSign, Loader2 } from "lucide-react";

const JOB_CATEGORIES = [
  { id: "tech", name: "Technology", count: 12450, growth: "+18%" },
  { id: "finance", name: "Finance", count: 8320, growth: "+12%" },
  { id: "health", name: "Healthcare", count: 9870, growth: "+15%" },
  { id: "education", name: "Education", count: 6540, growth: "+8%" },
  { id: "construction", name: "Construction", count: 7890, growth: "+10%" },
  { id: "mining", name: "Mining", count: 4230, growth: "+5%" },
  { id: "retail", name: "Retail", count: 11200, growth: "+6%" },
  { id: "government", name: "Government", count: 15600, growth: "+4%" },
];

const TRENDING_SKILLS = [
  "Python Programming", "Data Analysis", "Cloud Computing (AWS/Azure)",
  "Cybersecurity", "Project Management", "Digital Marketing",
  "Financial Analysis", "Nursing (Critical Care)", "Renewable Energy",
];

const SALARY_RANGES: Record<string, { min: number; max: number }> = {
  "Software Developer": { min: 250000, max: 850000 },
  "Data Analyst": { min: 220000, max: 650000 },
  "Nurse": { min: 180000, max: 450000 },
  "Accountant": { min: 200000, max: 700000 },
  "Project Manager": { min: 350000, max: 950000 },
  "Teacher": { min: 150000, max: 380000 },
  "Electrician": { min: 120000, max: 350000 },
};

export default function JobMarketPage() {
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    if (!search.trim()) return;
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  const formatSalary = (amount: number) =>
    "R" + amount.toLocaleString("en-ZA");

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Briefcase size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Job Market</h1>
            <p className="text-sm text-neutral-400">Opportunities and insights for South Africa</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search job titles, skills, or companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-3 rounded-xl bg-cyan-500 text-black font-medium hover:bg-cyan-400 transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : "Search"}
          </button>
        </div>

        {/* Categories */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {JOB_CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="p-3 rounded-xl bg-card border border-border hover:border-cyan-500/30 transition-colors"
            >
              <p className="font-medium text-sm">{cat.name}</p>
              <p className="text-xs text-neutral-400 mt-1">{cat.count.toLocaleString()} jobs</p>
              <p className="text-xs text-green-500 mt-0.5">{cat.growth} this year</p>
            </div>
          ))}
        </div>

        {/* Trending Skills */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-cyan-500" />
            Trending Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {TRENDING_SKILLS.map((skill) => (
              <button
                key={skill}
                onClick={() => { setSearch(skill); handleSearch(); }}
                className="px-3 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-sm text-neutral-300 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors"
              >
                {skill}
              </button>
            ))}
          </div>
        </div>

        {/* Salary Ranges */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <DollarSign size={18} className="text-cyan-500" />
            Salary Ranges (Annual, ZAR)
          </h2>
          <div className="space-y-2">
            {Object.entries(SALARY_RANGES).map(([job, range]) => (
              <button
                key={job}
                onClick={() => setSelectedJob(selectedJob === job ? null : job)}
                className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-cyan-500/30 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{job}</span>
                  <span className="text-sm text-cyan-400">
                    {formatSalary(range.min)} – {formatSalary(range.max)}
                  </span>
                </div>
                {selectedJob === job && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-neutral-400">
                      Entry-level typically starts at {formatSalary(range.min)}. Senior roles can exceed {formatSalary(range.max)}. Location (Gauteng vs other provinces) significantly impacts salary.
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
