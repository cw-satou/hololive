"""切り抜き支援ツール(19 hololive)。ライブアーカイブ1本から、切り抜く場所を見つけ、動画を切り出し、
字幕・補足・効果音を載せたYMM4のプロジェクトまでを作る。手元のPCで動かす(Vercelのアプリでは動画を扱えないため)。

段階(1つずつでも、まとめてでも動かせる):
  fetch  <URL>         動画・情報(Most replayed の山=heatmap・概要欄)・コメント・チャットのリプレイを落とす
  find   <作業フォルダ>  コメント内の時間表記(「いつ何があったか」)と、チャットの分間チャット数で盛り上がりを測り、
                       切り抜く候補を並べる → candidates.md / candidates.json / minutes.md(1分ごとの表)
  cut    <作業フォルダ> <候補の番号...>   候補の区間を切り出し、しゃべりを文字起こし(faster-whisper)する
  ymmp   <作業フォルダ> <候補の番号...>   切り出した動画に、字幕・補足のテロップ・効果音を載せたYMM4のプロジェクトを作る
  edit   <作業フォルダ> [--minutes 10]   盛り上がった場面をたくさん拾い、時刻の順につないで1本の切り抜きにする
                       (場面ごとに字幕・補足のテロップ・効果音) → edit_list.md / edit/kirinuki.ymmp
  all    <URL> [--minutes 10]  fetch → edit(切り抜きの本来の形=何場面もつないだ1本)

使い方の例:
  python kirinuki.py all https://www.youtube.com/watch?v=XXXXXXXXXXX --minutes 10
作業フォルダ: 19_hololive/03_doing/<日付>_<動画ID>/
要るもの: yt-dlp・ffmpeg が PATH にあること / pip install faster-whisper
効果音: tools/kirinuki/se/ に wav・mp3 を置くと、盛り上がりの瞬間に順に置く(無ければ置かない)
切り抜きは各事務所の二次創作ガイドラインに従う(ホロライブ=カバー株式会社の二次創作ガイドライン。出典の明記など)
"""
import argparse
import datetime as dt
import glob
import json
import math
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BIZ = os.path.abspath(os.path.join(HERE, "..", "..", ".."))          # 19_hololive
DOING = os.path.join(BIZ, "03_doing")
YMM_LIB = r"E:\Users\satou\Documents\git\08_omnipost\.claude\skills\ymm4-mv\scripts"   # 18 で使っているYMM4の部品
SE_DIR = os.path.join(HERE, "se")
# 効果音とつなぎ目(2026-10-29本人の素材 zip から。gitには置かない → 01_input/動画制作素材/)
ASSET_SE = os.path.join(BIZ, "01_input", "動画制作素材", "素材類", "YMM4", "効果音（割と使うのが入ってる）")
SE_LAUGH = ["ピヨン.mp3", "ボヨン.mp3", "間抜け3.mp3", "パフ.mp3", "ズッコケる01.mp3"]   # 笑いの山に順に
SE_SCENE = "切り替え音木琴.mp3"     # 場面のつなぎ目(0.57秒)
SE_HOOK = "字幕インパクト音.mp3"    # 冒頭のつかみの頭
SE_VOL = 45                         # 元の声を邪魔しない音量(切り抜きのコツ.md 4節)
FLASH_IN, FLASH_OUT = 0.15, 0.30    # つなぎ目の白フラッシュ(18のMVの「白へフェードして次へ」を短くしたもの)

BIN = 10.0              # 盛り上がりを数える幅(秒)
PAD_BEFORE, PAD_AFTER = 25.0, 35.0   # 山の前後に取る長さ(秒)。笑いの前振りから落ちまで入る長さ
MIN_GAP = 90.0          # 候補どうしの最小の間隔(秒)
LAUGH = re.compile(r"(草|笑|ｗ|w{2,}|W{2,}|www|ワロ|かわいい|可愛い|！？|!\?|えぐ|うま|てぇてぇ|助かる|kawaii|LOL|lol)")
TS = re.compile(r"(?<!\d)(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?!\d)")


def run(cmd):
    print(">", " ".join(cmd), flush=True)
    subprocess.run(cmd, check=True)


def video_id(url):
    m = re.search(r"(?:v=|youtu\.be/|/live/)([\w-]{11})", url)
    if not m:
        raise SystemExit(f"動画IDが読めないURL: {url}")
    return m.group(1)


def hms(t):
    t = int(round(t))
    return f"{t // 3600}:{t % 3600 // 60:02d}:{t % 60:02d}" if t >= 3600 else f"{t // 60}:{t % 60:02d}"


def secs(h, m, s):
    return int(h or 0) * 3600 + int(m) * 60 + int(s)


# ---- 1. 落とす ------------------------------------------------------------------------------

FMT = "bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/b"


