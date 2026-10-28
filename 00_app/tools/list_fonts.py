"""フォルダの中の書体ファイルを、書体の名前(日本語の名前があれば併記)ごとにまとめて一覧にする。
Windows に入っているか(ユーザーの書体フォルダ・Windows\\Fonts に同じファイル名があるか)も書く。YMM4 は入っている書体しか使えない。

使い方: python list_fonts.py <フォルダ> <出力.md>
"""
import collections
import os
import sys

from fontTools.ttLib import TTCollection, TTFont

INSTALLED = [os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Windows\Fonts"), r"C:\Windows\Fonts"]


def names(font):
    nm = font["name"]
    fam = nm.getDebugName(16) or nm.getDebugName(1) or "?"
    sub = nm.getDebugName(17) or nm.getDebugName(2) or ""
    ja = None
    for r in nm.names:
        if r.nameID in (16, 1) and r.platformID == 3 and r.langID == 0x411:
            ja = r.toUnicode()
            break
    return fam, sub, ja


def main():
    root, out = sys.argv[1], sys.argv[2]
    have = set()
    for d in INSTALLED:
        if os.path.isdir(d):
            have |= {f.lower() for f in os.listdir(d)}
    fams = collections.OrderedDict()
    for d, _, fs in os.walk(root):
        for f in sorted(fs):
            if not f.lower().endswith((".ttf", ".otf", ".ttc")):
                continue
            path = os.path.join(d, f)
            try:
                fonts = TTCollection(path).fonts if f.lower().endswith(".ttc") else [TTFont(path, lazy=True)]
            except Exception as e:  # noqa: BLE001
                print("読めない:", path, e)
                continue
            for ft in fonts:
                fam, sub, ja = names(ft)
                fams.setdefault((fam, ja), []).append((sub, f, f.lower() in have))
    lines = [f"# 書体の一覧 — {root}", "", f"{len(fams)}書体・{sum(len(v) for v in fams.values())}ファイル。"
             "「入」=Windows に入っている(YMM4 で使える)、「未」=まだ入っていない", "",
             "| 書体(YMM4で指定する名前) | 日本語の名前 | 太さ | 入っているか |", "| --- | --- | --- | --- |"]
    for (fam, ja), v in fams.items():
        subs = "・".join(s for s, _, _ in v)
        inst = sum(1 for *_, h in v if h)
        lines.append(f"| {fam} | {ja or ''} | {subs} | {'入' if inst == len(v) else ('未' if inst == 0 else f'一部({inst}/{len(v)})')} |")
    open(out, "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(out, len(fams))


if __name__ == "__main__":
    main()
