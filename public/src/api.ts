// APIクライアント

import type {
  Member,
  Video,
  AnalyzeResult,
  TranscriptSegment,
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

// メンバー一覧
export async function fetchMembers(): Promise<Member[]> {
  return fetchJSON<Member[]>("/api/members");
}

// ライブスケジュール
export async function fetchSchedule(memberIds?: string[]): Promise<Video[]> {
  const params = memberIds?.length
    ? `?member_ids=${memberIds.join(",")}`
    : "";
  return fetchJSON<Video[]>(`/api/schedule${params}`);
}

// アーカイブ一覧
export async function fetchArchives(
  memberId?: string,
  limit = 30
): Promise<Video[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (memberId) params.set("member_id", memberId);
  return fetchJSON<Video[]>(`/api/archives?${params}`);
}

// 参考切り抜き一覧
export async function fetchClips(limit = 30): Promise<Video[]> {
  return fetchJSON<Video[]>(`/api/clips?limit=${limit}`);
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

// 字幕取得（SRTダウンロード）
export function getTranscriptSrtUrl(videoId: string): string {
  return `/api/transcript/${videoId}?format=srt`;
}

// 字幕JSONデータ取得
export async function fetchTranscript(
  videoId: string
): Promise<TranscriptSegment[]> {
  return fetchJSON<TranscriptSegment[]>(`/api/transcript/${videoId}`);
}

// 各プラットフォームの検索URLを生成
export function getSearchUrls(memberName: string, keyword = ""): {
  yahoo: string;
  youtube: string;
  niconico: string;
} {
  const query = keyword ? `${memberName} ${keyword}` : memberName;
  const enc = encodeURIComponent(query);
  return {
    yahoo: `https://search.yahoo.co.jp/realtime/search?p=${enc}`,
    youtube: `https://www.youtube.com/results?search_query=${enc}`,
    niconico: `https://www.nicovideo.jp/search/${enc}`,
  };
}

// YouTubeのURLから動画IDを抽出
export function extractVideoId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  // youtu.be/xxxxx
  const shortMatch = urlOrId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // youtube.com/watch?v=xxxxx
  const longMatch = urlOrId.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (longMatch) return longMatch[1];
  // そのままIDの場合（11文字英数字）
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId)) return urlOrId;
  return null;
}
