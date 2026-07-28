/**
 * LUQI AI — Educational Companion
 * ================================
 * Study helper, course finder, and learning resources for SA students.
 */

import { useState } from "react";
import { useNavigate } from "react-router";
import { GraduationCap, BookOpen, Search, ArrowRight, Star, Lightbulb } from "lucide-react";

const RESOURCES = [
  { id: "nsfas", title: "NSFAS Funding Guide", category: "Funding", description: "Step-by-step guide to applying for NSFAS funding.", icon: "🎓" },
  { id: "bursaries", title: "SA Bursary Database", category: "Funding", description: "Comprehensive list of bursaries available to SA students.", icon: "💰" },
  { id: "matric", title: "Matric Revision", category: "Study", description: "Past papers and revision notes for Matric subjects.", icon: "📝" },
  { id: "universities", title: "University Applications", category: "Admissions", description: "Application deadlines and requirements for SA universities.", icon: "🏛️" },
  { id: "tvet", title: "TVET Colleges", category: "Admissions", description: "Vocational training courses and application info.", icon: "🔧" },
  { id: "online", title: "Free Online Courses", category: "Learning", description: "Curated free courses from Coursera, edX, and more.", icon: "💻" },
];

const TIPS = [
  "Create a study schedule and stick to it — consistency beats intensity.",
  "Use the Pomodoro technique: 25 minutes study, 5 minutes break.",
  "Form study groups with classmates to test each other.",
  "Apply for bursaries early — many deadlines are in August-October.",
  "Use past exam papers to practice under timed conditions.",
];

export default function EducationalCompanionPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTip, setActiveTip] = useState(0);

  const filtered = RESOURCES.filter(
    (r) =>
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <GraduationCap size={22} className="text-cyan-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Educational Companion</h1>
            <p className="text-sm text-neutral-400">Your study partner for South African education</p>
          </div>
        </div>

        {/* Tip of the Day */}
        <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-xl p-4 flex items-start gap-3">
          <Lightbulb size={18} className="text-cyan-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-neutral-300">{TIPS[activeTip]}</p>
            <button
              onClick={() => setActiveTip((activeTip + 1) % TIPS.length)}
              className="text-xs text-cyan-500 hover:text-cyan-400 mt-1"
            >
              Next tip →
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-neutral-800 border border-neutral-700 text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((resource) => (
            <button
              key={resource.id}
              onClick={() => navigate(`/education`)}
              className="text-left p-4 rounded-xl bg-card border border-border hover:border-cyan-500/30 transition-colors group"
            >
              <div className="text-2xl mb-2">{resource.icon}</div>
              <span className="text-xs text-cyan-500 font-medium">{resource.category}</span>
              <h3 className="font-semibold text-sm mt-1 group-hover:text-cyan-400 transition-colors">
                {resource.title}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">{resource.description}</p>
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-neutral-500">
            <BookOpen size={32} className="mx-auto mb-3" />
            <p>No resources match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}
