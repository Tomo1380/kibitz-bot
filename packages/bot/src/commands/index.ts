import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  TextChannel,
} from 'discord.js';
import { getVoiceConnection } from '@discordjs/voice';
import { GameSession } from '../types';
import { CaptureClient } from '../services/capture-client';
import { AiClient } from '../services/ai-client';
import { VoiceHandler } from '../voice/voice-handler';
import { AutoReactor } from '../reactions/auto-reactor';
import { TierManager } from '../tiers/tier-manager';

const CAPTURE_SERVICE_URL =
  process.env.CAPTURE_SERVICE_URL ?? 'http://localhost:3456';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:3457';

const PERSONA_TYPES = ['fps', 'rpg', 'moba', 'survival', 'action', 'other'];

export const commands = [
  new SlashCommandBuilder()
    .setName('kibitz-start')
    .setDescription('Start Kibitz — AI watches your game and reacts'),

  new SlashCommandBuilder()
    .setName('kibitz-stop')
    .setDescription('Stop Kibitz and leave voice channel'),

  new SlashCommandBuilder()
    .setName('kibitz-hint')
    .setDescription('Get a quick hint about your current screen'),

  new SlashCommandBuilder()
    .setName('kibitz-analyze')
    .setDescription('Get a detailed analysis of your current screen'),

  new SlashCommandBuilder()
    .setName('kibitz-mode')
    .setDescription('Manually set the game name')
    .addStringOption((option) =>
      option
        .setName('game_name')
        .setDescription('Game name')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('kibitz-persona')
    .setDescription('Change AI persona genre')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Persona type')
        .setRequired(true)
        .addChoices(
          { name: 'FPS', value: 'fps' },
          { name: 'RPG', value: 'rpg' },
          { name: 'MOBA', value: 'moba' },
          { name: 'Survival', value: 'survival' },
          { name: 'Action', value: 'action' },
          { name: 'Other', value: 'other' }
        )
    ),

  new SlashCommandBuilder()
    .setName('kibitz-upgrade')
    .setDescription('Learn how to upgrade to Kibitz Pro'),
];

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  sessions: Map<string, GameSession>,
  captureClient: CaptureClient,
  aiClient: AiClient,
  voiceHandler: VoiceHandler,
  autoReactor: AutoReactor
): Promise<void> {
  const { commandName, guildId } = interaction;
  const tierManager = TierManager.getInstance();

  if (!guildId) {
    await interaction.reply({
      content: 'This command can only be used in a server.',
      ephemeral: true,
    });
    return;
  }

  switch (commandName) {
    case 'kibitz-start': {
      const member = interaction.member as GuildMember | null;
      const voiceChannel = member?.voice?.channel;
      const tier = tierManager.isProGuild(guildId) ? 'pro' : 'free';

      if (!tierManager.checkAndConsume(guildId, tier)) {
        await interaction.reply({
          content:
            "You've hit the free tier limit (15 reactions/day). Use `/kibitz-upgrade` to go Pro!",
          ephemeral: true,
        });
        return;
      }

      try {
        // Join VC if user is in one AND tier is pro
        if (voiceChannel && voiceChannel.isVoiceBased() && tier === 'pro') {
          await voiceHandler.joinChannel(voiceChannel);
        }

        const session: GameSession = {
          guildId,
          channelId: interaction.channelId,
          voiceChannelId: voiceChannel?.id ?? '',
          gameName: null,
          genre: null,
          isMonitoring: true,
          lastReactionAt: null,
        };

        sessions.set(guildId, session);

        const textChannel = interaction.channel as TextChannel;

        // Start auto reactor
        autoReactor.start(
          guildId,
          CAPTURE_SERVICE_URL,
          AI_SERVICE_URL,
          textChannel,
          tier === 'pro' ? voiceHandler : undefined
        );

        const voiceStatus =
          tier === 'pro' && voiceChannel
            ? ' Joined voice channel!'
            : tier === 'free'
              ? ' (Voice is a Pro feature — `/kibitz-upgrade`)'
              : '';

        await interaction.reply(
          `Kibitz is now watching your game!${voiceStatus}`
        );
      } catch (error) {
        console.error('[Kibitz] Start error:', error);
        await interaction.reply({
          content: 'Failed to start Kibitz. Please try again.',
          ephemeral: true,
        });
      }
      break;
    }

    case 'kibitz-stop': {
      autoReactor.stop(guildId);
      voiceHandler.leaveChannel(guildId);

      const connection = getVoiceConnection(guildId);
      if (connection) {
        connection.destroy();
      }

      sessions.delete(guildId);

      await interaction.reply('Kibitz stopped. See you next game!');
      break;
    }

    case 'kibitz-hint': {
      const session = sessions.get(guildId);

      if (!session) {
        await interaction.reply({
          content: 'Start Kibitz first with `/kibitz-start`.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const screenshot = await captureClient.getScreenshot();

      if (!screenshot) {
        await interaction.editReply(
          'Failed to get screenshot. Is the capture service running?'
        );
        return;
      }

      const answer = await aiClient.analyze(
        screenshot.image,
        'Give me a quick hint about what I see on screen.',
        session.gameName ?? undefined,
        session.genre ?? undefined
      );

      await interaction.editReply(answer);
      break;
    }

    case 'kibitz-analyze': {
      const session = sessions.get(guildId);

      if (!session) {
        await interaction.reply({
          content: 'Start Kibitz first with `/kibitz-start`.',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const screenshot = await captureClient.getScreenshot();

      if (!screenshot) {
        await interaction.editReply(
          'Failed to get screenshot. Is the capture service running?'
        );
        return;
      }

      const answer = await aiClient.analyze(
        screenshot.image,
        'Analyze the current screen in detail. Describe the situation, enemy positions, health, items/resources, recommended actions, and things to watch out for.',
        session.gameName ?? undefined,
        session.genre ?? undefined
      );

      await interaction.editReply(answer);
      break;
    }

    case 'kibitz-mode': {
      const gameName = interaction.options.getString('game_name', true);

      const session = sessions.get(guildId);
      if (session) {
        session.gameName = gameName;
        sessions.set(guildId, session);
      } else {
        const newSession: GameSession = {
          guildId,
          channelId: interaction.channelId,
          voiceChannelId: '',
          gameName,
          genre: null,
          isMonitoring: false,
          lastReactionAt: null,
        };
        sessions.set(guildId, newSession);
      }

      await interaction.reply(`Game set to **${gameName}**.`);
      break;
    }

    case 'kibitz-persona': {
      const personaType = interaction.options.getString('type', true);

      if (!PERSONA_TYPES.includes(personaType)) {
        await interaction.reply({
          content: `Invalid persona type. Available: ${PERSONA_TYPES.join(', ')}`,
          ephemeral: true,
        });
        return;
      }

      const session = sessions.get(guildId);
      if (session) {
        session.genre = personaType;
        sessions.set(guildId, session);
      } else {
        const newSession: GameSession = {
          guildId,
          channelId: interaction.channelId,
          voiceChannelId: '',
          gameName: null,
          genre: personaType,
          isMonitoring: false,
          lastReactionAt: null,
        };
        sessions.set(guildId, newSession);
      }

      await interaction.reply(`Persona changed to **${personaType}**.`);
      break;
    }

    case 'kibitz-upgrade': {
      const remaining = tierManager.getRemainingReactions(guildId);
      await interaction.reply({
        content: [
          '**Kibitz Pro** — $4.99/mo',
          '',
          'Upgrade to unlock:',
          '- Unlimited AI reactions (free: 15/day)',
          '- Voice channel output (Kibitz speaks!)',
          '- Advanced game analysis',
          '- Priority support',
          '',
          `You have **${remaining}** free reactions remaining today.`,
          '',
          'To upgrade, visit: https://kibitz.gg/pro',
        ].join('\n'),
        ephemeral: true,
      });
      break;
    }

    default:
      await interaction.reply({
        content: 'Unknown command.',
        ephemeral: true,
      });
  }
}
