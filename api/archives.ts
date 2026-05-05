import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentArchives, normalizeVideo } from "./_lib/holodex.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const channelId = req.query.channel_id as string | undefined;
    const limit = parseInt(String(req.query.limit ?? "20"), 10);
    const archives = await getRecentArchives(channelId, limit);
    res.json(archives.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
