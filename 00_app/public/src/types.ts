// 型定義

export type Production = "vspo" | "hololive" | "all";

export type Tab =
  | "schedule"
  | "archives"
  | "clips"
  | "analyze"
  | "search"
  | "memo"
  | "rules"
  | "metadata"
  | "channels"
  | "highlights";

export interface Member {
  id: string;
  name: string;
  name_en: string;
  twitter: string;
  color: string;
  icon: string;
  production: "vspo" | "hololive";
}

export interface Video {
  video_id: string;
  title: string;
  status: "live" | "upcoming" | "past";
  available_at?: string | null;
  start_scheduled?: string | null;
  start_actual?: string | null;
  end_actual?: string | null;
  duration?: number | null;
  description?: string | null;
  thumbnail: string;
  youtube_url: string;
  channel_id?: string;
  channel_name?: string;
  channel_english_name?: string;
  production?: "vspo" | "hololive";
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

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TimestampNote {
  id: string;
  seconds: number;
  text: string;
}

export interface MetadataResult {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}

export interface HeatMarker {
  timeSeconds: number;
  intensity: number;
}

export interface TimestampComment {
  timeSeconds: number;
  timeLabel: string;
  text: string;
  likeCount: number;
}

export interface HighlightsResult {
  heatmap: HeatMarker[];
  duration: number;
  timestampComments: TimestampComment[];
  errors: string[];
}

export interface ChannelStat {
  id: string;
  name: string;
  english_name?: string;
  org?: string;
  subscriber_count?: number;
  photo?: string;
}

export interface AppState {
  activeTab: Tab;
  production: Production;
  selectedMembers: Set<string>;
  members: Member[];
  scheduleVideos: Video[];
  archiveVideos: Video[];
  clipVideos: Video[];
  archiveMemberId: string;
  analyzeVideoId: string;
  analyzeResult: AnalyzeResult | null;
  searchMemberId: string;
  searchKeyword: string;
  stampVideoUrl: string;
  stampNotes: TimestampNote[];
  stampStartTime: number | null;
  stampElapsed: number;
  metadataTitle: string;
  metadataDesc: string;
  metadataChannelName: string;
  metadataPlatform: "youtube" | "shorts" | "x";
  metadataResult: MetadataResult | null;
  channelStats: ChannelStat[];
  highlightsVideoUrl: string;
  highlightsResult: HighlightsResult | null;
  highlightsSortBy: "time" | "likes";
  loading: Record<string, boolean>;
  errors: Record<string, string>;
}
