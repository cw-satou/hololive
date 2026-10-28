// メインエントリーポイント

import {
  fetchMembers,
  fetchSchedule,
  fetchArchives,
  fetchClips,
  analyzeVideo,
  generateMetadata,
  fetchChannelStats,
  fetchHighlights,
  extractVideoId,
} from "./api";
import {
  state,
  subscribe,
  setTab,
  setProduction,
  toggleMember,
  setLoading,
  setError,
  clearError,
  notify,
} from "./state";
import {
  renderMemberFilter,
  renderVideoCard,
  renderAnalysisResult,
  renderSearchLinks,
  renderStampNotes,
  renderMetadataResult,
  renderRules,
  renderChannelStats,
  renderHeatmap,
  renderTimestampComments,
  renderError,
  renderLoading,
  formatSeconds,
} from "./ui";
import type { TimestampNote, Production } from "./types";

// ===== DOM参照 =====

const tabButtons = document.querySelectorAll<HTMLElement>(".tab-btn");
const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel");
const prodButtons = document.querySelectorAll<HTMLElement>(".prod-btn");
const analyzeForm = document.getElementById("analyze-form") as HTMLFormElement;
const analyzeInput = document.getElementById("video-url-input") as HTMLInputElement;
const analyzeMemberSelect = document.getElementById("analyze-member-select") as HTMLSelectElement;
const archiveMemberSelect = document.getElementById("archive-member-select") as HTMLSelectElement;
const archiveFilterBtn = document.getElementById("archive-filter-btn") as HTMLButtonElement;

// タイムスタンプメモ関連
const stampVideoUrlInput = document.getElementById("stamp-video-url") as HTMLInputElement;
const stampOpenBtn = document.getElementById("stamp-open-btn") as HTMLButtonElement;
const stampStartBtn = document.getElementById("stamp-start-btn") as HTMLButtonElement;
const stampElapsedEl = document.getElementById("stamp-elapsed") as HTMLElement;
const stampNoteInput = document.getElementById("stamp-note-input") as HTMLInputElement;
const stampAddBtn = document.getElementById("stamp-add-btn") as HTMLButtonElement;
const stampNotesContainer = document.getElementById("stamp-notes-list") as HTMLElement;
const stampCopyBtn = document.getElementById("stamp-copy-btn") as HTMLButtonElement;
const stampClearBtn = document.getElementById("stamp-clear-btn") as HTMLButtonElement;
// Shorts計算
const shortsDurationMin = document.getElementById("shorts-min") as HTMLInputElement;
const shortsDurationSec = document.getElementById("shorts-sec") as HTMLInputElement;
const shortsCalcBtn = document.getElementById("shorts-calc-btn") as HTMLButtonElement;
const shortsResult = document.getElementById("shorts-result") as HTMLElement;

// 盛り上がり分析関連
const highlightsInput = document.getElementById("highlights-video-url") as HTMLInputElement;
const highlightsSubmitBtn = document.getElementById("highlights-submit") as HTMLButtonElement;
const highlightsHeatmapContainer = document.getElementById("highlights-heatmap") as HTMLElement;
const highlightsCommentsContainer = document.getElementById("highlights-comments") as HTMLElement;
const highlightsSortTimeBtn = document.getElementById("highlights-sort-time") as HTMLButtonElement;
const highlightsSortLikesBtn = document.getElementById("highlights-sort-likes") as HTMLButtonElement;

// メタデータ生成関連
const metaTitleInput = document.getElementById("meta-video-title") as HTMLInputElement;
const metaDescInput = document.getElementById("meta-desc") as HTMLTextAreaElement;
const metaChannelInput = document.getElementById("meta-channel") as HTMLInputElement;
const metaPlatformSelect = document.getElementById("meta-platform") as HTMLSelectElement;
const metaSubmitBtn = document.getElementById("meta-submit") as HTMLButtonElement;
const metaResultContainer = document.getElementById("meta-result") as HTMLElement;

// ===== プロダクション選択 =====

prodButtons.forEach((btn) => {
  btn.addEventListener("click", async () => {
    const prod = btn.dataset.prod as Production;
    if (!prod || prod === state.production) return;
    setProduction(prod);
    // メンバー一覧を再取得
    state.members = await fetchMembers(prod).catch(() => []);
    renderMemberFilters();
    notify();
    // アクティブタブのデータを再取得
    reloadActiveTab();
  });
});

