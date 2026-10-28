import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentClips, normalizeVideo, type ProductionFilter } from "./_lib/holodex.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const production = (req.query.production ?? "all") as ProductionFilter;
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    const clips = await getRecentClips(production, limit);
    res.json(clips.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
