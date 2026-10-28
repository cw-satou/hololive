// UI描画ヘルパー

import type { Member, Video, AnalyzeResult, TimestampNote, MetadataResult, ChannelStat, Production, HeatMarker, TimestampComment } from "./types";
import { CLIP_RULES } from "./rules";

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

  const time =
    video.start_scheduled
      ? formatDateTime(video.start_scheduled)
      : video.start_actual
      ? formatDateTime(video.start_actual)
      : video.available_at
      ? formatDateTime(video.available_at)
      : "";

  const statusLabel: Record<string, string> = {
    live: "🔴 配信中",
    upcoming: "📅 予定",
    past: "📼 アーカイブ",
  };

  const prodBadge =
    video.production === "vspo"
      ? `<span class="prod-badge prod-vspo">ぶいすぽ</span>`
      : video.production === "hololive"
      ? `<span class="prod-badge prod-hololive">ホロライブ</span>`
      : "";

  card.innerHTML = `
    <div class="video-thumb">
      <img src="${escHtml(video.thumbnail)}" alt="${escHtml(video.title)}" loading="lazy" />
      <span class="video-status">${statusLabel[video.status] ?? ""}</span>
    </div>
    <div class="video-info">
      <div class="video-channel-row">
        <p class="video-channel">${escHtml(video.channel_name ?? "")}</p>
        ${prodBadge}
      </div>
      <h3 class="video-title">${escHtml(video.title)}</h3>
      <p class="video-time">${time}</p>
      <a class="video-link" href="${escHtml(video.youtube_url)}" target="_blank" rel="noopener">
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
      <img src="${escHtml(result.thumbnail)}" alt="サムネイル" class="analysis-thumb" />
      <div class="analysis-meta">
        <h2>${escHtml(result.title)}</h2>
        <p class="analysis-member">${escHtml(result.member_name)}</p>
        <a href="${escHtml(result.youtube_url)}" target="_blank" rel="noopener">YouTubeで開く →</a>
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
      <a class="btn btn-download" href="/api/transcript/${escHtml(result.video_id)}?format=srt" download="${escHtml(result.video_id)}.srt">
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

// ===== タイムスタンプメモ一覧 =====

export function renderStampNotes(notes: TimestampNote[]): HTMLElement {
  const el = document.createElement("div");
  el.className = "stamp-notes";

  if (!notes.length) {
    el.innerHTML = `<p class="empty-message">メモがまだありません。タイマーを開始してメモを追加しましょう</p>`;
    return el;
  }

  notes.forEach((n) => {
    const item = document.createElement("div");
    item.className = "stamp-note-item";
    item.dataset.id = n.id;
    item.innerHTML = `
      <span class="stamp-note-time">${formatSeconds(n.seconds)}</span>
      <span class="stamp-note-text">${escHtml(n.text)}</span>
      <button class="stamp-note-del" data-id="${n.id}" title="削除">✕</button>
    `;
    el.appendChild(item);
  });

  return el;
}

// ===== AIメタデータ結果 =====

export function renderMetadataResult(result: MetadataResult): HTMLElement {
  const el = document.createElement("div");
  el.className = "meta-result";

  const tagsHtml = result.tags.map((t) => `<span class="tag">#${escHtml(t)}</span>`).join("");
  const hashtagsHtml = result.hashtags.map((h) => `<span class="tag">${escHtml(h)}</span>`).join("");

  el.innerHTML = `
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">タイトル</span>
        <button class="copy-btn" data-copy="${escAttr(result.title)}">📋 コピー</button>
      </div>
      <p class="meta-block-content">${escHtml(result.title)}</p>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">説明文</span>
        <button class="copy-btn" data-copy="${escAttr(result.description)}">📋 コピー</button>
      </div>
      <p class="meta-block-content">${escHtml(result.description)}</p>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">タグ</span>
        <button class="copy-btn" data-copy="${escAttr(result.tags.join(", "))}">📋 コピー</button>
      </div>
      <div class="tags">${tagsHtml}</div>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">ハッシュタグ</span>
        <button class="copy-btn" data-copy="${escAttr(result.hashtags.join(" "))}">📋 コピー</button>
      </div>
      <div class="tags">${hashtagsHtml}</div>
    </div>
  `;

  el.querySelectorAll(".copy-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const text = (btn as HTMLElement).dataset.copy ?? "";
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = "✓ コピー済み";
        setTimeout(() => { btn.textContent = "📋 コピー"; }, 2000);
      });
    });
  });

  return el;
}

