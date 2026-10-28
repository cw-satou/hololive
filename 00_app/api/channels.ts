import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getChannels, type ProductionFilter } from "./_lib/holodex.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const production = (req.query.production ?? "all") as ProductionFilter;
    const channels = await getChannels(production);
    const sorted = [...channels]
      .filter((c) => c.subscriber_count != null)
      .sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
