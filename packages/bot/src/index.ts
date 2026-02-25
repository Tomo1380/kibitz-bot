import 'dotenv/config';
import http from 'http';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { GameSession } from './types';
import { handleCommand, commands } from './commands';
import { CaptureClient } from './services/capture-client';
import { AiClient } from './services/ai-client';
import { VoiceHandler } from './voice/voice-handler';
import { AutoReactor } from './reactions/auto-reactor';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CAPTURE_SERVICE_URL =
  process.env.CAPTURE_SERVICE_URL ?? 'http://localhost:3456';

if (!DISCORD_TOKEN) {
  console.error('[Kibitz] DISCORD_TOKEN is not set.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

const captureClient = new CaptureClient(CAPTURE_SERVICE_URL);
const aiClient = new AiClient();
const voiceHandler = new VoiceHandler();
const autoReactor = new AutoReactor();
const sessions = new Map<string, GameSession>();

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleCommand(
      interaction,
      sessions,
      captureClient,
      aiClient,
      voiceHandler,
      autoReactor
    );
  } catch (error) {
    console.error('[Kibitz] Command error:', error);
    try {
      if (interaction.replied) {
        // Already fully replied — do nothing to avoid double-ack
        return;
      }
      if (interaction.deferred) {
        await interaction.editReply({ content: 'An error occurred while executing the command.' });
      } else {
        await interaction.reply({ content: 'An error occurred while executing the command.', ephemeral: true });
      }
    } catch (replyError) {
      // Interaction may have expired or already been acknowledged — silently log
      console.error('[Kibitz] Failed to send error response:', replyError instanceof Error ? replyError.message : replyError);
    }
  }
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[Kibitz] Logged in as ${readyClient.user.tag}`);
  console.log(`[Kibitz] Connected to ${readyClient.guilds.cache.size} servers`);
  console.log(`[Kibitz] Capture Service: ${CAPTURE_SERVICE_URL}`);
  console.log(`[Kibitz] AI: Claude API (direct)`);
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

const shutdown = (): void => {
  console.log('[Kibitz] Shutting down...');
  client.destroy();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Health check HTTP server (Railway requires a port to be open)
const PORT = parseInt(process.env.PORT ?? '3458', 10);
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', bot: client.user?.tag ?? 'starting' }));
}).listen(PORT, () => {
  console.log(`[Kibitz] Health check server listening on port ${PORT}`);
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('[Kibitz] Login failed:', error);
  process.exit(1);
});