// ===== タブ切り替え =====

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = btn.dataset.tab as typeof state.activeTab;
    if (tab) setTab(tab);
  });
});

// ===== スケジュールタブ =====

async function loadSchedule(): Promise<void> {
  setLoading("schedule", true);
  clearError("schedule");
  try {
    const memberIds = Array.from(state.selectedMembers);
    state.scheduleVideos = await fetchSchedule(
      memberIds.length ? memberIds : undefined,
      state.production
    );
  } catch (e) {
    setError("schedule", (e as Error).message);
  } finally {
    setLoading("schedule", false);
  }
}

// ===== アーカイブタブ =====

async function loadArchives(): Promise<void> {
  setLoading("archives", true);
  clearError("archives");
  try {
    state.archiveVideos = await fetchArchives(
      state.archiveMemberId || undefined,
      30,
      state.production
    );
  } catch (e) {
    setError("archives", (e as Error).message);
  } finally {
    setLoading("archives", false);
  }
}

archiveMemberSelect?.addEventListener("change", () => {
  state.archiveMemberId = archiveMemberSelect.value;
});

archiveFilterBtn?.addEventListener("click", () => {
  loadArchives();
});

// ===== 参考切り抜きタブ =====

async function loadClips(): Promise<void> {
  if (state.clipVideos.length) return;
  setLoading("clips", true);
  clearError("clips");
  try {
    state.clipVideos = await fetchClips(30, state.production);
  } catch (e) {
    setError("clips", (e as Error).message);
  } finally {
    setLoading("clips", false);
  }
}

// ===== 動画分析タブ =====

analyzeForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const rawInput = analyzeInput.value.trim();
  const videoId = extractVideoId(rawInput);

  if (!videoId) {
    setError("analyze", "正しいYouTube URLまたは動画IDを入力してください");
    notify();
    return;
  }

  clearError("analyze");
  state.analyzeVideoId = videoId;
  state.analyzeResult = null;
  setLoading("analyze", true);

  try {
    const memberId = analyzeMemberSelect.value || undefined;
    state.analyzeResult = await analyzeVideo(videoId, memberId);
  } catch (e) {
    setError("analyze", (e as Error).message);
  } finally {
    setLoading("analyze", false);
  }
});

// ===== タイムスタンプメモタブ =====

let timerInterval: ReturnType<typeof setInterval> | null = null;

function updateStampDisplay(): void {
  if (stampElapsedEl) {
    stampElapsedEl.textContent = formatSeconds(state.stampElapsed);
  }
}

stampOpenBtn?.addEventListener("click", () => {
  const url = stampVideoUrlInput.value.trim();
  if (url) window.open(url, "_blank", "noopener");
});

stampStartBtn?.addEventListener("click", () => {
  if (state.stampStartTime === null) {
    // タイマー開始
    state.stampStartTime = Date.now() - state.stampElapsed * 1000;
    stampStartBtn.textContent = "⏹ 停止";
    timerInterval = setInterval(() => {
      state.stampElapsed = Math.floor((Date.now() - state.stampStartTime!) / 1000);
      updateStampDisplay();
    }, 1000);
  } else {
    // タイマー停止
    state.stampElapsed = Math.floor((Date.now() - state.stampStartTime) / 1000);
    state.stampStartTime = null;
    stampStartBtn.textContent = "▶ 開始";
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }
});

stampAddBtn?.addEventListener("click", () => {
  const text = stampNoteInput.value.trim();
  if (!text) return;
  const note: TimestampNote = {
    id: String(Date.now()),
    seconds: state.stampElapsed,
    text,
  };
  state.stampNotes = [...state.stampNotes, note];
  stampNoteInput.value = "";
  renderStampNotesList();
});

stampNoteInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") stampAddBtn?.click();
});

function renderStampNotesList(): void {
  if (!stampNotesContainer) return;
  stampNotesContainer.innerHTML = "";
  stampNotesContainer.appendChild(renderStampNotes(state.stampNotes));
  // 削除ボタンにイベントをバインド
  stampNotesContainer.querySelectorAll(".stamp-note-del").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = (btn as HTMLElement).dataset.id;
      state.stampNotes = state.stampNotes.filter((n) => n.id !== id);
      renderStampNotesList();
    });
  });
}

