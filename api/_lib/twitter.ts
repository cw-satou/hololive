import { consume, RateLimitExceeded } from "./x-rate-limiter.js";

export { RateLimitExceeded };

const X_BASE_URL = "https://api.twitter.com/2";

function bearerHeaders() {
  return { Authorization: `Bearer ${process.env.X_BEARER_TOKEN ?? ""}` };
}

export async function searchTweets(query: string, maxResults = 20): Promise<{ data?: Tweet[]; includes?: { users?: XUser[] } }> {
  consume(1);
  const url = new URL(`${X_BASE_URL}/tweets/search/recent`);
  url.searchParams.set("query", query);
  url.searchParams.set("max_results", String(Math.min(Math.max(10, maxResults), 100)));
  url.searchParams.set("tweet.fields", "created_at,public_metrics,author_id");
  url.searchParams.set("expansions", "author_id");
  url.searchParams.set("user.fields", "name,username,profile_image_url");
  const res = await fetch(url.toString(), { headers: bearerHeaders() });
  if (!res.ok) throw new Error(`X API error: ${res.status}`);
  return res.json();
}

export async function getMemberTweets(twitterUsername: string, maxResults = 20): Promise<{ data?: Tweet[] }> {
  consume(2);
  const userRes = await fetch(
    `${X_BASE_URL}/users/by/username/${twitterUsername}?user.fields=id,name,username`,
    { headers: bearerHeaders() }
  );
  if (!userRes.ok) throw new Error(`X user lookup error: ${userRes.status}`);
  const userData = await userRes.json() as { data?: { id: string } };
  const userId = userData.data?.id;
  if (!userId) throw new Error(`ユーザーが見つかりません: ${twitterUsername}`);

  const url = new URL(`${X_BASE_URL}/users/${userId}/tweets`);
  url.searchParams.set("max_results", String(Math.min(Math.max(5, maxResults), 100)));
  url.searchParams.set("tweet.fields", "created_at,public_metrics,entities");
  url.searchParams.set("exclude", "retweets,replies");
  const res = await fetch(url.toString(), { headers: bearerHeaders() });
  if (!res.ok) throw new Error(`X timeline error: ${res.status}`);
  return res.json();
}

export async function searchFanReactions(memberName: string, videoTitle?: string, maxResults = 20): Promise<FormattedTweet[]> {
  let query = `${memberName} -is:retweet lang:ja`;
  if (videoTitle) {
    const kw = videoTitle.replace(/[【】\[\]（）()「」『』#＃]/g, " ").replace(/\s+/g, " ").trim().slice(0, 20);
    if (kw) query = `${memberName} ${kw} -is:retweet lang:ja`;
  }
  const result = await searchTweets(query, maxResults);
  const tweets = result.data ?? [];
  const users: Record<string, XUser> = {};
  for (const u of result.includes?.users ?? []) users[u.id] = u;

  return tweets.map((t) => ({
    id: t.id,
    text: t.text,
    created_at: t.created_at,
    likes: t.public_metrics?.like_count ?? 0,
    retweets: t.public_metrics?.retweet_count ?? 0,
    author: users[t.author_id ?? ""]?.name ?? "",
    username: users[t.author_id ?? ""]?.username ?? "",
  }));
}

interface Tweet {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: { like_count: number; retweet_count: number };
}

interface XUser {
  id: string;
  name: string;
  username: string;
}

interface FormattedTweet {
  id: string;
  text: string;
  created_at?: string;
  likes: number;
  retweets: number;
  author: string;
  username: string;
}
