import 'dotenv/config';
import { Client, Events, GatewayIntentBits, TextChannel } from 'discord.js';
import { GameSession } from './types';
import { handleCommand, commands } from './commands';
import { CaptureClient } from './services/capture-client';
import { AiClient } from './services/ai-client';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CAPTURE_SERVICE_URL =
  process.env.CAPTURE_SERVICE_URL ?? 'http://localhost:3456';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:3457';
const REACTION_INTERVAL_MS = parseInt(
  process.env.REACTION_INTERVAL_MS ?? '30000',
  10
);

if (!DISCORD_TOKEN) {
  console.error('[Kibitz] DISCORD_TOKEN is not set.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const captureClient = new CaptureClient(CAPTURE_SERVICE_URL);
const aiClient = new AiClient(AI_SERVICE_URL);
const sessions = new Map<string, GameSession>();

// --- コマンド処理 ---
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleCommand(interaction, sessions, captureClient, aiClient);
  } catch (error) {
    console.error('[Kibitz] Command error:', error);
    const reply = interaction.deferred || interaction.replied
      ? interaction.editReply.bind(interaction)
      : interaction.reply.bind(interaction);
    await reply({ content: 'An error occurred while executing the command.' }).catch(
      console.error
    );
  }
});

// --- 定期モニタリングループ ---
let monitoringTimer: ReturnType<typeof setInterval> | null = null;

function startMonitoringLoop(): void {
  if (monitoringTimer) return;

  monitoringTimer = setInterval(async () => {
    for (const [guildId, session] of sessions) {
      if (!session.isMonitoring) continue;

      try {
        const screenshot = await captureClient.getScreenshot();
        if (!screenshot) continue;

        const reaction = await aiClient.react(
          screenshot.image,
          'periodic',
          session.gameName ?? undefined,
          session.genre ?? undefined
        );

        if (!reaction) continue;

        const channel = client.channels.cache.get(session.channelId);
        if (channel && channel instanceof TextChannel) {
          await channel.send(reaction);
          session.lastReactionAt = new Date();
        }
      } catch (error) {
        console.error(
          `[Kibitz] Monitoring error (guild: ${guildId}):`,
          error
        );
      }
    }
  }, REACTION_INTERVAL_MS);
}

// --- イベントハンドラ ---
client.once(Events.ClientReady, (readyClient) => {
  console.log(`[Kibitz] Logged in as ${readyClient.user.tag}`);
  console.log(`[Kibitz] Connected to ${readyClient.guilds.cache.size} servers`);
  console.log(`[Kibitz] Capture Service: ${CAPTURE_SERVICE_URL}`);
  console.log(`[Kibitz] AI Service: ${AI_SERVICE_URL}`);
  console.log(`[Kibitz] Monitoring interval: ${REACTION_INTERVAL_MS}ms`);
  startMonitoringLoop();
});

client.on(Events.ShardReconnecting, () => {
  console.log('[Kibitz] Reconnecting...');
});

client.on(Events.ShardDisconnect, () => {
  console.log('[Kibitz] Disconnected');
});

client.on(Events.Error, (error) => {
  console.error('[Kibitz] Client error:', error);
});

// --- グレースフルシャットダウン ---
const shutdown = (): void => {
  console.log('[Kibitz] Shutting down...');
  if (monitoringTimer) {
    clearInterval(monitoringTimer);
    monitoringTimer = null;
  }
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// --- Bot起動 ---
client.login(DISCORD_TOKEN).catch((error) => {
  console.error('[Kibitz] Login failed:', error);
  process.exit(1);
});
