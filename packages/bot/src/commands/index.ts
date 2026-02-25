import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  Client,
  GuildMember,
  TextChannel,
} from 'discord.js';
import {
  joinVoiceChannel,
  getVoiceConnection,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { GameSession } from '../types';
import { CaptureClient } from '../services/capture-client';
import { AiClient } from '../services/ai-client';

const PERSONA_TYPES = ['fps', 'rpg', 'moba', 'survival', 'action', 'other'];

export const commands = [
  new SlashCommandBuilder()
    .setName('join')
    .setDescription('VCに参加してゲームモニタリングを開始します'),

  new SlashCommandBuilder()
    .setName('leave')
    .setDescription('VCから退出します'),

  new SlashCommandBuilder()
    .setName('hint')
    .setDescription('今の画面についてヒントを教えます'),

  new SlashCommandBuilder()
    .setName('analyze')
    .setDescription('画面の詳細解析を実行します'),

  new SlashCommandBuilder()
    .setName('mode')
    .setDescription('ゲームを手動で指定します')
    .addStringOption((option) =>
      option
        .setName('game_name')
        .setDescription('ゲーム名')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('persona')
    .setDescription('AIキャラクターのジャンルを変更します')
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('キャラクタータイプ')
        .setRequired(true)
        .addChoices(
          { name: 'FPS', value: 'fps' },
          { name: 'RPG', value: 'rpg' },
          { name: 'MOBA', value: 'moba' },
          { name: 'サバイバル', value: 'survival' },
          { name: 'アクション', value: 'action' },
          { name: 'その他', value: 'other' }
        )
    ),
];

export async function handleCommand(
  interaction: ChatInputCommandInteraction,
  sessions: Map<string, GameSession>,
  captureClient: CaptureClient,
  aiClient: AiClient
): Promise<void> {
  const { commandName, guildId } = interaction;

  if (!guildId) {
    await interaction.reply({
      content: 'このコマンドはサーバー内でのみ使用できます。',
      ephemeral: true,
    });
    return;
  }

  switch (commandName) {
    case 'join': {
      const member = interaction.member as GuildMember | null;
      const voiceChannel = member?.voice?.channel;

      if (!voiceChannel) {
        await interaction.reply({
          content: 'まずVCに参加してからコマンドを実行してください。',
          ephemeral: true,
        });
        return;
      }

      if (!voiceChannel.isVoiceBased()) {
        await interaction.reply({
          content: '音声チャンネルに参加してください。',
          ephemeral: true,
        });
        return;
      }

      try {
        const connection = joinVoiceChannel({
          channelId: voiceChannel.id,
          guildId,
          adapterCreator: voiceChannel.guild.voiceAdapterCreator,
          selfDeaf: true,
          selfMute: true,
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
          console.log(`[Bot] VCに接続しました: ${voiceChannel.name}`);
        });

        const session: GameSession = {
          guildId,
          channelId: interaction.channelId,
          voiceChannelId: voiceChannel.id,
          gameName: null,
          genre: null,
          isMonitoring: true,
          lastReactionAt: null,
        };

        sessions.set(guildId, session);

        await interaction.reply('ゲームコンパニオンが参加しました！');
      } catch (error) {
        console.error('[Bot] VC接続エラー:', error);
        await interaction.reply({
          content: 'VCへの接続に失敗しました。',
          ephemeral: true,
        });
      }
      break;
    }

    case 'leave': {
      const connection = getVoiceConnection(guildId);

      if (!connection) {
        await interaction.reply({
          content: '現在VCに参加していません。',
          ephemeral: true,
        });
        return;
      }

      connection.destroy();
      sessions.delete(guildId);

      await interaction.reply('またね！');
      break;
    }

    case 'hint': {
      const session = sessions.get(guildId);

      if (!session) {
        await interaction.reply({
          content: 'まず /join でVCに参加してください。',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const screenshot = await captureClient.getScreenshot();

      if (!screenshot) {
        await interaction.editReply(
          'スクリーンショットの取得に失敗しました。capture-serviceが起動しているか確認してください。'
        );
        return;
      }

      const answer = await aiClient.analyze(
        screenshot.image,
        '今の画面でアドバイスして',
        session.gameName ?? undefined,
        session.genre ?? undefined
      );

      await interaction.editReply(answer);
      break;
    }

    case 'analyze': {
      const session = sessions.get(guildId);

      if (!session) {
        await interaction.reply({
          content: 'まず /join でVCに参加してください。',
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply();

      const screenshot = await captureClient.getScreenshot();

      if (!screenshot) {
        await interaction.editReply(
          'スクリーンショットの取得に失敗しました。capture-serviceが起動しているか確認してください。'
        );
        return;
      }

      const answer = await aiClient.analyze(
        screenshot.image,
        '現在の画面を詳細に解析してください。状況説明、敵の位置や体力、アイテム・リソース状況、推奨アクション、注意すべき点を詳しく教えてください。',
        session.gameName ?? undefined,
        session.genre ?? undefined
      );

      await interaction.editReply(answer);
      break;
    }

    case 'mode': {
      const gameName = interaction.options.getString('game_name', true);

      const session = sessions.get(guildId);
      if (session) {
        session.gameName = gameName;
        sessions.set(guildId, session);
      } else {
        // セッションがなくてもモード設定は受け付ける
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

      await interaction.reply(`ゲームを${gameName}に設定しました。`);
      break;
    }

    case 'persona': {
      const personaType = interaction.options.getString('type', true);

      if (!PERSONA_TYPES.includes(personaType)) {
        await interaction.reply({
          content: `無効なキャラクタータイプです。使用可能: ${PERSONA_TYPES.join(', ')}`,
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

      await interaction.reply(`キャラクターを${personaType}に変更しました。`);
      break;
    }

    default:
      await interaction.reply({
        content: '未知のコマンドです。',
        ephemeral: true,
      });
  }
}
