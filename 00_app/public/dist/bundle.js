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
  async function fetchMembers(production) {
    const params = production && production !== "all" ? `?production=${production}` : "";
    return fetchJSON(`/api/members${params}`);
  }
  async function fetchSchedule(memberIds, production) {
    const params = new URLSearchParams();
    if (memberIds?.length)
      params.set("member_ids", memberIds.join(","));
    if (production && production !== "all")
      params.set("production", production);
    const qs = params.toString();
    return fetchJSON(`/api/schedule${qs ? `?${qs}` : ""}`);
  }
  async function fetchArchives(memberId, limit = 30, production) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (memberId)
      params.set("member_id", memberId);
    if (production && production !== "all")
      params.set("production", production);
    return fetchJSON(`/api/archives?${params}`);
  }
  async function fetchClips(limit = 30, production) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (production && production !== "all")
      params.set("production", production);
    return fetchJSON(`/api/clips?${params}`);
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
  async function generateMetadata(data) {
    return fetchJSON("/api/metadata", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }
  async function fetchHighlights(videoId) {
    return fetchJSON(
      `/api/highlights?video_id=${encodeURIComponent(videoId)}`
    );
  }
  async function fetchChannelStats(production) {
    const params = production && production !== "all" ? `?production=${production}` : "";
    return fetchJSON(`/api/channels${params}`);
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
    activeTab: "archives",
    production: "all",
    selectedMembers: /* @__PURE__ */ new Set(),
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
  function setProduction(prod) {
    state.production = prod;
    state.scheduleVideos = [];
    state.archiveVideos = [];
    state.clipVideos = [];
    state.channelStats = [];
    state.selectedMembers = /* @__PURE__ */ new Set();
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

  // public/src/rules.ts
  var CLIP_RULES = [
    {
      production: "vspo",
      production_name: "\u3076\u3044\u3059\u307D\u3063\uFF01",
      emoji: "\u{1F49C}",
      monetization_status: "OK",
      monetization_detail: "YouTube\u30D1\u30FC\u30C8\u30CA\u30FC\u30D7\u30ED\u30B0\u30E9\u30E0\u3067\u306E\u53CE\u76CA\u5316OK\uFF08\u30C1\u30E3\u30F3\u30CD\u30EB\u6761\u4EF6\u3092\u6E80\u305F\u3059\u5834\u5408\uFF09",
      credits: "\u30BF\u30A4\u30C8\u30EB\u304B\u8AAC\u660E\u6B04\u306B\u30E9\u30A4\u30D0\u30FC\u540D\u30FB\u300C\u3076\u3044\u3059\u307D\u3063\uFF01\u300D\u306E\u660E\u8A18\u3092\u63A8\u5968",
      allowed: [
        "\u30B2\u30FC\u30E0\u30FB\u96D1\u8AC7\u30FB\u6B4C\u30FB\u30B3\u30E9\u30DC\u306E\u5207\u308A\u629C\u304D",
        "\u5B57\u5E55\u30FB\u7FFB\u8A33\u4ED8\u304D\u52D5\u753B",
        "\u30CF\u30A4\u30E9\u30A4\u30C8\u30FB\u307E\u3068\u3081\u52D5\u753B",
        "YouTube Shorts\u30FB\u7E26\u578B\u52D5\u753B"
      ],
      prohibited: [
        "\u500B\u4EBA\u60C5\u5831\u306E\u66B4\u9732\u30FB\u7279\u5B9A\u306B\u3064\u306A\u304C\u308B\u5185\u5BB9",
        "\u8AA4\u89E3\u3092\u62DB\u304F\u30FB\u30D5\u30A7\u30A4\u30AF\u7684\u306A\u7DE8\u96C6",
        "\u516C\u5E8F\u826F\u4FD7\u306B\u53CD\u3059\u308B\u30B3\u30F3\u30C6\u30F3\u30C4",
        "\u8457\u4F5C\u6A29\u697D\u66F2\u306E\u307F\u3092\u629C\u304D\u51FA\u3057\u305F\u97F3\u697D\u52D5\u753B"
      ],
      notes: [
        "\u914D\u4FE1\u7D42\u4E86\u76F4\u5F8C\u306F\u5C11\u3057\u9593\u3092\u7F6E\u3044\u3066\u304B\u3089\u6295\u7A3F\u3059\u308B\u306E\u304C\u89AA\u5207",
        "\u30BB\u30F3\u30B7\u30C6\u30A3\u30D6\u306A\u5185\u5BB9\u306F\u30E9\u30A4\u30D0\u30FC\u3078\u306E\u78BA\u8A8D\u3092\u63A8\u5968",
        "\u5207\u308A\u629C\u304D\u52D5\u753B\u306BVSPO\u30ED\u30B4\u306E\u7121\u65AD\u4F7F\u7528\u306FNG"
      ],
      source_url: "https://vspo.jp",
      source_label: "\u3076\u3044\u3059\u307D\u3063\uFF01\u516C\u5F0F\u30B5\u30A4\u30C8"
    },
    {
      production: "hololive",
      production_name: "\u30DB\u30ED\u30E9\u30A4\u30D6",
      emoji: "\u{1F499}",
      monetization_status: "conditional",
      monetization_detail: "\u30AB\u30D0\u30FC\u682A\u5F0F\u4F1A\u793E\u306E\u516C\u5F0F\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u57FA\u3065\u304D\u53CE\u76CA\u5316\u53EF\u80FD\uFF08\u8981\u78BA\u8A8D\uFF09",
      credits: "\u30BF\u30A4\u30C8\u30EB\u307E\u305F\u306F\u8AAC\u660E\u6B04\u306B\u30BF\u30EC\u30F3\u30C8\u540D\u30FB\u300C\u30DB\u30ED\u30E9\u30A4\u30D6\u300D\u306E\u660E\u8A18\u304C\u5FC5\u8981",
      allowed: [
        "\u914D\u4FE1\u306E\u5207\u308A\u629C\u304D\uFF08\u30B2\u30FC\u30E0\u30FB\u96D1\u8AC7\u30FB\u6B4C\u306A\u3069\uFF09",
        "\u5B57\u5E55\u30FB\u7FFB\u8A33\u4ED8\u304D\u52D5\u753B\uFF08\u591A\u8A00\u8A9EOK\uFF09",
        "\u30CF\u30A4\u30E9\u30A4\u30C8\u30FB\u307E\u3068\u3081\u52D5\u753B",
        "\u516C\u5F0F\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u6E96\u62E0\u3057\u305F\u30D5\u30A1\u30F3\u30B3\u30F3\u30C6\u30F3\u30C4"
      ],
      prohibited: [
        "\u500B\u4EBA\u60C5\u5831\u306E\u66B4\u9732",
        "\u30BF\u30EC\u30F3\u30C8\u306E\u540D\u8A89\u3092\u50B7\u3064\u3051\u308B\u30B3\u30F3\u30C6\u30F3\u30C4",
        "\u8AA4\u89E3\u3092\u751F\u3080\u30FB\u30D5\u30A7\u30A4\u30AF\u7684\u306A\u5207\u308A\u629C\u304D",
        "BGM\u30FB\u697D\u66F2\u306E\u307F\u3092\u5207\u308A\u629C\u3044\u305F\u52D5\u753B"
      ],
      notes: [
        "\u30DB\u30ED\u30E9\u30A4\u30D6\u30D7\u30ED\u30C0\u30AF\u30B7\u30E7\u30F3\u306E\u30D5\u30A1\u30F3\u30B3\u30F3\u30C6\u30F3\u30C4\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3\u306B\u6E96\u62E0",
        "\u82F1\u8A9E\u5B57\u5E55\u4ED8\u304D\u52D5\u753B\u3082\u8A31\u53EF",
        "\u30EB\u30FC\u30EB\u306F\u5909\u66F4\u3055\u308C\u308B\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002\u5FC5\u305A\u6700\u65B0\u306E\u516C\u5F0F\u60C5\u5831\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044"
      ],
      source_url: "https://hololivepro.com/en/clippingguidelines/",
      source_label: "\u30DB\u30ED\u30E9\u30A4\u30D6\u516C\u5F0F\u30AF\u30EA\u30C3\u30D4\u30F3\u30B0\u30AC\u30A4\u30C9\u30E9\u30A4\u30F3"
    }
  ];

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
    const time = video.start_scheduled ? formatDateTime(video.start_scheduled) : video.start_actual ? formatDateTime(video.start_actual) : video.available_at ? formatDateTime(video.available_at) : "";
    const statusLabel = {
      live: "\u{1F534} \u914D\u4FE1\u4E2D",
      upcoming: "\u{1F4C5} \u4E88\u5B9A",
      past: "\u{1F4FC} \u30A2\u30FC\u30AB\u30A4\u30D6"
    };
    const prodBadge = video.production === "vspo" ? `<span class="prod-badge prod-vspo">\u3076\u3044\u3059\u307D</span>` : video.production === "hololive" ? `<span class="prod-badge prod-hololive">\u30DB\u30ED\u30E9\u30A4\u30D6</span>` : "";
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
      <img src="${escHtml(result.thumbnail)}" alt="\u30B5\u30E0\u30CD\u30A4\u30EB" class="analysis-thumb" />
      <div class="analysis-meta">
        <h2>${escHtml(result.title)}</h2>
        <p class="analysis-member">${escHtml(result.member_name)}</p>
        <a href="${escHtml(result.youtube_url)}" target="_blank" rel="noopener">YouTube\u3067\u958B\u304F \u2192</a>
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
      <a class="btn btn-download" href="/api/transcript/${escHtml(result.video_id)}?format=srt" download="${escHtml(result.video_id)}.srt">
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
  function renderStampNotes(notes) {
    const el = document.createElement("div");
    el.className = "stamp-notes";
    if (!notes.length) {
      el.innerHTML = `<p class="empty-message">\u30E1\u30E2\u304C\u307E\u3060\u3042\u308A\u307E\u305B\u3093\u3002\u30BF\u30A4\u30DE\u30FC\u3092\u958B\u59CB\u3057\u3066\u30E1\u30E2\u3092\u8FFD\u52A0\u3057\u307E\u3057\u3087\u3046</p>`;
      return el;
    }
    notes.forEach((n) => {
      const item = document.createElement("div");
      item.className = "stamp-note-item";
      item.dataset.id = n.id;
      item.innerHTML = `
      <span class="stamp-note-time">${formatSeconds(n.seconds)}</span>
      <span class="stamp-note-text">${escHtml(n.text)}</span>
      <button class="stamp-note-del" data-id="${n.id}" title="\u524A\u9664">\u2715</button>
    `;
      el.appendChild(item);
    });
    return el;
  }
  function renderMetadataResult(result) {
    const el = document.createElement("div");
    el.className = "meta-result";
    const tagsHtml = result.tags.map((t) => `<span class="tag">#${escHtml(t)}</span>`).join("");
    const hashtagsHtml = result.hashtags.map((h) => `<span class="tag">${escHtml(h)}</span>`).join("");
    el.innerHTML = `
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">\u30BF\u30A4\u30C8\u30EB</span>
        <button class="copy-btn" data-copy="${escAttr(result.title)}">\u{1F4CB} \u30B3\u30D4\u30FC</button>
      </div>
      <p class="meta-block-content">${escHtml(result.title)}</p>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">\u8AAC\u660E\u6587</span>
        <button class="copy-btn" data-copy="${escAttr(result.description)}">\u{1F4CB} \u30B3\u30D4\u30FC</button>
      </div>
      <p class="meta-block-content">${escHtml(result.description)}</p>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">\u30BF\u30B0</span>
        <button class="copy-btn" data-copy="${escAttr(result.tags.join(", "))}">\u{1F4CB} \u30B3\u30D4\u30FC</button>
      </div>
      <div class="tags">${tagsHtml}</div>
    </div>
    <div class="meta-block">
      <div class="meta-block-header">
        <span class="meta-block-label">\u30CF\u30C3\u30B7\u30E5\u30BF\u30B0</span>
        <button class="copy-btn" data-copy="${escAttr(result.hashtags.join(" "))}">\u{1F4CB} \u30B3\u30D4\u30FC</button>
      </div>
      <div class="tags">${hashtagsHtml}</div>
    </div>
  `;
    el.querySelectorAll(".copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const text = btn.dataset.copy ?? "";
        navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "\u2713 \u30B3\u30D4\u30FC\u6E08\u307F";
          setTimeout(() => {
            btn.textContent = "\u{1F4CB} \u30B3\u30D4\u30FC";
          }, 2e3);
        });
      });
    });
    return el;
  }
  function renderRules(production) {
    const el = document.createElement("div");
    el.className = "rules-panel";
    const rules = production === "all" ? CLIP_RULES : CLIP_RULES.filter((r) => r.production === production);
    rules.forEach((rule) => {
      const section = document.createElement("div");
      section.className = "rules-section";
      const monetizationClass = rule.monetization_status === "OK" ? "status-ok" : rule.monetization_status === "conditional" ? "status-conditional" : "status-ng";
      const allowedHtml = rule.allowed.map((a) => `<li>${escHtml(a)}</li>`).join("");
      const prohibitedHtml = rule.prohibited.map((p) => `<li>${escHtml(p)}</li>`).join("");
      const notesHtml = rule.notes.map((n) => `<li>${escHtml(n)}</li>`).join("");
      section.innerHTML = `
      <div class="rules-header">
        <span class="rules-emoji">${rule.emoji}</span>
        <h3 class="rules-title">${escHtml(rule.production_name)}</h3>
      </div>
      <div class="rules-monetization ${monetizationClass}">
        <strong>\u53CE\u76CA\u5316:</strong> ${escHtml(rule.monetization_detail)}
      </div>
      <div class="rules-credits">
        <strong>\u30AF\u30EC\u30B8\u30C3\u30C8:</strong> ${escHtml(rule.credits)}
      </div>
      <div class="rules-columns">
        <div class="rules-column">
          <h4 class="rules-col-title rules-ok">\u2705 \u8A31\u53EF\u3055\u308C\u3066\u3044\u308B\u3053\u3068</h4>
          <ul>${allowedHtml}</ul>
        </div>
        <div class="rules-column">
          <h4 class="rules-col-title rules-ng">\u274C \u7981\u6B62\u3055\u308C\u3066\u3044\u308B\u3053\u3068</h4>
          <ul>${prohibitedHtml}</ul>
        </div>
      </div>
      ${notesHtml ? `
      <div class="rules-notes">
        <h4>\u{1F4CC} \u6CE8\u610F\u4E8B\u9805</h4>
        <ul>${notesHtml}</ul>
      </div>` : ""}
      <div class="rules-source">
        <a href="${escHtml(rule.source_url)}" target="_blank" rel="noopener">
          \u{1F4C4} ${escHtml(rule.source_label)}
        </a>
      </div>
    `;
      el.appendChild(section);
    });
    return el;
  }
  function renderChannelStats(stats) {
    const el = document.createElement("div");
    el.className = "channel-stats";
    if (!stats.length) {
      el.innerHTML = `<p class="empty-message">\u30C1\u30E3\u30F3\u30CD\u30EB\u60C5\u5831\u304C\u3042\u308A\u307E\u305B\u3093</p>`;
      return el;
    }
    stats.forEach((ch, i) => {
      const row = document.createElement("div");
      row.className = "channel-row";
      const prodBadge = ch.org === "VSpo" ? `<span class="prod-badge prod-vspo">\u3076\u3044\u3059\u307D</span>` : ch.org === "Hololive" ? `<span class="prod-badge prod-hololive">\u30DB\u30ED\u30E9\u30A4\u30D6</span>` : "";
      const subs = ch.subscriber_count ? formatSubscribers(ch.subscriber_count) : "\u4E0D\u660E";
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
  function renderHeatmap(markers, duration, videoId) {
    const el = document.createElement("div");
    el.className = "heatmap-wrap";
    if (!markers.length) {
      el.innerHTML = `<p class="heatmap-empty">Most Replayed \u30C7\u30FC\u30BF\u304C\u53D6\u5F97\u3067\u304D\u307E\u305B\u3093\u3067\u3057\u305F\u3002<br>\u914D\u4FE1\u9593\u3082\u306A\u3044\u52D5\u753B\u3084\u518D\u751F\u6570\u304C\u5C11\u306A\u3044\u52D5\u753B\u306F\u672A\u5BFE\u5FDC\u306E\u5834\u5408\u304C\u3042\u308A\u307E\u3059\u3002</p>`;
      return el;
    }
    const maxIntensity = Math.max(...markers.map((m) => m.intensity), 1e-3);
    const chart = document.createElement("div");
    chart.className = "heatmap-chart";
    markers.forEach((m) => {
      const bar = document.createElement("a");
      bar.className = "heatmap-bar";
      bar.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${m.timeSeconds}s`;
      bar.target = "_blank";
      bar.rel = "noopener";
      bar.title = `${formatSeconds(m.timeSeconds)}\uFF08\u5F37\u5EA6 ${Math.round(m.intensity / maxIntensity * 100)}%\uFF09`;
      const pct = m.intensity / maxIntensity * 100;
      bar.style.height = `${Math.max(pct, 2)}%`;
      const hue = Math.round(220 - pct * 1.8);
      bar.style.background = `hsl(${hue}, 75%, 52%)`;
      bar.style.opacity = String(0.4 + pct / 100 * 0.6);
      chart.appendChild(bar);
    });
    el.appendChild(chart);
    if (duration > 0) {
      const labels = document.createElement("div");
      labels.className = "heatmap-labels";
      for (let i = 0; i <= 4; i++) {
        const sec = Math.floor(duration * i / 4);
        const span = document.createElement("span");
        span.textContent = formatSeconds(sec);
        labels.appendChild(span);
      }
      el.appendChild(labels);
    }
    const peaks = [...markers].sort((a, b) => b.intensity - a.intensity).slice(0, 10);
    const peakSection = document.createElement("div");
    peakSection.className = "peak-list";
    peakSection.innerHTML = `<h4 class="peak-list-title">\u{1F525} \u518D\u751F\u30D4\u30FC\u30AF TOP${peaks.length}</h4>`;
    peaks.forEach((peak, i) => {
      const row = document.createElement("a");
      row.className = "peak-row";
      row.href = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${peak.timeSeconds}s`;
      row.target = "_blank";
      row.rel = "noopener";
      const pct = Math.round(peak.intensity / maxIntensity * 100);
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
  function renderTimestampComments(comments, videoId, sortBy) {
    const el = document.createElement("div");
    el.className = "ts-comments";
    if (!comments.length) {
      el.innerHTML = `<p class="empty-message">\u30BF\u30A4\u30E0\u30B9\u30BF\u30F3\u30D7\u4ED8\u304D\u30B3\u30E1\u30F3\u30C8\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093\u3067\u3057\u305F<br><small>\u30B3\u30E1\u30F3\u30C8\u53D6\u5F97\u306B\u306FYOUTUBE_API_KEY\u304C\u5FC5\u8981\u3067\u3059</small></p>`;
      return el;
    }
    const sorted = [...comments].sort(
      sortBy === "time" ? (a, b) => a.timeSeconds - b.timeSeconds || b.likeCount - a.likeCount : (a, b) => b.likeCount - a.likeCount || a.timeSeconds - b.timeSeconds
    );
    sorted.forEach((c) => {
      const item = document.createElement("div");
      item.className = "ts-comment-item";
      const likeHtml = c.likeCount > 0 ? `<span class="ts-like">\u{1F44D} ${c.likeCount.toLocaleString()}</span>` : "";
      item.innerHTML = `
      <a class="ts-time-link"
         href="https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}&t=${c.timeSeconds}s"
         target="_blank" rel="noopener">
        \u23F1 ${escHtml(c.timeLabel)}
      </a>
      <p class="ts-text">${escHtml(c.text.length > 160 ? c.text.slice(0, 160) + "\u2026" : c.text)}</p>
      ${likeHtml}
    `;
      el.appendChild(item);
    });
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
  function escAttr(str) {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#039;");
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
  function formatSeconds(sec) {
    const h = Math.floor(sec / 3600);
    const m = Math.floor(sec % 3600 / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function formatSubscribers(count) {
    if (count >= 1e6)
      return `${(count / 1e6).toFixed(1)}M`;
    if (count >= 1e4)
      return `${Math.floor(count / 1e4)}\u4E07`;
    if (count >= 1e3)
      return `${(count / 1e3).toFixed(1)}K`;
    return String(count);
  }

  // public/src/main.ts
  var tabButtons = document.querySelectorAll(".tab-btn");
  var tabPanels = document.querySelectorAll(".tab-panel");
  var prodButtons = document.querySelectorAll(".prod-btn");
  var analyzeForm = document.getElementById("analyze-form");
  var analyzeInput = document.getElementById("video-url-input");
  var analyzeMemberSelect = document.getElementById("analyze-member-select");
  var archiveMemberSelect = document.getElementById("archive-member-select");
  var archiveFilterBtn = document.getElementById("archive-filter-btn");
  var stampVideoUrlInput = document.getElementById("stamp-video-url");
  var stampOpenBtn = document.getElementById("stamp-open-btn");
  var stampStartBtn = document.getElementById("stamp-start-btn");
  var stampElapsedEl = document.getElementById("stamp-elapsed");
  var stampNoteInput = document.getElementById("stamp-note-input");
  var stampAddBtn = document.getElementById("stamp-add-btn");
  var stampNotesContainer = document.getElementById("stamp-notes-list");
  var stampCopyBtn = document.getElementById("stamp-copy-btn");
  var stampClearBtn = document.getElementById("stamp-clear-btn");
  var shortsDurationMin = document.getElementById("shorts-min");
  var shortsDurationSec = document.getElementById("shorts-sec");
  var shortsCalcBtn = document.getElementById("shorts-calc-btn");
  var shortsResult = document.getElementById("shorts-result");
  var highlightsInput = document.getElementById("highlights-video-url");
  var highlightsSubmitBtn = document.getElementById("highlights-submit");
  var highlightsHeatmapContainer = document.getElementById("highlights-heatmap");
  var highlightsCommentsContainer = document.getElementById("highlights-comments");
  var highlightsSortTimeBtn = document.getElementById("highlights-sort-time");
  var highlightsSortLikesBtn = document.getElementById("highlights-sort-likes");
  var metaTitleInput = document.getElementById("meta-video-title");
  var metaDescInput = document.getElementById("meta-desc");
  var metaChannelInput = document.getElementById("meta-channel");
  var metaPlatformSelect = document.getElementById("meta-platform");
  var metaSubmitBtn = document.getElementById("meta-submit");
  var metaResultContainer = document.getElementById("meta-result");
  prodButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const prod = btn.dataset.prod;
      if (!prod || prod === state.production)
        return;
      setProduction(prod);
      state.members = await fetchMembers(prod).catch(() => []);
      renderMemberFilters();
      notify();
      reloadActiveTab();
    });
  });
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
        memberIds.length ? memberIds : void 0,
        state.production
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
      state.archiveVideos = await fetchArchives(
        state.archiveMemberId || void 0,
        30,
        state.production
      );
    } catch (e) {
      setError("archives", e.message);
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
  async function loadClips() {
    if (state.clipVideos.length)
      return;
    setLoading("clips", true);
    clearError("clips");
    try {
      state.clipVideos = await fetchClips(30, state.production);
    } catch (e) {
      setError("clips", e.message);
    } finally {
      setLoading("clips", false);
    }
  }
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
  var timerInterval = null;
  function updateStampDisplay() {
    if (stampElapsedEl) {
      stampElapsedEl.textContent = formatSeconds(state.stampElapsed);
    }
  }
  stampOpenBtn?.addEventListener("click", () => {
    const url = stampVideoUrlInput.value.trim();
    if (url)
      window.open(url, "_blank", "noopener");
  });
  stampStartBtn?.addEventListener("click", () => {
    if (state.stampStartTime === null) {
      state.stampStartTime = Date.now() - state.stampElapsed * 1e3;
      stampStartBtn.textContent = "\u23F9 \u505C\u6B62";
      timerInterval = setInterval(() => {
        state.stampElapsed = Math.floor((Date.now() - state.stampStartTime) / 1e3);
        updateStampDisplay();
      }, 1e3);
    } else {
      state.stampElapsed = Math.floor((Date.now() - state.stampStartTime) / 1e3);
      state.stampStartTime = null;
      stampStartBtn.textContent = "\u25B6 \u958B\u59CB";
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  });
  stampAddBtn?.addEventListener("click", () => {
    const text = stampNoteInput.value.trim();
    if (!text)
      return;
    const note = {
      id: String(Date.now()),
      seconds: state.stampElapsed,
      text
    };
    state.stampNotes = [...state.stampNotes, note];
    stampNoteInput.value = "";
    renderStampNotesList();
  });
  stampNoteInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      stampAddBtn?.click();
  });
  function renderStampNotesList() {
    if (!stampNotesContainer)
      return;
    stampNotesContainer.innerHTML = "";
    stampNotesContainer.appendChild(renderStampNotes(state.stampNotes));
    stampNotesContainer.querySelectorAll(".stamp-note-del").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        state.stampNotes = state.stampNotes.filter((n) => n.id !== id);
        renderStampNotesList();
      });
    });
  }
  stampCopyBtn?.addEventListener("click", () => {
    if (!state.stampNotes.length)
      return;
    const text = state.stampNotes.map((n) => `[${formatSeconds(n.seconds)}] ${n.text}`).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      const orig = stampCopyBtn.textContent;
      stampCopyBtn.textContent = "\u2713 \u30B3\u30D4\u30FC\u6E08\u307F";
      setTimeout(() => {
        stampCopyBtn.textContent = orig;
      }, 2e3);
    });
  });
  stampClearBtn?.addEventListener("click", () => {
    if (!confirm("\u30E1\u30E2\u3092\u5168\u524A\u9664\u3057\u307E\u3059\u304B\uFF1F"))
      return;
    state.stampNotes = [];
    state.stampElapsed = 0;
    state.stampStartTime = null;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    if (stampStartBtn)
      stampStartBtn.textContent = "\u25B6 \u958B\u59CB";
    updateStampDisplay();
    renderStampNotesList();
  });
  shortsCalcBtn?.addEventListener("click", () => {
    const min = parseInt(shortsDurationMin.value || "0", 10);
    const sec = parseInt(shortsDurationSec.value || "0", 10);
    const totalSec = min * 60 + sec;
    if (!totalSec) {
      shortsResult.innerHTML = `<p class="empty-message">\u52D5\u753B\u306E\u9577\u3055\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044</p>`;
      return;
    }
    const shorts60 = Math.floor(totalSec / 60);
    const shorts45 = Math.floor(totalSec / 45);
    const tiktok3min = Math.floor(totalSec / 180);
    shortsResult.innerHTML = `
    <div class="shorts-result-grid">
      <div class="shorts-result-item">
        <span class="shorts-platform">YouTube Shorts / TikTok</span>
        <span class="shorts-count">\u6700\u592760\u79D2: <strong>${shorts60}\u672C</strong></span>
        <span class="shorts-count">\u63A8\u596845\u79D2: <strong>${shorts45}\u672C</strong></span>
      </div>
      <div class="shorts-result-item">
        <span class="shorts-platform">TikTok \u9577\u5C3A\uFF083\u5206\uFF09</span>
        <span class="shorts-count">\u6700\u59273\u5206: <strong>${tiktok3min}\u672C</strong></span>
      </div>
      <div class="shorts-result-item">
        <span class="shorts-platform">X\u52D5\u753B\uFF082\u520620\u79D2=140\u79D2\uFF09</span>
        <span class="shorts-count">\u6700\u59272\u520620\u79D2: <strong>${Math.floor(totalSec / 140)}\u672C</strong></span>
      </div>
    </div>
    <p class="shorts-note">\u203B\u5207\u308A\u629C\u304D\u306E\u8CEA\u3092\u512A\u5148\u3057\u3001\u52D5\u753B\u6570\u306F\u76EE\u5B89\u3068\u3057\u3066\u6D3B\u7528\u3057\u3066\u304F\u3060\u3055\u3044</p>
  `;
  });
  function renderHighlightsResult() {
    const result = state.highlightsResult;
    if (!result)
      return;
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
      highlightsHeatmapContainer.appendChild(renderError("\u6B63\u3057\u3044YouTube URL\u307E\u305F\u306F\u52D5\u753BID\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044"));
      return;
    }
    state.highlightsVideoUrl = rawInput;
    state.highlightsResult = null;
    highlightsSubmitBtn.disabled = true;
    highlightsSubmitBtn.textContent = "\u53D6\u5F97\u4E2D...";
    highlightsHeatmapContainer.innerHTML = "";
    highlightsHeatmapContainer.appendChild(renderLoading());
    highlightsCommentsContainer.innerHTML = "";
    try {
      state.highlightsResult = await fetchHighlights(videoId);
      renderHighlightsResult();
      if (state.highlightsResult.errors.length) {
        state.highlightsResult.errors.forEach((e) => {
          if (e.includes("\u30B3\u30E1\u30F3\u30C8")) {
            const note = document.createElement("p");
            note.className = "highlights-warn";
            note.textContent = `\u26A0\uFE0F ${e}`;
            highlightsCommentsContainer.prepend(note);
          }
        });
      }
    } catch (e) {
      highlightsHeatmapContainer.innerHTML = "";
      highlightsHeatmapContainer.appendChild(renderError(e.message));
    } finally {
      highlightsSubmitBtn.disabled = false;
      highlightsSubmitBtn.textContent = "\u{1F4C8} \u53D6\u5F97\u3059\u308B";
    }
  });
  highlightsInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter")
      highlightsSubmitBtn?.click();
  });
  function updateHighlightsSortButtons() {
    highlightsSortTimeBtn?.classList.toggle("active", state.highlightsSortBy === "time");
    highlightsSortLikesBtn?.classList.toggle("active", state.highlightsSortBy === "likes");
  }
  highlightsSortTimeBtn?.addEventListener("click", () => {
    state.highlightsSortBy = "time";
    updateHighlightsSortButtons();
    if (state.highlightsResult)
      renderHighlightsResult();
  });
  highlightsSortLikesBtn?.addEventListener("click", () => {
    state.highlightsSortBy = "likes";
    updateHighlightsSortButtons();
    if (state.highlightsResult)
      renderHighlightsResult();
  });
  metaSubmitBtn?.addEventListener("click", async () => {
    const title = metaTitleInput.value.trim();
    const desc = metaDescInput.value.trim();
    if (!title && !desc) {
      metaResultContainer.innerHTML = `<p class="empty-message">\u30BF\u30A4\u30C8\u30EB\u307E\u305F\u306F\u8AAC\u660E\u6587\u3092\u5165\u529B\u3057\u3066\u304F\u3060\u3055\u3044</p>`;
      return;
    }
    metaSubmitBtn.disabled = true;
    metaSubmitBtn.textContent = "\u751F\u6210\u4E2D...";
    metaResultContainer.innerHTML = `<div class="loading-spinner"><div class="spinner"></div><p>AI\u751F\u6210\u4E2D...</p></div>`;
    try {
      const result = await generateMetadata({
        video_title: title || void 0,
        video_description: desc || void 0,
        channel_name: metaChannelInput.value.trim() || void 0,
        production: state.production !== "all" ? state.production : void 0,
        platform: metaPlatformSelect.value || "youtube"
      });
      state.metadataResult = result;
      metaResultContainer.innerHTML = "";
      metaResultContainer.appendChild(renderMetadataResult(result));
    } catch (e) {
      metaResultContainer.innerHTML = "";
      metaResultContainer.appendChild(renderError(e.message));
    } finally {
      metaSubmitBtn.disabled = false;
      metaSubmitBtn.textContent = "\u{1F3AF} \u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u751F\u6210";
    }
  });
  async function loadChannelStats() {
    if (state.channelStats.length)
      return;
    setLoading("channels", true);
    clearError("channels");
    try {
      state.channelStats = await fetchChannelStats(state.production);
    } catch (e) {
      setError("channels", e.message);
    } finally {
      setLoading("channels", false);
    }
  }
  function render() {
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state.activeTab);
    });
    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === `tab-${state.activeTab}`);
    });
    document.querySelectorAll(".tab-group").forEach((group) => {
      const hasActive = Boolean(group.querySelector(`.tab-btn[data-tab="${state.activeTab}"]`));
      group.classList.toggle("active-group", hasActive);
    });
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
  function renderRulesPanel() {
    const container = document.getElementById("rules-container");
    if (!container)
      return;
    container.innerHTML = "";
    container.appendChild(renderRules(state.production));
  }
  function renderChannelsPanel() {
    const container = document.getElementById("channels-container");
    if (!container)
      return;
    container.innerHTML = "";
    if (state.loading["channels"]) {
      container.appendChild(renderLoading());
      return;
    }
    if (state.errors["channels"]) {
      container.appendChild(renderError(state.errors["channels"]));
      return;
    }
    container.appendChild(renderChannelStats(state.channelStats));
  }
  function renderMemberFilters() {
    const filterContainers = document.querySelectorAll(".member-filter-slot");
    filterContainers.forEach((slot) => {
      slot.innerHTML = "";
      slot.appendChild(
        renderMemberFilter(state.members, state.selectedMembers, (id) => {
          toggleMember(id);
          if (slot.closest("#tab-schedule"))
            loadSchedule();
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
        opt.textContent = `${m.icon} ${m.name}`;
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
    if (state.activeTab === "channels" && !state.channelStats.length && !state.loading["channels"]) {
      loadChannelStats();
    }
  });
  function reloadActiveTab() {
    switch (state.activeTab) {
      case "schedule":
        loadSchedule();
        break;
      case "archives":
        loadArchives();
        break;
      case "clips":
        state.clipVideos = [];
        loadClips();
        break;
      case "channels":
        state.channelStats = [];
        loadChannelStats();
        break;
    }
  }
  async function init() {
    subscribe(render);
    try {
      state.members = await fetchMembers(state.production);
      renderMemberFilters();
    } catch {
    }
    renderStampNotesList();
    updateStampDisplay();
    await loadSchedule();
    loadArchives();
    render();
  }
  init();
})();
//# sourceMappingURL=bundle.js.map
