import { useEffect, useMemo, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { BossBuildHubView } from './components/BossBuildHubView';
import { ChatAssistantView } from './components/ChatAssistantView';
import { GamingNewsView } from './components/GamingNewsView';
import { GuidesView } from './components/GuidesView';
import { OfflineIndicator } from './components/OfflineIndicator';
import { ProgressTrackerView } from './components/ProgressTrackerView';
import { TopAppBar } from './components/TopAppBar';
import {
  SEED_BOSS_GUIDES,
  SEED_TRACKED_GAMES,
  SEED_WELCOME_MESSAGES,
} from './data/seedData';
import { SEED_GAME_GUIDES } from './data/seedGuides';
import { useVoicePlayer } from './hooks/useVoicePlayer';
import type {
  AppTab,
  BossCoachSessionState,
  BossGuide,
  ChatMessage,
  ChatSession,
  GameGuide,
  GamingNewsPulse,
  GuideAgentSessionState,
  MilestoneItem,
  TrackedGame,
} from './types/gaming';
import { createDefaultBossCoachState } from './utils/bossCoach';
import { removeBossGuide } from './utils/bossFilter';
import {
  appendMessagesToSession,
  createChatSession,
  deleteChatSession,
  migrateLegacyChatMessages,
  renameChatSession,
  toggleSessionPin,
} from './utils/chatHistory';
import { createDefaultGuideAgentState } from './utils/guideAgent';
import {
  removeGameGuide,
  toggleGuideBookmark,
  toggleGuideStep,
} from './utils/guideFilter';
import { addGameHours, removeTrackedGame, toggleGameItem } from './utils/progressStats';
import {
  DEFAULT_VOICE_PRESET,
  normalizeVoiceName,
  type VoicePresetId,
} from './utils/voiceHelpers';

const STORAGE_KEYS = {
  chat: 'gsa_chat_messages_v1',
  chatSessions: 'gsa_chat_sessions_v1',
  activeChatId: 'gsa_active_chat_id_v1',
  bosses: 'gsa_boss_guides_v1',
  removedBosses: 'gsa_removed_boss_ids_v1',
  bossCoach: 'gsa_boss_coach_state_v1',
  guides: 'gsa_game_guides_v1',
  removedGuides: 'gsa_removed_guide_ids_v1',
  guideAgent: 'gsa_guide_agent_state_v1',
  games: 'gsa_tracked_games_v1',
  psnId: 'gsa_psn_id_v1',
  newsPulse: 'gsa_news_pulse_v1',
  voiceAutoRead: 'gsa_voice_autoread_v1',
  voicePreset: 'gsa_voice_preset_v1',
};

function loadStored<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function loadBossGuides(): BossGuide[] {
  const stored = loadStored<BossGuide[]>(STORAGE_KEYS.bosses, SEED_BOSS_GUIDES);
  const removedIds = new Set(loadStored<string[]>(STORAGE_KEYS.removedBosses, []));
  const seedMap = new Map(SEED_BOSS_GUIDES.map((s) => [s.id, s]));

  const merged = stored
    .filter((guide) => !removedIds.has(guide.id))
    .map((guide) => {
      const seed = seedMap.get(guide.id);
      if (!seed || guide.isCustom) return guide;
      return {
        ...seed,
        ...guide,
        imageUrl: seed.imageUrl ?? guide.imageUrl,
        arenaLocation: seed.arenaLocation ?? guide.arenaLocation,
        weaknesses: seed.weaknesses ?? guide.weaknesses,
      };
    });

  const existingIds = new Set(merged.map((g) => g.id));
  const missingSeeds = SEED_BOSS_GUIDES.filter(
    (s) => !existingIds.has(s.id) && !removedIds.has(s.id)
  );
  return missingSeeds.length > 0 ? [...merged, ...missingSeeds] : merged;
}

function loadChatSessions(): ChatSession[] {
  const storedSessions = loadStored<ChatSession[] | null>(STORAGE_KEYS.chatSessions, null);
  if (Array.isArray(storedSessions) && storedSessions.length > 0) {
    return storedSessions.map((session) => ({
      ...session,
      topicFocus: session.topicFocus || 'All Topics',
      messages:
        Array.isArray(session.messages) && session.messages.length > 0
          ? session.messages
          : SEED_WELCOME_MESSAGES,
    }));
  }

  const legacyMessages = loadStored<ChatMessage[]>(STORAGE_KEYS.chat, SEED_WELCOME_MESSAGES).map(
    (msg) =>
      msg.id === 'welcome-1' && msg.content.startsWith('Game Subject Agent ready.')
        ? { ...msg, content: SEED_WELCOME_MESSAGES[0].content }
        : msg
  );

  return migrateLegacyChatMessages(legacyMessages, SEED_WELCOME_MESSAGES);
}

function loadGameGuides(): GameGuide[] {
  const stored = loadStored<GameGuide[]>(STORAGE_KEYS.guides, SEED_GAME_GUIDES);
  const removedIds = new Set(loadStored<string[]>(STORAGE_KEYS.removedGuides, []));
  const seedMap = new Map(SEED_GAME_GUIDES.map((s) => [s.id, s]));

  const merged = stored
    .filter((guide) => !removedIds.has(guide.id))
    .map((guide) => {
      const seed = seedMap.get(guide.id);
      if (!seed || guide.isCustom) return guide;
      const completedMap = new Map(guide.steps.map((st) => [st.id, Boolean(st.completed)]));
      return {
        ...seed,
        bookmarked: guide.bookmarked ?? seed.bookmarked,
        updatedAt: guide.updatedAt || seed.updatedAt,
        steps: seed.steps.map((st) => ({
          ...st,
          completed: completedMap.get(st.id) ?? Boolean(st.completed),
        })),
      };
    });

  const existingIds = new Set(merged.map((g) => g.id));
  const missingSeeds = SEED_GAME_GUIDES.filter(
    (s) => !existingIds.has(s.id) && !removedIds.has(s.id)
  );
  return missingSeeds.length > 0 ? [...merged, ...missingSeeds] : merged;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('chat');
  const [selectedBossId, setSelectedBossId] = useState<string | null>(null);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(loadChatSessions);
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const savedId = loadStored<string>(STORAGE_KEYS.activeChatId, '');
    return savedId;
  });
  const [bossGuides, setBossGuides] = useState<BossGuide[]>(loadBossGuides);
  const [removedBossIds, setRemovedBossIds] = useState<string[]>(() =>
    loadStored<string[]>(STORAGE_KEYS.removedBosses, [])
  );
  const [bossCoachState, setBossCoachState] = useState<BossCoachSessionState>(() =>
    loadStored<BossCoachSessionState>(STORAGE_KEYS.bossCoach, createDefaultBossCoachState())
  );
  const [gameGuides, setGameGuides] = useState<GameGuide[]>(loadGameGuides);
  const [removedGuideIds, setRemovedGuideIds] = useState<string[]>(() =>
    loadStored<string[]>(STORAGE_KEYS.removedGuides, [])
  );
  const [guideAgentState, setGuideAgentState] = useState<GuideAgentSessionState>(() =>
    loadStored<GuideAgentSessionState>(STORAGE_KEYS.guideAgent, createDefaultGuideAgentState())
  );
  const [trackedGames, setTrackedGames] = useState<TrackedGame[]>(() =>
    loadStored(STORAGE_KEYS.games, SEED_TRACKED_GAMES)
  );
  const [linkedPsnId, setLinkedPsnId] = useState<string>(() =>
    loadStored<string>(STORAGE_KEYS.psnId, '')
  );
  const [newsPulse, setNewsPulse] = useState<GamingNewsPulse | null>(() =>
    loadStored<GamingNewsPulse | null>(STORAGE_KEYS.newsPulse, null)
  );
  const [autoReadVoice, setAutoReadVoice] = useState<boolean>(() =>
    loadStored<boolean>(STORAGE_KEYS.voiceAutoRead, false)
  );
  const [voicePreset, setVoicePreset] = useState<VoicePresetId>(() =>
    normalizeVoiceName(loadStored<string>(STORAGE_KEYS.voicePreset, DEFAULT_VOICE_PRESET))
  );
  const [isChatLoading, setIsChatLoading] = useState(false);

  const voicePlayer = useVoicePlayer();

  const activeSession = useMemo(() => {
    return chatSessions.find((s) => s.id === activeSessionId) ?? chatSessions[0];
  }, [activeSessionId, chatSessions]);

  useEffect(() => {
    if (activeSession && activeSession.id !== activeSessionId) {
      setActiveSessionId(activeSession.id);
    }
  }, [activeSession, activeSessionId]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.psnId, JSON.stringify(linkedPsnId));
    } catch {
      // Ignore storage quota errors
    }
  }, [linkedPsnId]);

  useEffect(() => {
    try {
      if (newsPulse) {
        window.localStorage.setItem(STORAGE_KEYS.newsPulse, JSON.stringify(newsPulse));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [newsPulse]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.voiceAutoRead, JSON.stringify(autoReadVoice));
    } catch {
      // Ignore storage quota errors
    }
  }, [autoReadVoice]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.voicePreset, JSON.stringify(voicePreset));
    } catch {
      // Ignore storage quota errors
    }
  }, [voicePreset]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.chatSessions, JSON.stringify(chatSessions));
    } catch {
      // Ignore storage quota errors
    }
  }, [chatSessions]);

  useEffect(() => {
    try {
      if (activeSession?.id) {
        window.localStorage.setItem(STORAGE_KEYS.activeChatId, JSON.stringify(activeSession.id));
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [activeSession?.id]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.bosses, JSON.stringify(bossGuides));
    } catch {
      // Ignore storage quota errors
    }
  }, [bossGuides]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        STORAGE_KEYS.removedBosses,
        JSON.stringify(removedBossIds)
      );
    } catch {
      // Ignore storage quota errors
    }
  }, [removedBossIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.bossCoach, JSON.stringify(bossCoachState));
    } catch {
      // Ignore storage quota errors
    }
  }, [bossCoachState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.guides, JSON.stringify(gameGuides));
    } catch {
      // Ignore storage quota errors
    }
  }, [gameGuides]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.removedGuides, JSON.stringify(removedGuideIds));
    } catch {
      // Ignore storage quota errors
    }
  }, [removedGuideIds]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.guideAgent, JSON.stringify(guideAgentState));
    } catch {
      // Ignore storage quota errors
    }
  }, [guideAgentState]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.games, JSON.stringify(trackedGames));
    } catch {
      // Ignore storage quota errors
    }
  }, [trackedGames]);

  const savedBossIds = useMemo(
    () => new Set(bossGuides.map((g) => g.id)),
    [bossGuides]
  );

  const handleSendMessage = async (prompt: string) => {
    const targetSession = activeSession;
    if (!targetSession) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: prompt,
      kind: 'general_gaming',
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...targetSession.messages, userMsg];
    setChatSessions((prev) =>
      appendMessagesToSession(prev, targetSession.id, [userMsg])
    );
    setIsChatLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          topicFocus: targetSession.topicFocus,
          history: nextHistory.slice(-6).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const errMsg: ChatMessage = {
          id: `err-${Date.now()}`,
          role: 'agent',
          content: data.error || 'Unable to reach RADAHN right now.',
          kind: 'error',
          timestamp: new Date().toISOString(),
        };
        setChatSessions((prev) =>
          appendMessagesToSession(prev, targetSession.id, [errMsg])
        );
        return;
      }

      const agentMsgId = `agent-${Date.now()}`;
      const agentMsg: ChatMessage = {
        id: agentMsgId,
        role: 'agent',
        content: data.text,
        kind: data.kind || 'general_gaming',
        bossGuide: data.bossGuide,
        timestamp: new Date().toISOString(),
      };
      setChatSessions((prev) =>
        appendMessagesToSession(prev, targetSession.id, [agentMsg])
      );

      if (autoReadVoice && data.text) {
        void voicePlayer.playText(agentMsgId, data.text, voicePreset);
      }
    } catch {
      const netErrMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'agent',
        content: 'Network connection failed. Check your connection and try again.',
        kind: 'error',
        timestamp: new Date().toISOString(),
      };
      setChatSessions((prev) =>
        appendMessagesToSession(prev, targetSession.id, [netErrMsg])
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleNewConversation = () => {
    const fresh = createChatSession(SEED_WELCOME_MESSAGES, 'All Topics');
    setChatSessions((prev) => [fresh, ...prev]);
    setActiveSessionId(fresh.id);
  };

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
  };

  const handleDeleteSession = (sessionId: string) => {
    setChatSessions((prev) => {
      const result = deleteChatSession(prev, sessionId, SEED_WELCOME_MESSAGES);
      if (activeSession?.id === sessionId) {
        setActiveSessionId(result.nextActiveId);
      }
      return result.sessions;
    });
  };

  const handleTogglePinSession = (sessionId: string) => {
    setChatSessions((prev) => toggleSessionPin(prev, sessionId));
  };

  const handleRenameSession = (sessionId: string, nextTitle: string) => {
    setChatSessions((prev) => renameChatSession(prev, sessionId, nextTitle));
  };

  const handleClearActiveChat = () => {
    if (!activeSession) return;
    setChatSessions((prev) =>
      prev.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              title: 'New Conversation',
              messages: SEED_WELCOME_MESSAGES,
              updatedAt: new Date().toISOString(),
            }
          : session
      )
    );
  };

  const handleAddOrSaveBossGuide = (guide: BossGuide) => {
    setRemovedBossIds((prev) => prev.filter((id) => id !== guide.id));
    setBossGuides((prev) => {
      if (prev.some((g) => g.id === guide.id)) return prev;
      return [guide, ...prev];
    });
  };

  const handleUpdateBossGuide = (updated: BossGuide) => {
    setBossGuides((prev) =>
      prev.map((g) => (g.id === updated.id ? updated : g))
    );
  };

  const handleRemoveBossGuide = (bossId: string) => {
    setBossGuides((prev) => removeBossGuide(prev, bossId));
    if (SEED_BOSS_GUIDES.some((s) => s.id === bossId)) {
      setRemovedBossIds((prev) => (prev.includes(bossId) ? prev : [...prev, bossId]));
    }
    if (selectedBossId === bossId) {
      setSelectedBossId(null);
    }
  };

  const handleOpenBossGuideFromChat = (bossId: string) => {
    setSelectedBossId(bossId);
    setActiveTab('boss-hub');
  };

  const handleToggleItem = (gameId: string, itemId: string) => {
    setTrackedGames((prev) => toggleGameItem(prev, gameId, itemId));
  };

  const handleAdjustHours = (gameId: string, delta: number) => {
    setTrackedGames((prev) => addGameHours(prev, gameId, delta));
  };

  const handleReplaceGameItems = (
    gameId: string,
    items: MilestoneItem[],
    psnProfilesUrl?: string
  ) => {
    setTrackedGames((prev) =>
      prev.map((g) => {
        if (g.id !== gameId) return g;
        const completedTitleSet = new Set(
          g.items.filter((it) => it.completed).map((it) => it.title.toLowerCase())
        );
        const mergedItems = items.map((it) => ({
          ...it,
          completed: completedTitleSet.has(it.title.toLowerCase()) ? true : it.completed,
        }));
        return {
          ...g,
          psnProfilesUrl: psnProfilesUrl ?? g.psnProfilesUrl,
          items: mergedItems,
          lastUpdated: new Date().toISOString(),
        };
      })
    );
  };

  const handleAddGame = (game: TrackedGame) => {
    setTrackedGames((prev) => [game, ...prev]);
  };

  const handleRemoveGame = (gameId: string) => {
    setTrackedGames((prev) => removeTrackedGame(prev, gameId));
  };

  const handleAddGuide = (guide: GameGuide) => {
    setRemovedGuideIds((prev) => prev.filter((id) => id !== guide.id));
    setGameGuides((prev) => [guide, ...prev.filter((g) => g.id !== guide.id)]);
  };

  const handleToggleGuideStep = (guideId: string, stepId: string) => {
    setGameGuides((prev) => toggleGuideStep(prev, guideId, stepId));
  };

  const handleToggleGuideBookmark = (guideId: string) => {
    setGameGuides((prev) => toggleGuideBookmark(prev, guideId));
  };

  const handleRemoveGuide = (guideId: string) => {
    setGameGuides((prev) => removeGameGuide(prev, guideId));
    if (SEED_GAME_GUIDES.some((s) => s.id === guideId)) {
      setRemovedGuideIds((prev) => (prev.includes(guideId) ? prev : [...prev, guideId]));
    }
  };

  const sectionTitle =
    activeTab === 'chat'
      ? 'Chat Assistant'
      : activeTab === 'boss-hub'
      ? 'Boss & Build Hub'
      : activeTab === 'guides'
      ? 'Game Guides'
      : activeTab === 'news'
      ? 'Gaming News'
      : 'Progress Tracker';

  return (
    <div className="min-h-dvh bg-[#090B10] text-slate-100">
      <TopAppBar activeSectionTitle={sectionTitle} />

      <main className="w-full">
        {activeTab === 'chat' && activeSession && (
          <ChatAssistantView
            sessions={chatSessions}
            activeSession={activeSession}
            onSelectSession={handleSelectSession}
            onNewConversation={handleNewConversation}
            onDeleteSession={handleDeleteSession}
            onTogglePinSession={handleTogglePinSession}
            onRenameSession={handleRenameSession}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearActiveChat}
            onSaveBossGuide={handleAddOrSaveBossGuide}
            savedBossIds={savedBossIds}
            bossGuides={bossGuides}
            onOpenBossGuide={handleOpenBossGuideFromChat}
            isLoading={isChatLoading}
            autoReadVoice={autoReadVoice}
            onToggleAutoReadVoice={() => setAutoReadVoice((prev) => !prev)}
            voicePreset={voicePreset}
            onChangeVoicePreset={setVoicePreset}
            playingVoiceId={voicePlayer.playingId}
            loadingVoiceId={voicePlayer.loadingId}
            voiceError={voicePlayer.voiceError}
            onSpeakText={(id, text) => voicePlayer.playText(id, text, voicePreset)}
            onClearVoiceError={voicePlayer.clearError}
          />
        )}

        {activeTab === 'boss-hub' && (
          <BossBuildHubView
            guides={bossGuides}
            onAddBossGuide={handleAddOrSaveBossGuide}
            onUpdateBossGuide={handleUpdateBossGuide}
            onRemoveBossGuide={handleRemoveBossGuide}
            coachState={bossCoachState}
            onUpdateCoachState={setBossCoachState}
            selectedBossId={selectedBossId}
            onClearSelectedBossId={() => setSelectedBossId(null)}
            playingVoiceId={voicePlayer.playingId}
            loadingVoiceId={voicePlayer.loadingId}
            voiceError={voicePlayer.voiceError}
            onSpeakText={(id, text) => voicePlayer.playText(id, text, voicePreset)}
            onClearVoiceError={voicePlayer.clearError}
          />
        )}

        {activeTab === 'guides' && (
          <GuidesView
            guides={gameGuides}
            onAddGuide={handleAddGuide}
            onToggleStep={handleToggleGuideStep}
            onToggleBookmark={handleToggleGuideBookmark}
            onRemoveGuide={handleRemoveGuide}
            agentState={guideAgentState}
            onUpdateAgentState={setGuideAgentState}
            playingVoiceId={voicePlayer.playingId}
            loadingVoiceId={voicePlayer.loadingId}
            voiceError={voicePlayer.voiceError}
            onSpeakText={(id, text) => voicePlayer.playText(id, text, voicePreset)}
            onClearVoiceError={voicePlayer.clearError}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressTrackerView
            games={trackedGames}
            linkedPsnId={linkedPsnId}
            onSavePsnId={setLinkedPsnId}
            onClearPsnId={() => setLinkedPsnId('')}
            onToggleItem={handleToggleItem}
            onAdjustHours={handleAdjustHours}
            onReplaceGameItems={handleReplaceGameItems}
            onAddGame={handleAddGame}
            onRemoveGame={handleRemoveGame}
          />
        )}

        {activeTab === 'news' && (
          <GamingNewsView
            cachedPulse={newsPulse}
            onSavePulse={setNewsPulse}
            playingVoiceId={voicePlayer.playingId}
            loadingVoiceId={voicePlayer.loadingId}
            onSpeakText={(id, text) => voicePlayer.playText(id, text, voicePreset)}
          />
        )}
      </main>

      <OfflineIndicator />

      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        bossCount={bossGuides.length}
        guidesCount={gameGuides.length}
        gamesCount={trackedGames.length}
      />
    </div>
  );
}
