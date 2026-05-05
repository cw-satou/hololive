// メインエントリーポイント
// タブ切り替え・イベントハンドラ・初期化

import {
  fetchMembers,
  fetchSchedule,
  fetchArchives,
  fetchClips,
  analyzeVideo,
  extractVideoId,
} from "./api";
import {
  state,
  subscribe,
  setTab,
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
  renderError,
  renderLoading,
} from "./ui";

// DOM要素参照
const tabButtons = document.querySelectorAll<HTMLElement>(".tab-btn");
const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel");

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
      memberIds.length ? memberIds : undefined
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
    state.archiveVideos = await fetchArchives(state.archiveMemberId || undefined, 30);
  } catch (e) {
    setError("archives", (e as Error).message);
  } finally {
    setLoading("archives", false);
  }
}

// ===== 切り抜きタブ =====

async function loadClips(): Promise<void> {
  if (state.clipVideos.length) return;
  setLoading("clips", true);
  clearError("clips");
  try {
    state.clipVideos = await fetchClips(30);
  } catch (e) {
    setError("clips", (e as Error).message);
  } finally {
    setLoading("clips", false);
  }
}

// ===== 分析タブ =====

const analyzeForm = document.getElementById("analyze-form") as HTMLFormElement;
const analyzeInput = document.getElementById("video-url-input") as HTMLInputElement;
const analyzeMemberSelect = document.getElementById("analyze-member-select") as HTMLSelectElement;

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

// ===== アーカイブ メンバー絞り込み =====

const archiveMemberSelect = document.getElementById("archive-member-select") as HTMLSelectElement;
const archiveFilterBtn = document.getElementById("archive-filter-btn") as HTMLButtonElement;

archiveMemberSelect?.addEventListener("change", () => {
  state.archiveMemberId = archiveMemberSelect.value;
});

archiveFilterBtn?.addEventListener("click", () => {
  loadArchives();
});

// ===== 描画 =====

function render(): void {
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`);
  });

  renderSchedulePanel();
  renderArchivesPanel();
  renderClipsPanel();
  renderAnalyzePanel();
  renderSearchPanel();
}

function renderSchedulePanel(): void {
  const container = document.getElementById("schedule-videos");
  if (!container) return;
  container.innerHTML = "";

  if (state.loading["schedule"]) {
    container.appendChild(renderLoading());
    return;
  }
  if (state.errors["schedule"]) {
    container.appendChild(renderError(state.errors["schedule"]));
    return;
  }
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

  if (state.loading["archives"]) {
    container.appendChild(renderLoading());
    return;
  }
  if (state.errors["archives"]) {
    container.appendChild(renderError(state.errors["archives"]));
    return;
  }
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

  if (state.loading["clips"]) {
    container.appendChild(renderLoading());
    return;
  }
  if (state.errors["clips"]) {
    container.appendChild(renderError(state.errors["clips"]));
    return;
  }
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

  if (state.loading["analyze"]) {
    resultContainer.appendChild(renderLoading());
    return;
  }
  if (state.errors["analyze"]) {
    resultContainer.appendChild(renderError(state.errors["analyze"]));
    return;
  }
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

// ===== メンバーフィルター描画（共通） =====

function renderMemberFilters(): void {
  const filterContainers = document.querySelectorAll<HTMLElement>(".member-filter-slot");
  filterContainers.forEach((slot) => {
    slot.innerHTML = "";
    slot.appendChild(
      renderMemberFilter(state.members, state.selectedMembers, (id) => {
        toggleMember(id);
        if (slot.closest("#tab-schedule")) {
          loadSchedule();
        }
      })
    );
  });

  // 分析・アーカイブのセレクトボックスを更新
  [analyzeMemberSelect, archiveMemberSelect].forEach((sel) => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = `<option value="">-- 全メンバー --</option>`;
    state.members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
    sel.value = currentVal;
  });

  if (analyzeMemberSelect) {
    analyzeMemberSelect.querySelector("option")!.textContent = "-- メンバーを選択（任意） --";
  }
}

// ===== タブ切り替え時のデータ遅延ロード =====

subscribe(() => {
  if (state.activeTab === "clips" && !state.clipVideos.length && !state.loading["clips"]) {
    loadClips();
  }
});

// ===== 初期化 =====

async function init(): Promise<void> {
  subscribe(render);

  try {
    state.members = await fetchMembers();
    renderMemberFilters();
  } catch {
    // メンバー取得失敗は無視
  }

  await loadSchedule();
  loadArchives();

  render();
}

init();
