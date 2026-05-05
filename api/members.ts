import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllMembers } from "./_lib/members.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json(getAllMembers());
}
