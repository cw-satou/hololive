import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentClips, normalizeVideo } from "./_lib/holodex.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    const clips = await getRecentClips(limit);
    res.json(clips.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
