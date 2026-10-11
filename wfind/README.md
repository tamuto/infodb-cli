# @infodb/wfind

検索キーワードを予め TOML ファイルに登録しておき、指定フォルダ以下にそれらのキーワードが含まれていないかをチェックする CLI ツールです。
「検索するキーワード(複数)が予め決まっている grep」として使えます。

## インストール

```bash
npm install -g @infodb/wfind
# または
pnpx @infodb/wfind [path]
```

## クイックスタート

```bash
# サンプル設定を ~/.config/infodb-wfind/keywords.toml に作成
wfind init

# カレントディレクトリを default セクションのキーワードで検索
wfind

# ./src を example セクション + default セクションのキーワードで検索
wfind ./src -s example
```

## 設定ファイル

`~/.config/infodb-wfind/keywords.toml` にセクション別にキーワードを登録します。

```toml
# 常に検索対象となる共通セクション
[default]
keywords = [
  { regex = "AKIA[0-9A-Z]{16}", label = "AWS Access Key" },
  { preset = "メールアドレス" },
]

# 個別セクション (wfind -s example で default + example を検索)
[example]
keywords = [
  "社外秘",                                  # 固定文字列
  { text = "Confidential", ignoreCase = true },
  { regex = "token_[a-z0-9]+", flags = "i" },
  { preset = "電話番号" },
]
```

### セクション

- `default` セクションは共通キーワードで、常に検索対象になります。
- `-s <section>` を指定すると **個別セクション + default セクション** で検索します。
- `-s` を指定しない場合は default セクションのみで検索します。

### キーワードの種類

| 書き方 | 種類 | 説明 |
|--------|------|------|
| `"文字列"` | 固定文字列 | そのままの文字列で検索 |
| `{ text = "...", ignoreCase = true }` | 固定文字列 | オプション付きの固定文字列 |
| `{ regex = "...", flags = "i" }` | 正規表現 | JavaScript の RegExp 構文 (行単位でマッチ) |
| `{ preset = "..." }` | 抽象指定 | 「電話番号」などの組み込みプリセット |

いずれも `label = "表示名"` で出力時のラベルを指定できます。

### プリセット (抽象指定)

`wfind presets` で一覧を表示できます。日本語の別名でも指定可能です。

| 名前 | 別名 | 内容 |
|------|------|------|
| `email` | メールアドレス, mail | メールアドレス |
| `phone-jp` | 電話番号, phone | 日本の電話番号 |
| `postal-code-jp` | 郵便番号, zip-jp | 日本の郵便番号 |
| `ipv4` | IPアドレス | IPv4 アドレス |
| `credit-card` | クレジットカード番号 | 16桁のカード番号らしき数字 |

「氏名」のように正規表現だけでは判定できないものは今後追加予定です。
プリセットは `Matcher` インターフェース (`src/matchers/types.ts`) を実装すれば追加できる構造になっており、
辞書や形態素解析などを用いた判定も `src/matchers/presets.ts` に登録するだけで設定ファイルから利用できます。

## コマンド

### `wfind [search] [path]`

| オプション | 説明 |
|-----------|------|
| `-s, --section <name>` | 使用するセクション (default は常に含まれる) |
| `-c, --config <file>` | 設定ファイル (既定: `~/.config/infodb-wfind/keywords.toml`) |
| `-i, --ignore-case` | すべてのキーワードで大文字小文字を無視 |
| `-x, --exclude <names...>` | 除外するファイル名・ディレクトリ名 |
| `--no-default-excludes` | `.git`, `node_modules` も検索対象にする |
| `--max-file-size <bytes>` | これより大きいファイルはスキップ (既定: 10MB) |
| `-l, --files-with-matches` | 一致したファイル名のみ表示 |
| `--json` | JSON Lines 形式で出力 |

出力例:

```
src/a.txt:2:6: 連絡先: 03-1234-5678  [電話番号]
src/b.md:1:9: This is CONFIDENTIAL 社外秘  [Confidential, 社外秘]
2 files scanned, 0 skipped (binary/large), 6 keywords [default + example]
```

終了コードは grep と同じです: 一致あり `0` / 一致なし `1` / エラー `2`。

### その他のコマンド

```bash
wfind list [section]   # セクションで使われるキーワード (default を含む) を表示
wfind presets          # 利用可能なプリセットを表示
wfind init [--force]   # サンプル設定ファイルを作成
```

## 制限事項

- ファイルは UTF-8 として読み込みます (Shift_JIS 等は未対応)。
- バイナリファイル (先頭 8000 バイトに NUL を含む) はスキップします。
- マッチは行単位です。複数行にまたがる正規表現には対応していません。
- シンボリックリンクは辿りません。

## 開発

```bash
pnpm install
pnpm build
pnpm dev -- ./path -s example
```

## License

MIT
