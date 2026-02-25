# Kibitz — Your AI Gaming Co-Pilot

> The witty AI that watches your screen, joins your voice channel, and tells you exactly what you're doing wrong (and right).

## Features

- **Watches your game screen** in real-time via companion app
- **Joins your Discord voice channel** and speaks reactions
- **Powered by Claude AI** — game-aware, strategy-smart
- **Auto-reacts** to deaths, boss fights, victories, and clutch moments
- **Ask questions mid-game:** "Hey Kibitz, what should I build next?"

## Quick Start (5 steps)

1. [Add Kibitz to your server](https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3145728&scope=bot%20applications.commands)
2. Download the Kibitz Companion App (Windows) from Releases
3. Run the app and start your game
4. Join a voice channel and type `/kibitz-start`
5. Play — Kibitz will handle the rest

## Free vs Pro

| Feature | Free | Pro ($4.99/mo) |
|---------|------|----------------|
| AI reactions | 15/day | Unlimited |
| Voice output | - | Yes |
| Game analysis | Basic | Advanced |
| Priority support | - | Yes |

## Setup for Self-Hosting

Copy `.env.example` to `.env` and fill in the values:

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# Anthropic (Claude API)
ANTHROPIC_API_KEY=your_api_key

# ElevenLabs TTS (Pro tier)
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=your_voice_id

# Service URLs
CAPTURE_SERVICE_URL=http://localhost:3456
AI_SERVICE_URL=http://localhost:3457

# Bot
REACTION_INTERVAL_MS=30000

# Tier
PRO_GUILD_IDS=guild_id_1,guild_id_2
```

Then run:

```bash
npm install
npm run start:capture   # Windows companion app
npm run start:ai        # AI analysis service
npm run start:bot       # Discord bot
```

## Architecture

```
Kibitz Companion App (Windows)     Discord Bot (WSL2/Linux)
┌─────────────────────┐           ┌──────────────────────┐
│  Screen Capture      │  HTTP     │  Bot + Commands       │
│  Game Detection      │ ───────> │  Voice Handler        │
│  localhost:3456      │           │  Auto Reactor         │
└─────────────────────┘           │  Tier Manager         │
                                   └──────┬───────────────┘
                                          │
                                   ┌──────▼───────────────┐
                                   │  AI Service           │
                                   │  Claude Vision API    │
                                   │  Game Knowledge Base  │
                                   │  localhost:3457       │
                                   └──────────────────────┘
```

## Contributing

PRs welcome! See CONTRIBUTING.md
