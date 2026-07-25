import { useState, useEffect } from "react";
import { useApi } from "@/hooks/useApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Globe,
  Search,
  Languages,
  ArrowLeft,
  Send,
  Sparkles,
  BookOpen,
  MessageCircle,
} from "lucide-react";

interface Language {
  name: string;
  region: string;
  greeting: string;
  speakers?: string;
  family?: string;
}

interface LanguageDetail {
  name: string;
  greeting: string;
  cultural_notes: string;
  sample_phrases: Record<string, string>;
  region: string;
  speakers: string;
}

export default function LanguagesPage() {
  const { get, post, loading, error } = useApi();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [filtered, setFiltered] = useState<Language[]>([]);
  const [search, setSearch] = useState("");
  const [selectedLang, setSelectedLang] = useState<LanguageDetail | null>(null);

  // Translate state
  const [translateText, setTranslateText] = useState("");
  const [translateLang, setTranslateLang] = useState("");
  const [translationResult, setTranslationResult] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const fetchLanguages = async () => {
    try {
      const data = await get('/api/v25/languages');
      const langs = data.languages || data;
      setLanguages(Array.isArray(langs) ? langs : []);
      setFiltered(Array.isArray(langs) ? langs : []);
    } catch (e: unknown) {
      // Fallback demo data
      const demo: Language[] = [
        { name: "Zulu", region: "South Africa", greeting: "Sawubona", speakers: "12M", family: "Bantu" },
        { name: "Swahili", region: "East Africa", greeting: "Jambo", speakers: "16M", family: "Bantu" },
        { name: "Yoruba", region: "Nigeria", greeting: "Bawo ni", speakers: "45M", family: "Niger-Congo" },
        { name: "Amharic", region: "Ethiopia", greeting: "Selam", speakers: "32M", family: "Semitic" },
        { name: "Igbo", region: "Nigeria", greeting: "Nnoo", speakers: "27M", family: "Niger-Congo" },
        { name: "Hausa", region: "West Africa", greeting: "Sannu", speakers: "63M", family: "Afro-Asiatic" },
        { name: "Shona", region: "Zimbabwe", greeting: "Mhoroi", speakers: "10M", family: "Bantu" },
        { name: "Xhosa", region: "South Africa", greeting: "Molo", speakers: "8M", family: "Bantu" },
        { name: "Wolof", region: "Senegal", greeting: "Na nga def", speakers: "5M", family: "Niger-Congo" },
        { name: "Somali", region: "Horn of Africa", greeting: "Assalamu alaikum", speakers: "18M", family: "Cushitic" },
        { name: "Twi", region: "Ghana", greeting: "Mahama", speakers: "9M", family: "Niger-Congo" },
        { name: "Malagasy", region: "Madagascar", greeting: "Manao ahoana", speakers: "25M", family: "Austronesian" },
      ];
      setLanguages(demo);
      setFiltered(demo);
    }
  };

  const fetchLanguageDetail = async (lang: string) => {
    try {
      const data = await get(`/api/v25/languages/${encodeURIComponent(lang)}`);
      setSelectedLang(data);
    } catch (e: unknown) {
      // Fallback detail
      const greetings: Record<string, string> = {
        Zulu: "Sawubona", Swahili: "Jambo", Yoruba: "Bawo ni", Amharic: "Selam",
        Igbo: "Nnoo", Hausa: "Sannu", Shona: "Mhoroi", Xhosa: "Molo",
        Wolof: "Na nga def", Somali: "Assalamu alaikum", Twi: "Mahama", Malagasy: "Manao ahoana",
      };
      setSelectedLang({
        name: lang,
        greeting: greetings[lang] || "Hello",
        cultural_notes: `${lang} is spoken by millions across Africa. Greetings are an essential part of ${lang} culture — always greet someone before starting a conversation.`,
        sample_phrases: {
          "Hello": greetings[lang] || "Hello",
          "How are you?": "How are you? (translation)",
          "Thank you": "Thank you (translation)",
          "Goodbye": "Goodbye (translation)",
        },
        region: "Africa",
        speakers: "Millions",
      });
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim() || !translateLang) return;
    setTranslating(true);
    setTranslationResult(null);
    try {
      const data = await post('/api/v25/languages/translate', { phrase: translateText, language: translateLang });
      setTranslationResult(data.translation || data.translated || JSON.stringify(data));
    } catch (e: unknown) {
      setTranslationResult(`[${translateLang}] "${translateText}" — Translation simulated (API unavailable)`);
    } finally {
      setTranslating(false);
    }
  };

  useEffect(() => {
    fetchLanguages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(languages.filter((l) => l.name.toLowerCase().includes(q) || l.region.toLowerCase().includes(q)));
  }, [search, languages]);

  if (selectedLang) {
    return (
      <div className="h-full overflow-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedLang(null)} className="text-neutral-400 hover:text-white">
              <ArrowLeft size={16} />
            </Button>
            <div className="flex items-center gap-2">
              <Globe size={20} className="text-cyan-400" />
              <h1 className="text-xl font-bold text-white">{selectedLang.name}</h1>
            </div>
          </div>

          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <MessageCircle size={20} className="text-cyan-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{selectedLang.greeting}</p>
                  <p className="text-xs text-neutral-400">Common greeting</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                  <p className="text-neutral-400 text-xs">Region</p>
                  <p className="text-white font-medium">{selectedLang.region}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                  <p className="text-neutral-400 text-xs">Speakers</p>
                  <p className="text-white font-medium">{selectedLang.speakers}</p>
                </div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                <p className="text-xs text-neutral-400 mb-1 flex items-center gap-1"><BookOpen size={12} /> Cultural Notes</p>
                <p className="text-sm text-neutral-200">{selectedLang.cultural_notes}</p>
              </div>
            </CardContent>
          </Card>

          {selectedLang.sample_phrases && Object.keys(selectedLang.sample_phrases).length > 0 && (
            <Card className="bg-neutral-900 border-neutral-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-neutral-300 flex items-center gap-2">
                  <Languages size={16} className="text-emerald-400" />
                  Sample Phrases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(selectedLang.sample_phrases).map(([en, translated]) => (
                  <div key={en} className="flex justify-between items-center bg-neutral-800 rounded-lg p-3 border border-neutral-700">
                    <span className="text-sm text-neutral-300">{en}</span>
                    <span className="text-sm font-medium text-cyan-400">{translated}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Globe size={20} className="text-cyan-400" />
            <h1 className="text-xl font-bold text-white">African Languages</h1>
            <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">
              {languages.length} languages
            </Badge>
          </div>

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search languages or regions..."
                className="pl-8 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Translate bar */}
          <Card className="bg-neutral-900 border-neutral-800">
            <CardContent className="p-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={translateText}
                  onChange={(e) => setTranslateText(e.target.value)}
                  placeholder="Enter phrase to translate..."
                  className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
                  onKeyDown={(e) => e.key === "Enter" && handleTranslate()}
                />
                <Select value={translateLang} onValueChange={setTranslateLang}>
                  <SelectTrigger className="w-[180px] bg-neutral-800 border-neutral-700 text-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-neutral-800 border-neutral-700">
                    {languages.map((l) => (
                      <SelectItem key={l.name} value={l.name} className="text-white hover:bg-neutral-700">
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleTranslate}
                  disabled={translating || !translateText.trim() || !translateLang}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  {translating ? <Sparkles size={16} className="animate-spin" /> : <Send size={16} />}
                  Translate
                </Button>
              </div>
              {translationResult && (
                <div className="mt-2 p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg text-sm text-cyan-300">
                  {translationResult}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Language Grid */}
      <ScrollArea className="flex-1 p-6">
        <div className="max-w-5xl mx-auto">
          {loading && languages.length === 0 && (
            <div className="text-center py-12 text-neutral-500">
              <Sparkles size={32} className="animate-spin mx-auto mb-3" />
              <p>Loading languages...</p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-sm text-yellow-400">
              API error: {error}. Showing demo data.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((lang) => (
              <Card
                key={lang.name}
                className="bg-neutral-900 border-neutral-800 hover:border-cyan-500/30 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/5"
                onClick={() => fetchLanguageDetail(lang.name)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                      <Globe size={18} className="text-cyan-400" />
                    </div>
                    <Badge variant="outline" className="bg-neutral-800 text-neutral-400 border-neutral-700 text-xs">
                      {lang.family || "African"}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-1">{lang.name}</h3>
                  <p className="text-xs text-neutral-400 mb-2">{lang.region}</p>
                  <div className="bg-neutral-800 rounded-lg p-2 border border-neutral-700">
                    <p className="text-xs text-neutral-500">Greeting</p>
                    <p className="text-sm font-medium text-cyan-400">{lang.greeting}</p>
                  </div>
                  {lang.speakers && (
                    <p className="text-xs text-neutral-500 mt-2">~{lang.speakers} speakers</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && !loading && (
            <div className="text-center py-12 text-neutral-500">
              <Search size={32} className="mx-auto mb-3 opacity-50" />
              <p>No languages found matching &quot;{search}&quot;</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
