import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentArchives, getChannels, normalizeVideo } from "./_lib/holodex.js";
import { getMemberById } from "./_lib/members.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const memberId = req.query.member_id as string | undefined;
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    let channelId: string | undefined;

    if (memberId) {
      const member = getMemberById(memberId);
      if (member) {
        const channels = await getChannels();
        const ch = channels.find(
          (c) =>
            c.name.includes(member.name) ||
            (c.english_name ?? "").includes(member.name_en)
        );
        channelId = ch?.id;
      }
    }

    const archives = await getRecentArchives(channelId, limit);
    res.json(archives.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
