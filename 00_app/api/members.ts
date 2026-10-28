import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAllMembers, type Production } from "./_lib/members.js";

export default function handler(req: VercelRequest, res: VercelResponse) {
  const production = req.query.production as Production | undefined;
  res.json(getAllMembers(production));
}
