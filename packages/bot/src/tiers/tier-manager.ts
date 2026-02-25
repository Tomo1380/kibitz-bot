const FREE_DAILY_LIMIT = 15;

const PRO_GUILD_IDS = new Set(
  (process.env.PRO_GUILD_IDS ?? '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

interface GuildUsage {
  count: number;
  resetAt: number; // UTC midnight timestamp
}

function getNextMidnightUTC(): number {
  const now = new Date();
  const midnight = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return midnight.getTime();
}

export class TierManager {
  private static instance: TierManager;
  private usage = new Map<string, GuildUsage>();

  private constructor() {}

  static getInstance(): TierManager {
    if (!TierManager.instance) {
      TierManager.instance = new TierManager();
    }
    return TierManager.instance;
  }

  isProGuild(guildId: string): boolean {
    return PRO_GUILD_IDS.has(guildId);
  }

  checkAndConsume(guildId: string, tier: 'free' | 'pro'): boolean {
    if (tier === 'pro') {
      return true; // Unlimited
    }

    // Free tier: 15 reactions/day
    const now = Date.now();
    let guildUsage = this.usage.get(guildId);

    if (!guildUsage || now >= guildUsage.resetAt) {
      guildUsage = { count: 0, resetAt: getNextMidnightUTC() };
      this.usage.set(guildId, guildUsage);
    }

    if (guildUsage.count >= FREE_DAILY_LIMIT) {
      return false;
    }

    guildUsage.count++;
    return true;
  }

  getRemainingReactions(guildId: string): number {
    if (this.isProGuild(guildId)) return Infinity;

    const now = Date.now();
    const guildUsage = this.usage.get(guildId);

    if (!guildUsage || now >= guildUsage.resetAt) {
      return FREE_DAILY_LIMIT;
    }

    return Math.max(0, FREE_DAILY_LIMIT - guildUsage.count);
  }
}
