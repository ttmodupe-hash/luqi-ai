const SERPER_API_KEY = process.env.SERPER_API_KEY || "";
const SERPER_BASE_URL = "https://google.serper.dev";

interface SerperSearchResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
  position?: number;
}

interface SerperNewsResult {
  title: string;
  link: string;
  snippet: string;
  date: string;
  source: string;
  imageUrl?: string;
}

interface SerperResponse {
  organic: SerperSearchResult[];
  news?: SerperNewsResult[];
  answerBox?: {
    title: string;
    snippet: string;
    link: string;
  };
  knowledgeGraph?: {
    title: string;
    description: string;
    type: string;
  };
}

/**
 * Search the web using Serper.dev API
 * Returns structured search results with titles, links, and snippets
 */
export async function searchWeb(
  query: string,
  options: {
    numResults?: number;
    location?: string;
    language?: string;
  } = {}
): Promise<SerperResponse> {
  const { numResults = 10, location = "South Africa", language = "en" } = options;

  if (!SERPER_API_KEY) {
    console.warn("[Serper] No API key configured — returning empty results");
    return { organic: [] };
  }

  try {
    const response = await fetch(`${SERPER_BASE_URL}/search`, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
        gl: location,
        hl: language,
      }),
    });

    if (!response.ok) {
      console.error(`[Serper] API error: ${response.status} ${response.statusText}`);
      return { organic: [] };
    }

    const data = await response.json();
    return data as SerperResponse;
  } catch (error) {
    console.error("[Serper] Search failed:", error);
    return { organic: [] };
  }
}

/**
 * Search news articles using Serper.dev News API
 * Returns news results with titles, links, dates, and sources
 */
export async function searchNews(
  query: string,
  options: {
    numResults?: number;
    location?: string;
    language?: string;
    timeRange?: "hour" | "day" | "week" | "month" | "year";
  } = {}
): Promise<SerperResponse> {
  const { numResults = 10, location = "South Africa", language = "en", timeRange = "week" } = options;

  if (!SERPER_API_KEY) {
    console.warn("[Serper] No API key configured — returning empty results");
    return { organic: [], news: [] };
  }

  try {
    const response = await fetch(`${SERPER_BASE_URL}/news`, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
        gl: location,
        hl: language,
        tbs: `qdr:${timeRange === "hour" ? "h" : timeRange === "day" ? "d" : timeRange === "week" ? "w" : timeRange === "month" ? "m" : "y"}`,
      }),
    });

    if (!response.ok) {
      console.error(`[Serper] News API error: ${response.status} ${response.statusText}`);
      return { organic: [], news: [] };
    }

    const data = await response.json();
    return data as SerperResponse;
  } catch (error) {
    console.error("[Serper] News search failed:", error);
    return { organic: [], news: [] };
  }
}

/**
 * Format search results into a readable context string for AI consumption
 * Combines organic results, news, and knowledge graph into a single context block
 */
export function formatSearchContext(
  results: SerperResponse,
  options: {
    maxResults?: number;
    includeNews?: boolean;
    includeAnswerBox?: boolean;
  } = {}
): string {
  const { maxResults = 5, includeNews = true, includeAnswerBox = true } = options;

  const parts: string[] = [];

  // Add answer box if present
  if (includeAnswerBox && results.answerBox) {
    parts.push(`**Featured Answer:** ${results.answerBox.title}`);
    parts.push(`${results.answerBox.snippet}`);
    parts.push(`Source: ${results.answerBox.link}`);
    parts.push("");
  }

  // Add knowledge graph if present
  if (results.knowledgeGraph) {
    parts.push(`**${results.knowledgeGraph.title}** (${results.knowledgeGraph.type})`);
    parts.push(`${results.knowledgeGraph.description}`);
    parts.push("");
  }

  // Add organic search results
  if (results.organic && results.organic.length > 0) {
    parts.push("**Web Results:**");
    results.organic.slice(0, maxResults).forEach((result, i) => {
      parts.push(`${i + 1}. **${result.title}**`);
      parts.push(`   ${result.snippet}`);
      parts.push(`   Link: ${result.link}`);
      if (result.date) {
        parts.push(`   Date: ${result.date}`);
      }
      parts.push("");
    });
  }

  // Add news results if present
  if (includeNews && results.news && results.news.length > 0) {
    parts.push("**News Results:**");
    results.news.slice(0, maxResults).forEach((article, i) => {
      parts.push(`${i + 1}. **${article.title}**`);
      parts.push(`   ${article.snippet}`);
      parts.push(`   Source: ${article.source} | Date: ${article.date}`);
      parts.push(`   Link: ${article.link}`);
      parts.push("");
    });
  }

  return parts.join("\n").trim();
}

/**
 * Search for images using Serper.dev Images API
 * Returns image results with URLs and metadata
 */
export async function searchImages(
  query: string,
  options: {
    numResults?: number;
    location?: string;
    language?: string;
  } = {}
): Promise<{ images: Array<{ title: string; imageUrl: string; link: string; source: string }> }> {
  const { numResults = 10, location = "South Africa", language = "en" } = options;

  if (!SERPER_API_KEY) {
    console.warn("[Serper] No API key configured — returning empty results");
    return { images: [] };
  }

  try {
    const response = await fetch(`${SERPER_BASE_URL}/images`, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
        gl: location,
        hl: language,
      }),
    });

    if (!response.ok) {
      console.error(`[Serper] Images API error: ${response.status} ${response.statusText}`);
      return { images: [] };
    }

    const data = await response.json();
    return { images: data.images || [] };
  } catch (error) {
    console.error("[Serper] Image search failed:", error);
    return { images: [] };
  }
}

/**
 * Search for videos using Serper.dev Videos API
 * Returns video results with URLs and metadata
 */
export async function searchVideos(
  query: string,
  options: {
    numResults?: number;
    location?: string;
    language?: string;
  } = {}
): Promise<{ videos: Array<{ title: string; link: string; snippet: string; duration?: string; source?: string }> }> {
  const { numResults = 10, location = "South Africa", language = "en" } = options;

  if (!SERPER_API_KEY) {
    console.warn("[Serper] No API key configured — returning empty results");
    return { videos: [] };
  }

  try {
    const response = await fetch(`${SERPER_BASE_URL}/videos`, {
      method: "POST",
      headers: {
        "X-API-KEY": SERPER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: query,
        num: numResults,
        gl: location,
        hl: language,
      }),
    });

    if (!response.ok) {
      console.error(`[Serper] Videos API error: ${response.status} ${response.statusText}`);
      return { videos: [] };
    }

    const data = await response.json();
    return { videos: data.videos || [] };
  } catch (error) {
    console.error("[Serper] Video search failed:", error);
    return { videos: [] };
  }
}
