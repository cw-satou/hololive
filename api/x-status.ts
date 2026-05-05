import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStatus } from "./_lib/x-rate-limiter.js";

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.json(getStatus());
}
