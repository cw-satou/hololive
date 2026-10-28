export type Production = "vspo" | "hololive";

export interface Member {
  id: string;
  name: string;
  name_en: string;
  twitter: string;
  color: string;
  icon: string;
  production: Production;
}

const VSPO_MEMBERS: Member[] = [
  { id: "sena_asumi",      name: "空澄セナ",     name_en: "Sena Asumi",       twitter: "AsHmiSena",        color: "#87CEEB", icon: "🌊", production: "vspo" },
  { id: "sumire_kaga",     name: "花芽すみれ",   name_en: "Sumire Kaga",      twitter: "KagaSumire",       color: "#9B59B6", icon: "🌸", production: "vspo" },
  { id: "nazuna_kaga",     name: "花芽なずな",   name_en: "Nazuna Kaga",      twitter: "KagaNazuna",       color: "#FF69B4", icon: "🌼", production: "vspo" },
  { id: "beni_yakumo",     name: "八雲べに",     name_en: "Beni Yakumo",      twitter: "YakumoBeni",       color: "#E74C3C", icon: "🍁", production: "vspo" },
  { id: "mimi_tosaki",     name: "兎咲ミミ",     name_en: "Mimi Tosaki",      twitter: "TosakyMimi",       color: "#F0E68C", icon: "🐰", production: "vspo" },
  { id: "uruha_ichinose",  name: "一ノ瀬うるは", name_en: "Uruha Ichinose",   twitter: "IchinoseUruha",    color: "#00CED1", icon: "🌊", production: "vspo" },
  { id: "hinano_tachibana",name: "橘ひなの",     name_en: "Hinano Tachibana", twitter: "TachihanaHinano",  color: "#FFA500", icon: "🍊", production: "vspo" },
  { id: "toto_kozume",     name: "小雀とと",     name_en: "Toto Kozume",      twitter: "KozumeToto",       color: "#8FBC8F", icon: "🐦", production: "vspo" },
  { id: "qpi_kaminari",    name: "神成きゅぴ",   name_en: "Qpi Kaminari",     twitter: "KaminariQpi",      color: "#FFD700", icon: "⚡", production: "vspo" },
  { id: "ramune_shironami",name: "白波らむね",   name_en: "Ramune Shironami", twitter: "ShironamiRamune",  color: "#ADD8E6", icon: "🥤", production: "vspo" },
  { id: "ren_kisaragi",    name: "如月れん",     name_en: "Ren Kisaragi",     twitter: "KisaragiRen",      color: "#FF6B9D", icon: "🌹", production: "vspo" },
  { id: "runa_shinnomiya", name: "紫宮るな",     name_en: "Runa Shinnomiya",  twitter: "ShinnomiyaRuna",   color: "#9370DB", icon: "🔮", production: "vspo" },
  { id: "risa_hanabusa",   name: "英リサ",       name_en: "Risa Hanabusa",    twitter: "HanabusaRisa",     color: "#20B2AA", icon: "🌺", production: "vspo" },
  { id: "nana_kagura",     name: "カグラナナ",   name_en: "Nana Kagura",      twitter: "KaguraNana",       color: "#FF4500", icon: "🦊", production: "vspo" },
  { id: "akari_yumeno",    name: "夢野あかり",   name_en: "Akari Yumeno",     twitter: "YumenoAkari",      color: "#FF8C94", icon: "🌟", production: "vspo" },
  { id: "ema_aizawa",      name: "藍沢エマ",     name_en: "Ema Aizawa",       twitter: "AizawaEma",        color: "#4169E1", icon: "💙", production: "vspo" },
  { id: "noa_kurumi",      name: "胡桃のあ",     name_en: "Noa Kurumi",       twitter: "KurumiNoa",        color: "#DEB887", icon: "🌰", production: "vspo" },
  { id: "tsuna_nekota",    name: "猫汰つな",     name_en: "Tsuna Nekota",     twitter: "NekotaTsuna",      color: "#F5CBA7", icon: "🐱", production: "vspo" },
];

