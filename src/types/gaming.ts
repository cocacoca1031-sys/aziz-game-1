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

export type ChatTopicFocus =
  | 'All Topics'
  | 'Boss & Combat'
  | 'Builds & Gear'
  | 'Hardware & Settings'
  | 'Achievements';

export interface ChatSession {
  id: string;
  title: string;
  pinned?: boolean;
  topicFocus: ChatTopicFocus;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
  digestMessage: string;
  sources: GamingNewsSource[];
}

export type DailyDispatchStatus =
  | 'idle'
  | 'sent_via_api'
  | 'ready_for_dispatch'
  | 'failed';

export interface DailyDispatchRecord {
  dispatchedAt: string;
  localDate: string;
  scheduledSlot: string;
  telegramTarget: string;
  platformFilter: string;
  status: DailyDispatchStatus;
  detail: string;
  digestMessage: string;
  items: GamingNewsItem[];
}

export interface DailyNewsScheduleConfig {
  enabled: boolean;
  telegramTarget: string;
  platformFilter: string;
  sendTimes: string[];
  timeZone: string;
  lastDispatchedSlotKeys?: string[];
  lastDispatchedAt?: string;
  lastDeliveryStatus?: DailyDispatchStatus;
  lastDeliveryDetail?: string;
  lastDispatch?: DailyDispatchRecord | null;
}

export interface TelegramGatewayInfo {
  configured: boolean;
  provider: 'telegram_bot' | 'none';
}

export type GuideCategory =
  | 'Story Walkthrough'
  | 'Secrets & Collectibles'
  | 'Trophy Roadmap'
  | 'Mechanics & Combat'
  | 'Beginner Essentials';

export type GuideDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';

export interface GameGuideStep {
  id: string;
  stepNumber: number;
  title: string;
  detail: string;
  location?: string;
  completed?: boolean;
}

export interface GameGuide {
  id: string;
  title: string;
  gameTitle: string;
  category: GuideCategory;
  difficulty: GuideDifficulty;
  estimatedMinutes: number;
  summary: string;
  prerequisites: string[];
  missableWarnings: string[];
  steps: GameGuideStep[];
  proTips: string[];
  bookmarked?: boolean;
  isCustom?: boolean;
  updatedAt: string;
}

export type GuideHintPreference = 'auto' | 'hint' | 'walkthrough';

export interface GuideAgentMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  imagePreviewUrl?: string;
  milestoneCompleted?: string;
  suggestedNextStep?: string;
  needsProgressCheck?: boolean;
  isRefusal?: boolean;
  timestamp: string;
}

export interface GuideAgentSessionState {
  gameTitle: string;
  currentProgress: string;
  hintPreference: GuideHintPreference;
  milestones: string[];
  messages: GuideAgentMessage[];
  updatedAt: string;
}

export type BossPhaseCap = 'phase1' | 'phase2' | 'full';

export interface BossCoachMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  phaseUsed?: BossPhaseCap;
  isDeathDiagnosis?: boolean;
  isRefusal?: boolean;
  timestamp: string;
}

export interface BossCoachSessionState {
  bossName: string;
  gameTitle: string;
  reachedPhase: BossPhaseCap;
  currentGear: string;
  attemptsLogged: number;
  messages: BossCoachMessage[];
  updatedAt: string;
}

export type AppTab = 'chat' | 'boss-hub' | 'guides' | 'progress' | 'news';

