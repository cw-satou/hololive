"""Windows で作られた zip(名前が Shift_JIS)を、日本語の名前のまま展開する。
Expand-Archive や 7-Zip の既定では名前が文字化けするため(2026-10-29 動画制作の素材3本で確認)。

使い方: python unzip_sjis.py <zip> <展開先フォルダ>
        python unzip_sjis.py --fix-names <フォルダ>   (中身の名前がすでに化けていたときに直す)
"""
import os
import re
import sys
import zipfile


def name_of(info):
    if info.flag_bits & 0x800:          # UTF-8 の印がある名前はそのまま
        return info.filename
    try:
        return info.filename.encode("cp437").decode("cp932")
    except UnicodeDecodeError:
        return info.filename


JA = re.compile(r"[ぁ-んァ-ヶ一-龥ー・（）「」]")


def fix_names(root):
    """zip の中に、すでに文字化けした名前(一度 cp437 で展開された日本語の名前)が入っていたときに直す。
    名前を cp437 のバイトに戻して cp932 で読み、日本語になるものだけ付け直す(深い所から順に)"""
    n = 0
    for d, dirs, files in os.walk(root, topdown=False):
        for name in dirs + files:
            if name.isascii():
                continue
            try:
                raw = name.encode("cp437")
            except UnicodeEncodeError:
                continue
            try:
                new = raw.decode("cp932")
            except UnicodeDecodeError:
                try:                                    # 化けたときに途中で切れて、最後の1バイトが半端な名前
                    new = raw[:-1].decode("cp932")
                except UnicodeDecodeError:
                    continue
            if new == name or not JA.search(new):
                continue
            a, b = os.path.join(d, name), os.path.join(d, new)
            if not os.path.exists(b):
                os.rename(a, b)
                n += 1
            elif os.path.isdir(a) and os.path.isdir(b):
                # 同じフォルダが2つの文字コードで入っていた(2026-10-29「効果音（割と使うのが入ってる）」)。中身を寄せる
                for x in os.listdir(a):
                    if not os.path.exists(os.path.join(b, x)):
                        os.rename(os.path.join(a, x), os.path.join(b, x))
                        n += 1
                if not os.listdir(a):
                    os.rmdir(a)                         # 空になったフォルダだけ消す
    print(f"名前を直した: {n}件")


def main():
    if sys.argv[1] == "--fix-names":
        fix_names(os.path.abspath(sys.argv[2]))
        return
    src, dst = sys.argv[1], os.path.abspath(sys.argv[2])
    n = 0
    with zipfile.ZipFile(src) as z:
        for info in z.infolist():
            rel = name_of(info).replace("\\", "/")
            out = os.path.abspath(os.path.join(dst, rel))
            if not out.startswith(dst + os.sep) and out != dst:   # 展開先の外へ出る名前は捨てる
                print("飛ばした(外へ出る名前):", rel)
                continue
            if rel.endswith("/"):
                os.makedirs(out, exist_ok=True)
                continue
            os.makedirs(os.path.dirname(out), exist_ok=True)
            with z.open(info) as fi, open(out, "wb") as fo:
                while True:
                    b = fi.read(1 << 20)
                    if not b:
                        break
                    fo.write(b)
            n += 1
    print(f"{src} → {dst}: {n}件")


if __name__ == "__main__":
    main()
