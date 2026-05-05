import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLiveStreams, getVspoChannels, normalizeVideo } from "./_lib/holodex.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const memberIdsParam = req.query.member_ids as string | undefined;
    let channelIds: string[] | undefined;

    if (memberIdsParam) {
      const channels = await getVspoChannels();
      const requested = memberIdsParam.split(",");
      channelIds = channels
        .filter((ch) => requested.some((r) => (ch.name + (ch.english_name ?? "")).includes(r)))
        .map((ch) => ch.id);
    }

    const streams = await getLiveStreams(channelIds);
    res.json(streams.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
