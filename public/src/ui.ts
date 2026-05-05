// UI描画ヘルパー

import type { Member, Video, AnalyzeResult } from "./types";

// ===== メンバーフィルター =====

export function renderMemberFilter(
  members: Member[],
  selected: Set<string>,
  onToggle: (id: string) => void
): HTMLElement {
  const container = document.createElement("div");
  container.className = "member-filter";

  members.forEach((m) => {
    const btn = document.createElement("button");
    btn.className = `member-btn ${selected.has(m.id) ? "active" : ""}`;
    btn.style.setProperty("--member-color", m.color);
    btn.innerHTML = `<span class="member-icon">${m.icon}</span><span class="member-name">${m.name}</span>`;
    btn.addEventListener("click", () => onToggle(m.id));
    container.appendChild(btn);
  });

  return container;
}

// ===== 動画カード =====

export function renderVideoCard(video: Video): HTMLElement {
  const card = document.createElement("div");
  card.className = `video-card status-${video.status}`;
  card.dataset.videoId = video.video_id;

  const time = video.start_scheduled
    ? formatDateTime(video.start_scheduled)
    : video.start_actual
    ? formatDateTime(video.start_actual)
    : "";

  const statusLabel: Record<string, string> = {
    live: "🔴 配信中",
    upcoming: "📅 予定",
    past: "📼 アーカイブ",
  };

  card.innerHTML = `
    <div class="video-thumb">
      <img src="${video.thumbnail}" alt="${escHtml(video.title)}" loading="lazy" />
      <span class="video-status">${statusLabel[video.status] ?? ""}</span>
    </div>
    <div class="video-info">
      <p class="video-channel">${escHtml(video.channel_name)}</p>
      <h3 class="video-title">${escHtml(video.title)}</h3>
      <p class="video-time">${time}</p>
      <a class="video-link" href="${video.youtube_url}" target="_blank" rel="noopener">
        YouTubeで見る →
      </a>
    </div>
  `;

  return card;
}

// ===== 分析結果 =====

export function renderAnalysisResult(result: AnalyzeResult): HTMLElement {
  const el = document.createElement("div");
  el.className = "analysis-result";

  const highlights = result.analysis.highlights
    .map(
      (h) => `
      <li class="highlight-item">
        <span class="highlight-time">${escHtml(h.time_hint)}</span>
        <span class="highlight-desc">${escHtml(h.description)}</span>
        <span class="highlight-reason">${escHtml(h.reason)}</span>
      </li>`
    )
    .join("");

  const clips = result.analysis.clip_suggestions
    .map(
      (c) => `
      <div class="clip-card">
        <h4>${escHtml(c.title)}</h4>
        <span class="clip-style">${escHtml(c.style)}</span>
        <p>${escHtml(c.description)}</p>
        <span class="clip-duration">推奨尺: ${c.duration_seconds}秒</span>
      </div>`
    )
    .join("");

  const tags = result.analysis.tags
    .map((t) => `<span class="tag">#${escHtml(t)}</span>`)
    .join("");

  el.innerHTML = `
    <div class="analysis-header">
      <img src="${result.thumbnail}" alt="サムネイル" class="analysis-thumb" />
      <div class="analysis-meta">
        <h2>${escHtml(result.title)}</h2>
        <p class="analysis-member">${escHtml(result.member_name)}</p>
        <a href="${result.youtube_url}" target="_blank" rel="noopener">YouTubeで開く →</a>
      </div>
    </div>

    <section class="analysis-section">
      <h3>📝 配信まとめ</h3>
      <p class="analysis-summary">${escHtml(result.analysis.summary)}</p>
      <div class="tags">${tags}</div>
    </section>

    ${result.analysis.thumbnail_text ? `
    <section class="analysis-section">
      <h3>🖼️ サムネイルコピー案</h3>
      <p class="thumbnail-text">${escHtml(result.analysis.thumbnail_text)}</p>
    </section>` : ""}

    <section class="analysis-section">
      <h3>✨ 見どころ</h3>
      <ul class="highlights-list">${highlights}</ul>
    </section>

    <section class="analysis-section">
      <h3>✂️ 切り抜き提案</h3>
      <div class="clips-grid">${clips}</div>
    </section>

    ${result.transcript_available ? `
    <section class="analysis-section">
      <h3>📄 字幕データ</h3>
      <a class="btn btn-download" href="/api/transcript/${result.video_id}?format=srt" download="${result.video_id}.srt">
        SRTファイルをダウンロード
      </a>
    </section>` : ""}
  `;

  return el;
}

// ===== ファン反応検索リンク =====

export function renderSearchLinks(
  members: Member[],
  selectedMemberId: string,
  keyword: string,
  onMemberChange: (id: string) => void,
  onKeywordChange: (kw: string) => void
): HTMLElement {
  const el = document.createElement("div");
  el.className = "search-panel";

  const member = members.find((m) => m.id === selectedMemberId);
  const memberName = member?.name ?? "";

  // メンバー選択
  const selectRow = document.createElement("div");
  selectRow.className = "form-row";
  const select = document.createElement("select");
  select.className = "select-input";
  select.innerHTML = `<option value="">-- メンバーを選択 --</option>`;
  members.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.name;
    opt.selected = m.id === selectedMemberId;
    select.appendChild(opt);
  });
  select.addEventListener("change", () => onMemberChange(select.value));
  selectRow.appendChild(select);
  el.appendChild(selectRow);

  // キーワード入力
  const kwRow = document.createElement("div");
  kwRow.className = "form-row";
  const kwInput = document.createElement("input");
  kwInput.type = "text";
  kwInput.className = "text-input";
  kwInput.placeholder = "追加キーワード（任意）";
  kwInput.value = keyword;
  kwInput.addEventListener("input", () => onKeywordChange(kwInput.value));
  kwRow.appendChild(kwInput);
  el.appendChild(kwRow);

  // 検索ボタン群
  if (memberName) {
    const q = keyword ? `${memberName} ${keyword}` : memberName;
    const enc = encodeURIComponent(q);
    const links = document.createElement("div");
    links.className = "search-links";
    links.innerHTML = `
      <a class="search-btn search-btn-yahoo"
         href="https://search.yahoo.co.jp/realtime/search?p=${enc}"
         target="_blank" rel="noopener">
        🔍 Yahoo! リアルタイム検索
      </a>
      <a class="search-btn search-btn-youtube"
         href="https://www.youtube.com/results?search_query=${enc}"
         target="_blank" rel="noopener">
        ▶ YouTube で探す
      </a>
      <a class="search-btn search-btn-nico"
         href="https://www.nicovideo.jp/search/${enc}"
         target="_blank" rel="noopener">
        🎬 ニコニコ動画で探す
      </a>
    `;
    el.appendChild(links);
  } else {
    const hint = document.createElement("p");
    hint.className = "empty-message";
    hint.textContent = "メンバーを選択するとファン反応を検索できます";
    el.appendChild(hint);
  }

  return el;
}

// ===== エラー表示 =====

export function renderError(message: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "error-message";
  el.textContent = `⚠️ ${message}`;
  return el;
}

// ===== ローディング =====

export function renderLoading(): HTMLElement {
  const el = document.createElement("div");
  el.className = "loading-spinner";
  el.innerHTML = `<div class="spinner"></div><p>読み込み中...</p>`;
  return el;
}

// ===== ユーティリティ =====

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