stampCopyBtn?.addEventListener("click", () => {
  if (!state.stampNotes.length) return;
  const text = state.stampNotes
    .map((n) => `[${formatSeconds(n.seconds)}] ${n.text}`)
    .join("\n");
  navigator.clipboard.writeText(text).then(() => {
    const orig = stampCopyBtn.textContent;
    stampCopyBtn.textContent = "✓ コピー済み";
    setTimeout(() => { stampCopyBtn.textContent = orig; }, 2000);
  });
});

stampClearBtn?.addEventListener("click", () => {
  if (!confirm("メモを全削除しますか？")) return;
  state.stampNotes = [];
  state.stampElapsed = 0;
  state.stampStartTime = null;
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  if (stampStartBtn) stampStartBtn.textContent = "▶ 開始";
  updateStampDisplay();
  renderStampNotesList();
});

// Shorts計算
shortsCalcBtn?.addEventListener("click", () => {
  const min = parseInt(shortsDurationMin.value || "0", 10);
  const sec = parseInt(shortsDurationSec.value || "0", 10);
  const totalSec = min * 60 + sec;
  if (!totalSec) {
    shortsResult.innerHTML = `<p class="empty-message">動画の長さを入力してください</p>`;
    return;
  }
  const shorts60 = Math.floor(totalSec / 60);
  const shorts45 = Math.floor(totalSec / 45);
  const tiktok3min = Math.floor(totalSec / 180);
  shortsResult.innerHTML = `
    <div class="shorts-result-grid">
      <div class="shorts-result-item">
        <span class="shorts-platform">YouTube Shorts / TikTok</span>
        <span class="shorts-count">最大60秒: <strong>${shorts60}本</strong></span>
        <span class="shorts-count">推奨45秒: <strong>${shorts45}本</strong></span>
      </div>
      <div class="shorts-result-item">
        <span class="shorts-platform">TikTok 長尺（3分）</span>
        <span class="shorts-count">最大3分: <strong>${tiktok3min}本</strong></span>
      </div>
      <div class="shorts-result-item">
        <span class="shorts-platform">X動画（2分20秒=140秒）</span>
        <span class="shorts-count">最大2分20秒: <strong>${Math.floor(totalSec / 140)}本</strong></span>
      </div>
    </div>
    <p class="shorts-note">※切り抜きの質を優先し、動画数は目安として活用してください</p>
  `;
});

// ===== 盛り上がり分析タブ =====

function renderHighlightsResult(): void {
  const result = state.highlightsResult;
  if (!result) return;
  const videoId = extractVideoId(state.highlightsVideoUrl) ?? "";

  highlightsHeatmapContainer.innerHTML = "";
  highlightsHeatmapContainer.appendChild(renderHeatmap(result.heatmap, result.duration, videoId));

  highlightsCommentsContainer.innerHTML = "";
  highlightsCommentsContainer.appendChild(
    renderTimestampComments(result.timestampComments, videoId, state.highlightsSortBy)
  );
}

highlightsSubmitBtn?.addEventListener("click", async () => {
  const rawInput = highlightsInput.value.trim();
  const videoId = extractVideoId(rawInput);

  if (!videoId) {
    highlightsHeatmapContainer.innerHTML = "";
    highlightsHeatmapContainer.appendChild(renderError("正しいYouTube URLまたは動画IDを入力してください"));
    return;
  }

  state.highlightsVideoUrl = rawInput;
  state.highlightsResult = null;
  highlightsSubmitBtn.disabled = true;
  highlightsSubmitBtn.textContent = "取得中...";
  highlightsHeatmapContainer.innerHTML = "";
  highlightsHeatmapContainer.appendChild(renderLoading());
  highlightsCommentsContainer.innerHTML = "";

  try {
    state.highlightsResult = await fetchHighlights(videoId);
    renderHighlightsResult();

    // APIエラーを表示
    if (state.highlightsResult.errors.length) {
      state.highlightsResult.errors.forEach((e) => {
        if (e.includes("コメント")) {
          const note = document.createElement("p");
          note.className = "highlights-warn";
          note.textContent = `⚠️ ${e}`;
          highlightsCommentsContainer.prepend(note);
        }
      });
    }
  } catch (e) {
    highlightsHeatmapContainer.innerHTML = "";
    highlightsHeatmapContainer.appendChild(renderError((e as Error).message));
  } finally {
    highlightsSubmitBtn.disabled = false;
    highlightsSubmitBtn.textContent = "📈 取得する";
  }
});

highlightsInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") highlightsSubmitBtn?.click();
});

function updateHighlightsSortButtons(): void {
  highlightsSortTimeBtn?.classList.toggle("active", state.highlightsSortBy === "time");
  highlightsSortLikesBtn?.classList.toggle("active", state.highlightsSortBy === "likes");
}

highlightsSortTimeBtn?.addEventListener("click", () => {
  state.highlightsSortBy = "time";
  updateHighlightsSortButtons();
  if (state.highlightsResult) renderHighlightsResult();
});

highlightsSortLikesBtn?.addEventListener("click", () => {
  state.highlightsSortBy = "likes";
  updateHighlightsSortButtons();
  if (state.highlightsResult) renderHighlightsResult();
});

// ===== メタデータ生成タブ =====

metaSubmitBtn?.addEventListener("click", async () => {
  const title = metaTitleInput.value.trim();
  const desc = metaDescInput.value.trim();
  if (!title && !desc) {
    metaResultContainer.innerHTML = `<p class="empty-message">タイトルまたは説明文を入力してください</p>`;
    return;
  }
  metaSubmitBtn.disabled = true;
  metaSubmitBtn.textContent = "生成中...";
  metaResultContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI生成中...</p></div>`;
  try {
    const result = await generateMetadata({
      video_title: title || undefined,
      video_description: desc || undefined,
      channel_name: metaChannelInput.value.trim() || undefined,
      production: state.production !== "all" ? state.production : undefined,
      platform: (metaPlatformSelect.value || "youtube") as "youtube" | "shorts" | "x",
    });
    state.metadataResult = result;
    metaResultContainer.innerHTML = "";
    metaResultContainer.appendChild(renderMetadataResult(result));
  } catch (e) {
    metaResultContainer.innerHTML = "";
    metaResultContainer.appendChild(renderError((e as Error).message));
  } finally {
    metaSubmitBtn.disabled = false;
    metaSubmitBtn.textContent = "🎯 メタデータを生成";
  }
});

// ===== チャンネル統計タブ =====

async function loadChannelStats(): Promise<void> {
  if (state.channelStats.length) return;
  setLoading("channels", true);
  clearError("channels");
  try {
    state.channelStats = await fetchChannelStats(state.production);
  } catch (e) {
    setError("channels", (e as Error).message);
  } finally {
    setLoading("channels", false);
  }
}

// ===== 描画 =====

function render(): void {
  // タブ・パネルのアクティブ状態を更新
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`);
  });

  // グループラベルのアクティブ状態を更新（現在のステップを強調）
  document.querySelectorAll<HTMLElement>(".tab-group").forEach((group) => {
    const hasActive = Boolean(group.querySelector(`.tab-btn[data-tab="${state.activeTab}"]`));
    group.classList.toggle("active-group", hasActive);
  });

  // プロダクションボタン
  prodButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.prod === state.production);
  });

  renderSchedulePanel();
  renderArchivesPanel();
  renderClipsPanel();
  renderAnalyzePanel();
  renderSearchPanel();
  renderRulesPanel();
  renderChannelsPanel();
}

function renderSchedulePanel(): void {
  const container = document.getElementById("schedule-videos");
  if (!container) return;
  container.innerHTML = "";
  if (state.loading["schedule"]) { container.appendChild(renderLoading()); return; }
  if (state.errors["schedule"]) { container.appendChild(renderError(state.errors["schedule"])); return; }
  if (!state.scheduleVideos.length) {
    container.innerHTML = `<p class="empty-message">現在配信予定はありません</p>`;
    return;
  }
  state.scheduleVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
}

