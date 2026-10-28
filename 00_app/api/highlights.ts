import type { VercelRequest, VercelResponse } from "@vercel/node";

export interface HeatMarker {
  timeSeconds: number;
  intensity: number; // 0-1 正規化済み
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

// ===== ヒートマップ取得（YouTube ページスクレイピング） =====

async function getHeatmap(videoId: string): Promise<{ markers: HeatMarker[]; duration: number }> {
  const res = await fetch(`https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "ja,en-US;q=0.9,en;q=0.8",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  if (!res.ok) throw new Error(`YouTube ページ取得エラー: ${res.status}`);
  const html = await res.text();

  // heatMarkers 配列を文字列ベースで高速抽出（ytInitialData 全体のパースを避ける）
  const markers = extractHeatMarkersFromHtml(html);

  // 動画時間
  const durMatch = html.match(/"lengthSeconds"\s*:\s*"(\d+)"/);
  const duration = durMatch ? Number(durMatch[1]) : 0;

  return { markers, duration };
}

function extractHeatMarkersFromHtml(html: string): HeatMarker[] {
  const idx = html.indexOf('"heatMarkers"');
  if (idx === -1) return [];

  const arrStart = html.indexOf("[", idx);
  if (arrStart === -1) return [];

  // 対応する ] を探す（ネスト対応）
  let depth = 0;
  let arrEnd = -1;
  for (let i = arrStart; i < Math.min(html.length, arrStart + 200_000); i++) {
    const ch = html[i];
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) {
        arrEnd = i + 1;
        break;
      }
    }
  }
  if (arrEnd === -1) return [];

  try {
    const arr = JSON.parse(html.slice(arrStart, arrEnd)) as Array<Record<string, unknown>>;
    return arr
      .map((m) => {
        // heatMarkerRenderer 形式（旧）と timedMarkerRenderer 形式（新）に対応
        const r = (m.heatMarkerRenderer ?? m.timedMarkerRenderer ?? m) as Record<string, unknown>;
        const startMs = Number(r.timeRangeStartMillis ?? r.startMillis ?? 0);
        const intensity = Number(r.heatMarkerIntensityScoreNormalized ?? r.intensityScoreNormalized ?? 0);
        return { timeSeconds: Math.floor(startMs / 1000), intensity };
      })
      .filter((m) => m.intensity > 0);
  } catch {
    return [];
  }
}

// ===== タイムスタンプコメント取得（YouTube Data API v3） =====

async function getTimestampComments(
  videoId: string,
  apiKey: string
): Promise<TimestampComment[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("videoId", videoId);
  url.searchParams.set("order", "relevance");
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouTube Comments API エラー ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    items?: Array<{
      snippet: {
        topLevelComment: {
          snippet: { textDisplay: string; likeCount?: number };
        };
      };
    }>;
  };

  const results: TimestampComment[] = [];
  // M:SS または H:MM:SS 形式のタイムスタンプにマッチ（数字に挟まれていないもの）
  const tsRegex = /(?<!\d)(\d{1,2}):(\d{2})(?::(\d{2}))?(?!\d)/g;

  for (const item of data.items ?? []) {
    const snip = item.snippet.topLevelComment.snippet;
    // HTMLタグを改行や空白に変換して除去
    const text = snip.textDisplay
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .trim();
    const likeCount = snip.likeCount ?? 0;

    let match: RegExpExecArray | null;
    tsRegex.lastIndex = 0;
    while ((match = tsRegex.exec(text)) !== null) {
      const p1 = Number(match[1]);
      const p2 = Number(match[2]);
      const p3 = match[3] !== undefined ? Number(match[3]) : undefined;

      let totalSeconds: number;
      let timeLabel: string;

      if (p3 !== undefined) {
        // H:MM:SS
        totalSeconds = p1 * 3600 + p2 * 60 + p3;
        timeLabel = `${p1}:${String(p2).padStart(2, "0")}:${String(p3).padStart(2, "0")}`;
      } else {
        // M:SS
        totalSeconds = p1 * 60 + p2;
        timeLabel = `${p1}:${String(p2).padStart(2, "0")}`;
      }

      results.push({ timeSeconds: totalSeconds, timeLabel, text, likeCount });
    }
  }

  // 同一コメントのタイムスタンプを複数保持しつつ、時間→いいね順でソート
  results.sort((a, b) => a.timeSeconds - b.timeSeconds || b.likeCount - a.likeCount);
  return results;
}

// ===== ハンドラ =====

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = req.query.video_id as string | undefined;
  if (!videoId) return res.status(400).json({ error: "video_id は必須です" });

  const apiKey = process.env.YOUTUBE_API_KEY ?? "";
  const errors: string[] = [];

  const [heatmapResult, commentsResult] = await Promise.allSettled([
    getHeatmap(videoId),
    apiKey
      ? getTimestampComments(videoId, apiKey)
      : Promise.reject(new Error("YOUTUBE_API_KEY が設定されていません")),
  ]);

  const heatmap =
    heatmapResult.status === "fulfilled" ? heatmapResult.value.markers : [];
  const duration =
    heatmapResult.status === "fulfilled" ? heatmapResult.value.duration : 0;
  const timestampComments =
    commentsResult.status === "fulfilled" ? commentsResult.value : [];

  if (heatmapResult.status === "rejected")
    errors.push(`ヒートマップ: ${String(heatmapResult.reason)}`);
  if (commentsResult.status === "rejected")
    errors.push(`コメント: ${String(commentsResult.reason)}`);

  const result: HighlightsResult = { heatmap, duration, timestampComments, errors };
  res.json(result);
}
