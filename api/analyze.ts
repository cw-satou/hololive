import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMemberById } from "./_lib/members.js";
import { getVideoInfo, collectAllChat, extractHighlightsFromChat } from "./_lib/youtube.js";
import { getTranscript, transcriptToText } from "./_lib/transcript.js";
import { summarizeStream } from "./_lib/summarize.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const data = req.body as Record<string, unknown>;
  const videoId = data?.video_id as string | undefined;
  if (!videoId) return res.status(400).json({ error: "video_idは必須です" });

  try {
    const member = data.member_id ? getMemberById(data.member_id as string) : undefined;
    const memberName = member?.name ?? "ぶいすぽメンバー";

    const videoInfo = await getVideoInfo(videoId) as Record<string, Record<string, unknown>>;
    const snippet = videoInfo.snippet ?? {};
    const title = String(snippet.title ?? "");
    const description = String(snippet.description ?? "");
    const liveDetails = videoInfo.liveStreamingDetails ?? {};

    let chatHighlights: { time: string; score: number; type: string }[] = [];
    if (data.include_chat !== false) {
      const liveChatId = liveDetails.activeLiveChatId as string | undefined;
      if (liveChatId) {
        const messages = await collectAllChat(liveChatId);
        chatHighlights = extractHighlightsFromChat(messages);
      }
    }

    let transcriptText = "";
    let transcriptAvailable = false;
    if (data.include_transcript !== false) {
      const transcript = await getTranscript(videoId);
      transcriptText = transcriptToText(transcript);
      transcriptAvailable = transcript.length > 0;
    }

    const analysis = await summarizeStream({ title, description, transcriptText, chatHighlights, memberName });

    res.json({
      video_id: videoId,
      title,
      member_name: memberName,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      youtube_url: `https://www.youtube.com/watch?v=${videoId}`,
      analysis,
      chat_highlights: chatHighlights.slice(0, 10),
      transcript_available: transcriptAvailable,
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