function renderArchivesPanel(): void {
  const container = document.getElementById("archive-videos");
  if (!container) return;
  container.innerHTML = "";
  if (state.loading["archives"]) { container.appendChild(renderLoading()); return; }
  if (state.errors["archives"]) { container.appendChild(renderError(state.errors["archives"])); return; }
  if (!state.archiveVideos.length) {
    container.innerHTML = `<p class="empty-message">アーカイブが見つかりませんでした</p>`;
    return;
  }
  state.archiveVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
}

function renderClipsPanel(): void {
  const container = document.getElementById("clips-videos");
  if (!container) return;
  container.innerHTML = "";
  if (state.loading["clips"]) { container.appendChild(renderLoading()); return; }
  if (state.errors["clips"]) { container.appendChild(renderError(state.errors["clips"])); return; }
  if (!state.clipVideos.length) {
    container.innerHTML = `<p class="empty-message">切り抜き動画が見つかりませんでした</p>`;
    return;
  }
  state.clipVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
}

function renderAnalyzePanel(): void {
  const resultContainer = document.getElementById("analyze-result");
  if (!resultContainer) return;
  resultContainer.innerHTML = "";
  if (state.loading["analyze"]) { resultContainer.appendChild(renderLoading()); return; }
  if (state.errors["analyze"]) { resultContainer.appendChild(renderError(state.errors["analyze"])); return; }
  if (state.analyzeResult) {
    resultContainer.appendChild(renderAnalysisResult(state.analyzeResult));
  }
}

function renderSearchPanel(): void {
  const container = document.getElementById("search-container");
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(
    renderSearchLinks(
      state.members,
      state.searchMemberId,
      state.searchKeyword,
      (id) => { state.searchMemberId = id; notify(); },
      (kw) => { state.searchKeyword = kw; notify(); }
    )
  );
}

function renderRulesPanel(): void {
  const container = document.getElementById("rules-container");
  if (!container) return;
  container.innerHTML = "";
  container.appendChild(renderRules(state.production));
}

function renderChannelsPanel(): void {
  const container = document.getElementById("channels-container");
  if (!container) return;
  container.innerHTML = "";
  if (state.loading["channels"]) { container.appendChild(renderLoading()); return; }
  if (state.errors["channels"]) { container.appendChild(renderError(state.errors["channels"])); return; }
  container.appendChild(renderChannelStats(state.channelStats));
}

// ===== メンバーフィルター描画（共通） =====

function renderMemberFilters(): void {
  const filterContainers = document.querySelectorAll<HTMLElement>(".member-filter-slot");
  filterContainers.forEach((slot) => {
    slot.innerHTML = "";
    slot.appendChild(
      renderMemberFilter(state.members, state.selectedMembers, (id) => {
        toggleMember(id);
        if (slot.closest("#tab-schedule")) loadSchedule();
      })
    );
  });

  [analyzeMemberSelect, archiveMemberSelect].forEach((sel) => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = `<option value="">-- 全メンバー --</option>`;
    state.members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = `${m.icon} ${m.name}`;
      sel.appendChild(opt);
    });
    sel.value = currentVal;
  });

  if (analyzeMemberSelect) {
    (analyzeMemberSelect.querySelector("option") as HTMLOptionElement).textContent =
      "-- メンバーを選択（任意） --";
  }
}

// ===== タブ切り替え時の遅延ロード =====

subscribe(() => {
  if (state.activeTab === "clips" && !state.clipVideos.length && !state.loading["clips"]) {
    loadClips();
  }
  if (state.activeTab === "channels" && !state.channelStats.length && !state.loading["channels"]) {
    loadChannelStats();
  }
});

function reloadActiveTab(): void {
  switch (state.activeTab) {
    case "schedule": loadSchedule(); break;
    case "archives": loadArchives(); break;
    case "clips": state.clipVideos = []; loadClips(); break;
    case "channels": state.channelStats = []; loadChannelStats(); break;
  }
}

// ===== 初期化 =====

async function init(): Promise<void> {
  subscribe(render);

  try {
    state.members = await fetchMembers(state.production);
    renderMemberFilters();
  } catch {
    // メンバー取得失敗は無視
  }

  // タイムスタンプメモの初期表示
  renderStampNotesList();
  updateStampDisplay();

  await loadSchedule();
  loadArchives();

  render();
}

init();
