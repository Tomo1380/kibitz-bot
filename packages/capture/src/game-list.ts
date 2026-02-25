export interface GameEntry {
  processName: string; // 部分一致マッチ用（toLowerCase）
  displayName: string;
  genre: 'fps' | 'rpg' | 'moba' | 'survival' | 'action' | 'other';
  persona: 'coach' | 'buddy' | 'teammate' | 'guide';
}

export const GAME_LIST: GameEntry[] = [
  {
    processName: 'VALORANT-Win64-Shipping',
    displayName: 'VALORANT',
    genre: 'fps',
    persona: 'teammate',
  },
  {
    processName: 'r5apex',
    displayName: 'Apex Legends',
    genre: 'fps',
    persona: 'teammate',
  },
  {
    processName: 'FortniteClient-Win64-Shipping',
    displayName: 'Fortnite',
    genre: 'survival',
    persona: 'buddy',
  },
  {
    processName: 'League of Legends',
    displayName: 'League of Legends',
    genre: 'moba',
    persona: 'coach',
  },
  {
    processName: 'RainbowSix',
    displayName: 'Rainbow Six Siege',
    genre: 'fps',
    persona: 'teammate',
  },
  {
    processName: 'Overwatch',
    displayName: 'Overwatch 2',
    genre: 'fps',
    persona: 'teammate',
  },
  {
    processName: 'javaw',
    displayName: 'Minecraft Java',
    genre: 'survival',
    persona: 'buddy',
  },
  {
    processName: 'Minecraft.Windows',
    displayName: 'Minecraft Bedrock',
    genre: 'survival',
    persona: 'buddy',
  },
  {
    processName: 'GenshinImpact',
    displayName: '原神',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'ZenlessZoneZero',
    displayName: 'ゼンレスゾーンゼロ',
    genre: 'action',
    persona: 'buddy',
  },
  {
    processName: 'HonkaiStarRail',
    displayName: '崩壊：スターレイル',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'ffxiv_dx11',
    displayName: 'Final Fantasy XIV',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'ELDENRING',
    displayName: 'Elden Ring',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'sekiro',
    displayName: 'SEKIRO',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'ds3',
    displayName: 'Dark Souls III',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'darksouls3',
    displayName: 'Dark Souls III',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'NieRAutomata',
    displayName: 'NieR:Automata',
    genre: 'action',
    persona: 'buddy',
  },
  {
    processName: 'Cyberpunk2077',
    displayName: 'Cyberpunk 2077',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'RDR2',
    displayName: 'Red Dead Redemption 2',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'witcher3',
    displayName: 'The Witcher 3',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'GTA5',
    displayName: 'GTA V',
    genre: 'action',
    persona: 'buddy',
  },
  {
    processName: 'MonsterHunterWorld',
    displayName: 'Monster Hunter World',
    genre: 'action',
    persona: 'teammate',
  },
  {
    processName: 'MonsterHunterRise',
    displayName: 'Monster Hunter Rise',
    genre: 'action',
    persona: 'teammate',
  },
  {
    processName: 're4',
    displayName: 'Resident Evil 4',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'Starfield',
    displayName: 'Starfield',
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'bg3',
    displayName: "Baldur's Gate 3",
    genre: 'rpg',
    persona: 'guide',
  },
  {
    processName: 'DevilMayCry5',
    displayName: 'Devil May Cry 5',
    genre: 'action',
    persona: 'coach',
  },
  {
    processName: 'Palworld-Win64-Shipping',
    displayName: 'Palworld',
    genre: 'survival',
    persona: 'buddy',
  },
  {
    processName: 'steam',
    displayName: 'Steam (汎用)',
    genre: 'other',
    persona: 'buddy',
  },
];
