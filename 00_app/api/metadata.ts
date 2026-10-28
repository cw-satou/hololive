import type { VercelRequest, VercelResponse } from "@vercel/node";

interface MetadataRequest {
  video_title?: string;
  video_description?: string;
  channel_name?: string;
  production?: string;
  platform?: "youtube" | "shorts" | "x";
}

interface MetadataResult {
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
}

const PLATFORM_GUIDES: Record<string, string> = {
  youtube: "YouTube通常動画（タイトル100文字以内、説明文500文字以内、タグ15個まで）",
  shorts: "YouTube Shorts（タイトル簡潔に、#Shorts タグ必須、縦型60秒以内）",
  x: "X（旧Twitter）投稿（280文字以内、ハッシュタグ3個まで）",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const data = req.body as MetadataRequest;
  const { video_title, video_description, channel_name, production, platform = "youtube" } = data;

  if (!video_title && !video_description) {
    return res.status(400).json({ error: "動画タイトルまたは説明を入力してください" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OpenAI APIキーが設定されていません" });

  const prodName =
    production === "vspo" ? "ぶいすぽっ！" : production === "hololive" ? "ホロライブ" : "VTuber";

  const prompt = `${prodName}の切り抜き動画メタデータを生成してください。

元動画:
- タイトル: ${video_title ?? "(不明)"}
- チャンネル: ${channel_name ?? "(不明)"}
- 説明文: ${(video_description ?? "").slice(0, 300) || "(なし)"}

プラットフォーム: ${PLATFORM_GUIDES[platform] ?? platform}

以下のJSON形式のみで返してください（説明なし）:
{
  "title": "切り抜きタイトル",
  "description": "説明文",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "hashtags": ["#ハッシュタグ1", "#ハッシュタグ2"]
}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "VTuber切り抜き動画のメタデータ最適化の専門家です。JSONのみ返してください。",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
    });

    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);

    const result = (await response.json()) as { choices: { message: { content: string } }[] };
    const content = result.choices[0]?.message?.content ?? "{}";
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned) as MetadataResult;
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
