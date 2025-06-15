# @infodb/worktree

git worktreeとVSCodeワークスペースファイルを管理するTypeScript CLIツールです。

## インストール

```bash
npm install -g @infodb/worktree
```

またはpnpxで直接実行:

```bash
pnpx @infodb/worktree <ブランチ名> [オプション]
```

## 使用方法

### 基本的な使用方法

ブランチ用のgit worktreeを作成（ワークスペースファイルを自動検出）:

```bash
pnpx @infodb/worktree feature/new-feature
```

これにより `{プロジェクト名}.{ブランチ名}` 形式のworktreeディレクトリが作成されます（例: `myproject.feature-new-feature`）

### VSCodeワークスペースと連携

git worktreeを作成して特定のVSCodeワークスペースファイルに追加:

```bash
pnpx @infodb/worktree feature/new-feature --workspace my-project
```

注意: 
- `.code-workspace` 拡張子は省略可能で、自動的に追加されます
- ワークスペースファイルが存在しない場合は、現在のリポジトリを含めて自動的に作成されます

### カスタムディレクトリ名

worktree用のカスタムディレクトリ名を指定:

```bash
pnpx @infodb/worktree feature/new-feature --directory custom-folder-name
```

### 環境変数

ワークスペース検索ディレクトリを設定:

```bash
export INFODB_WORKSPACE_DIR="/path/to/workspaces"
pnpx @infodb/worktree feature/new-feature
```

### オプション

- `-w, --workspace <file>`: 更新するVSCodeワークスペースファイル（.code-workspace拡張子は省略可能）
- `-d, --directory <dir>`: worktree用のカスタムディレクトリ名（デフォルトは project.branch パターン）
- `-h, --help`: ヘルプ情報を表示
- `-V, --version`: バージョン番号を表示

## 動作原理

1. **プロジェクト名検出**: git remote URLからプロジェクト名を検出、またはディレクトリ名をフォールバックとして使用
2. **ディレクトリ命名**: `{プロジェクト名}.{ブランチ名}` パターンでworktreeを作成（例: `myproject.feature-auth`）
3. **ブランチ名の正規化**: `/` を `-` に変換し、ファイルシステムで無効な文字を除去
4. **Git Worktree作成**: 現在のリポジトリに隣接するディレクトリに新しいgit worktreeを作成
5. **ブランチ処理**: 
   - ブランチがローカルに存在する場合は、それを使用
   - ブランチがリモートに存在する場合は、ローカル追跡ブランチを作成
   - ブランチが存在しない場合は、現在のHEADから新しいブランチを作成
6. **ワークスペース検出**: 以下の場所で `.code-workspace` ファイルを自動検索:
   - `INFODB_WORKSPACE_DIR` 環境変数の場所（設定されている場合）
   - リポジトリの隣接ディレクトリ
7. **VSCode統合**: 検出または指定されたVSCodeワークスペースファイルにworktreeディレクトリを追加

## 要件

- Gitリポジトリ
- Node.js 16以上
- VSCodeワークスペースファイル（ワークスペース統合を使用する場合、オプション）

## 使用例

```bash
# ワークスペース自動検出でworktreeを作成
pnpx @infodb/worktree main
# 作成されるディレクトリ: myproject.main/

# 機能ブランチのworktreeを作成（ブランチ名は正規化される）
pnpx @infodb/worktree feature/user-auth
# 作成されるディレクトリ: myproject.feature-user-auth/

# ワークスペースファイルを指定してworktreeを作成（拡張子省略可能、存在しない場合は作成）
pnpx @infodb/worktree feature/user-auth --workspace project

# カスタムディレクトリ名でworktreeを作成
pnpx @infodb/worktree hotfix/critical-bug --directory hotfix-urgent

# 環境変数を使用してワークスペース検索
export INFODB_WORKSPACE_DIR="/home/user/workspaces"
pnpx @infodb/worktree feature/new-feature
```

## トラブルシューティング

### よくあるエラー

- **"Not in a git repository"**: Gitリポジトリ内でコマンドを実行してください
- **"Directory already exists"**: 指定したディレクトリが既に存在します。別の名前を使用するか、`--directory`オプションで別名を指定してください
- **"Workspace file must have .code-workspace extension"**: ワークスペースファイルは`.code-workspace`拡張子が必要です

### デバッグ

エラーが発生した場合は、以下を確認してください：
1. 現在のディレクトリがGitリポジトリであること
2. 指定したワークスペースファイルが存在すること
3. ブランチ名に無効な文字が含まれていないこと