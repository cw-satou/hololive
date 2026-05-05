import OpenAI from "openai";

const OPENAI_MODEL = "gpt-4o";

function openai() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function summarizeStream(params: {
  title: string;
  description: string;
  transcriptText: string;
  chatHighlights: { time: string; score: number; type: string }[];
  memberName: string;
}): Promise<Record<string, unknown>> {
  const { title, description, transcriptText, chatHighlights, memberName } = params;

  const chatInfo = chatHighlights
    .slice(0, 10)
    .map((h) => `- ${h.time}: スコア${h.score} (${h.type})`)
    .join("\n");

  const transcriptExcerpt = trimTranscript(transcriptText, 3000);

  const prompt = `あなたはVTuber切り抜き動画の専門編集者です。
以下の配信情報を分析して、切り抜きに最適な情報をJSON形式で返してください。

【配信者】${memberName}
【タイトル】${title}
【概要欄】
${description.slice(0, 500)}

【字幕（抜粋）】
${transcriptExcerpt}

【チャット盛り上がりポイント】
${chatInfo}

以下のJSON形式で回答してください：
{
  "summary": "配信全体の簡潔な説明（100文字以内）",
  "highlights": [
    {"time_hint": "盛り上がり時刻のヒント", "description": "何が起きたか", "reason": "切り抜き推奨理由"}
  ],
  "clip_suggestions": [
    {"title": "動画タイトル案", "style": "編集スタイル", "description": "どんな切り抜きか", "duration_seconds": 推奨秒数}
  ],
  "tags": ["関連タグ1", "関連タグ2"],
  "thumbnail_text": "サムネイルに入れるキャッチコピー"
}

highlights は最大5個、clip_suggestions は最大3個にしてください。`;

  const response = await openai().chat.completions.create({
    model: OPENAI_MODEL,
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.7,
  });

  const content = response.choices[0].message.content ?? "{}";
  return JSON.parse(content);
}

function trimTranscript(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const chunk = Math.floor(maxChars / 3);
  const start = text.slice(0, chunk);
  const midStart = Math.floor(text.length / 2) - Math.floor(chunk / 2);
  const middle = text.slice(midStart, midStart + chunk);
  const end = text.slice(-chunk);
  return `${start}\n...(中略)...\n${middle}\n...(中略)...\n${end}`;
}
