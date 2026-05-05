// APIクライアント

import type {
  Member,
  Video,
  AnalyzeResult,
  Tweet,
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
  channelId?: string,
  limit = 20
): Promise<Video[]> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (channelId) params.set("channel_id", channelId);
  return fetchJSON<Video[]>(`/api/archives?${params}`);
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

// X API 残高確認
export interface XStatus {
  balance: number;
  daily_alloc: number;
  monthly_used: number;
  monthly_limit: number;
  monthly_remaining: number;
  last_updated: string;
}

export async function fetchXStatus(): Promise<XStatus> {
  return fetchJSON<XStatus>("/api/x-status");
}

// ファン感想ツイート
export async function fetchFanTweets(
  memberId: string,
  videoTitle?: string,
  limit = 20
): Promise<Tweet[]> {
  const params = new URLSearchParams({ member_id: memberId, limit: String(limit) });
  if (videoTitle) params.set("video_title", videoTitle);
  return fetchJSON<Tweet[]>(`/api/tweets?${params}`);
}

// メンバー本人のツイート
export async function fetchMemberTweets(
  memberId: string,
  limit = 10
): Promise<Tweet[]> {
  const params = new URLSearchParams({ member_id: memberId, limit: String(limit) });
  return fetchJSON<Tweet[]>(`/api/member-tweets?${params}`);
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
