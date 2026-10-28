import React, { useState, useEffect, useRef } from "react";
import {
  LANGUAGES,
  type LanguageInfo,
  getStoredLanguage,
  setStoredLanguage,
} from "../lib/languages";
import { Globe, Check, ChevronDown, Search } from "lucide-react";

interface LanguageSelectorDropdownProps {
  compact?: boolean;
  className?: string;
}

export default function LanguageSelectorDropdown({
  compact = false,
  className = "",
}: LanguageSelectorDropdownProps) {
  const [currentLang, setCurrentLang] = useState<LanguageInfo>(getStoredLanguage());
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync with global language change events
  useEffect(() => {
    const handleLangChange = (e: any) => {
      if (e.detail?.language) {
        setCurrentLang(e.detail.language);
      }
    };
    window.addEventListener("luqi:language-changed", handleLangChange);
    return () => window.removeEventListener("luqi:language-changed", handleLangChange);
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelect = (lang: LanguageInfo) => {
    setStoredLanguage(lang);
    setCurrentLang(lang);
    setIsOpen(false);
    setSearchQuery("");
  };

  const filteredLanguages = LANGUAGES.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.code.toLowerCase().includes(q) ||
      l.region.toLowerCase().includes(q)
    );
  });

  // Group filtered languages
  const groups = [
    { title: "South Africa (11 Official)", items: filteredLanguages.filter((l) => l.region === "South Africa (11 Official)") },
    { title: "Pan-Africa", items: filteredLanguages.filter((l) => l.region === "Pan-Africa") },
    { title: "Global Scientific & Trade", items: filteredLanguages.filter((l) => l.region === "Global") },
  ].filter((g) => g.items.length > 0);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-amber-500/50 transition-all text-xs font-medium shadow-xs hover:shadow-amber-500/10 focus:outline-hidden focus:ring-2 focus:ring-amber-500/40"
        aria-label={`Choose Luqi language (${currentLang.nativeName})`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title={`Active Language: ${currentLang.nativeName} (${currentLang.name}) — 22 Languages Supported`}
      >
        <span className="text-base leading-none" role="img" aria-label={currentLang.name}>
          {currentLang.flag}
        </span>
        {!compact ? (
          <span className="hidden sm:inline font-semibold text-slate-200 truncate max-w-[110px]">
            {currentLang.nativeName}
          </span>
        ) : null}
        <span className="sm:hidden font-mono uppercase font-bold text-[11px] text-amber-400">
          {currentLang.code}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] sm:w-80 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl shadow-black/80 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3 border-b border-slate-800 bg-slate-950/70">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Reply language</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                22 Languages
              </span>
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search languages (e.g. Zulu, French, Swahili)..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-amber-500 focus:outline-hidden text-slate-200 placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Language Items List */}
          <div className="max-h-72 overflow-y-auto p-1.5 space-y-2 divide-y divide-slate-800/40">
            {groups.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">
                No matching language found for "{searchQuery}".
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.title} className="pt-1.5 first:pt-0">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 gap-0.5 mt-0.5">
                    {group.items.map((lang) => {
                      const isSelected = lang.code === currentLang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => handleSelect(lang)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                            isSelected
                              ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30"
                              : "hover:bg-slate-800/70 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className="text-base leading-none" role="img" aria-label={lang.name}>
                              {lang.flag}
                            </span>
                            <div className="truncate">
                              <span className="text-xs block text-slate-200 font-medium truncate">
                                {lang.nativeName}
                              </span>
                              <span className="text-[10px] text-slate-500 block truncate">
                                {lang.name} &middot; <span className="font-mono uppercase">{lang.code}</span>
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-slate-800/80 bg-slate-950/60 text-[10px] text-slate-500 flex items-center justify-between px-3">
            <span>Used for your next Luqi reply</span>
            <span className="font-mono text-amber-400/80">Your choice</span>
          </div>
        </div>
      )}
    </div>
  );
}
