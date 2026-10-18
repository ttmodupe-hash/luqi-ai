// =====================================================================
// GLOBAL COMMAND PALETTE — LUQI AI 48 OPERATIONAL PAGES & ENGINES
// Instant modal navigation, keyboard-first Cmd+K / Ctrl+K & deep routing
// =====================================================================

import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router";
import { Search, X, CornerDownLeft, ChevronRight, HelpCircle } from "lucide-react";
import { ALL_48_OPERATIONAL_PAGES, type OperationalPage } from "./commandPaletteData";

const CATEGORIES = [
  "All (48)",
  "CertMaster",
  "STEM Labs",
  "African Radar",
  "Video & Voice",
  "Total Archive",
  "Self-Healing",
  "Credits & Pricing",
  "Support & Legal",
] as const;

interface GlobalCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalCommandPalette({ isOpen, onClose }: GlobalCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All (48)");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load recent IDs
  useEffect(() => {
    try {
      const stored = localStorage.getItem("luqi_recent_pages");
      if (stored) {
        setRecentIds(JSON.parse(stored));
      }
    } catch {
      // non-fatal
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHighlightedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filtered pages
  const filteredPages = useMemo(() => {
    const q = query.trim().toLowerCase();

    return ALL_48_OPERATIONAL_PAGES.filter((page) => {
      // Category filter
      if (selectedCategory !== "All (48)" && page.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;

      // Match query
      const matchTitle = page.title.toLowerCase().includes(q);
      const matchDesc = page.description.toLowerCase().includes(q);
      const matchBadge = page.badge.toLowerCase().includes(q);
      const matchCat = page.category.toLowerCase().includes(q);
      const matchPath = page.path.toLowerCase().includes(q);
      const matchKeywords = page.keywords.some((k) => k.toLowerCase().includes(q));

      return matchTitle || matchDesc || matchBadge || matchCat || matchPath || matchKeywords;
    });
  }, [query, selectedCategory]);

  // Reset highlight when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredPages.length, selectedCategory, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("[data-command-item]");
    const activeItem = items[highlightedIndex];
    if (activeItem) {
      activeItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightedIndex]);

  // Execute navigation
  const handleSelect = (page: OperationalPage) => {
    // Save to recents
    try {
      const updated = [page.id, ...recentIds.filter((id) => id !== page.id)].slice(0, 8);
      localStorage.setItem("luqi_recent_pages", JSON.stringify(updated));
      setRecentIds(updated);
    } catch {
      // non-fatal
    }

    onClose();

    // Custom tab event for current page tab switching without full reload
    if (page.tabKey && page.tabValue) {
      window.dispatchEvent(
        new CustomEvent("luqi:navigate-tab", {
          detail: { tabKey: page.tabKey, tabValue: page.tabValue, path: page.path },
        })
      );
    }

    navigate(page.path);
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredPages.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filteredPages.length) % Math.max(1, filteredPages.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredPages[highlightedIndex]) {
        handleSelect(filteredPages[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-3 sm:px-4 bg-slate-950/80 backdrop-blur-md transition-all animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/80 flex flex-col overflow-hidden text-slate-100 ring-1 ring-white/10"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center border-b border-slate-800 px-4 py-3.5 bg-slate-950/60">
          <Search className="w-5 h-5 text-amber-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search across all 48 operational pages, CLI labs, engines, or exams..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors mr-2"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[11px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Category Filter Pills Bar */}
        <div className="flex items-center gap-1 px-3 py-2 bg-slate-950/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-[58vh] sm:max-h-[62vh] overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1"
        >
          {filteredPages.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-500 mx-auto opacity-60" />
              <div className="text-sm font-semibold text-slate-300">
                No operational pages match &ldquo;{query}&rdquo;
              </div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Try searching by topic like &ldquo;Cisco CLI&rdquo;, &ldquo;Pendulum&rdquo;, &ldquo;AfCFTA&rdquo;, &ldquo;Voiceover&rdquo;, or reset the category filter.
              </p>
              <button
                onClick={() => {
                  setQuery("");
                  setSelectedCategory("All (48)");
                }}
                className="text-xs text-amber-400 hover:underline pt-1 inline-block"
              >
                Reset search filters
              </button>
            </div>
          ) : (
            filteredPages.map((page, idx) => {
              const isSelected = idx === highlightedIndex;
              const IconComponent = page.icon;

              return (
                <div
                  key={page.id}
                  data-command-item
                  onClick={() => handleSelect(page)}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`group relative flex items-start sm:items-center justify-between gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-gradient-to-r from-amber-500/15 via-slate-800 to-slate-800/90 border border-amber-500/40 shadow-sm"
                      : "hover:bg-slate-800/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSelected
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          : "bg-slate-800 text-slate-300 border-slate-700/60 group-hover:text-amber-400"
                      } transition-colors`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold tracking-tight ${
                            isSelected ? "text-amber-300" : "text-slate-100 group-hover:text-amber-200"
                          }`}
                        >
                          {page.title}
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${page.badgeColor}`}>
                          {page.badge}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-1 group-hover:text-slate-300">
                        {page.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                        <span className="text-amber-400/80">{page.category}</span>
                        <span>&bull;</span>
                        <span className="truncate">{page.path}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2 text-slate-500 group-hover:text-amber-400">
                    {isSelected && (
                      <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium mr-1">
                        Select <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="font-mono text-amber-400/90 font-medium">
              {filteredPages.length} of 48 operational pages
            </span>
            <span className="hidden sm:inline text-slate-600">&bull;</span>
            <span className="hidden sm:inline text-[11px] text-slate-400">
              Navigation updates URL & triggers direct tab switches
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-400">
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                &uarr;&darr;
              </kbd>{" "}
              navigate
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                &crarr;
              </kbd>{" "}
              open
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono">
                esc
              </kbd>{" "}
              close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GLOBAL FLOATING SEARCH TRIGGER BUTTON & HOTKEY LISTENER ────────
export function GlobalSearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      // Press '/' to search when not typing in an input
      if (
        e.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-20 z-40 flex items-center gap-2.5 px-3.5 py-2.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-amber-500/40 hover:border-amber-400 shadow-xl shadow-amber-500/10 backdrop-blur-md transition-all group scale-100 hover:scale-105"
        title="Open Command Palette (Cmd+K)"
        aria-label="Global Search Command Palette"
      >
        <Search className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span className="text-xs font-semibold tracking-wide pr-1">Search 48 Pages</span>
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded">
          ⌘K
        </kbd>
      </button>

      <GlobalCommandPalette isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
