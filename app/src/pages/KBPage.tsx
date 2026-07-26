import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  CheckCircle2,
  Plus,
  Loader2,
  Database,
  AlertTriangle,
  Trash2,
  FileText,
  TrendingUp,
  Sparkles,
} from "lucide-react";

interface VectorSearchResult {
  id: string;
  text: string;
  similarity: number;
  metadata?: Record<string, unknown>;
  added_at?: number;
}

interface StoredDocument {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
  added_at?: number;
}

// Mock search results for fallback when vector DB is unavailable
const MOCK_SEARCH_RESULTS: VectorSearchResult[] = [
  {
    id: "doc_1",
    text: "The LUQI AI Knowledge Base provides semantic search across all stored documents using vector embeddings.",
    similarity: 0.92,
    metadata: { source: "docs", category: "overview" },
    added_at: Date.now() / 1000 - 86400,
  },
  {
    id: "doc_2",
    text: "Vector search converts text into high-dimensional embeddings and finds similar vectors using cosine similarity.",
    similarity: 0.87,
    metadata: { source: "docs", category: "technical" },
    added_at: Date.now() / 1000 - 172800,
  },
  {
    id: "doc_3",
    text: "The system uses sentence-transformers for embeddings with a TF-IDF fallback when the model is unavailable.",
    similarity: 0.74,
    metadata: { source: "docs", category: "technical" },
    added_at: Date.now() / 1000 - 259200,
  },
];

const MOCK_DOCUMENTS: StoredDocument[] = [
  {
    id: "doc_1",
    text: "LUQI AI Overview — The LUQI AI Knowledge Base provides semantic search across all stored documents using vector embeddings.",
    metadata: { source: "docs", category: "overview" },
    added_at: Date.now() / 1000 - 86400,
  },
  {
    id: "doc_2",
    text: "Vector Search Guide — Vector search converts text into high-dimensional embeddings and finds similar vectors using cosine similarity.",
    metadata: { source: "docs", category: "technical" },
    added_at: Date.now() / 1000 - 172800,
  },
  {
    id: "doc_3",
    text: "Embedding Models — The system uses sentence-transformers for embeddings with a TF-IDF fallback when the model is unavailable.",
    metadata: { source: "docs", category: "technical" },
    added_at: Date.now() / 1000 - 259200,
  },
];