def fetch(url, with_video=True):
    vid = video_id(url)
    work = os.path.join(DOING, f"{dt.date.today():%Y%m%d}_{vid}")
    os.makedirs(work, exist_ok=True)
    o = os.path.join(work, "src")
    # 情報・コメント・チャットのリプレイ(動画より先に。動画は大きいので最後)
    run(["yt-dlp", "--skip-download", "--write-info-json", "--write-comments",
         "--extractor-args", "youtube:max_comments=3000,all,200;comment_sort=top",
         "--write-subs", "--sub-langs", "live_chat", "-o", o + ".%(ext)s", url])
    if load_info(work).get("availability") in ("subscriber_only", "premium_only", "needs_auth"):
        # 有料のもの(メンバーシップ限定など)は切り抜かない(ホロライブの切り抜きガイドライン。切り抜きのコツ.md 1節)
        sys.exit("止めた: メンバー限定・有料の動画は切り抜けない(ホロライブの切り抜きガイドライン)")
    fetch_captions(work)
    st = load_info(work).get("live_status")
    if st == "post_live":
        # 配信が終わった直後は、チャットのリプレイ・再生の山がまだ無く、区間だけの切り出しも失敗した(2026-10-28 試し)
        print("注意: この配信は終わった直後(post_live)で、チャットのリプレイと「最も再生された部分」がまだ作られていない。"
              "候補の点数が出ないので、数時間〜1日おいてから fetch し直す")
    if with_video:
        fetch_video(work)
    print("作業フォルダ:", work)
    return work


def fetch_video(work):
    """アーカイブの動画を丸ごと落とす。区間だけを落とす形(--download-sections・ffmpeg で直接読む)は、
    2026-10-29 の試しで2通りとも5分たっても1バイトも進まなかったので使わない"""
    url = load_info(work).get("webpage_url")
    run(["yt-dlp", "-N", "8", "-f", FMT, "--merge-output-format", "mp4", "-o", os.path.join(work, "src.%(ext)s"), url])


def load_info(work):
    p = os.path.join(work, "src.info.json")
    return json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}


def load_chat(work):
    """チャットのリプレイ → [(秒, 文字, 投げ銭か)]"""
    p = os.path.join(work, "src.live_chat.json")
    out = []
    if not os.path.exists(p):
        return out
    for ln in open(p, encoding="utf-8"):
        try:
            d = json.loads(ln)
        except json.JSONDecodeError:
            continue
        act = d.get("replayChatItemAction", {})
        t = int(act.get("videoOffsetTimeMsec", 0)) / 1000
        for a in act.get("actions", []):
            item = a.get("addChatItemAction", {}).get("item", {})
            for kind, r in item.items():
                if "Message" not in kind and "Paid" not in kind:
                    continue
                text = "".join(x.get("text", "") for x in r.get("message", {}).get("runs", []))
                out.append((t, text, "Paid" in kind))
    return out


# ---- 2. 見つける ----------------------------------------------------------------------------

def timeline(info, dur=0.0):
    """概要欄とコメント欄の時間表記 → [(秒, 見出し, 出どころ, 重み)]。
    時刻が書かれたコメントは1件でも数える。いいねの多いコメントほど重く、
    3つ以上の時刻が並ぶ「タイムライン」のコメントは1行ずつ数える"""
    rows = []
    sources = [("概要欄", info.get("description", ""), 50)]
    sources += [("コメント", c.get("text", ""), c.get("like_count") or 0) for c in info.get("comments", [])]
    for src, text, likes in sources:
        hits = []
        for line in text.splitlines():
            for m in TS.finditer(line):
                t = secs(*m.groups())
                if dur and t > dur:
                    continue
                label = re.sub(r":_[^:\s]*:?|\[\]", "", TS.sub("", line)).strip(" 　-:：・|｜~〜")   # メンバースタンプの記号を外す
                hits.append((t, label[:40]))
        w = 1.0 + math.log10(1 + likes)
        rows += [(t, lab, src, w) for t, lab in hits]
    return rows


def zscore(xs):
    n = len(xs) or 1
    mu = sum(xs) / n
    sd = math.sqrt(sum((x - mu) ** 2 for x in xs) / n) or 1.0
    return [(x - mu) / sd for x in xs]


