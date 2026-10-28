const HOLODEX_BASE_URL = "https://holodex.net/api/v2";

export type ProductionFilter = "vspo" | "hololive" | "all";
const ORG_VSPO = "VSpo";
const ORG_HOLOLIVE = "Hololive";
const ORG_MAP = { vspo: ORG_VSPO, hololive: ORG_HOLOLIVE } as const;

function headers() {
  return { "X-APIKEY": process.env.HOLODEX_API_KEY ?? "" };
}

export interface HolodexVideo {
  id: string;
  title: string;
  status: string;
  type?: string;
  available_at?: string;
  start_scheduled?: string;
  start_actual?: string;
  end_actual?: string;
  duration?: number;
  description?: string;
  channel?: { id: string; name: string; english_name?: string; org?: string };
}

export interface ChannelInfo {
  id: string;
  name: string;
  english_name?: string;
  org?: string;
  subscriber_count?: number;
  video_count?: number;
  photo?: string;
  inactive?: boolean;
}

export interface NormalizedVideo {
  video_id: string;
  title: string;
  status: string;
  available_at?: string;
  start_scheduled?: string;
  start_actual?: string;
  end_actual?: string;
  duration?: number;
  description?: string;
  thumbnail: string;
  youtube_url: string;
  channel_id?: string;
  channel_name?: string;
  channel_english_name?: string;
  production?: string;
}

// ===== 内部ヘルパー =====

async function fetchChannelsByOrg(org: string, limit = 100): Promise<ChannelInfo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/channels`);
  url.searchParams.set("org", org);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("sort", "subscriber_count");
  url.searchParams.set("order", "desc");
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex channels error: ${res.status}`);
  return res.json();
}

async function fetchLiveByOrg(org: string | null, channelIds?: string[]): Promise<HolodexVideo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/live`);
  if (org) url.searchParams.set("org", org);
  url.searchParams.set("limit", "100");
  url.searchParams.set("max_upcoming_hours", "168");
  url.searchParams.set("include", "description,live_info");
  if (channelIds?.length) url.searchParams.set("channel_id", channelIds.join(","));
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex live error: ${res.status}`);
  const videos: HolodexVideo[] = await res.json();
  return videos.filter((v) => v.status === "live" || v.status === "upcoming");
}

async function fetchVideosByOrg(
  org: string | null,
  type: string,
  channelId?: string,
  limit = 30,
  from?: string
): Promise<HolodexVideo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/videos`);
  if (org) url.searchParams.set("org", org);
  url.searchParams.set("type", type);
  if (type !== "clip") url.searchParams.set("status", "past");
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("sort", "published_at");
  url.searchParams.set("order", "desc");
  if (channelId) url.searchParams.set("channel_id", channelId);
  if (from) url.searchParams.set("from", from);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex videos error: ${res.status}`);
  return res.json();
}

// ===== 公開API =====

export async function getChannels(production: ProductionFilter = "all"): Promise<ChannelInfo[]> {
  if (production === "all") {
    const [vspo, holo] = await Promise.all([
      fetchChannelsByOrg(ORG_VSPO, 50),
      fetchChannelsByOrg(ORG_HOLOLIVE, 100),
    ]);
    return [...vspo, ...holo];
  }
  return fetchChannelsByOrg(ORG_MAP[production], production === "hololive" ? 100 : 50);
}

export async function getLiveStreams(
  production: ProductionFilter = "all",
  channelIds?: string[]
): Promise<HolodexVideo[]> {
  if (channelIds?.length) return fetchLiveByOrg(null, channelIds);
  if (production === "all") {
    const [vspo, holo] = await Promise.all([
      fetchLiveByOrg(ORG_VSPO),
      fetchLiveByOrg(ORG_HOLOLIVE),
    ]);
    return [...vspo, ...holo].sort((a, b) => {
      if (a.status === "live" && b.status !== "live") return -1;
      if (b.status === "live" && a.status !== "live") return 1;
      const ta = a.start_scheduled ?? a.start_actual ?? "";
      const tb = b.start_scheduled ?? b.start_actual ?? "";
      return ta.localeCompare(tb);
    });
  }
  return fetchLiveByOrg(ORG_MAP[production]);
}

export async function getRecentArchives(
  production: ProductionFilter = "all",
  channelId?: string,
  limit = 30,
  from?: string
): Promise<HolodexVideo[]> {
  if (channelId) return fetchVideosByOrg(null, "stream", channelId, limit, from);
  if (production === "all") {
    const [vspo, holo] = await Promise.all([
      fetchVideosByOrg(ORG_VSPO, "stream", undefined, limit, from),
      fetchVideosByOrg(ORG_HOLOLIVE, "stream", undefined, limit, from),
    ]);
    return [...vspo, ...holo]
      .sort((a, b) =>
        (b.start_actual ?? b.available_at ?? "").localeCompare(a.start_actual ?? a.available_at ?? "")
      )
      .slice(0, limit);
  }
  return fetchVideosByOrg(ORG_MAP[production], "stream", undefined, limit, from);
}

export async function getRecentClips(
  production: ProductionFilter = "all",
  limit = 30
): Promise<HolodexVideo[]> {
  if (production === "all") {
    const [vspo, holo] = await Promise.all([
      fetchVideosByOrg(ORG_VSPO, "clip", undefined, limit),
      fetchVideosByOrg(ORG_HOLOLIVE, "clip", undefined, limit),
    ]);
    return [...vspo, ...holo]
      .sort((a, b) => (b.available_at ?? "").localeCompare(a.available_at ?? ""))
      .slice(0, limit);
  }
  return fetchVideosByOrg(ORG_MAP[production], "clip", undefined, limit);
}

export function normalizeVideo(raw: HolodexVideo): NormalizedVideo {
  return {
    video_id: raw.id,
    title: raw.title,
    status: raw.status,
    available_at: raw.available_at,
    start_scheduled: raw.start_scheduled,
    start_actual: raw.start_actual,
    end_actual: raw.end_actual,
    duration: raw.duration,
    description: raw.description,
    thumbnail: `https://img.youtube.com/vi/${raw.id}/mqdefault.jpg`,
    youtube_url: `https://www.youtube.com/watch?v=${raw.id}`,
    channel_id: raw.channel?.id,
    channel_name: raw.channel?.name,
    channel_english_name: raw.channel?.english_name,
    production: raw.channel?.org === ORG_VSPO ? "vspo" : raw.channel?.org === ORG_HOLOLIVE ? "hololive" : undefined,
  };
}
