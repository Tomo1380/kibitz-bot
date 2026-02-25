export interface GameSession {
  guildId: string;
  channelId: string;
  voiceChannelId: string;
  gameName: string | null;
  genre: string | null;
  isMonitoring: boolean;
  lastReactionAt: Date | null;
}
