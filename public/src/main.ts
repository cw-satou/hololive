// メインエントリーポイント
// タブ切り替え・イベントハンドラ・初期化

import {
  fetchMembers,
  fetchSchedule,
  fetchArchives,
  analyzeVideo,
  fetchFanTweets,
  fetchMemberTweets,
  fetchXStatus,
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
  renderTweets,
  renderXStatusBadge,
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
    state.archiveVideos = await fetchArchives(undefined, 30);
  } catch (e) {
    setError("archives", (e as Error).message);
  } finally {
    setLoading("archives", false);
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

// ===== ツイートタブ =====

const tweetMemberSelect = document.getElementById("tweet-member-select") as HTMLSelectElement;
const tweetSearchBtn = document.getElementById("tweet-search-btn") as HTMLButtonElement;
const tweetVideoTitleInput = document.getElementById("tweet-video-title") as HTMLInputElement;

tweetSearchBtn?.addEventListener("click", async () => {
  const memberId = tweetMemberSelect.value;
  if (!memberId) return;

  clearError("tweets");
  state.tweetMemberId = memberId;
  state.tweets = [];
  setLoading("tweets", true);

  try {
    const videoTitle = tweetVideoTitleInput?.value.trim() || undefined;
    state.tweets = await fetchFanTweets(memberId, videoTitle, 20);
    // 検索後に残高を更新して表示に反映
    state.xStatus = await fetchXStatus();
  } catch (e) {
    setError("tweets", (e as Error).message);
  } finally {
    setLoading("tweets", false);
  }
});

// ===== 描画 =====

function render(): void {
  // タブのアクティブ状態
  tabButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
  });
  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`);
  });

  // 各タブの描画
  renderSchedulePanel();
  renderArchivesPanel();
  renderAnalyzePanel();
  renderTweetsPanel();
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
  state.archiveVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
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

function renderTweetsPanel(): void {
  // 残高バッジ描画
  const statusSlot = document.getElementById("x-status-slot");
  if (statusSlot) {
    statusSlot.innerHTML = "";
    if (state.xStatus) {
      statusSlot.appendChild(renderXStatusBadge(state.xStatus));
    }
  }

  const container = document.getElementById("tweets-container");
  if (!container) return;
  container.innerHTML = "";

  if (state.loading["tweets"]) {
    container.appendChild(renderLoading());
    return;
  }
  if (state.errors["tweets"]) {
    container.appendChild(renderError(state.errors["tweets"]));
    return;
  }
  if (state.tweets.length) {
    container.appendChild(renderTweets(state.tweets));
  }
}

// ===== メンバーフィルター描画（共通） =====

function renderMemberFilters(): void {
  const filterContainers = document.querySelectorAll<HTMLElement>(".member-filter-slot");
  filterContainers.forEach((slot) => {
    slot.innerHTML = "";
    slot.appendChild(
      renderMemberFilter(state.members, state.selectedMembers, (id) => {
        toggleMember(id);
        // スケジュールタブのフィルターなら再取得
        if (slot.closest("#tab-schedule")) {
          loadSchedule();
        }
      })
    );
  });

  // メンバーセレクトボックスを更新
  [analyzeMemberSelect, tweetMemberSelect].forEach((sel) => {
    if (!sel) return;
    sel.innerHTML = `<option value="">-- メンバーを選択 --</option>`;
    state.members.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
  });
}

// ===== 初期化 =====

async function init(): Promise<void> {
  subscribe(render);

  // メンバー一覧取得
  try {
    state.members = await fetchMembers();
    renderMemberFilters();
  } catch {
    // マスターのフォールバックはなし（エラー表示のみ）
  }

  // 初期タブのデータ取得
  await loadSchedule();
  loadArchives(); // バックグラウンドで並行取得

  // X API 残高を初期取得
  fetchXStatus().then((s) => {
    state.xStatus = s;
    notify();
  }).catch(() => { /* 残高取得失敗は無視 */ });

  render();
}

init();
