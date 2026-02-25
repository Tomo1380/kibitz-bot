# Discord Game AI Bot - 仕様書

## コンセプト
VCチャンネルに参加するAIボット。プレイヤーのゲーム画面をリアルタイムで解析し、
リアクション・攻略ヒント・実況コメントを音声/テキストで提供する。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────┐
│  Windows側（ゲームPC）                               │
│  ┌──────────────────┐                               │
│  │ capture-service   │  ← Node.js/Electron           │
│  │ - ゲームウィンドウ検出 │                           │
│  │ - 定期スクリーンショット │                         │
│  │ - HTTP API提供    │                               │
│  └────────┬─────────┘                               │
│           │ HTTP (port 3456)                         │
└───────────┼─────────────────────────────────────────┘
            │ WSL2ネットワーク経由
┌───────────┼─────────────────────────────────────────┐
│  WSL2/Linux側                                        │
│           ↓                                          │
│  ┌──────────────────┐    ┌─────────────────────┐    │
│  │  Discord Bot      │←→│  AI Service (Claude) │    │
│  │  (discord.js)     │    │  - 画面解析          │    │
│  │  - VCチャンネル参加 │   │  - ゲーム特定        │    │
│  │  - 音声入出力     │    │  - 攻略ヒント生成    │    │
│  │  - テキスト応答   │    │  - リアクション生成  │    │
│  └──────────────────┘    └─────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## パッケージ構成（モノレポ）

```
discord-game-bot/
├── package.json              # ルートのworkspace設定
├── packages/
│   ├── bot/                  # Discord Bot
│   │   ├── src/
│   │   │   ├── index.ts      # エントリーポイント
│   │   │   ├── voice/        # VC音声処理
│   │   │   ├── commands/     # スラッシュコマンド
│   │   │   └── events/       # Discordイベントハンドラ
│   │   └── package.json
│   ├── capture/              # 画面キャプチャサービス（Windows用）
│   │   ├── src/
│   │   │   ├── index.ts      # HTTP APIサーバー
│   │   │   ├── capture.ts    # スクリーンショット取得
│   │   │   └── game-detect.ts # ゲームプロセス検出
│   │   └── package.json
│   └── ai-service/           # AI解析サービス
│       ├── src/
│       │   ├── index.ts      # エントリーポイント
│       │   ├── analyzer.ts   # Claude Vision API連携
│       │   ├── game-kb.ts    # ゲーム別ナレッジベース
│       │   └── persona.ts    # ゲーム別キャラクター設定
│       └── package.json
├── SPEC.md                   # この仕様書
└── .env.example              # 環境変数サンプル
```

## 技術スタック

### Discord Bot (packages/bot)
- **discord.js** v14 - メインBot SDK
- **@discordjs/voice** - VCチャンネル音声
- **@discordjs/opus** - 音声コーデック
- **openai** - Whisper STT（音声→テキスト）
- **elevenlabs** or **google-cloud/text-to-speech** - TTS（テキスト→音声）
- **TypeScript** + **tsx** for dev

### 画面キャプチャ (packages/capture)
- **screenshot-desktop** - Windows画面キャプチャ
- **active-win** - アクティブウィンドウ・プロセス情報取得
- **ps-list** - プロセス一覧（ゲーム検出用）
- **sharp** - 画像リサイズ・最適化
- **fastify** - 軽量HTTPサーバー（APIエンドポイント提供）
- TypeScript + Node.js（Windows側で実行）

### AI Service (packages/ai-service)
- **@anthropic-ai/sdk** - Claude Vision API
- Claude Sonnet 4.6 - 画面解析・攻略ヒント生成
- **fastify** - 内部HTTPサービス
- TypeScript

## API設計

### Capture Service API (port 3456)
```
GET /screenshot          → 最新のゲーム画面（base64 JPEG）
GET /game-info           → 検出中のゲーム情報 {name, process, pid}
GET /health              → サービス状態確認
```

### AI Service API (port 3457)
```
POST /analyze            → 画面解析 {image_base64, question?, context?}
POST /react              → リアクション生成 {image_base64, event_type}
GET /health              → サービス状態確認
```

## 機能詳細

### 1. ゲーム検出
- psListでゲームプロセスをスキャン（Steamゲーム, よく遊ぶゲーム等）
- ゲームリストは `packages/capture/src/game-list.ts` で管理
- 5秒ごとに再スキャン

### 2. 画面キャプチャ
- アクティブなゲームウィンドウを2秒ごとにキャプチャ
- 解像度を1280x720にリサイズ（API効率化）
- 最新フレームをメモリにキャッシュ

### 3. AI解析フロー
```
ユーザーが「ここどうすればいい？」と音声入力
  → STT（Whisper）でテキスト化
  → capture serviceから最新スクリーンショット取得
  → Claude Vision APIに (画像 + 質問 + ゲームコンテキスト) を送信
  → 攻略ヒント・アドバイスを生成
  → TTS for 音声出力 または チャンネルにテキスト投稿
```

### 4. 自動リアクション
- 定期的（30秒ごと）に画面を解析
- 特定イベント検出時にリアクション
  - 敵撃破 → 「やったじゃん！」
  - 死亡 → 「惜しかった〜次いける！」
  - 宝箱発見 → 「あそこ開けてみて！」
  - ボス戦 → 「ボスだ！頑張れー！」

### 5. ゲーム別ペルソナ
- ダークソウル系 → 厳しいコーチ口調
- マイクラ → 元気な相棒
- FPS → 熱いチームメイト
- RPG → 物知りな相棒

## Discordスラッシュコマンド
- `/join` - VCに参加してゲームモニタリング開始
- `/leave` - VC退出
- `/hint` - 今の画面についてヒントを教える
- `/analyze` - 画面の詳細解析を実行
- `/mode [game_name]` - ゲームを手動指定
- `/persona [type]` - AIキャラクター変更

## 環境変数
```
DISCORD_TOKEN=          # Discord Bot Token
DISCORD_CLIENT_ID=      # Application ID

ANTHROPIC_API_KEY=      # Claude API Key

OPENAI_API_KEY=         # Whisper STT用

ELEVENLABS_API_KEY=     # TTS用（任意）
ELEVENLABS_VOICE_ID=    # TTS音声ID（任意）

CAPTURE_SERVICE_URL=http://localhost:3456  # capture serviceのURL
AI_SERVICE_URL=http://localhost:3457       # AI serviceのURL

# capture serviceの設定
CAPTURE_INTERVAL_MS=2000     # キャプチャ間隔（ミリ秒）
SCREENSHOT_QUALITY=80        # JPEG品質
```

## セットアップ手順（将来のREADME用）
1. `npm install` (ルートで実行、workspaceで全パッケージインストール)
2. `.env` を `.env.example` からコピーして設定
3. Windowsで `npm run start:capture` (capture service)
4. `npm run start:ai` (AI service)
5. `npm run start:bot` (Discord Bot)

## 優先実装順序
1. capture service（画面キャプチャ + HTTP API）
2. ai-service（Claude Vision + 解析ロジック）
3. bot（Discord接続 + コマンド + VC音声）
4. 自動リアクション機能
5. TTS音声出力
