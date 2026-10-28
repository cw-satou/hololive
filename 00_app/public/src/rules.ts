export interface ProductionRules {
  production: "vspo" | "hololive";
  production_name: string;
  emoji: string;
  monetization_status: "OK" | "conditional" | "NG";
  monetization_detail: string;
  credits: string;
  allowed: string[];
  prohibited: string[];
  notes: string[];
  source_url: string;
  source_label: string;
}

export const CLIP_RULES: ProductionRules[] = [
  {
    production: "vspo",
    production_name: "ぶいすぽっ！",
    emoji: "💜",
    monetization_status: "OK",
    monetization_detail: "YouTubeパートナープログラムでの収益化OK（チャンネル条件を満たす場合）",
    credits: "タイトルか説明欄にライバー名・「ぶいすぽっ！」の明記を推奨",
    allowed: [
      "ゲーム・雑談・歌・コラボの切り抜き",
      "字幕・翻訳付き動画",
      "ハイライト・まとめ動画",
      "YouTube Shorts・縦型動画",
    ],
    prohibited: [
      "個人情報の暴露・特定につながる内容",
      "誤解を招く・フェイク的な編集",
      "公序良俗に反するコンテンツ",
      "著作権楽曲のみを抜き出した音楽動画",
    ],
    notes: [
      "配信終了直後は少し間を置いてから投稿するのが親切",
      "センシティブな内容はライバーへの確認を推奨",
      "切り抜き動画にVSPOロゴの無断使用はNG",
    ],
    source_url: "https://vspo.jp",
    source_label: "ぶいすぽっ！公式サイト",
  },
  {
    production: "hololive",
    production_name: "ホロライブ",
    emoji: "💙",
    monetization_status: "conditional",
    monetization_detail: "カバー株式会社の公式ガイドラインに基づき収益化可能（要確認）",
    credits: "タイトルまたは説明欄にタレント名・「ホロライブ」の明記が必要",
    allowed: [
      "配信の切り抜き（ゲーム・雑談・歌など）",
      "字幕・翻訳付き動画（多言語OK）",
      "ハイライト・まとめ動画",
      "公式ガイドラインに準拠したファンコンテンツ",
    ],
    prohibited: [
      "個人情報の暴露",
      "タレントの名誉を傷つけるコンテンツ",
      "誤解を生む・フェイク的な切り抜き",
      "BGM・楽曲のみを切り抜いた動画",
    ],
    notes: [
      "ホロライブプロダクションのファンコンテンツガイドラインに準拠",
      "英語字幕付き動画も許可",
      "ルールは変更される場合があります。必ず最新の公式情報をご確認ください",
    ],
    source_url: "https://hololivepro.com/en/clippingguidelines/",
    source_label: "ホロライブ公式クリッピングガイドライン",
  },
];
