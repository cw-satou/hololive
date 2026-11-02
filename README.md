# 19 hololive

ホロライブの切り抜き作りを手伝うアプリ(配信スケジュール・見どころ分析・字幕抽出)の事業。

## 置き場の形

| 置き場 | 中身 |
| --- | --- |
| `00_app/` | アプリ本体(Vercel。`api/` サーバー側、`public/` 画面) |
| `01_input/` | 受け取った素材・資料 |
| `02_todo/` | これから作るもの |
| `03_doing/` | 作業中の案件 |
| `04_done/` | 完成品 |
| `90_archive/` | 使わなくなった物の保管 |
| `99_trash/` | 消す前の退避場所(削除の代わりにここへ移す) |
| `決定台帳.md` | 生きた決定を1行ずつ |
| `TODO.md` | 未処理の1動作=1行 |

## 動画編集の素材(gitに置かない)

`01_input/動画制作素材/`(2026-10-29、本人の zip 3本 `X:\動画制作ファイル（素材類・フォント類・フリーBGM集）.zip` を展開。`.gitignore` 済み)。素材類=効果音・BGM・トランジション動画・字幕の下地・背景・いらすとや、フォント類=源ノ角ゴシック系(mgenplus)・丸ゴ(rounded-mplus)・ねむけ。zip の名前は Shift_JIS なので `00_app/tools/unzip_sjis.py` で展開する(化けた名前は `--fix-names` で直す)

## 切り抜き支援ツール(手元のPCで動かす)

**2026-11-02に08の共通の道具へ移した**(本人「19 17 を一緒に08に取り込んで」)。正本は `08_omnipost/00_app/tools/kirinuki/kirinuki.py`、説明は同じフォルダの `README.md`、作り方の根拠は `切り抜きのコツ.md`。この事業だけの設定(ガイドライン表記・16:9)は `00_app/kirinuki.json`。移す前の版は `90_archive/2026-11-02_kirinuki_08へ統合前/`。
ライブアーカイブ1本から、盛り上がった場面をたくさん拾い、時刻の順につないだ1本の切り抜きを、ジェットカット・字幕・補足・効果音つきのYMM4のプロジェクトと確認用mp4として作る。

```text
python E:/Users/satou/Documents/git/08_omnipost/00_app/tools/kirinuki/kirinuki.py all <配信のURL> --biz E:/Users/satou/Documents/git/19_hololive --minutes 10
```

1. fetch: 配信の情報・コメント・チャットのリプレイ・動画を落とす(区間だけを落とす形は2026-10-29に止まって進まなかったので、動画は丸ごと落とす)
2. find: 盛り上がりを「コメント内の時間表記(いいねで重み)」と「分間チャット数」で測る(2026-10-29本人指定) → `candidates.md`・1分ごとの表 `minutes.md`
3. edit: 点数の高い場面から、合計が `--minutes` 分になるまで拾い、時刻の順に並べて近い場面はつなげる → `edit_list.md`。場面ごとに切り出して文字起こし(faster-whisper)し、字幕(下)・補足のテロップ(場面の頭に左上。タイムラインの見出し)・出典・効果音(笑いが集まった瞬間)を載せた `edit/kirinuki.ymmp`
4. 場面を足す・消す・長さを変えるときは `edit_list.json` を書き換えて `edit <作業フォルダ> --keep`(同じ区間は切り出しと文字起こしをやり直さない)
5. 作り方の根拠(ガイドライン・尺・冒頭のつかみ・字幕・効果音・サムネ)は `00_app/tools/kirinuki/切り抜きのコツ.md`。メンバーカラーは `member_colors.json`
6. 1場面だけを見たいときは `cut`・`ymmp` <候補の番号> で `clips/clip_NN.ymmp`

作業フォルダは `03_doing/<YYYY-MM-DD>/切り抜き_<動画ID>/`。効果音は 08 の `tools/kirinuki/se/` に wav か mp3 を置くと入る。
YMM4の部品は 18 と同じ `discoverly/.claude/skills/ymm4-mv/scripts/ymmp_lib.py` を使う。切り抜きはカバー株式会社の二次創作ガイドラインに従う。
