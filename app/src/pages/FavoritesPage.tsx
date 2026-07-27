import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Star, Trash2, ExternalLink } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface FavoriteItem {
  id: string;
  label: string;
  path: string;
  icon: string;
  created_at?: string;
}

/* ------------------------------------------------------------------ */
/* Icon map — maps stored icon names to Lucide components              */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Star,
  Trash2,
  ExternalLink,
  Brain: Star,
  Bot: Star,
  MessageSquare: Star,
  Briefcase: Star,
  Search: Star,
  Cpu: Star,
};

const FALLBACK_ICONS = [
  "Brain", "MessageSquare", "Bot", "Search", "Briefcase",
  "Cpu", "DollarSign", "GraduationCap", "Shield", "Zap",
  "Stethoscope", "CloudSun", "Car", "Plane", "Music",
];

/* ------------------------------------------------------------------ */
/* Mock data for when backend is unavailable                           */
/* ------------------------------------------------------------------ */

const MOCK_FAVORITES: FavoriteItem[] = [
  { id: "mock-1", label: "AI Brain", path: "/ai-brain", icon: "Brain", created_at: new Date().toISOString() },
  { id: "mock-2", label: "Chat", path: "/chat", icon: "MessageSquare", created_at: new Date().toISOString() },
  { id: "mock-3", label: "Finance", path: "/finance", icon: "DollarSign", created_at: new Date().toISOString() },
  { id: "mock-4", label: "Education", path: "/education", icon: "GraduationCap", created_at: new Date().toISOString() },
];

const STORAGE_KEY = "luqi_favorites";

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function FavoritesPage() {
  const navigate = useNavigate();
  const { get, post, loading } = useApi();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  /* ---- Load from API or localStorage -------------------------------- */

  const loadFavorites = useCallback(async () => {
    setPageLoading(true);
    try {
      // Try API first
      const result = await get("/api/v25/favorites") as { favorites?: FavoriteItem[] } | null;
      if (result && Array.isArray(result.favorites)) {
        setFavorites(result.favorites);
        // Sync to localStorage as cache
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result.favorites));
        setPageLoading(false);
        return;
      }
    } catch {
      // API unavailable — fall through to localStorage
    }

    // Fallback: localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as FavoriteItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setFavorites(parsed);
          setPageLoading(false);
          return;
        }
      }
    } catch {
      // localStorage parse error — fall through to mock data
    }

    // Final fallback: mock demo data
    setFavorites(MOCK_FAVORITES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_FAVORITES));
    setPageLoading(false);
  }, [get]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  /* ---- Remove a favorite -------------------------------------------- */

  const removeFavorite = useCallback(
    async (id: string) => {
      setRemovingId(id);
      try {
        // Try API first
        await post("/api/v25/favorites/remove", { id });
      } catch {
        // API unavailable — remove locally
      }

      // Always update local state & localStorage
      setFavorites((prev) => {
        const updated = prev.filter((f) => f.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      setRemovingId(null);
    },
    [post]
  );

  /* ---- Navigate to capability --------------------------------------- */

  const navigateTo = (path: string) => {
    navigate(path);
  };

  /* ---- Icon renderer ------------------------------------------------ */

  const renderIcon = (iconName: string, index: number) => {
    const IconComp = ICON_MAP[iconName] || Star;
    const fallbackColor = [
      "text-cyan-400", "text-emerald-400", "text-amber-400",
      "text-rose-400", "text-violet-400", "text-blue-400",
    ][index % 6];
    return (
      <div className={`w-10 h-10 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center ${fallbackColor}`}>
        <IconComp size={20} />
      </div>
    );
  };

  /* ---- Render ------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-neutral-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Star size={22} className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Your Favorites</h1>
              <p className="text-sm text-neutral-400">
                {favorites.length} saved {favorites.length === 1 ? "capability" : "capabilities"}
              </p>
            </div>
          </div>
        </div>

        {/* Loading */}
        {pageLoading || loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-neutral-400">Loading favorites...</p>
          </div>
        ) : favorites.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-4">
              <Star size={32} className="text-neutral-500" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No favorites yet
            </h3>
            <p className="text-sm text-neutral-400 max-w-xs">
              Tap the star on any capability to save it here for quick access.
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="mt-6 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white"
            >
              <ExternalLink size={16} className="mr-2" />
              Browse Capabilities
            </Button>
          </div>
        ) : (
          /* Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((fav, idx) => (
              <div
                key={fav.id}
                className="group relative bg-neutral-800 border border-neutral-700 rounded-xl p-4 hover:border-neutral-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => navigateTo(fav.path)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {renderIcon(fav.icon, idx)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {fav.label}
                      </p>
                      <p className="text-xs text-neutral-500 truncate">
                        {fav.path}
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => removeFavorite(fav.id)}
                    disabled={removingId === fav.id}
                    className="ml-2 p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Remove from favorites"
                  >
                    {removingId === fav.id ? (
                      <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
