import { YoutubeTranscript } from "youtube-transcript";

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export async function getTranscript(videoId: string): Promise<TranscriptSegment[]> {
  try {
    const items = await YoutubeTranscript.fetchTranscript(videoId, { lang: "ja" });
    return items.map((item) => ({
      text: item.text,
      start: item.offset / 1000,
      duration: item.duration / 1000,
    }));
  } catch {
    // 日本語字幕がなければ言語指定なしで再試行
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId);
      return items.map((item) => ({
        text: item.text,
        start: item.offset / 1000,
        duration: item.duration / 1000,
      }));
    } catch {
      return [];
    }
  }
}

export function transcriptToText(transcript: TranscriptSegment[]): string {
  return transcript.map((s) => s.text).filter(Boolean).join(" ");
}

export function transcriptToSrt(transcript: TranscriptSegment[]): string {
  return transcript
    .map((seg, i) => {
      const start = secondsToSrtTime(seg.start);
      const end = secondsToSrtTime(seg.start + seg.duration);
      return `${i + 1}\n${start} --> ${end}\n${seg.text}`;
    })
    .join("\n\n");
}

function secondsToSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(ms).padStart(3, "0")}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}