const HOLOLIVE_MEMBERS: Member[] = [
  // 0期生
  { id: "tokino_sora",        name: "ときのそら",         name_en: "Tokino Sora",       twitter: "tokino_sora",       color: "#4CA8E0", icon: "🌟", production: "hololive" },
  { id: "robocosan",          name: "ロボ子さん",         name_en: "Robocosan",         twitter: "robocosan",          color: "#C0C0C0", icon: "🤖", production: "hololive" },
  { id: "sakura_miko",        name: "さくらみこ",         name_en: "Sakura Miko",       twitter: "sakuramiko_holo",    color: "#F24C8F", icon: "🌸", production: "hololive" },
  { id: "hoshimachi_suisei",  name: "星街すいせい",       name_en: "Hoshimachi Suisei", twitter: "hoshimachi_sui",     color: "#69C1C5", icon: "💫", production: "hololive" },
  { id: "azki",               name: "AZKi",               name_en: "AZKi",              twitter: "AZKi_VDiVA",         color: "#E83770", icon: "🎵", production: "hololive" },
  // 1期生
  { id: "yozora_mel",         name: "夜空メル",           name_en: "Yozora Mel",        twitter: "yozoramel",          color: "#F8D342", icon: "🧡", production: "hololive" },
  { id: "shirakami_fubuki",   name: "白上フブキ",         name_en: "Shirakami Fubuki",  twitter: "shirakamifubuki",    color: "#00B4FF", icon: "🦊", production: "hololive" },
  { id: "natsuiro_matsuri",   name: "夏色まつり",         name_en: "Natsuiro Matsuri",  twitter: "natsumatsuri",       color: "#FF6B9D", icon: "🎆", production: "hololive" },
  { id: "aki_rosenthal",      name: "アキ・ローゼンタール", name_en: "Aki Rosenthal",   twitter: "akirosenthal",       color: "#D4AC0D", icon: "🌹", production: "hololive" },
  { id: "akai_haato",         name: "赤井はあと",         name_en: "Akai Haato",        twitter: "akaihaato",          color: "#E74C3C", icon: "❤️", production: "hololive" },
  // 2期生
  { id: "minato_aqua",        name: "湊あくあ",           name_en: "Minato Aqua",       twitter: "minatoaqua",         color: "#87CEFA", icon: "💧", production: "hololive" },
  { id: "murasaki_shion",     name: "紫咲シオン",         name_en: "Murasaki Shion",    twitter: "murasakishionhh",    color: "#9B59B6", icon: "🔮", production: "hololive" },
  { id: "nakiri_ayame",       name: "百鬼あやめ",         name_en: "Nakiri Ayame",      twitter: "nakiriayame",        color: "#E74C3C", icon: "🌺", production: "hololive" },
  { id: "yuzuki_choco",       name: "癒月ちょこ",         name_en: "Yuzuki Choco",      twitter: "yuzukichocohh",      color: "#FF69B4", icon: "🍫", production: "hololive" },
  { id: "oozora_subaru",      name: "大空スバル",         name_en: "Oozora Subaru",     twitter: "ozorasubaru",        color: "#F4D03F", icon: "🦆", production: "hololive" },
  // ゲーマーズ
  { id: "ookami_mio",         name: "大神ミオ",           name_en: "Ookami Mio",        twitter: "ookamimio",          color: "#C0392B", icon: "🐺", production: "hololive" },
  { id: "nekomata_okayu",     name: "猫又おかゆ",         name_en: "Nekomata Okayu",    twitter: "nekomataokayu",      color: "#9370DB", icon: "🐱", production: "hololive" },
  { id: "inugami_korone",     name: "戌神ころね",         name_en: "Inugami Korone",    twitter: "inugamikorone",      color: "#D2691E", icon: "🐶", production: "hololive" },
  // 3期生
  { id: "usada_pekora",       name: "兎田ぺこら",         name_en: "Usada Pekora",      twitter: "usadapekora",        color: "#3498DB", icon: "🥕", production: "hololive" },
  { id: "shiranui_flare",     name: "不知火フレア",       name_en: "Shiranui Flare",    twitter: "shiranuiflare",      color: "#E67E22", icon: "🔥", production: "hololive" },
  { id: "shirogane_noel",     name: "白銀ノエル",         name_en: "Shirogane Noel",    twitter: "shiroganenoel",      color: "#808080", icon: "🛡️", production: "hololive" },
  { id: "amane_kanata",       name: "天音かなた",         name_en: "Amane Kanata",      twitter: "amanekanatach",      color: "#AED6F1", icon: "😇", production: "hololive" },
  // 4期生
  { id: "tsunomaki_watame",   name: "角巻わため",         name_en: "Tsunomaki Watame",  twitter: "tsunomakiwatame",    color: "#F8D342", icon: "🐑", production: "hololive" },
  { id: "tokoyami_towa",      name: "常闇トワ",           name_en: "Tokoyami Towa",     twitter: "tokoyamitowa",       color: "#9B59B6", icon: "😈", production: "hololive" },
  { id: "himemori_luna",      name: "姫森ルーナ",         name_en: "Himemori Luna",     twitter: "himemoriluna",       color: "#FFB6C1", icon: "👑", production: "hololive" },
  // 5期生
  { id: "yukihana_lamy",      name: "雪花ラミィ",         name_en: "Yukihana Lamy",     twitter: "yukihanalamy",       color: "#87CEFA", icon: "🌨️", production: "hololive" },
  { id: "momosuzu_nene",      name: "桃鈴ねね",           name_en: "Momosuzu Nene",     twitter: "momosuzunene",       color: "#FF6B9D", icon: "💛", production: "hololive" },
  { id: "shishiro_botan",     name: "獅白ぼたん",         name_en: "Shishiro Botan",    twitter: "shishirobotan",      color: "#C0C0C0", icon: "🦁", production: "hololive" },
  { id: "omaru_polka",        name: "尾丸ポルカ",         name_en: "Omaru Polka",       twitter: "omarupolka",         color: "#E67E22", icon: "🎪", production: "hololive" },
  // 6期生
  { id: "laplus_darkness",    name: "ラプラス・ダークネス", name_en: "La+ Darkness",    twitter: "laplus_kaf",         color: "#8B008B", icon: "💜", production: "hololive" },
  { id: "takane_lui",         name: "鷹嶺ルイ",           name_en: "Takane Lui",        twitter: "takanelui",          color: "#8B0000", icon: "🦅", production: "hololive" },
  { id: "hakui_koyori",       name: "博衣こより",         name_en: "Hakui Koyori",      twitter: "hakuikoyori",        color: "#FF69B4", icon: "🧪", production: "hololive" },
  { id: "sakamata_chloe",     name: "沙花叉クロヱ",       name_en: "Sakamata Chloe",    twitter: "sakamatachloe",      color: "#1A237E", icon: "🌊", production: "hololive" },
  { id: "kazama_iroha",       name: "風真いろは",         name_en: "Kazama Iroha",      twitter: "kazamairoha_hh",     color: "#2ECC71", icon: "🌸", production: "hololive" },
  // ReGLOSS
  { id: "otonose_kanade",     name: "音乃瀬奏",           name_en: "Otonose Kanade",    twitter: "kanade_holo",        color: "#4CA8E0", icon: "🎹", production: "hololive" },
  { id: "ichijou_ririka",     name: "一条莉々華",         name_en: "Ichijou Ririka",    twitter: "ririka_holo",        color: "#C0392B", icon: "👑", production: "hololive" },
  { id: "juufuutei_raden",    name: "儒烏風亭らでん",     name_en: "Juufuutei Raden",   twitter: "raden_holo",         color: "#5D6D7E", icon: "🍶", production: "hololive" },
  { id: "todoroki_hajime",    name: "轟はじめ",           name_en: "Todoroki Hajime",   twitter: "hajime_holo",        color: "#E67E22", icon: "🌻", production: "hololive" },
  { id: "isaki_mahiro",       name: "Elizabeth Rose Bloodflame", name_en: "Isaki Mahiro", twitter: "mahiro_holo",    color: "#E91E8C", icon: "🌹", production: "hololive" },
];

export const ALL_MEMBERS: Member[] = [...VSPO_MEMBERS, ...HOLOLIVE_MEMBERS];

export function getAllMembers(production?: Production | "all"): Member[] {
  if (!production || production === "all") return ALL_MEMBERS;
  return ALL_MEMBERS.filter((m) => m.production === production);
}

export function getMemberById(id: string): Member | undefined {
  return ALL_MEMBERS.find((m) => m.id === id);
}