// ===== 切り抜きルール =====

export function renderRules(production: Production): HTMLElement {
  const el = document.createElement("div");
  el.className = "rules-panel";

  const rules =
    production === "all"
      ? CLIP_RULES
      : CLIP_RULES.filter((r) => r.production === production);

  rules.forEach((rule) => {
    const section = document.createElement("div");
    section.className = "rules-section";

    const monetizationClass =
      rule.monetization_status === "OK"
        ? "status-ok"
        : rule.monetization_status === "conditional"
        ? "status-conditional"
        : "status-ng";

    const allowedHtml = rule.allowed
      .map((a) => `<li>${escHtml(a)}</li>`)
      .join("");
    const prohibitedHtml = rule.prohibited
      .map((p) => `<li>${escHtml(p)}</li>`)
      .join("");
    const notesHtml = rule.notes
      .map((n) => `<li>${escHtml(n)}</li>`)
      .join("");

    section.innerHTML = `
      <div class="rules-header">
        <span class="rules-emoji">${rule.emoji}</span>
        <h3 class="rules-title">${escHtml(rule.production_name)}</h3>
      </div>
      <div class="rules-monetization ${monetizationClass}">
        <strong>収益化:</strong> ${escHtml(rule.monetization_detail)}
      </div>
      <div class="rules-credits">
        <strong>クレジット:</strong> ${escHtml(rule.credits)}
      </div>
      <div class="rules-columns">
        <div class="rules-column">
          <h4 class="rules-col-title rules-ok">✅ 許可されていること</h4>
          <ul>${allowedHtml}</ul>
        </div>
        <div class="rules-column">
          <h4 class="rules-col-title rules-ng">❌ 禁止されていること</h4>
          <ul>${prohibitedHtml}</ul>
        </div>
      </div>
      ${notesHtml ? `
      <div class="rules-notes">
        <h4>📌 注意事項</h4>
        <ul>${notesHtml}</ul>
      </div>` : ""}
      <div class="rules-source">
        <a href="${escHtml(rule.source_url)}" target="_blank" rel="noopener">
          📄 ${escHtml(rule.source_label)}
        </a>
      </div>
    `;

    el.appendChild(section);
  });

  return el;
}

// ===== チャンネル統計 =====

export function renderChannelStats(stats: ChannelStat[]): HTMLElement {
  const el = document.createElement("div");
  el.className = "channel-stats";

  if (!stats.length) {
    el.innerHTML = `<p class="empty-message">チャンネル情報がありません</p>`;
    return el;
  }

  stats.forEach((ch, i) => {
    const row = document.createElement("div");
    row.className = "channel-row";

    const prodBadge =
      ch.org === "VSpo"
        ? `<span class="prod-badge prod-vspo">ぶいすぽ</span>`
        : ch.org === "Hololive"
        ? `<span class="prod-badge prod-hololive">ホロライブ</span>`
        : "";

    const subs = ch.subscriber_count
      ? formatSubscribers(ch.subscriber_count)
      : "不明";

    row.innerHTML = `
      <span class="channel-rank">${i + 1}</span>
      <div class="channel-info">
        <span class="channel-name">${escHtml(ch.name)}</span>
        ${ch.english_name ? `<span class="channel-name-en">${escHtml(ch.english_name)}</span>` : ""}
        ${prodBadge}
      </div>
      <span class="channel-subs">${subs}</span>
    `;
    el.appendChild(row);
  });

  return el;
}

// ===== 再生ヒートマップ =====

