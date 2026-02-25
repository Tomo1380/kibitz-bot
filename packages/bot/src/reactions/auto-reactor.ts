import { TextChannel } from 'discord.js';
import axios from 'axios';
import { VoiceHandler } from '../voice/voice-handler';

const REACTION_INTERVAL_MS = parseInt(
  process.env.REACTION_INTERVAL_MS ?? '30000',
  10
);

interface ReactResponse {
  reaction: string;
  shouldReact: boolean;
}

interface GuildReactorState {
  timer: ReturnType<typeof setInterval>;
  captureUrl: string;
  aiUrl: string;
  textChannel: TextChannel;
  voiceHandler?: VoiceHandler;
}

export class AutoReactor {
  private reactors = new Map<string, GuildReactorState>();

  start(
    guildId: string,
    captureUrl: string,
    aiUrl: string,
    textChannel: TextChannel,
    voiceHandler?: VoiceHandler
  ): void {
    // Stop existing reactor for this guild if any
    this.stop(guildId);

    const timer = setInterval(async () => {
      try {
        // Get screenshot from capture service
        const screenshotRes = await axios.get(`${captureUrl}/screenshot`, {
          timeout: 5000,
        });
        const { image } = screenshotRes.data;

        if (!image) return;

        // Send to AI service /react endpoint
        const reactRes = await axios.post<ReactResponse>(
          `${aiUrl}/react`,
          {
            image,
            eventType: 'periodic',
          },
          { timeout: 30000 }
        );

        const { reaction, shouldReact } = reactRes.data;

        if (!shouldReact || !reaction) return;

        // Post to text channel
        await textChannel.send(reaction);

        // Optionally speak via voice
        if (voiceHandler?.isConnected(guildId)) {
          await voiceHandler.speak(guildId, reaction);
        }

        console.log(`[Kibitz Reactor] Reacted in guild ${guildId}`);
      } catch (error) {
        console.error(
          `[Kibitz Reactor] Error (guild: ${guildId}):`,
          error instanceof Error ? error.message : error
        );
      }
    }, REACTION_INTERVAL_MS);

    this.reactors.set(guildId, {
      timer,
      captureUrl,
      aiUrl,
      textChannel,
      voiceHandler,
    });

    console.log(
      `[Kibitz Reactor] Started for guild ${guildId} (interval: ${REACTION_INTERVAL_MS}ms)`
    );
  }

  stop(guildId: string): void {
    const state = this.reactors.get(guildId);
    if (state) {
      clearInterval(state.timer);
      this.reactors.delete(guildId);
      console.log(`[Kibitz Reactor] Stopped for guild ${guildId}`);
    }
  }

  isRunning(guildId: string): boolean {
    return this.reactors.has(guildId);
  }
}
