import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentArchives, getChannels, normalizeVideo } from "./_lib/holodex.js";
import { getMemberById } from "./_lib/members.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const memberId = req.query.member_id as string | undefined;
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    let channelId: string | undefined;
    let from: string | undefined;

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
      // メンバー絞り込み時は1年前から最大50件取得
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      from = oneYearAgo.toISOString();
    }

    const effectiveLimit = memberId ? 50 : limit;
    const archives = await getRecentArchives(channelId, effectiveLimit, from);
    res.json(archives.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
