// APIクライアント

import type {
  Member,
  Video,
  AnalyzeResult,
  TranscriptSegment,
  MetadataResult,
  ChannelStat,
  Production,
} from "./types";

const BASE = "";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(BASE + url, options);
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: resp.statusText }));
    throw new Error(err.error || `HTTPエラー: ${resp.status}`);
  }
  return resp.json() as Promise<T>;
}

// メンバー一覧（プロダクション絞り込み対応）
export async function fetchMembers(production?: Production): Promise<Member[]> {
  const params =
    production && production !== "all" ? `?production=${production}` : "";
  return fetchJSON<Member[]>(`/api/members${params}`);
}

// ライブスケジュール
export async function fetchSchedule(
  memberIds?: string[],
  production?: Production
): Promise<Video[]> {
  const params = new URLSearchParams();
  if (memberIds?.length) params.set("member_ids", memberIds.join(","));
  if (production && production !== "all") params.set("production", production);
  const qs = params.toString();
  return fetchJSON<Video[]>(`/api/schedule${qs ? `?${qs}` : ""}`);
}

// アーカイブ一覧
export async function fetchArchives(
  memberId?: string,
  limit = 30,
  production?: Production
): Promise<Video[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (memberId) params.set("member_id", memberId);
  if (production && production !== "all") params.set("production", production);
  return fetchJSON<Video[]>(`/api/archives?${params}`);
}

// 参考切り抜き一覧
export async function fetchClips(
  limit = 30,
  production?: Production
): Promise<Video[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (production && production !== "all") params.set("production", production);
  return fetchJSON<Video[]>(`/api/clips?${params}`);
}

// 動画分析
export async function analyzeVideo(
  videoId: string,
  memberId?: string,
  options?: { includeTranscript?: boolean; includeChat?: boolean }
): Promise<AnalyzeResult> {
  return fetchJSON<AnalyzeResult>("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      video_id: videoId,
      member_id: memberId,
      include_transcript: options?.includeTranscript ?? true,
      include_chat: options?.includeChat ?? true,
    }),
  });
}

// AIメタデータ生成
export async function generateMetadata(data: {
  video_title?: string;
  video_description?: string;
  channel_name?: string;
  production?: string;
  platform?: "youtube" | "shorts" | "x";
}): Promise<MetadataResult> {
  return fetchJSON<MetadataResult>("/api/metadata", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// 盛り上がり分析（ヒートマップ + タイムスタンプコメント）
export async function fetchHighlights(videoId: string): Promise<import("./types").HighlightsResult> {
  return fetchJSON<import("./types").HighlightsResult>(
    `/api/highlights?video_id=${encodeURIComponent(videoId)}`
  );
}

// チャンネル統計
export async function fetchChannelStats(
  production?: Production
): Promise<ChannelStat[]> {
  const params =
    production && production !== "all" ? `?production=${production}` : "";
  return fetchJSON<ChannelStat[]>(`/api/channels${params}`);
}

// 字幕SRT URL生成
export function getTranscriptSrtUrl(videoId: string): string {
  return `/api/transcript/${videoId}?format=srt`;
}

// 字幕JSON取得
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  return fetchJSON<TranscriptSegment[]>(`/api/transcript/${videoId}`);
}

// YouTubeのURLから動画IDを抽出
export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  const shortMatch = urlOrId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const longMatch = urlOrId.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  return null;
}
