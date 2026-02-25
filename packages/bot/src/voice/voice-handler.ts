import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  VoiceConnectionStatus,
  entersState,
  DiscordGatewayAdapterCreator,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { Readable } from 'stream';
import axios from 'axios';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

interface GuildVoiceState {
  connection: VoiceConnection;
  player: ReturnType<typeof createAudioPlayer>;
}

export class VoiceHandler {
  private states = new Map<string, GuildVoiceState>();

  async joinChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    console.log(`[Kibitz Voice] Joined VC: ${channel.name}`);

    const player = createAudioPlayer();
    connection.subscribe(player);

    this.states.set(channel.guild.id, { connection, player });

    return connection;
  }

  leaveChannel(guildId: string): void {
    const state = this.states.get(guildId);
    if (state) {
      state.player.stop();
      state.connection.destroy();
      this.states.delete(guildId);
      console.log(`[Kibitz Voice] Left VC (guild: ${guildId})`);
    }
  }

  async speak(guildId: string, text: string): Promise<void> {
    const state = this.states.get(guildId);
    if (!state) return;

    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      console.warn('[Kibitz Voice] ElevenLabs API key or voice ID not set, skipping TTS');
      return;
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'xi-api-key': ELEVENLABS_API_KEY,
            'Content-Type': 'application/json',
            Accept: 'audio/mpeg',
          },
          responseType: 'arraybuffer',
          timeout: 15000,
        }
      );

      const audioStream = Readable.from(Buffer.from(response.data));
      const resource = createAudioResource(audioStream);
      state.player.play(resource);

      await entersState(state.player, AudioPlayerStatus.Idle, 30_000);
    } catch (error) {
      console.error(
        '[Kibitz Voice] TTS error:',
        error instanceof Error ? error.message : error
      );
    }
  }

  startListening(
    guildId: string,
    onTranscript: (text: string) => void
  ): void {
    const state = this.states.get(guildId);
    if (!state) return;

    // Placeholder for Whisper STT integration
    console.log(`[Kibitz Voice] Listening started for guild ${guildId} (placeholder — Whisper STT not yet implemented)`);

    // onTranscript will be called when STT is implemented
    void onTranscript;
  }

  isConnected(guildId: string): boolean {
    return this.states.has(guildId);
  }
}
