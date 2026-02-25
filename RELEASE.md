# Kibitz — Release Guide

## アーキテクチャ

```
[Windows PC]                        [Railway Cloud]
Kibitz.exe (Electron)               ├── Bot Service (Discord Bot)
  └── ゲーム画面検出                  └── AI Service (Claude Vision)
  └── スクショをAIに送信
```

- **Kibitz.exe**: ユーザーのPCにインストールするWindowsアプリ
- **Bot Service**: Discordに常駐。VCに参加してAIの反応を話す
- **AI Service**: ゲーム画面を解析してリアクション生成（Claude API使用）

---

## 一回だけやるセットアップ

### Step 1: GitHub リポジトリを作成

```bash
# GitHubでリポジトリ作成後:
cd /home/isayama/discord-game-bot
git remote add origin https://github.com/YOUR_USERNAME/kibitz-bot.git
git branch -M master
git push -u origin master
```

pushするとGitHub Actionsが自動起動:
- **deploy-railway.yml**: Bot + AI Service をRailwayにデプロイ
- **build-release.yml**: Windows .exe をビルド（タグpush時はGitHub Releaseも作成）

### Step 2: Railway セットアップ（Bot + AI Service のクラウドホスティング）

1. https://railway.app でアカウント作成/ログイン
2. **New Project** → **Deploy from GitHub repo** → `kibitz-bot` を選択
3. `railway.toml` が自動検出され、2つのサービスが作成される

**ai-service の環境変数:**
| 変数名 | 値 |
|-------|---|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...`（あなたのキー） |
| `PORT` | 自動設定 |

**bot の環境変数:**
| 変数名 | 値 |
|-------|---|
| `DISCORD_TOKEN` | `MTQ3NjA4...`（あなたのBotトークン） |
| `DISCORD_CLIENT_ID` | `1476082436663279646` |
| `AI_SERVICE_URL` | Railwayのai-serviceのURL（例: `https://kibitz-ai-xxxx.railway.app`） |
| `ELEVENLABS_API_KEY` | 任意（Pro機能のTTS用） |

4. Railway Dashboard → **Account** → **Tokens** でトークンを発行

### Step 3: GitHub Secrets を設定

GitHub リポジトリ → Settings → Secrets and variables → Actions:
- `RAILWAY_TOKEN`: Railwayのアカウントトークン

これで `git push` するたびに自動デプロイされる。

### Step 4: Windows .exe のビルド

GitHub Actions の **build-release** ワークフローが自動でWindowsビルドを実行。

**手動でビルドしたい場合:**
1. GitHub → Actions タブ → "Build & Release Windows App" → "Run workflow"
2. 完了後、Artifacts から `kibitz-windows-installer.zip` をダウンロード
3. 中の `.exe` がインストーラー

**リリース版（バージョンタグ付き）:**
```bash
git tag v1.0.0
git push origin v1.0.0
# → GitHub Releases に .exe が自動添付される
```

---

## ユーザー向け使い方

1. **Kibitz.exe** をインストール → システムトレイに常駐
2. Discord Bot をサーバーに招待:
   ```
   https://discord.com/oauth2/authorize?client_id=1476082436663279646&permissions=2150631424&scope=bot+applications.commands
   ```
3. ゲームを起動
4. DiscordのVCに参加
5. テキストチャンネルで `/kibitz-start` を実行
6. KibitzがVCに参加し、ゲーム画面を見ながらリアクション開始！

---

## Top.gg への登録（ディスカバリー）

1. https://top.gg にログイン（Discord認証）
2. "Add Your Bot" → Client ID: `1476082436663279646`
3. `docs/topgg-description.md` の内容を説明欄に貼り付け
4. 招待リンクを設定

---

## 料金モデル

| プラン | 制限 | 価格 |
|-------|------|------|
| Free | 1日15回リアクション、テキスト応答 | 無料 |
| Pro | 無制限、音声応答(TTS)、高度な解析 | $4.99/月 |

Pro サーバーは `PRO_GUILD_IDS` 環境変数にサーバーIDをカンマ区切りで追加。

---

## トラブルシューティング

**Bot がVCに入ってこない:**
- Bot がサーバーに招待されているか確認
- `/kibitz-start` をVC内から実行しているか確認
- Railway Dashboard でBot serviceのログを確認

**AIが反応しない:**
- Kibitz.exe の設定でAI Service URLが正しいか確認（⚙️ アイコン → URL設定）
- Railway Dashboard でai-serviceのログを確認

**Electron appがゲームを検出しない:**
- ゲームをフォアグラウンドウィンドウにする
- 未対応ゲームは `packages/capture-app/electron/main.ts` の `KNOWN_GAMES` に追加可能
