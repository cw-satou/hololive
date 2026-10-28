// アプリ状態管理

import type { AppState, Tab, Production } from "./types";

export const state: AppState = {
  activeTab: "archives",
  production: "all",
  selectedMembers: new Set(),
  members: [],
  scheduleVideos: [],
  archiveVideos: [],
  clipVideos: [],
  archiveMemberId: "",
  analyzeVideoId: "",
  analyzeResult: null,
  searchMemberId: "",
  searchKeyword: "",
  stampVideoUrl: "",
  stampNotes: [],
  stampStartTime: null,
  stampElapsed: 0,
  metadataTitle: "",
  metadataDesc: "",
  metadataChannelName: "",
  metadataPlatform: "youtube",
  metadataResult: null,
  channelStats: [],
  highlightsVideoUrl: "",
  highlightsResult: null,
  highlightsSortBy: "time",
  loading: {},
  errors: {},
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(): void {
  listeners.forEach((fn) => fn());
}

export function setTab(tab: Tab): void {
  state.activeTab = tab;
  notify();
}

export function setProduction(prod: Production): void {
  state.production = prod;
  // プロダクション切り替え時はキャッシュをクリア
  state.scheduleVideos = [];
  state.archiveVideos = [];
  state.clipVideos = [];
  state.channelStats = [];
  state.selectedMembers = new Set();
  notify();
}

export function toggleMember(id: string): void {
  if (state.selectedMembers.has(id)) {
    state.selectedMembers.delete(id);
  } else {
    state.selectedMembers.add(id);
  }
  notify();
}

export function setLoading(key: string, value: boolean): void {
  state.loading[key] = value;
  notify();
}

export function setError(key: string, message: string): void {
  state.errors[key] = message;
  notify();
}

export function clearError(key: string): void {
  delete state.errors[key];
}
