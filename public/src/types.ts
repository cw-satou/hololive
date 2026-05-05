// 型定義

export interface Member {
  id: string;
  name: string;
  name_en: string;
  twitter: string;
  color: string;
  icon: string;
}

export interface Video {
  video_id: string;
  title: string;
  status: "live" | "upcoming" | "past";
  start_scheduled: string | null;
  start_actual: string | null;
  end_actual: string | null;
  duration: number | null;
  description: string | null;
  thumbnail: string;
  youtube_url: string;
  channel_id: string;
  channel_name: string;
  channel_english_name: string;
}

export interface Highlight {
  time_hint: string;
  description: string;
  reason: string;
}

export interface ClipSuggestion {
  title: string;
  style: string;
  description: string;
  duration_seconds: number;
}

export interface Analysis {
  summary: string;
  highlights: Highlight[];
  clip_suggestions: ClipSuggestion[];
  tags: string[];
  thumbnail_text: string;
}

export interface AnalyzeResult {
  video_id: string;
  title: string;
  member_name: string;
  thumbnail: string;
  youtube_url: string;
  analysis: Analysis;
  chat_highlights: ChatHighlight[];
  transcript_available: boolean;
}

export interface ChatHighlight {
  time: string;
  score?: number;
  type: string;
  message?: string;
  author?: string;
}

export interface Tweet {
  id: string;
  text: string;
  created_at: string;
  likes: number;
  retweets: number;
  author: string;
  username: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface XStatus {
  balance: number;
  daily_alloc: number;
  monthly_used: number;
  monthly_limit: number;
  monthly_remaining: number;
  last_updated: string;
}

// UI状態
export type Tab = "schedule" | "archives" | "analyze" | "tweets";

export interface AppState {
  activeTab: Tab;
  selectedMembers: Set<string>;
  members: Member[];
  scheduleVideos: Video[];
  archiveVideos: Video[];
  analyzeVideoId: string;
  analyzeResult: AnalyzeResult | null;
  tweets: Tweet[];
  tweetMemberId: string;
  xStatus: XStatus | null;
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}
