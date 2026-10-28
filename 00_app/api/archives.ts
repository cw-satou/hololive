import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRecentArchives, getChannels, normalizeVideo, type ProductionFilter } from "./_lib/holodex.js";
import { getMemberById } from "./_lib/members.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const production = (req.query.production ?? "all") as ProductionFilter;
    const memberId = req.query.member_id as string | undefined;
    const limit = parseInt(String(req.query.limit ?? "30"), 10);
    let channelId: string | undefined;
    let from: string | undefined;
    let effectiveProduction: ProductionFilter = production;

    if (memberId) {
      const member = getMemberById(memberId);
      if (member) {
        // メンバー指定時は所属プロダクションのみを検索対象にする
        effectiveProduction = member.production;
        const channels = await getChannels(member.production);
        const ch = channels.find(
          (c) =>
            c.name.includes(member.name) ||
            (c.english_name ?? "").includes(member.name_en)
        );
        channelId = ch?.id;
      }
      // 1年前から取得
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      from = oneYearAgo.toISOString();
    }

    const effectiveLimit = memberId ? 50 : limit;
    const archives = await getRecentArchives(effectiveProduction, channelId, effectiveLimit, from);
    res.json(archives.map(normalizeVideo));
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