export function renderHeatmap(markers: HeatMarker[], duration: number, videoId: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "heatmap-wrap";

  if (!markers.length) {
    el.innerHTML = `<p class="heatmap-empty">Most Replayed データが取得できませんでした。<br>配信間もない動画や再生数が少ない動画は未対応の場合があります。</p>`;
    return el;
  }

  const maxIntensity = Math.max(...markers.map((m) => m.intensity), 0.001);

  // バーチャート
  const chart = document.createElement("div");
  chart.className = "heatmap-chart";

  markers.forEach((m) => {
    const bar = document.createElement("a");
    bar.className = "heatmap-bar";
    bar.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${m.timeSeconds}s`;
    bar.target = "_blank";
    bar.rel = "noopener";
    bar.title = `${formatSeconds(m.timeSeconds)}（強度 ${Math.round((m.intensity / maxIntensity) * 100)}%）`;
    const pct = (m.intensity / maxIntensity) * 100;
    bar.style.height = `${Math.max(pct, 2)}%`;
    // 強度に応じて色を変化（低: 青系 → 高: 赤系）
    const hue = Math.round(220 - pct * 1.8);
    bar.style.background = `hsl(${hue}, 75%, 52%)`;
    bar.style.opacity = String(0.4 + (pct / 100) * 0.6);
    chart.appendChild(bar);
  });

  el.appendChild(chart);

  // 時間ラベル
  if (duration > 0) {
    const labels = document.createElement("div");
    labels.className = "heatmap-labels";
    for (let i = 0; i <= 4; i++) {
      const sec = Math.floor((duration * i) / 4);
      const span = document.createElement("span");
      span.textContent = formatSeconds(sec);
      labels.appendChild(span);
    }
    el.appendChild(labels);
  }

  // ピーク TOP10
  const peaks = [...markers]
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 10);

  const peakSection = document.createElement("div");
  peakSection.className = "peak-list";
  peakSection.innerHTML = `<h4 class="peak-list-title">🔥 再生ピーク TOP${peaks.length}</h4>`;

  peaks.forEach((peak, i) => {
    const row = document.createElement("a");
    row.className = "peak-row";
    row.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${peak.timeSeconds}s`;
    row.target = "_blank";
    row.rel = "noopener";
    const pct = Math.round((peak.intensity / maxIntensity) * 100);
    row.innerHTML = `
      <span class="peak-rank">${i + 1}</span>
      <span class="peak-time">${formatSeconds(peak.timeSeconds)}</span>
      <div class="peak-bar-wrap">
        <div class="peak-bar" style="width:${pct}%"></div>
      </div>
      <span class="peak-pct">${pct}%</span>
    `;
    peakSection.appendChild(row);
  });

  el.appendChild(peakSection);
  return el;
}

// ===== タイムスタンプコメント =====

export function renderTimestampComments(
  comments: TimestampComment[],
  videoId: string,
  sortBy: "time" | "likes"
): HTMLElement {
  const el = document.createElement("div");
  el.className = "ts-comments";

  if (!comments.length) {
    el.innerHTML = `<p class="empty-message">タイムスタンプ付きコメントが見つかりませんでした<br><small>コメント取得にはYOUTUBE_API_KEYが必要です</small></p>`;
    return el;
  }

  const sorted = [...comments].sort(
    sortBy === "time"
      ? (a, b) => a.timeSeconds - b.timeSeconds || b.likeCount - a.likeCount
      : (a, b) => b.likeCount - a.likeCount || a.timeSeconds - b.timeSeconds
  );

  sorted.forEach((c) => {
    const item = document.createElement("div");
    item.className = "ts-comment-item";
    const likeHtml =
      c.likeCount > 0
        ? `<span class="ts-like">👍 ${c.likeCount.toLocaleString()}</span>`
        : "";
    item.innerHTML = `
      <a class="ts-time-link"
         href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${c.timeSeconds}s"
         target="_blank" rel="noopener">
        ⏱ ${escHtml(c.timeLabel)}
      </a>
      <p class="ts-text">${escHtml(c.text.length > 160 ? c.text.slice(0, 160) + "…" : c.text)}</p>
      ${likeHtml}
    `;
    el.appendChild(item);
  });

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

function escAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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

export function formatSeconds(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatSubscribers(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${Math.floor(count / 10_000)}万`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}
