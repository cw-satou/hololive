const YT_BASE_URL = "https://www.googleapis.com/youtube/v3";

function apiKey() {
  return process.env.YOUTUBE_API_KEY ?? "";
}

export async function getVideoInfo(videoId: string): Promise<Record<string, unknown>> {
  const url = new URL(`${YT_BASE_URL}/videos`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("id", videoId);
  url.searchParams.set("part", "snippet,statistics,liveStreamingDetails");
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  const data = await res.json() as { items?: Record<string, unknown>[] };
  if (!data.items?.length) throw new Error(`動画が見つかりません: ${videoId}`);
  return data.items[0];
}

interface ChatMessage {
  snippet?: {
    publishedAt?: string;
    type?: string;
    displayMessage?: string;
  };
  authorDetails?: { displayName?: string };
}

async function getLiveChatMessages(liveChatId: string, pageToken?: string): Promise<{ items: ChatMessage[]; nextPageToken?: string }> {
  const url = new URL(`${YT_BASE_URL}/liveChat/messages`);
  url.searchParams.set("key", apiKey());
  url.searchParams.set("liveChatId", liveChatId);
  url.searchParams.set("part", "snippet,authorDetails");
  url.searchParams.set("maxResults", "200");
  if (pageToken) url.searchParams.set("pageToken", pageToken);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`YouTube chat error: ${res.status}`);
  return res.json();
}

export async function collectAllChat(liveChatId: string, maxPages = 10): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < maxPages; i++) {
    const result = await getLiveChatMessages(liveChatId, pageToken);
    messages.push(...(result.items ?? []));
    pageToken = result.nextPageToken;
    if (!pageToken) break;
  }
  return messages;
}

export function extractHighlightsFromChat(messages: ChatMessage[]): { time: string; score: number; type: string }[] {
  const HYPE = ["草", "w", "ｗ", "笑", "草生える", "kusa"];
  const REACTION = ["神", "やばい", "すごい", "！！", "草"];
  const minuteCounts: Record<string, number> = {};
  const superchatTimes: { time: string; score: number; type: string }[] = [];

  for (const msg of messages) {
    const snippet = msg.snippet ?? {};
    const published = snippet.publishedAt ?? "";
    const msgType = snippet.type ?? "";
    const text = (snippet.displayMessage ?? "").toLowerCase();

    if (published) {
      const key = published.slice(0, 16);
      minuteCounts[key] = (minuteCounts[key] ?? 0) + 1;
      if ([...HYPE, ...REACTION].some((k) => text.includes(k))) {
        minuteCounts[key] += 2;
      }
    }
    if (msgType.includes("superChat") || msgType.includes("superSticker")) {
      superchatTimes.push({ time: published, score: 10, type: "superchat" });
    }
  }

  const top = Object.entries(minuteCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([time, score]) => ({ time, score, type: "chat_spike" }));

  return [...top, ...superchatTimes];
}
