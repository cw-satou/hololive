// アプリ状態管理

import type { AppState, Tab } from "./types";

// 初期状態
export const state: AppState = {
  activeTab: "schedule",
  selectedMembers: new Set(),
  members: [],
  scheduleVideos: [],
  archiveVideos: [],
  clipVideos: [],
  analyzeVideoId: "",
  analyzeResult: null,
  archiveMemberId: "",
  searchMemberId: "",
  searchKeyword: "",
  loading: {},
  errors: {},
};

// 状態変更リスナー
type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function notify(): void {
  listeners.forEach((fn) => fn());
}

// 状態更新ヘルパー
export function setTab(tab: Tab): void {
  state.activeTab = tab;
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
