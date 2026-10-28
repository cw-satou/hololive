import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getMemberById } from "./_lib/members.js";
import { getMemberTweets } from "./_lib/twitter.js";
import { RateLimitExceeded, getStatus } from "./_lib/x-rate-limiter.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const memberId = req.query.member_id as string | undefined;
  if (!memberId) return res.status(400).json({ error: "member_idは必須です" });

  const member = getMemberById(memberId);
  if (!member) return res.status(404).json({ error: "メンバーが見つかりません" });

  try {
    const limit = parseInt(String(req.query.limit ?? "10"), 10);
    const result = await getMemberTweets(member.twitter, limit);
    res.json(result.data ?? []);
  } catch (err) {
    if (err instanceof RateLimitExceeded) {
      return res.status(429).json({ error: String(err), rate_limit: getStatus() });
    }
    res.status(500).json({ error: String(err) });
  }
}
