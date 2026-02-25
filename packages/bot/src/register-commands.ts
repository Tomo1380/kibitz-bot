import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN!;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error('[Kibitz] DISCORD_TOKEN and DISCORD_CLIENT_ID must be set.');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

const commandData = commands.map((cmd) => cmd.toJSON());

async function registerCommands(): Promise<void> {
  try {
    console.log(`[Kibitz] Registering ${commandData.length} commands...`);

    if (DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body: commandData }
      );
      console.log(`[Kibitz] Commands registered to guild ${DISCORD_GUILD_ID}.`);
    } else {
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), {
        body: commandData,
      });
      console.log('[Kibitz] Commands registered globally.');
    }
  } catch (error) {
    console.error('[Kibitz] Command registration failed:', error);
    process.exit(1);
  }
}

registerCommands();
