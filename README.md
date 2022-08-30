# infodb-cli

主にpackage.jsonのscripts補助ツールとして利用

## 関連プロジェクト

関連するプロジェクトは以下の通り  
それぞれのREADME参照のこと

* [DevEnviron](https://github.com/tamuto/devenviron)
  * dockerコンテナ、コマンドライン用のプロジェクト
  * WindowsやMacでの統一した開発環境、利用しているバージョンの統一などが主目的
* [infodb-cli](https://github.com/tamuto/infodb-cli)
  * 主にnpm補助ツールとしての位置付け
  * package.jsonのスクリプト機能拡充のためのプロジェクト
* [boilerplate](https://github.com/tamuto/boilerplate)
  * プロジェクトテンプレート
  * infodb-cliのinitコマンドにて参照されるプロジェクト

## 個別利用方法

通常はDevEnviron内に組み込まれているため以下の手順は不要だが、個別に利用する場合には以下のコマンドを実行する。

```
npm install @infodb/infodb-cli
```

## コマンド一覧

| コマンド | 説明                                                                                      |
| -------- | ----------------------------------------------------------------------------------------- |
| init     | 新規プロジェクトの作成。指定したboilerplateを使用して新規プロジェクトを作成されるコマンド |
| gitsync  | git submoduleの同期用コマンド                                                             |
| template | テンプレートエンジンを利用したjson変換コマンド                                            |
| serve    | react-routerに対応した簡易httpサーバを起動するコマンド                                    |
| minify   | htmlをminifyするコマンド。内部ではposthtmlを使用している                                  |
| es       | EScriptをトランスパイルするコマンド。内部ではesbuildを使用している                        |
| runall   | package.jsonの他のスクリプトを実行するコマンド。内部ではnpm-run-allを使用している         |
| docview  | Markdown形式のファイル表示用サーバを起動するコマンド。                                    |
| shell    | 一つ目に指定したコマンドに対して二つ目に指定たファイルの内容を標準入力で入力します。      |
| verup    | `{"version": 9999}`という形式のjsonファイルを出色します。 |

### Example

* package.json

```json
{
  ...
  "scripts": {
    "up": "infodb-cli docker start test.yml"
  }
  ...
}
```

* command line

```sh
npm run up
```

## コマンド詳細

### shell

* サーバのプロビジョニング等に使用する。コマンドリストを実行します。

#### 使い方

```
infodb-cli shell -c "ssh-aws.sh profile server" setup.cmd
```
