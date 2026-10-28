import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getLiveStreams, getChannels, normalizeVideo, type ProductionFilter } from "./_lib/holodex.js";
import { getMemberById } from "./_lib/members.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const production = (req.query.production ?? "all") as ProductionFilter;
    const memberIdsParam = req.query.member_ids as string | undefined;
    let channelIds: string[] | undefined;

    if (memberIdsParam) {
      const channels = await getChannels(production);
      const requestedIds = memberIdsParam.split(",");
      const memberNames = requestedIds
        .map((id) => getMemberById(id))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .flatMap((m) => [m.name, m.name_en]);

      if (memberNames.length) {
        channelIds = channels
          .filter((ch) =>
            memberNames.some(
              (name) => ch.name.includes(name) || (ch.english_name ?? "").includes(name)
            )
          )
          .map((ch) => ch.id);
      }
    }

    const streams = await getLiveStreams(production, channelIds);
    res.json(streams.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
