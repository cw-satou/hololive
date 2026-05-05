import fs from "fs";
import path from "path";

const DAILY_ALLOC = 15;
const MONTHLY_LIMIT = 500;
const POOL_HARD_CAP = 120;

interface RateState {
  balance: number;
  last_updated: string;
  monthly_used: number;
  month: string;
}

export class RateLimitExceeded extends Error {}

function statePath(): string {
  const dataDir = process.env.DATA_DIR ||
    (process.env.VERCEL ? "/tmp" : path.join(process.cwd(), "data"));
  return path.join(dataDir, "x_rate_limit.json");
}

function load(): RateState {
  const p = statePath();
  if (fs.existsSync(p)) {
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8")) as RateState;
    } catch { /* fall through */ }
  }
  const today = new Date().toISOString().slice(0, 10);
  return { balance: DAILY_ALLOC, last_updated: today, monthly_used: 0, month: today.slice(0, 7) };
}

function save(state: RateState): void {
  const p = statePath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(state, null, 2), "utf-8");
}

function accrue(state: RateState): RateState {
  const today = new Date().toISOString().slice(0, 10);
  const last = new Date(state.last_updated);
  const elapsed = Math.floor((Date.now() - last.getTime()) / 86400000);
  if (elapsed <= 0) return state;

  const currentMonth = today.slice(0, 7);
  if (state.month !== currentMonth) {
    state.monthly_used = 0;
    state.month = currentMonth;
  }

  const monthlyRemaining = MONTHLY_LIMIT - state.monthly_used;
  const cap = Math.min(POOL_HARD_CAP, monthlyRemaining);
  state.balance = Math.max(0, Math.min(state.balance + elapsed * DAILY_ALLOC, cap));
  state.last_updated = today;
  return state;
}

export function getStatus() {
  const state = accrue(load());
  save(state);
  return {
    balance: state.balance,
    daily_alloc: DAILY_ALLOC,
    monthly_used: state.monthly_used,
    monthly_limit: MONTHLY_LIMIT,
    monthly_remaining: MONTHLY_LIMIT - state.monthly_used,
    last_updated: state.last_updated,
  };
}

export function consume(n = 1): void {
  const state = accrue(load());
  if (state.monthly_used + n > MONTHLY_LIMIT) {
    save(state);
    throw new RateLimitExceeded(`X API 月間上限（${MONTHLY_LIMIT}）に達しています。今月の使用数: ${state.monthly_used}`);
  }
  if (state.balance < n) {
    save(state);
    throw new RateLimitExceeded(`本日のX API残高が不足しています（残高: ${state.balance}）。1日${DAILY_ALLOC}リクエストずつ補充されます。`);
  }
  state.balance -= n;
  state.monthly_used += n;
  save(state);
}
