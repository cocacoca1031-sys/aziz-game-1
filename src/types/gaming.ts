export interface BossPhase {
  phaseNumber: number;
  title: string;
  hpThreshold: string;
  attackPatterns: string[];
  safeWindows: string[];
}

export interface BossLoadout {
  playstyle: string;
  weapon: string;
  charmsOrRelics: string[];
  skillsOrArts: string[];
  defensiveGear: string[];
  consumables: string[];
  rationale: string;
}

export interface BossGuide {
  id: string;
  bossName: string;
  gameTitle: string;
  genre: string;
  difficulty: 'Standard' | 'Hard' | 'Extreme' | 'Nightmare';
  arenaLocation?: string;
  weaknesses?: string[];
  imageUrl?: string;
  summary: string;
  phases: BossPhase[];
  positioningTips: string[];
  dodgingTips: string[];
  loadouts: BossLoadout[];
  isCustom?: boolean;
}

export interface GameCaseDossier {
  gameTitle: string;
  genre: string;
  platforms: string;
  coreCombatLoop: string;
  keyMechanics: string[];
  recommendedEndgameLoadout: string;
  elementalOrStaggerNotes: string;
}

export type ChatReplyKind = 'general_gaming' | 'boss_strategy' | 'refusal' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  kind: ChatReplyKind;
  bossGuide?: BossGuide;
  timestamp: string;
}

export interface MilestoneItem {
  id: string;
  title: string;
  type: 'story' | 'achievement';
  completed: boolean;
  description?: string;
}

export interface TrackedGame {
  id: string;
  title: string;
  platform: string;
  genre: string;
  hoursPlayed: number;
  imageUrl?: string;
  psnProfilesUrl?: string;
  items: MilestoneItem[];
  lastUpdated: string;
}

export interface GamingNewsItem {
  rank: number;
  headline: string;
  summary: string;
}

export interface GamingNewsSource {
  title: string;
  url: string;
}

export interface GamingNewsPulse {
  platformFilter: string;
  fetchedAt: string;
  items: GamingNewsItem[];
  whatsappMessage: string;
  sources: GamingNewsSource[];
}

export type AppTab = 'chat' | 'boss-hub' | 'progress' | 'news';
