"use strict";
(() => {
  // public/src/api.ts
  var BASE = "";
  async function fetchJSON(url, options) {
    const resp = await fetch(BASE + url, options);
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || `HTTP\u30A8\u30E9\u30FC: ${resp.status}`);
    }
    return resp.json();
  }
  async function fetchMembers() {
    return fetchJSON("/api/members");
  }
  async function fetchSchedule(memberIds) {
    const params = memberIds?.length ? `?member_ids=${memberIds.join(",")}` : "";
    return fetchJSON(`/api/schedule${params}`);
  }
  async function fetchArchives(memberId, limit = 30) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (memberId)
      params.set("member_id", memberId);
    return fetchJSON(`/api/archives?${params}`);
  }
  async function fetchClips(limit = 30) {
    return fetchJSON(`/api/clips?limit=${limit}`);
  }
  async function analyzeVideo(videoId, memberId, options) {
    return fetchJSON("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        video_id: videoId,
        member_id: memberId,
        include_transcript: options?.includeTranscript ?? true,
        include_chat: options?.includeChat ?? true
      })
    });
  }
  function extractVideoId(urlOrId) {
    if (!urlOrId)
      return null;
    const shortMatch = urlOrId.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch)
      return shortMatch[1];
    const longMatch = urlOrId.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (longMatch)
      return longMatch[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId))
      return urlOrId;
    return null;
  }

  // public/src/state.ts
  var state = {
    activeTab: "schedule",
    selectedMembers: /* @__PURE__ */ new Set(),
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
    errors: {}
  };
  var listeners = /* @__PURE__ */ new Set();
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function notify() {
    listeners.forEach((fn) => fn());
  }
  function setTab(tab) {
    state.activeTab = tab;
    notify();
  }
  function toggleMember(id) {
    if (state.selectedMembers.has(id)) {
      state.selectedMembers.delete(id);
    } else {
      state.selectedMembers.add(id);
    }
    notify();
  }
  function setLoading(key, value) {
    state.loading[key] = value;
    notify();
  }
  function setError(key, message) {
    state.errors[key] = message;
    notify();
  }
  function clearError(key) {
    delete state.errors[key];
  }

  // public/src/ui.ts
  function renderMemberFilter(members, selected, onToggle) {
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
  function renderVideoCard(video) {
    const card = document.createElement("div");
    card.className = `video-card status-${video.status}`;
    card.dataset.videoId = video.video_id;
    const time = video.start_scheduled ? formatDateTime(video.start_scheduled) : video.start_actual ? formatDateTime(video.start_actual) : "";
    const statusLabel = {
      live: "\u{1F534} \u914D\u4FE1\u4E2D",
      upcoming: "\u{1F4C5} \u4E88\u5B9A",
      past: "\u{1F4FC} \u30A2\u30FC\u30AB\u30A4\u30D6"
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
        YouTube\u3067\u898B\u308B \u2192
      </a>
    </div>
  `;
    return card;
  }
  function renderAnalysisResult(result) {
    const el = document.createElement("div");
    el.className = "analysis-result";
    const highlights = result.analysis.highlights.map(
      (h) => `
      <li class="highlight-item">
        <span class="highlight-time">${escHtml(h.time_hint)}</span>
        <span class="highlight-desc">${escHtml(h.description)}</span>
        <span class="highlight-reason">${escHtml(h.reason)}</span>
      </li>`
    ).join("");
    const clips = result.analysis.clip_suggestions.map(
      (c) => `
      <div class="clip-card">
        <h4>${escHtml(c.title)}</h4>
        <span class="clip-style">${escHtml(c.style)}</span>
        <p>${escHtml(c.description)}</p>
        <span class="clip-duration">\u63A8\u5968\u5C3A: ${c.duration_seconds}\u79D2</span>
      </div>`
    ).join("");
    const tags = result.analysis.tags.map((t) => `<span class="tag">#${escHtml(t)}</span>`).join("");
    el.innerHTML = `
    <div class="analysis-header">
      <img src="${result.thumbnail}" alt="\u30B5\u30E0\u30CD\u30A4\u30EB" class="analysis-thumb" />
      <div class="analysis-meta">
        <h2>${escHtml(result.title)}</h2>
        <p class="analysis-member">${escHtml(result.member_name)}</p>
        <a href="${result.youtube_url}" target="_blank" rel="noopener">YouTube\u3067\u958B\u304F \u2192</a>
      </div>
    </div>

    <section class="analysis-section">
      <h3>\u{1F4DD} \u914D\u4FE1\u307E\u3068\u3081</h3>
      <p class="analysis-summary">${escHtml(result.analysis.summary)}</p>
      <div class="tags">${tags}</div>
    </section>

    ${result.analysis.thumbnail_text ? `
    <section class="analysis-section">
      <h3>\u{1F5BC}\uFE0F \u30B5\u30E0\u30CD\u30A4\u30EB\u30B3\u30D4\u30FC\u6848</h3>
      <p class="thumbnail-text">${escHtml(result.analysis.thumbnail_text)}</p>
    </section>` : ""}

    <section class="analysis-section">
      <h3>\u2728 \u898B\u3069\u3053\u308D</h3>
      <ul class="highlights-list">${highlights}</ul>
    </section>

    <section class="analysis-section">
      <h3>\u2702\uFE0F \u5207\u308A\u629C\u304D\u63D0\u6848</h3>
      <div class="clips-grid">${clips}</div>
    </section>

    ${result.transcript_available ? `
    <section class="analysis-section">
      <h3>\u{1F4C4} \u5B57\u5E55\u30C7\u30FC\u30BF</h3>
      <a class="btn btn-download" href="/api/transcript/${result.video_id}?format=srt" download="${result.video_id}.srt">
        SRT\u30D5\u30A1\u30A4\u30EB\u3092\u30C0\u30A6\u30F3\u30ED\u30FC\u30C9
      </a>
    </section>` : ""}
  `;
    return el;
  }
  function renderSearchLinks(members, selectedMemberId, keyword, onMemberChange, onKeywordChange) {
    const el = document.createElement("div");
    el.className = "search-panel";
    const member = members.find((m) => m.id === selectedMemberId);
    const memberName = member?.name ?? "";
    const selectRow = document.createElement("div");
    selectRow.className = "form-row";
    const select = document.createElement("select");
    select.className = "select-input";
    select.innerHTML = `<option value="">-- \u30E1\u30F3\u30D0\u30FC\u3092\u9078\u629E --</option>`;
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
    kwInput.placeholder = "\u8FFD\u52A0\u30AD\u30FC\u30EF\u30FC\u30C9\uFF08\u4EFB\u610F\uFF09";
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
        \u{1F50D} Yahoo! \u30EA\u30A2\u30EB\u30BF\u30A4\u30E0\u691C\u7D22
      </a>
      <a class="search-btn search-btn-youtube"
         href="https://www.youtube.com/results?search_query=${enc}"
         target="_blank" rel="noopener">
        \u25B6 YouTube \u3067\u63A2\u3059
      </a>
      <a class="search-btn search-btn-nico"
         href="https://www.nicovideo.jp/search/${enc}"
         target="_blank" rel="noopener">
        \u{1F3AC} \u30CB\u30B3\u30CB\u30B3\u52D5\u753B\u3067\u63A2\u3059
      </a>
    `;
      el.appendChild(links);
    } else {
      const hint = document.createElement("p");
      hint.className = "empty-message";
      hint.textContent = "\u30E1\u30F3\u30D0\u30FC\u3092\u9078\u629E\u3059\u308B\u3068\u30D5\u30A1\u30F3\u53CD\u5FDC\u3092\u691C\u7D22\u3067\u304D\u307E\u3059";
      el.appendChild(hint);
    }
    return el;
  }
  function renderError(message) {
    const el = document.createElement("div");
    el.className = "error-message";
    el.textContent = `\u26A0\uFE0F ${message}`;
    return el;
  }
  function renderLoading() {
    const el = document.createElement("div");
    el.className = "loading-spinner";
    el.innerHTML = `<div class="spinner"></div><p>\u8AAD\u307F\u8FBC\u307F\u4E2D...</p>`;
    return el;
  }
  function escHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
  function formatDateTime(iso) {
    try {
      return new Date(iso).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return iso;
    }
  }

  // public/src/main.ts
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab)
        setTab(tab);
    });
  });
  async function loadSchedule() {
    setLoading("schedule", true);
    clearError("schedule");
    try {
      const memberIds = Array.from(state.selectedMembers);
      state.scheduleVideos = await fetchSchedule(
        memberIds.length ? memberIds : void 0
      );
    } catch (e) {
      setError("schedule", e.message);
    } finally {
      setLoading("schedule", false);
    }
  }
  async function loadArchives() {
    setLoading("archives", true);
    clearError("archives");
    try {
      state.archiveVideos = await fetchArchives(state.archiveMemberId || void 0, 30);
    } catch (e) {
      setError("archives", e.message);
    } finally {
      setLoading("archives", false);
    }
  }
  async function loadClips() {
    if (state.clipVideos.length)
      return;
    setLoading("clips", true);
    clearError("clips");
    try {
      state.clipVideos = await fetchClips(30);
    } catch (e) {
      setError("clips", e.message);
    } finally {
      setLoading("clips", false);
    }
  }
  var analyzeForm = document.getElementById("analyze-form");
  var analyzeInput = document.getElementById("video-url-input");
  var analyzeMemberSelect = document.getElementById("analyze-member-select");
  analyzeForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const rawInput = analyzeInput.value.trim();
    const videoId = extractVideoId(rawInput);
    if (!videoId) {
      setError("analyze", "\u6B63\u3057\u3044YouTube URL\u307E\u305F\u306F\u52D5\u753BID\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044");
      notify();
      return;
    }
    clearError("analyze");
    state.analyzeVideoId = videoId;
    state.analyzeResult = null;
    setLoading("analyze", true);
    try {
      const memberId = analyzeMemberSelect.value || void 0;
      state.analyzeResult = await analyzeVideo(videoId, memberId);
    } catch (e2) {
      setError("analyze", e2.message);
    } finally {
      setLoading("analyze", false);
    }
  });
  var archiveMemberSelect = document.getElementById("archive-member-select");
  var archiveFilterBtn = document.getElementById("archive-filter-btn");
  archiveMemberSelect?.addEventListener("change", () => {
    state.archiveMemberId = archiveMemberSelect.value;
  });
  archiveFilterBtn?.addEventListener("click", () => {
    loadArchives();
  });
  function render() {
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
  function renderSchedulePanel() {
    const container = document.getElementById("schedule-videos");
    if (!container)
      return;
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
      container.innerHTML = `<p class="empty-message">\u73FE\u5728\u914D\u4FE1\u4E88\u5B9A\u306F\u3042\u308A\u307E\u305B\u3093</p>`;
      return;
    }
    state.scheduleVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
  }
  function renderArchivesPanel() {
    const container = document.getElementById("archive-videos");
    if (!container)
      return;
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
      container.innerHTML = `<p class="empty-message">\u30A2\u30FC\u30AB\u30A4\u30D6\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F</p>`;
      return;
    }
    state.archiveVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
  }
  function renderClipsPanel() {
    const container = document.getElementById("clips-videos");
    if (!container)
      return;
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
      container.innerHTML = `<p class="empty-message">\u5207\u308A\u629C\u304D\u52D5\u753B\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F</p>`;
      return;
    }
    state.clipVideos.forEach((v) => container.appendChild(renderVideoCard(v)));
  }
  function renderAnalyzePanel() {
    const resultContainer = document.getElementById("analyze-result");
    if (!resultContainer)
      return;
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
  function renderSearchPanel() {
    const container = document.getElementById("search-container");
    if (!container)
      return;
    container.innerHTML = "";
    container.appendChild(
      renderSearchLinks(
        state.members,
        state.searchMemberId,
        state.searchKeyword,
        (id) => {
          state.searchMemberId = id;
          notify();
        },
        (kw) => {
          state.searchKeyword = kw;
          notify();
        }
      )
    );
  }
  function renderMemberFilters() {
    const filterContainers = document.querySelectorAll(".member-filter-slot");
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
    [analyzeMemberSelect, archiveMemberSelect].forEach((sel) => {
      if (!sel)
        return;
      const currentVal = sel.value;
      sel.innerHTML = `<option value="">-- \u5168\u30E1\u30F3\u30D0\u30FC --</option>`;
      state.members.forEach((m) => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        sel.appendChild(opt);
      });
      sel.value = currentVal;
    });
    if (analyzeMemberSelect) {
      analyzeMemberSelect.querySelector("option").textContent = "-- \u30E1\u30F3\u30D0\u30FC\u3092\u9078\u629E\uFF08\u4EFB\u610F\uFF09 --";
    }
  }
  subscribe(() => {
    if (state.activeTab === "clips" && !state.clipVideos.length && !state.loading["clips"]) {
      loadClips();
    }
  });
  async function init() {
    subscribe(render);
    try {
      state.members = await fetchMembers();
      renderMemberFilters();
    } catch {
    }
    await loadSchedule();
    loadArchives();
    render();
  }
  init();
})();
//# sourceMappingURL=bundle.js.map
