const HOLODEX_BASE_URL = "https://holodex.net/api/v2";
const HOLOLIVE_ORG = "Hololive";

function headers() {
  return { "X-APIKEY": process.env.HOLODEX_API_KEY ?? "" };
}

export interface HolodexVideo {
  id: string;
  title: string;
  status: string;
  start_scheduled?: string;
  start_actual?: string;
  end_actual?: string;
  duration?: number;
  description?: string;
  channel?: { id: string; name: string; english_name?: string };
}

export interface NormalizedVideo {
  video_id: string;
  title: string;
  status: string;
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
}

export async function getChannels(): Promise<{ id: string; name: string; english_name?: string }[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/channels`);
  url.searchParams.set("org", HOLOLIVE_ORG);
  url.searchParams.set("limit", "100");
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex channels error: ${res.status}`);
  return res.json();
}

export async function getLiveStreams(channelIds?: string[]): Promise<HolodexVideo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/live`);
  url.searchParams.set("org", HOLOLIVE_ORG);
  url.searchParams.set("status", "live,upcoming");
  url.searchParams.set("limit", "100");
  url.searchParams.set("max_upcoming_hours", "168");
  url.searchParams.set("include", "description,live_info");
  if (channelIds?.length) url.searchParams.set("channel_id", channelIds.join(","));
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex live error: ${res.status}`);
  const videos: HolodexVideo[] = await res.json();
  return videos.filter((v) => v.status === "live" || v.status === "upcoming");
}

export async function getRecentArchives(channelId?: string, limit = 20): Promise<HolodexVideo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/videos`);
  url.searchParams.set("org", HOLOLIVE_ORG);
  url.searchParams.set("type", "stream");
  url.searchParams.set("status", "past");
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("sort", "published_at");
  url.searchParams.set("order", "desc");
  if (channelId) url.searchParams.set("channel_id", channelId);
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex archives error: ${res.status}`);
  return res.json();
}

export async function getRecentClips(limit = 30): Promise<HolodexVideo[]> {
  const url = new URL(`${HOLODEX_BASE_URL}/videos`);
  url.searchParams.set("org", HOLOLIVE_ORG);
  url.searchParams.set("type", "clip");
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("sort", "published_at");
  url.searchParams.set("order", "desc");
  const res = await fetch(url.toString(), { headers: headers() });
  if (!res.ok) throw new Error(`Holodex clips error: ${res.status}`);
  return res.json();
}

export function normalizeVideo(raw: HolodexVideo): NormalizedVideo {
  return {
    video_id: raw.id,
    title: raw.title,
    status: raw.status,
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
  };
}
