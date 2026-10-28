import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getTranscript, transcriptToSrt } from "../_lib/transcript.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const videoId = req.query.videoId as string;
  try {
    const transcript = await getTranscript(videoId);
    const fmt = req.query.format as string | undefined;

    if (fmt === "srt") {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${videoId}.srt"`);
      return res.send(transcriptToSrt(transcript));
    }

    res.json(transcript);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
