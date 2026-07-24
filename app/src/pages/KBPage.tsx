import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, BookOpen, MessageSquare, Sparkles } from "lucide-react";

interface SearchResult {
  question?: string;
  matched_question?: string;
  answer?: string;
  confidence?: number;
  score?: number;
  category?: string;
}

export default function KBPage() {
  const { kbAsk, kbSearch, loading } = useApi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState<"ask" | "search">("ask");

  const handleAsk = async () => {
    if (!query.trim()) return;
    setHasSearched(true);
    const answers = await kbAsk(query);
    if (answers) {
      setResults(answers.map((a) => ({
        matched_question: a.question,
        answer: a.answer,
        confidence: a.confidence,
        category: a.category,
      })));
    } else {
      setResults([]);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setHasSearched(true);
    const searchResults = await kbSearch(query);
    if (searchResults) {
      setResults(searchResults);
    } else {
      setResults([]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "ask") {
      handleAsk();
    } else {
      handleSearch();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen size={20} className="text-cyan-400" />
            <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setActiveTab("ask")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === "ask"
                  ? "bg-cyan-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              <MessageSquare size={14} />
              Ask Question
            </button>
            <button
              onClick={() => setActiveTab("search")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === "search"
                  ? "bg-cyan-600 text-white"
                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
              }`}
            >
              <Search size={14} />
              Search
            </button>
          </div>

          {/* Search Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                activeTab === "ask"
                  ? "Ask the knowledge base a question..."
                  : "Search knowledge base entries..."
              }
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading ? (
                <Sparkles size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Results */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {hasSearched && results.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500">
              <BookOpen size={32} className="mx-auto mb-3 opacity-50" />
              <p>No results found. Try a different query.</p>
            </div>
          )}

          {results.map((result, i) => (
            <Card key={i} className="bg-neutral-900 border-neutral-800">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-sm font-medium text-cyan-400">
                    {result.matched_question || result.question || "Result"}
                  </p>
                  {result.category && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-400">
                      {result.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  {result.answer || "No answer available"}
                </p>
                {(result.confidence || result.score) && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-500 rounded-full"
                        style={{
                          width: `${Math.min(100, ((result.confidence || result.score || 0) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-neutral-500">
                      {((result.confidence || result.score || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {!hasSearched && (
            <div className="text-center py-12 text-neutral-500">
              <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
              <p>Ask a question or search the knowledge base.</p>
              <p className="text-sm mt-2">The KB contains FAQ entries about crypto, taxes, languages, and more.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
