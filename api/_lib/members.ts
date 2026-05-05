export interface Member {
  id: string;
  name: string;
  name_en: string;
  twitter: string;
  color: string;
  icon: string;
  gen: string;
}

export const HOLOLIVE_MEMBERS: Member[] = [
  // 0期生
  { id: "tokino_sora",      name: "ときのそら",     name_en: "Tokino Sora",      twitter: "tokino_sora",       color: "#4CA8E0", icon: "🌟", gen: "0期生" },
  { id: "robocosan",        name: "ロボ子さん",     name_en: "Robocosan",        twitter: "robocosan",          color: "#C0C0C0", icon: "🤖", gen: "0期生" },
  { id: "sakura_miko",      name: "さくらみこ",     name_en: "Sakura Miko",      twitter: "sakuramiko_holo",   color: "#F24C8F", icon: "🌸", gen: "0期生" },
  { id: "hoshimachi_suisei",name: "星街すいせい",   name_en: "Hoshimachi Suisei",twitter: "hoshimachi_sui",    color: "#69C1C5", icon: "💫", gen: "0期生" },
  { id: "azki",             name: "AZKi",           name_en: "AZKi",             twitter: "AZKi_VDiVA",        color: "#E83770", icon: "🎵", gen: "0期生" },
  // 1期生
  { id: "yozora_mel",       name: "夜空メル",       name_en: "Yozora Mel",       twitter: "yozoramel",         color: "#F8D342", icon: "🧡", gen: "1期生" },
  { id: "shirakami_fubuki", name: "白上フブキ",     name_en: "Shirakami Fubuki", twitter: "shirakamifubuki",   color: "#00B4FF", icon: "🦊", gen: "1期生" },
  { id: "natsuiro_matsuri", name: "夏色まつり",     name_en: "Natsuiro Matsuri", twitter: "natsumatsuri",      color: "#FF6B9D", icon: "🎆", gen: "1期生" },
  { id: "aki_rosenthal",    name: "アキ・ローゼンタール", name_en: "Aki Rosenthal", twitter: "akirosenthal",  color: "#D4AC0D", icon: "🌹", gen: "1期生" },
  { id: "akai_haato",       name: "赤井はあと",     name_en: "Akai Haato",       twitter: "akaihaato",         color: "#E74C3C", icon: "❤️", gen: "1期生" },
  // 2期生
  { id: "minato_aqua",      name: "湊あくあ",       name_en: "Minato Aqua",      twitter: "minatoaqua",        color: "#87CEFA", icon: "💧", gen: "2期生" },
  { id: "murasaki_shion",   name: "紫咲シオン",     name_en: "Murasaki Shion",   twitter: "murasakishionhh",   color: "#9B59B6", icon: "🔮", gen: "2期生" },
  { id: "nakiri_ayame",     name: "百鬼あやめ",     name_en: "Nakiri Ayame",     twitter: "nakiriayame",       color: "#E74C3C", icon: "🌺", gen: "2期生" },
  { id: "yuzuki_choco",     name: "癒月ちょこ",     name_en: "Yuzuki Choco",     twitter: "yuzukichocohh",     color: "#FF69B4", icon: "🍫", gen: "2期生" },
  { id: "oozora_subaru",    name: "大空スバル",     name_en: "Oozora Subaru",    twitter: "ozorasubaru",       color: "#F4D03F", icon: "🦆", gen: "2期生" },
  // ゲーマーズ
  { id: "ookami_mio",       name: "大神ミオ",       name_en: "Ookami Mio",       twitter: "ookamimio",         color: "#C0392B", icon: "🐺", gen: "ゲーマーズ" },
  { id: "nekomata_okayu",   name: "猫又おかゆ",     name_en: "Nekomata Okayu",   twitter: "nekomataokayu",     color: "#9370DB", icon: "🐱", gen: "ゲーマーズ" },
  { id: "inugami_korone",   name: "戌神ころね",     name_en: "Inugami Korone",   twitter: "inugamikorone",     color: "#D2691E", icon: "🐶", gen: "ゲーマーズ" },
  // 3期生（ファンタジー）
  { id: "usada_pekora",     name: "兎田ぺこら",     name_en: "Usada Pekora",     twitter: "usadapekora",       color: "#3498DB", icon: "🥕", gen: "3期生" },
  { id: "shiranui_flare",   name: "不知火フレア",   name_en: "Shiranui Flare",   twitter: "shiranuiflare",     color: "#E67E22", icon: "🔥", gen: "3期生" },
  { id: "shirogane_noel",   name: "白銀ノエル",     name_en: "Shirogane Noel",   twitter: "shiroganenoel",     color: "#808080", icon: "🛡️", gen: "3期生" },
  { id: "amane_kanata",     name: "天音かなた",     name_en: "Amane Kanata",     twitter: "amanekanatach",     color: "#AED6F1", icon: "😇", gen: "3期生" },
  // 4期生
  { id: "tsunomaki_watame", name: "角巻わため",     name_en: "Tsunomaki Watame", twitter: "tsunomakiwatame",   color: "#F8D342", icon: "🐑", gen: "4期生" },
  { id: "tokoyami_towa",    name: "常闇トワ",       name_en: "Tokoyami Towa",    twitter: "tokoyamitowa",      color: "#9B59B6", icon: "😈", gen: "4期生" },
  { id: "himemori_luna",    name: "姫森ルーナ",     name_en: "Himemori Luna",    twitter: "himemoriluna",      color: "#FFB6C1", icon: "👑", gen: "4期生" },
  // 5期生（ねぽらぼ）
  { id: "yukihana_lamy",    name: "雪花ラミィ",     name_en: "Yukihana Lamy",    twitter: "yukihanalamy",      color: "#87CEFA", icon: "🌨️", gen: "5期生" },
  { id: "momosuzu_nene",    name: "桃鈴ねね",       name_en: "Momosuzu Nene",    twitter: "momosuzunene",      color: "#FF6B9D", icon: "💛", gen: "5期生" },
  { id: "shishiro_botan",   name: "獅白ぼたん",     name_en: "Shishiro Botan",   twitter: "shishirobotan",     color: "#C0C0C0", icon: "🦁", gen: "5期生" },
  { id: "omaru_polka",      name: "尾丸ポルカ",     name_en: "Omaru Polka",      twitter: "omarupolka",        color: "#E67E22", icon: "🎪", gen: "5期生" },
  // 6期生（秘密結社holoX）
  { id: "laplus_darkness",  name: "ラプラス・ダークネス", name_en: "La+ Darkness", twitter: "laplus_kaf",      color: "#8B008B", icon: "💜", gen: "6期生" },
  { id: "takane_lui",       name: "鷹嶺ルイ",       name_en: "Takane Lui",       twitter: "takanelui",         color: "#8B0000", icon: "🦅", gen: "6期生" },
  { id: "hakui_koyori",     name: "博衣こより",     name_en: "Hakui Koyori",     twitter: "hakuikoyori",       color: "#FF69B4", icon: "🧪", gen: "6期生" },
  { id: "sakamata_chloe",   name: "沙花叉クロヱ",   name_en: "Sakamata Chloe",   twitter: "sakamatachloe",     color: "#1A237E", icon: "🌊", gen: "6期生" },
  { id: "kazama_iroha",     name: "風真いろは",     name_en: "Kazama Iroha",     twitter: "kazamairoha_hh",    color: "#2ECC71", icon: "🌸", gen: "6期生" },
  // 7期生（ReGLOSS）
  { id: "otonose_kanade",   name: "音乃瀬奏",       name_en: "Otonose Kanade",   twitter: "kanade_holo",       color: "#4CA8E0", icon: "🎹", gen: "ReGLOSS" },
  { id: "ichijou_ririka",   name: "一条莉々華",     name_en: "Ichijou Ririka",   twitter: "ririka_holo",       color: "#C0392B", icon: "👑", gen: "ReGLOSS" },
  { id: "juufuutei_raden",  name: "儒烏風亭らでん", name_en: "Juufuutei Raden",  twitter: "raden_holo",        color: "#5D6D7E", icon: "🍶", gen: "ReGLOSS" },
  { id: "todoroki_hajime",  name: "轟はじめ",       name_en: "Todoroki Hajime",  twitter: "hajime_holo",       color: "#E67E22", icon: "🌻", gen: "ReGLOSS" },
  { id: "isaki_mahiro",     name: "Elizabeth Rose Bloodflame", name_en: "Isaki Mahiro", twitter: "mahiro_holo", color: "#E91E8C", icon: "🌹", gen: "ReGLOSS" },
];

export function getAllMembers(): Member[] {
  return HOLOLIVE_MEMBERS;
}

export function getMemberById(id: string): Member | undefined {
  return HOLOLIVE_MEMBERS.find((m) => m.id === id);
}
