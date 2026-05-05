import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMemberById } from "./_lib/members.js";
import { searchFanReactions, RateLimitExceeded } from "./_lib/twitter.js";
import { getStatus } from "./_lib/x-rate-limiter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const memberId = req.query.member_id as string | undefined;
  if (!memberId) return res.status(400).json({ error: "member_idは必須です" });

  const member = getMemberById(memberId);
  if (!member) return res.status(404).json({ error: "メンバーが見つかりません" });

  try {
    const videoTitle = req.query.video_title as string | undefined;
    const limit = parseInt(String(req.query.limit ?? "20"), 10);
    const tweets = await searchFanReactions(member.name, videoTitle, limit);
    res.json(tweets);
  } catch (err) {
    if (err instanceof RateLimitExceeded) {
      return res.status(429).json({ error: String(err), rate_limit: getStatus() });
    }
    res.status(500).json({ error: String(err) });
  }
}
