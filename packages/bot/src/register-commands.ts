import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID; // オプション

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error(
    'DISCORD_TOKEN と DISCORD_CLIENT_ID を環境変数に設定してください。'
  );
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const commandData = commands.map((cmd) => cmd.toJSON());

async function registerCommands(): Promise<void> {
  try {
    console.log(`${commandData.length} 個のコマンドを登録中...`);

    if (DISCORD_GUILD_ID) {
      // ギルド限定登録（即時反映）
      await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commandData }
      );
      console.log(
        `ギルド (${DISCORD_GUILD_ID}) にコマンドを登録しました。`
      );
    } else {
      // グローバル登録（反映まで最大1時間）
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
        body: commandData,
      });
      console.log('グローバルにコマンドを登録しました。');
    }
  } catch (error) {
    console.error('コマンド登録に失敗しました:', error);
    process.exit(1);
  }
}

registerCommands();