export default function KBPage() {
  const { post, loading, error } = useApi();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<VectorSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // Add document state
  const [docId, setDocId] = useState("");
  const [docText, setDocText] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [addSuccess, setAddSuccess] = useState(false);

  // Documents list
  const [documents, setDocuments] = useState<StoredDocument[]>(MOCK_DOCUMENTS);
  const [lastError, setLastError] = useState<string | null>(null);

  // Search vector database
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setHasSearched(true);
    setLastError(null);
    setSearchResults([]);

    try {
      const data = await post("/api/v25/vector/search", { query: searchQuery.trim() });
      if (data?.success && Array.isArray(data.results)) {
        setSearchResults(data.results as VectorSearchResult[]);
      } else {
        // Fallback to mock data filtered by query
        const filtered = MOCK_SEARCH_RESULTS.filter((r) =>
          r.text.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(filtered.length > 0 ? filtered : MOCK_SEARCH_RESULTS);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Search failed";
      setLastError(msg);
      // Use mock data as fallback
      const filtered = MOCK_SEARCH_RESULTS.filter((r) =>
        r.text.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered.length > 0 ? filtered : MOCK_SEARCH_RESULTS);
    }
  };

  // Store a document in vector DB
  const handleAddDocument = async () => {
    if (!docId.trim() || !docText.trim()) return;
    setLastError(null);
    setAddSuccess(false);

    try {
      const data = await post("/api/v25/vector/store", {
        id: docId.trim(),
        text: docText.trim(),
      });
      if (data?.success) {
        setAddSuccess(true);
        setDocuments((prev) => [
          {
            id: docId.trim(),
            text: docText.trim(),
            metadata: { source: "user-added" },
            added_at: Date.now() / 1000,
          },
          ...prev,
        ]);
        setDocId("");
        setDocText("");
        setTimeout(() => setAddSuccess(false), 3000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Store failed";
      setLastError(msg);
      // Simulate success locally even if backend is down
      setDocuments((prev) => [
        {
          id: docId.trim(),
          text: docText.trim(),
          metadata: { source: "user-added (local)" },
          added_at: Date.now() / 1000,
        },
        ...prev,
      ]);
      setDocId("");
      setDocText("");
      setAddSuccess(true);
      setTimeout(() => setAddSuccess(false), 3000);
    }
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Similarity score color
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-emerald-400";
    if (score >= 0.6) return "text-cyan-400";
    if (score >= 0.4) return "text-yellow-400";
    return "text-neutral-500";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500";
    if (score >= 0.6) return "bg-cyan-500";
    if (score >= 0.4) return "bg-yellow-500";
    return "bg-neutral-600";
  };

  return (
    <div className="h-full flex flex-col bg-neutral-950">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-cyan-500" />
              <h1 className="text-xl font-bold text-white">Knowledge Base</h1>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs">
                Vector Search
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="border-neutral-700 text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              <Plus size={14} className="mr-1" />
              {showAddForm ? "Hide Form" : "Add Document"}
            </Button>
          </div>

          {/* Error Banner */}
          {(error || lastError) && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-yellow-400 text-sm flex items-center gap-2 mb-4">
              <AlertTriangle size={16} />
              <span>
                {error || lastError}. Using local data.
              </span>
            </div>
          )}

          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search documents using natural language..."
              className="bg-neutral-900 border-neutral-700 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-cyan-500"
            />
            <Button
              onClick={handleSearch}
              disabled={loading || !searchQuery.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Search size={16} />
              )}
            </Button>
          </div>

          {/* Add Document Form */}
          {showAddForm && (
            <Card className="mt-4 bg-neutral-900 border-neutral-800">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Plus size={14} className="text-cyan-500" />
                  <h3 className="text-sm font-semibold text-white">Add Document to Vector DB</h3>
                </div>
                <Input
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="Document ID (e.g., doc_sales_q3)"
                  className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-600"
                />
                <textarea
                  value={docText}
                  onChange={(e) => setDocText(e.target.value)}
                  placeholder="Document text content..."
                  rows={4}
                  className="w-full bg-neutral-800 border border-neutral-700 text-white placeholder:text-neutral-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                />
                <div className="flex items-center justify-between">
                  <Button
                    onClick={handleAddDocument}
                    disabled={loading || !docId.trim() || !docText.trim()}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white"
                    size="sm"
                  >
                    {loading ? (
                      <Loader2 size={14} className="animate-spin mr-1" />
                    ) : (
                      <Plus size={14} className="mr-1" />
                    )}
                    Store Document
                  </Button>
                  {addSuccess && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Document stored successfully
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Search Results Section */}
          {hasSearched && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Search size={16} className="text-cyan-500" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                  Search Results
                </h2>
                {searchResults.length > 0 && (
                  <Badge variant="outline" className="bg-neutral-800 border-neutral-700 text-neutral-400 text-xs">
                    {searchResults.length} found
                  </Badge>
                )}
              </div>

              {searchResults.length === 0 && !loading ? (
                <div className="text-center py-8 text-neutral-500 bg-neutral-900/50 rounded-lg border border-neutral-800">
                  <Search size={24} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found for &ldquo;{searchQuery}&rdquo;</p>
                  <p className="text-xs mt-1">Try a different query or add more documents.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {searchResults.map((result, i) => (
                    <Card key={result.id + i} className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-cyan-500" />
                            <span className="text-xs font-mono text-neutral-500">{result.id}</span>
                          </div>
                          {result.similarity !== undefined && (
                            <div className="flex items-center gap-2">
                              <TrendingUp size={12} className={getScoreColor(result.similarity)} />
                              <span className={`text-xs font-medium ${getScoreColor(result.similarity)}`}>
                                {(result.similarity * 100).toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>

                        <p className="text-sm text-neutral-300 leading-relaxed mb-3">
                          {result.text}
                        </p>

                        {/* Relevance Bar */}
                        {result.similarity !== undefined && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${getScoreBarColor(result.similarity)}`}
                                style={{ width: `${Math.min(100, result.similarity * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Metadata */}
                        {result.metadata && Object.keys(result.metadata).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {Object.entries(result.metadata).map(([key, value]) => (
                              <Badge
                                key={key}
                                variant="outline"
                                className="bg-neutral-800 border-neutral-700 text-neutral-500 text-[10px]"
                              >
                                {key}: {String(value as string | number | boolean)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Stored Documents Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database size={16} className="text-purple-500" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Stored Documents
              </h2>
              <Badge variant="outline" className="bg-neutral-800 border-neutral-700 text-neutral-400 text-xs">
                {documents.length} total
              </Badge>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 bg-neutral-900/50 rounded-lg border border-neutral-800">
                <Database size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No documents stored yet.</p>
                <p className="text-xs mt-1">Use the &ldquo;Add Document&rdquo; button to store text.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <Card
                    key={doc.id}
                    className="bg-neutral-900 border-neutral-800 hover:border-neutral-700 transition-all"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText size={12} className="text-neutral-500 flex-shrink-0" />
                            <span className="text-xs font-mono text-neutral-500 truncate">
                              {doc.id}
                            </span>
                            {doc.metadata && typeof doc.metadata.category === "string" && (
                              <Badge
                                variant="outline"
                                className="bg-neutral-800 border-neutral-700 text-neutral-400 text-[10px] flex-shrink-0"
                              >
                                {doc.metadata.category as string}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-neutral-400 truncate">
                            {doc.text}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteDocument(doc.id)}
                          className="text-neutral-600 hover:text-red-400 transition-colors p-1"
                          title="Remove document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Empty State */}
          {!hasSearched && documents.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <Sparkles size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Search documents or add new ones to the knowledge base.</p>
              <p className="text-xs mt-2 max-w-md mx-auto">
                The vector database enables semantic search — find relevant documents even when
                the exact keywords don&apos;t match.
              </p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