def find(work, top=10):
    """盛り上がり = コメント内の時間表記(いいねで重み) + チャットの分間チャット数(前後30秒の件数)。
    山の位置は10秒刻みで探す"""
    info = load_info(work)
    dur = float(info.get("duration") or 0)
    chat = load_chat(work)
    tl = timeline(info, dur)
    if not dur:
        dur = max([t for t, *_ in chat] + [t for t, *_ in tl] + [600])
    nb = int(dur // BIN) + 1
    cnt10, laugh10, paid10 = [0.0] * nb, [0.0] * nb, [0.0] * nb
    for t, text, is_paid in chat:
        b = min(int(t // BIN), nb - 1)
        cnt10[b] += 1
        laugh10[b] += 1 if LAUGH.search(text) else 0
        paid10[b] += 1 if is_paid else 0
    half = int(30 // BIN)                        # 前後30秒 = 1分の窓
    per_min = [sum(cnt10[max(0, i - half):i + half]) for i in range(nb)]
    tlw = [0.0] * nb
    for t, _, _, w in tl:
        for b in range(max(0, int(t // BIN) - 1), min(nb, int(t // BIN) + 3)):   # 書かれた時刻の少し後まで
            tlw[b] += w
    zc, zt = zscore(per_min), zscore(tlw)
    score = [zc[i] + zt[i] for i in range(nb)]
    # 山を高い順に、MIN_GAP より近いものは捨てて拾う(配信の最初と最後の5分は待機と締めなので外す)
    order = sorted(range(nb), key=lambda i: -score[i])
    picks = []
    for i in order:
        t = i * BIN + BIN / 2
        if t < 300 or t > dur - 300 or any(abs(t - p) < MIN_GAP for p in picks):
            continue
        picks.append(t)
        if len(picks) >= top:
            break
    picks.sort()
    cands = []
    for k, t in enumerate(picks, 1):
        s, e = max(0.0, t - PAD_BEFORE), min(dur, t + PAD_AFTER)
        near = sorted([r for r in tl if s - 30 <= r[0] <= e], key=lambda r: -r[3])
        label = near[0][1] if near else ""
        i = int(t // BIN)
        lines = [x for x in chat if s <= x[0] <= e and LAUGH.search(x[1])][:8]
        cands.append({"no": k, "start": s, "end": e, "peak": t, "label": label, "score": round(score[i], 2),
                      "chat_per_min": per_min[i], "timeline_count": len([r for r in tl if s - 30 <= r[0] <= e]),
                      "laugh_per_10s": laugh10[i],
                      "timeline_hits": [{"t": r[0], "label": r[1], "from": r[2]} for r in near[:5]],
                      "chat_sample": [x[1] for x in lines]})
    json.dump({"video": info.get("webpage_url"), "title": info.get("title"), "channel": info.get("channel"),
               "duration": dur, "candidates": cands}, open(os.path.join(work, "candidates.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    avg = sum(per_min) / (len(per_min) or 1)
    md = [f"# 切り抜きの候補 — {info.get('title', '')}", "", f"元の配信: {info.get('webpage_url', '')}",
          f"チャット {len(chat)}件(平均 {avg:.0f}件/分) / コメント内の時間表記 {len(tl)}件", "",
          "盛り上がりの測り方: コメント内の時間表記(いいねで重み) + 分間チャット数。時刻の順に並べた", ""]
    for c in cands:
        md += [f"## {c['no']}. {hms(c['start'])}〜{hms(c['end'])}  {c['label']}",
               f"点数 {c['score']} / 分間チャット {c['chat_per_min']:.0f}件(平均の{c['chat_per_min'] / (avg or 1):.1f}倍) / 時間表記 {c['timeline_count']}件",
               "時間表記: " + (" / ".join(f"{hms(h['t'])} {h['label']}" for h in c["timeline_hits"]) or "なし"),
               "チャット: " + (" | ".join(c["chat_sample"]) or "なし"), ""]
    open(os.path.join(work, "candidates.md"), "w", encoding="utf-8").write("\n".join(md))
    # 1分ごとの表(分間チャット数の棒と、その分に書かれた時間表記)
    mins = int(dur // 60) + 1
    pm = [0] * mins
    for t, *_ in chat:
        pm[min(int(t // 60), mins - 1)] += 1
    tl_by = {}
    for t, lab, _, w in tl:
        tl_by.setdefault(int(t // 60), []).append((w, lab))
    top_pm = max(pm) or 1
    rows = [f"# 1分ごとの盛り上がり — {info.get('title', '')}", "",
            "分間チャット数(棒)と、その1分に当たるコメント内の時間表記の件数・見出し", "", "```text"]
    for m in range(mins):
        labs = sorted(tl_by.get(m, []), key=lambda x: -x[0])
        seen = []
        for _, lab in labs:
            if lab and lab not in seen:
                seen.append(lab)
        rows.append(f"{hms(m * 60)} {pm[m]:5d} {'#' * round(40 * pm[m] / top_pm):<40} "
                    f"{('時間表記' + str(len(labs)) + ' ' + ' / '.join(seen[:2])) if labs else ''}")
    rows.append("```")
    open(os.path.join(work, "minutes.md"), "w", encoding="utf-8").write("\n".join(rows))
    print(os.path.join(work, "candidates.md"))
    print(os.path.join(work, "minutes.md"))
    return cands


# ---- 3. 切り出して文字起こし -----------------------------------------------------------------

def clip_paths(work, no):
    d = os.path.join(work, "clips")
    os.makedirs(d, exist_ok=True)
    return d, os.path.join(d, f"clip_{no:02d}")


def whisper(model):
    from faster_whisper import WhisperModel
    return WhisperModel(model, device="cpu", compute_type="int8", cpu_threads=4)


def length_of(x):
    return x["end"] - x["start"]


def cut_video(src, start, end, base):
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.2f}", "-to", f"{end:.2f}", "-i", src,
         "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", base + ".mp4"])


def cut_one(src, start, end, base, wm):
    """元の動画の start〜end を base.mp4 に切り出し、しゃべりを文字起こしして base_subs.json / base.srt に書く"""
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{start:.2f}", "-to", f"{end:.2f}", "-i", src,
         "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-c:a", "aac", "-b:a", "192k", base + ".mp4"])
    run(["ffmpeg", "-y", "-loglevel", "error", "-i", base + ".mp4", "-ac", "1", "-ar", "16000", base + ".wav"])
    # 波形を自分で読んで渡す(faster-whisper の読み込みは、入っている PyAV の版と合わずに落ちた。2026-10-29)
    import wave
    import numpy as np
    with wave.open(base + ".wav") as wf:
        pcm = np.frombuffer(wf.readframes(wf.getnframes()), np.int16).astype(np.float32) / 32768.0
    segs, _ = wm.transcribe(pcm, language="ja", beam_size=1, vad_filter=True)
    subs = [{"start": x.start, "end": x.end, "text": x.text.strip()} for x in segs if x.text.strip()]
    json.dump(subs, open(base + "_subs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(base + ".srt", "w", encoding="utf-8") as fh:
        for i, x in enumerate(subs, 1):
            f = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(t % 1 * 1000):03d}"  # noqa: E731
            fh.write(f"{i}\n{f(x['start'])} --> {f(x['end'])}\n{x['text']}\n\n")
    print(f"切り出した: {base}.mp4 / 字幕 {len(subs)}行")
    return subs


def cut(work, nos, model="small"):
    data = json.load(open(os.path.join(work, "candidates.json"), encoding="utf-8"))
    src = os.path.join(work, "src.mp4")
    if not os.path.exists(src):
        fetch_video(work)
    wm = whisper(model)
    for no in nos:
        c = data["candidates"][no - 1]
        _, base = clip_paths(work, no)
        cut_one(src, c["start"], c["end"], base, wm)


# ---- 4. YMM4のプロジェクト ------------------------------------------------------------------

def make_ymmp(work, nos):
    sys.path.insert(0, YMM_LIB)
    from ymmp_lib import Project, anim, audio, load_skeleton, outline, text, video
    data = json.load(open(os.path.join(work, "candidates.json"), encoding="utf-8"))
    chat = load_chat(work)
    ses = sorted(glob.glob(os.path.join(SE_DIR, "*.wav")) + glob.glob(os.path.join(SE_DIR, "*.mp3")))
    for no in nos:
        c = data["candidates"][no - 1]
        _, base = clip_paths(work, no)
        subs = json.load(open(base + "_subs.json", encoding="utf-8"))
        length = c["end"] - c["start"]
        p = Project(fps=30)
        v = video(base + ".mp4", 0, length, 1)
        v["Volume"] = anim(100)                  # 部品の video は音を0にしているので、切り抜きでは元の声を出す
        p.add(v)
        # 字幕(しゃべった内容)。画面の下に、白い字+黒の縁取り
        for s in subs:
            p.add(text(s["text"], s["start"], max(s["end"], s["start"] + 0.8), 3, "LINE Seed JP", size=64, y=410,
                       per_char=0, style="Normal", color="#FFFFFFFF",
                       effects=[outline(6, "#FF101010"), outline(14, "#88000000", blur=8)]))
        # 補足のテロップ: タイムラインの見出し(なければ空の枠)を左上に。中身は YMM4 で書き換える
        p.add(text(c["label"] or "(補足をここに)", 0.3, min(length, 6.0), 4, "LINE Seed JP", size=46, x=-560, y=-440,
                   per_char=0, style="Normal", color="#FFFFF4A0", effects=[outline(5, "#FF2A1A00")]))
        p.add(text(f"出典: {data.get('channel') or ''} {data.get('video') or ''}", 0, length, 5, "LINE Seed JP", size=24,
                   x=560, y=505, per_char=0, style="Normal", color="#CCFFFFFF", effects=[outline(3, "#FF000000")]))
        # 効果音: 区間の中で笑いのチャットが最も集まった瞬間(チャットは数秒遅れるので2秒前に置く)から3つ
        if ses:
            bins = {}
            for t, txt, _ in chat:
                if c["start"] <= t <= c["end"] and LAUGH.search(txt):
                    bins[int((t - c["start"]) // 2)] = bins.get(int((t - c["start"]) // 2), 0) + 1
            peaks = []
            for b, _ in sorted(bins.items(), key=lambda kv: -kv[1]):
                if all(abs(b - q) >= 4 for q in peaks):
                    peaks.append(b)
                if len(peaks) >= 3:
                    break
            for k, b in enumerate(sorted(peaks)):
                t = max(0.0, b * 2 - 2.0)
                p.add(audio(ses[k % len(ses)], t, min(length, t + 2.0), 6 + k, offset=0.0))
        out = base + ".ymmp"
        p.save(out, {1: "切り抜き", 3: "字幕", 4: "補足", 5: "出典", 6: "効果音1", 7: "効果音2", 8: "効果音3"},
               skeleton=load_skeleton())
        print("YMM4:", out, "(効果音", "あり" if ses else "なし: tools/kirinuki/se/ に置くと入る", ")")


# ---- 字幕: YouTube の文字起こし → 一文ずつ・画面に収まる長さへ ------------------------------

SUB_FONT = "01FLOPDESIGN"   # フロップデザイン(2026-10-29本人指定)。太字・黒と元の色の二重の縁取り
SUB_SIZE = 76
SUB_COLOR = "#FFFFFFFF"     # 字の色。縁取りの外側もこの色にする
SUB_MAX = 15                # 1枚の字幕の最大の字数(1920幅・76pxで左右に余白が残る長さ)
SUB_MIN = 0.6               # 1枚の字幕を出す最短の秒数
SENT_END = re.compile(r"(?<=[。！？!?])")


def fetch_captions(work):
    """YouTube の文字起こし(配信の元の言語の自動字幕)を json3 で落とす → src.ja-orig.json3"""
    url = load_info(work).get("webpage_url")
    run(["yt-dlp", "--skip-download", "--write-auto-subs", "--sub-langs", "ja-orig,ja", "--sub-format", "json3",
         "-o", os.path.join(work, "src.%(ext)s"), url])


def load_captions(work):
    """→ [(開始秒, 終了秒, 文)]。json3 の1件は話のまとまり。改行だけの件は区切りとして捨てる"""
    path = next((q for q in (os.path.join(work, "src.ja-orig.json3"), os.path.join(work, "src.ja.json3"))
                 if os.path.exists(q)), None)
    if not path:
        return []
    ev = [e for e in json.load(open(path, encoding="utf-8")).get("events", []) if e.get("segs")]
    rows = []
    for i, e in enumerate(ev):
        txt = "".join(x.get("utf8", "") for x in e["segs"]).replace("\n", "").strip()
        if not txt:
            continue
        st = e["tStartMs"] / 1000
        en = st + (e.get("dDurationMs") or 2000) / 1000
        rows.append([st, en, txt])
    for i in range(len(rows) - 1):            # 次の文が出たら前の文は消す
        rows[i][1] = min(rows[i][1], rows[i + 1][0])
    return [tuple(r) for r in rows]


PARTICLE = set("はがをにでともへやねよなのかてば")
KANA = re.compile(r"[ぁ-ゖ]")


def break_points(sent):
    """割ってよい位置(その字の後ろ)と、その良さ。読点・空白 > 助詞のあとで次が漢字かカタカナ > 助詞のあと"""
    pts = {}
    for i, ch in enumerate(sent[:-1]):
        nx = sent[i + 1]
        if ch.isdigit() or nx.isdigit() or nx in "ヶヵ" or (i + 2 < len(sent) and sent[i + 2] in "ヶヵ"):
            continue                                   # 「2ヶ月」のような数と単位は割らない
        if ch in "、 ":
            pts[i + 1] = 3
        elif ch in PARTICLE and not KANA.match(nx):
            pts[i + 1] = 2
        elif ch in PARTICLE and i > 0 and not KANA.match(sent[i - 1]):
            pts[i + 1] = 1
        elif KANA.match(ch) and not KANA.match(nx) and nx not in "ー。！？!?":
            pts[i + 1] = 0.5                           # かなの後ろで漢字・カタカナが始まる所
    return pts


def split_short(txt):
    """一文ずつに割り、まだ長い文は、言葉の切れ目(読点・助詞のあと)で SUB_MAX 字以下の同じくらいの長さに割る"""
    out = []
    for sent in [x.strip() for x in SENT_END.split(txt) if x.strip()]:
        while len(sent) > SUB_MAX:
            n = math.ceil(len(sent) / SUB_MAX)
            ideal = len(sent) / n
            pts = break_points(sent)
            ok = [i for i in pts if 3 <= i <= SUB_MAX and len(sent) - i >= 2]
            cut = min(ok, key=lambda i: abs(i - ideal) * 1.0 - pts[i] * 2.0) if ok else round(ideal)
            out.append(sent[:cut].strip(" 、"))
            sent = sent[cut:].strip(" 、")
        if sent:
            out.append(sent)
    return [x for x in out if x]


def short_subs(rows, start, end):
    """区間 start〜end の文字起こしを、一文ずつの短い字幕 [{start, end, text}](区間の頭からの秒)にする。
    1件を割ったときは、字数の割合で時間を分ける"""
    # YouTube の文字起こしは文の途中で件が切れることがある(「1ヶ月とかね、2」「ヶ月。」)。文の終わりまでつなぐ
    joined = []
    for st, en, txt in rows:
        if en <= start or st >= end:
            continue
        if joined and not re.search(r"[。！？!?]$", joined[-1][2]) and st - joined[-1][1] < 1.0:
            joined[-1] = (joined[-1][0], en, joined[-1][2] + txt)
        else:
            joined.append((st, en, txt))
    subs = []
    for st, en, txt in joined:
        st, en = max(st, start), min(en, end)
        parts = split_short(txt)
        n = sum(len(x) for x in parts) or 1
        t = st
        for x in parts:
            d = (en - st) * len(x) / n
            if len(x) <= 1 and subs:                 # 「?」だけ等は前の字幕に付ける
                subs[-1]["text"] += x
                subs[-1]["end"] = t + d - start
            else:
                subs.append({"start": t - start, "end": t + d - start, "text": x})
            t += d
    # 読めない短さを残さない: 1枚 SUB_MIN 秒以上。延ばした分は次の字幕を後ろへずらす
    out, prev = [], 0.0
    for sb in subs:
        s0 = max(sb["start"], prev)
        e0 = max(sb["end"], s0 + SUB_MIN)
        if s0 >= end - start:
            break
        out.append({"start": s0, "end": min(e0, end - start), "text": sb["text"]})
        prev = out[-1]["end"]
    return out


def sub_text(text, outline, s, t0, t1, layer):
    """字幕1枚: フロップデザインの太字。内側に黒、外側に字と同じ色の二重の縁取り"""
    return text(s, t0, t1, layer, SUB_FONT, size=SUB_SIZE, y=400, per_char=0, style="Normal", bold=True,
                color=SUB_COLOR, effects=[outline(7, "#FF000000"), outline(7, SUB_COLOR)])


# ---- 5. つないで一本にする ----------------------------------------------------------------

SEG_BEFORE, SEG_AFTER = 25.0, 20.0   # 1場面の長さ: 山の25秒前(チャットは遅れて盛り上がるので前を厚く)〜20秒後
JOIN_GAP = 8.0                       # 場面どうしがこれより近ければ1つにつなげる(秒)
SNAP = 6.0                           # 場面の頭と終わりを、この秒数の範囲で文の切れ目へずらす
HOOK_BEFORE, HOOK_AFTER = 4.0, 5.0   # 冒頭のつかみ: いちばん盛り上がった瞬間の前後(切り抜きのコツ.md 2節「最初の3〜5秒」)


def snap_to_sentences(x, caps):
    """場面の頭を文の始まりへ、終わりを文の終わりへずらす(文の途中で始めない・終わらない。切り抜きのコツ.md 2節)"""
    if not caps:
        return x
    starts = [c[0] for c in caps if x["start"] - SNAP <= c[0] <= x["start"] + 1.0]
    ends = [c[1] for c in caps if x["end"] - 1.0 <= c[1] <= x["end"] + SNAP]
    if starts:
        x["start"] = round(min(starts, key=lambda t: abs(t - x["start"] + 1.5)), 2)
    if ends:
        x["end"] = round(min(ends, key=lambda t: abs(t - x["end"] - 1.5)), 2)
    return x


def plan_edit(work, minutes):
    """候補を点数の高い順に拾い、合計が minutes 分になるまで足す → 時刻の順に並べ、近い場面はつなげる → edit_list.json"""
    info = load_info(work)
    dur = float(info.get("duration") or 0)
    cands = find(work, top=200)
    picked, total = [], 0.0
    for c in sorted(cands, key=lambda c: -c["score"]):
        if total >= minutes * 60:
            break
        s0, e0 = max(0.0, c["peak"] - SEG_BEFORE), min(dur or 1e9, c["peak"] + SEG_AFTER)
        picked.append({"start": s0, "end": e0, "label": c["label"], "score": c["score"]})
        total += e0 - s0
    picked.sort(key=lambda x: x["start"])
    segs = []
    for x in picked:
        if segs and x["start"] - segs[-1]["end"] < JOIN_GAP:
            segs[-1]["end"] = max(segs[-1]["end"], x["end"])
            segs[-1]["label"] = segs[-1]["label"] or x["label"]
        else:
            segs.append(dict(x))
    if not load_captions(work):
        fetch_captions(work)
    caps = load_captions(work)
    segs = [snap_to_sentences(x, caps) for x in segs]
    for k, x in enumerate(segs, 1):
        x["no"] = k
    # 冒頭のつかみ: 点数がいちばん高い山の前後を、本編の前に置く(時系列より見どころを先に)
    best = max(cands, key=lambda c: c["score"])
    hook = {"no": 0, "hook": True, "start": round(best["peak"] - HOOK_BEFORE, 2), "end": round(best["peak"] + HOOK_AFTER, 2),
            "label": "", "score": best["score"]}
    segs = [hook] + segs
    json.dump({"video": info.get("webpage_url"), "title": info.get("title"), "channel": info.get("channel"),
               "segments": segs}, open(os.path.join(work, "edit_list.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    md = [f"# つなぐ場面の一覧 — {info.get('title', '')}", "",
          f"{len(segs)}場面・合計 {hms(sum(x['end'] - x['start'] for x in segs))}。"
          "場面を足す・消す・長さを変えるときは edit_list.json を書き換えて `edit <作業フォルダ> --keep` で作り直す", ""]
    t = 0.0
    for x in segs:
        md.append(f"{x['no']:2d}. 完成 {hms(t)}〜 / 元の配信 {hms(x['start'])}〜{hms(x['end'])}  "
                  f"{'(冒頭のつかみ)' if x.get('hook') else x['label']}")
        t += x["end"] - x["start"]
    open(os.path.join(work, "edit_list.md"), "w", encoding="utf-8").write("\n".join(md))
    print(os.path.join(work, "edit_list.md"))
    return segs


def make_edit(work, minutes=10, model="small", keep=False):
    """盛り上がった場面をたくさん拾い、時刻の順につないで1本の切り抜きにする → edit/kirinuki.ymmp"""
    sys.path.insert(0, YMM_LIB)
    from ymmp_lib import Project, anim, audio, load_skeleton, outline, screen_fill, text, video
    lst = os.path.join(work, "edit_list.json")
    if keep and os.path.exists(lst):
        data = json.load(open(lst, encoding="utf-8"))
        segs = data["segments"]
    else:
        segs = plan_edit(work, minutes)
        data = json.load(open(lst, encoding="utf-8"))
    src = os.path.join(work, "src.mp4")
    if not os.path.exists(src):
        fetch_video(work)
    d = os.path.join(work, "edit")
    os.makedirs(d, exist_ok=True)
    chat = load_chat(work)
    ses = sorted(glob.glob(os.path.join(SE_DIR, "*.wav")) + glob.glob(os.path.join(SE_DIR, "*.mp3"))) or \
        [q for q in (os.path.join(ASSET_SE, n) for n in SE_LAUGH) if os.path.exists(q)]
    se_scene, se_hook = os.path.join(ASSET_SE, SE_SCENE), os.path.join(ASSET_SE, SE_HOOK)

    def se(path, t, sec):
        a = audio(path, t, t + sec, 6 if path in ses else 7, offset=0.0)
        a["Volume"] = anim(SE_VOL)
        return a
    if not load_captions(work):
        fetch_captions(work)
    caps = load_captions(work)                 # YouTube の文字起こし(2026-10-29本人「文字起こし使ってみてYOUTUBEの」)
    print("字幕:", "YouTube の文字起こし" if caps else "faster-whisper(YouTube の文字起こしが無い)")
    wm = None if caps else whisper(model)
    p = Project(fps=30)
    t0 = 0.0
    chapters = []
    for k, x in enumerate(segs):
        if not x.get("hook"):
            chapters.append((t0, x["label"]))
        if k > 0:
            # つなぎ目: 白へ一瞬抜いて次へ+切り替えの音(配信の別の時間へ飛んだことを伝える。切り抜きのコツ.md 2節)
            p.add(screen_fill(t0 - FLASH_IN, t0 + FLASH_OUT, 8, "#FFFFFFFF", 85, blend="Normal",
                              fade_in=FLASH_IN, fade_out=FLASH_OUT))
            if os.path.exists(se_scene):
                p.add(se(se_scene, max(0.0, t0 - 0.1), 0.57))
        elif x.get("hook") and os.path.exists(se_hook):
            p.add(se(se_hook, 0.0, 1.7))
        base = os.path.join(d, f"seg_{x['no']:02d}")
        rng = f"{x['start']:.2f}-{x['end']:.2f}"
        same = os.path.exists(base + "_subs.json") and os.path.exists(base + ".range") and \
            open(base + ".range").read() == rng
        if not same:                               # 前と同じ区間なら切り出しをやり直さない
            if caps:
                cut_video(src, x["start"], x["end"], base)
            else:
                cut_one(src, x["start"], x["end"], base, wm)
            open(base + ".range", "w").write(rng)
        if caps:
            subs = short_subs(caps, x["start"], x["end"])
        else:
            subs = [y for z in json.load(open(base + "_subs.json", encoding="utf-8"))
                    for y in short_subs([(z["start"], z["end"], z["text"])], 0, length_of(x))]
        length = x["end"] - x["start"]
        v = video(base + ".mp4", t0, t0 + length, 1)
        v["Volume"] = anim(100)                  # 部品の video は音を0にしているので、切り抜きでは元の声を出す
        p.add(v)
        for j, sb in enumerate(subs):            # 字幕(しゃべった内容)。一文ずつ、画面の下に
            nxt = subs[j + 1]["start"] if j + 1 < len(subs) else length   # 次の字幕が出たら消す(同じ層で重ねない)
            s1, e1 = t0 + sb["start"], t0 + min(length, nxt, max(sb["end"], sb["start"] + 0.6))
            if e1 - s1 >= 0.1:
                p.add(sub_text(text, outline, sb["text"], s1, e1, 3))
        # 補足のテロップ: 場面の頭に、タイムラインの見出し(なければ空の枠)を左上へ。中身は YMM4 で書き換える
        if not x.get("hook"):
            p.add(text(x["label"] or "(補足をここに)", t0 + 0.2, t0 + min(length, 5.0), 4, "LINE Seed JP", size=46,
                       x=-560, y=-440, per_char=0, style="Normal", color="#FFFFF4A0", effects=[outline(5, "#FF2A1A00")]))
        # 効果音: 場面の中で笑いのチャットが最も集まった瞬間(チャットは数秒遅れるので2秒前)に1つ
        if ses:
            bins = {}
            for t, txt, _ in chat:
                if x["start"] <= t <= x["end"] and LAUGH.search(txt):
                    bins[int((t - x["start"]) // 2)] = bins.get(int((t - x["start"]) // 2), 0) + 1
            if bins:
                b = max(bins, key=bins.get)
                ts = t0 + max(1.0, b * 2 - 2.0)          # つなぎ目の音と重ねない
                if ts < t0 + length - 1.0:
                    p.add(se(ses[k % len(ses)], ts, min(t0 + length, ts + 1.5) - ts))
        t0 += length
    p.add(text(f"出典: {data.get('channel') or ''} {data.get('video') or ''}", 0, t0, 5, "LINE Seed JP", size=24,
               x=560, y=505, per_char=0, style="Normal", color="#CCFFFFFF", effects=[outline(3, "#FF000000")]))
    out = os.path.join(d, "kirinuki.ymmp")
    p.save(out, {1: "切り抜き", 3: "字幕", 4: "補足", 5: "出典", 6: "効果音", 7: "つなぎの音", 8: "つなぎ目"},
           skeleton=load_skeleton())
    write_description(d, data, chapters)
    print("YMM4:", out, f"({len(segs)}場面・{hms(t0)}・効果音", "あり" if ses else "なし: tools/kirinuki/se/ に置くと入る", ")")
    return out


def write_description(d, data, chapters):
    """YouTube の概要欄の下書き → edit/説明文.md。1〜2行目は元動画のタイトルとURL(ホロライブの切り抜きガイドライン)"""
    lines = [f"元動画: {data.get('title') or ''}", data.get("video") or "", ""]
    if chapters and chapters[0][0] > 0:
        chapters = [(0.0, "冒頭")] + chapters          # YouTube のチャプターは 0:00 から始める決まり
    lines += [f"{hms(t)} {lab or '(見出し)'}" for t, lab in chapters]
    lines += ["", f"出典: {data.get('channel') or ''}",
              "この動画はホロライブプロダクションの二次創作ガイドラインに従って制作しています。"]
    open(os.path.join(d, "説明文.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("説明文:", os.path.join(d, "説明文.md"))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("step", choices=["fetch", "find", "cut", "ymmp", "edit", "all"])
    ap.add_argument("target", help="URL(fetch/all) か 作業フォルダ")
    ap.add_argument("nos", nargs="*", type=int, help="候補の番号(cut/ymmp)")
    ap.add_argument("--minutes", type=float, default=10, help="edit・all で作る切り抜きの長さ(分)")
    ap.add_argument("--keep", action="store_true", help="edit で、書き換えた edit_list.json のまま作り直す")
    ap.add_argument("--model", default="small", help="文字起こしの大きさ(small/medium)")
    ap.add_argument("--no-video", action="store_true",
                    help="fetch では動画を落とさない(候補を先に見たいとき)。動画は cut のときに丸ごと落とす")
    a = ap.parse_args()
    if a.step == "fetch":
        fetch(a.target, not a.no_video)
    elif a.step == "find":
        find(a.target)
    elif a.step == "cut":
        cut(a.target, a.nos, a.model)
    elif a.step == "ymmp":
        make_ymmp(a.target, a.nos)
    elif a.step == "edit":
        make_edit(a.target, a.minutes, a.model, a.keep)
    else:
        make_edit(fetch(a.target, not a.no_video), a.minutes, a.model)


if __name__ == "__main__":
    main()
