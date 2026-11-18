import type { GameGuide } from '../types/gaming';

export const SEED_GAME_GUIDES: GameGuide[] = [
  {
    id: 'elden-ring-scadutree-route',
    title: 'Shadow of the Erdtree: Early Scadutree Blessing Route (+8)',
    gameTitle: 'Elden Ring',
    category: 'Secrets & Collectibles',
    difficulty: 'Intermediate',
    estimatedMinutes: 20,
    summary:
      'Collect 16 early Scadutree Fragments across Gravesite Plain and Scadu Altus without fighting a single major remembrance boss, pushing your Shadow Realm Blessing to +8 before Castle Ensis or Belurat.',
    prerequisites: [
      'Defeat Starscourge Radahn and Mohg, Lord of Blood to enter the Realm of Shadow.',
      'Unlock Torrent immediately upon arriving at Gravesite Plain.',
    ],
    missableWarnings: [
      'Do NOT approach the main gate of Shadow Keep until you finish early NPC dialogues with Hornsent, Freyja, and Moore—crossing the seal triggers Miquella’s Great Rune shattering.',
    ],
    steps: [
      {
        id: 'er-step-1',
        stepNumber: 1,
        title: 'Church of Consolation (2 Fragments)',
        detail:
          'Ride southeast from the Scorched Ruins Site of Grace past the graveyard and grab two Scadutree Fragments directly in front of the Marika statue inside the ruined church.',
        location: 'Southeast Gravesite Plain',
        completed: false,
      },
      {
        id: 'er-step-2',
        stepNumber: 2,
        title: 'Three-Path Cross & Main Gate Cross (2 Fragments)',
        detail:
          'Pick up the fragment next to Freyja and Hornsent at Three-Path Cross, then follow the road northwest toward Belurat to grab the Main Gate Cross fragment.',
        location: 'Three-Path Cross / Belurat Outer Gate',
        completed: false,
      },
      {
        id: 'er-step-3',
        stepNumber: 3,
        title: 'Castle Front & Pillar Path Waypoint (2 Fragments)',
        detail:
          'Ride east across the Ellac Greatbridge to Castle Front Site of Grace, then follow the south road to Pillar Path Cross for another fragment next to Thiollier.',
        location: 'Castle Front / Pillar Path Cross',
        completed: false,
      },
      {
        id: 'er-step-4',
        stepNumber: 4,
        title: 'Bypass Castle Ensis via Spiritspring to Scadu Altus (5 Fragments)',
        detail:
          'From Elder’s Hovel southeast of Castle Ensis, break the sealed Spiritspring cairn to launch straight up to Fort of Reprimand and loot the fragments at Highroad Cross, Moorth Ruins, and Crusade Insignia.',
        location: 'Fort of Reprimand & Scadu Altus',
        completed: false,
      },
      {
        id: 'er-step-5',
        stepNumber: 5,
        title: 'Shadow Keep Outer Pot Hollows & Church of the Crusade (5 Fragments)',
        detail:
          'Sweep the glowing Pot Shadows west of Moorth Ruins and enter the Church of the Crusade (watch for Fire Knight Queelign invasion) for two final early fragments.',
        location: 'West Scadu Altus',
        completed: false,
      },
    ],
    proTips: [
      'Scadutree Blessings grant ~40–50% total attack and damage negation scaling by +8, making Rellana and Divine Beast Dancing Lion dramatically more forgiving.',
      'Equip the Opaline Hardtear and Dragoncrest Greatshield Talisman while riding past high-damage Furnace Golems.',
    ],
    bookmarked: true,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'hollow-knight-112-roadmap',
    title: '112% Completion & True Ending Roadmap',
    gameTitle: 'Hollow Knight',
    category: 'Trophy Roadmap',
    difficulty: 'Advanced',
    estimatedMinutes: 35,
    summary:
      'Structured route from mid-game Dream Nail upgrades through 1,800 Essence, White Palace, Void Heart, and Pantheon preparation without locking yourself out of early endings.',
    prerequisites: [
      'Obtain Mantis Claw, Crystal Heart, Monarch Wings, and Shade Cloak.',
      'Awaken the Dream Nail by gathering 1,800 Essence from Warrior Dreams and Dream Bosses.',
    ],
    missableWarnings: [
      'Once you obtain Void Heart, the basic ending ("The Hollow Knight") is permanently replaced. Defeat the Hollow Knight at least once BEFORE picking up Void Heart if you want all ending achievements in one save.',
    ],
    steps: [
      {
        id: 'hk-step-1',
        stepNumber: 1,
        title: 'Clear the Basic Ending First',
        detail:
          'Enter the Black Egg Temple after defeating all three Dreamers while still wearing Kingsoul (or before transforming it) to unlock the first ending.',
        location: 'Black Egg Temple, Forgotten Crossroads',
        completed: false,
      },
      {
        id: 'hk-step-2',
        stepNumber: 2,
        title: 'Gather Both Halves of Kingsoul',
        detail:
          'Defeat Traitor Lord in Queen’s Gardens for the White Lady half, then reach 1,800 Essence and strike the Kingsmould corpse in Ancient Basin to clear White Palace.',
        location: 'Queen’s Gardens & White Palace',
        completed: false,
      },
      {
        id: 'hk-step-3',
        stepNumber: 3,
        title: 'Transform Kingsoul into Void Heart',
        detail:
          'Equip Kingsoul and descend into the Birthplace at the bottom of the Abyss. Dream Nail your reflection at the end of the climb.',
        location: 'The Abyss (Birthplace)',
        completed: false,
      },
      {
        id: 'hk-step-4',
        stepNumber: 4,
        title: 'Finish Colosseum Trials & Grimm Troupe for 112%',
        detail:
          'Complete Trial of the Fool (1%), collect all 40 charms, max out Soul Vessels/Masks, and finish either NKG or Banishment (both count equally for 1%).',
        location: 'Kingdom’s Edge & Dirtmouth',
        completed: false,
      },
      {
        id: 'hk-step-5',
        stepNumber: 5,
        title: 'Clear Pantheons 1–4 in Godhome',
        detail:
          'Unlock Godseeker in Junk Pit, then defeat Pantheons of the Master, Artist, Sage, and Knight (4% total—Pantheon of Hallownest is 0% toward 112% but unlocks Embrace the Void).',
        location: 'Godhome, Royal Waterways',
        completed: false,
      },
    ],
    proTips: [
      'Equip Hiveblood + Grubsong + Deep Focus during White Palace so you never run out of Soul on sawblade platforming sections.',
      'Lost Kin, Failed Champion, and Soul Tyrant grant 1,100 Essence combined—making the 1,800 threshold fast to hit.',
    ],
    bookmarked: false,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'sekiro-deflection-posture-guide',
    title: 'Deflection Rhythm, Posture Control & Mikiri Mastery',
    gameTitle: 'Sekiro: Shadows Die Twice',
    category: 'Mechanics & Combat',
    difficulty: 'Beginner',
    estimatedMinutes: 15,
    summary:
      'Break the Dark Souls dodge-roll habit and master Sekiro’s posture engine—learn why aggression, crisp L1/LB timing, and perilous counters win fights in half the time.',
    prerequisites: [
      'Purchase Mikiri Counter (2 Skill Points) in the Shinobi Arts tree immediately.',
      'Unlock Ichimonji Double in Ashina Arts as soon as Tengu awards the Esoteric Text.',
    ],
    missableWarnings: [
      'Spamming the guard button shrinks your active deflect window from 12 frames down to 4 frames—always tap deliberately in rhythm with enemy swings.',
    ],
    steps: [
      {
        id: 'sek-step-1',
        stepNumber: 1,
        title: 'Listen for the Deflect Clash Pitch',
        detail:
          'Attack relentlessly until you hear a louder, higher-pitched clang and see bright orange sparks—that audio cue means the enemy just deflected you and is about to counterattack.',
        location: 'Combat Fundamentals',
        completed: false,
      },
      {
        id: 'sek-step-2',
        stepNumber: 2,
        title: 'Hold Block Between Exchanges to Recover Posture',
        detail:
          'Holding guard when not under active attack recovers your own posture bar nearly twice as fast as standing idle.',
        location: 'Any Boss Arena',
        completed: false,
      },
      {
        id: 'sek-step-3',
        stepNumber: 3,
        title: 'Read Perilous Kanji Animations (Thrust vs. Sweep)',
        detail:
          'Watch the enemy weapon, not the red kanji: glint near the hilt/hip means Thrust (press Dodge toward them for Mikiri); blade pulled horizontal to the side means Sweep (Jump + Jump again on their head).',
        location: 'Dilapidated Temple (Hanbei Training)',
        completed: false,
      },
      {
        id: 'sek-step-4',
        stepNumber: 4,
        title: 'Chip Vitality Down to 75% First',
        detail:
          'Enemies with full HP regenerate posture rapidly. Use Flame Vent, Firecrackers, or dodge-counters on slow overhead slams to lower HP to ~75% so posture damage sticks.',
        location: 'Early Bosses (Gyoubu / Genichiro)',
        completed: false,
      },
    ],
    proTips: [
      'Your posture NEVER breaks as long as you successfully deflect, even if your posture bar looks completely full.',
      'Ichimonji Double deals heavy posture damage to bosses while simultaneously wiping away your own posture buildup.',
    ],
    bookmarked: false,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'gow-ragnarok-berserkers-walkthrough',
    title: 'All 12 Berserker Gravestones & King Hrólf Endgame Guide',
    gameTitle: 'God of War Ragnarök',
    category: 'Story Walkthrough',
    difficulty: 'Intermediate',
    estimatedMinutes: 25,
    summary:
      'Optimal order for clearing every Berserker Soul gravestone from Power Level 5 to 9, including Realm Shift relic counters and dual/triple Berserker crowd control.',
    prerequisites: [
      'Complete "The Word of Fate" in Midgard to obtain the Inert Hilt of Skofnung.',
      'Reach at least Power Level 6 before attempting multi-Berserker gravestones.',
    ],
    missableWarnings: [
      'Do not attempt the King’s Grave in Midgard right away—King Hrólf Kraki only spawns after all 11 other Berserkers across the Nine Realms are defeated.',
    ],
    steps: [
      {
        id: 'gow-step-1',
        stepNumber: 1,
        title: 'Clear the 4 Entry-Level Solo Berserkers (Midgard, Svartalfheim, Alfheim)',
        detail:
          'Start with Fraekni the Zealous (Midgard), Hardrefill (Svartalfheim), and Beigadr the Feared (Svartalfheim) to upgrade your Hilt of Skofnung and unlock Lúnda’s or Steinbjörn’s armor.',
        location: 'Lake of Nine / Nidavellir Beach / Alberich Hollow',
        completed: false,
      },
      {
        id: 'gow-step-2',
        stepNumber: 2,
        title: 'Tackle Mid-Tier Duels & Niflheim (Level 6–7)',
        detail:
          'Defeat Hjalti the Stolid in Alfheim and Skjothendi the Unerring in Niflheim (bring Bifrost-clearing Rage or Dauntless Shield parries).',
        location: 'Forbidden Sands & Mist Fields',
        completed: false,
      },
      {
        id: 'gow-step-3',
        stepNumber: 3,
        title: 'Manage Multi-Boss Arenas in Alfheim & Vanaheim',
        detail:
          'Against Svipdagr & the Sisters of Illska (Alfheim) and Bodvar & Starolfr (Svartalfheim), keep both targets in camera view and focus down the melee aggressor first while Freya fires Sonic arrows at aerial casters.',
        location: 'The Barrens (Alfheim) & Jarnsmida Pitmines',
        completed: false,
      },
      {
        id: 'gow-step-4',
        stepNumber: 4,
        title: 'Shoot Down Air-Burst Rings with Spear or Axe Throws',
        detail:
          'Whenever any Berserker floats up to charge a yellow/red room-wide shockwave, immediately throw Draupnir Spear or Leviathan Axe to interrupt them for free stun buildup.',
        location: 'All Berserker Arenas',
        completed: false,
      },
      {
        id: 'gow-step-5',
        stepNumber: 5,
        title: 'Defeat King Hrólf Kraki at King’s Grave',
        detail:
          'Combine Hilt of Hofud (Realm Shift) with Valor or Fury Spartan Rage and Dauntless Shield—King Hrólf uses every Berserker’s signature moves sequentially.',
        location: 'King’s Grave, Midgard',
        completed: false,
      },
    ],
    proTips: [
      'Equip the Svartalfheim / Vanaheim Amulet Enchantment sets alongside Seal of Runic Storm for rapid Realm Shift burst windows.',
      'Activate Draupnir’s Elemental Siphon right after a parry to match or counter elemental shields.',
    ],
    bookmarked: false,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
  {
    id: 'bg3-act1-essentials-checklist',
    title: 'Act 1 Missables, Camp Upgrades & Optimal Quest Order',
    gameTitle: 'Baldur’s Gate 3',
    category: 'Beginner Essentials',
    difficulty: 'Beginner',
    estimatedMinutes: 18,
    summary:
      'Essential early-game checklist so you recruit all companions, rescue Waukeen’s Rest & the Emerald Grove cleanly, and avoid accidentally triggering Act 1 quest lockouts.',
    prerequisites: [
      'Long Rest frequently in Act 1—companion cutscenes queue up behind each other and only advance during camp rests.',
    ],
    missableWarnings: [
      'Entering the Mountain Pass (Rosymorn Monastery Trail) or taking the Grymforge elevator BEFORE resolving the Goblin Camp vs. Emerald Grove conflict automatically concludes the grove questline and kills the Tieflings.',
    ],
    steps: [
      {
        id: 'bg3-step-1',
        stepNumber: 1,
        title: 'Recruit All Six Core Origin Companions Before Leaving the Coast',
        detail:
          'Pick up Shadowheart, Astarion, Gale, and Lae’zel around the Ravaged Beach/Roadside Cliffs, then recruit Wyll inside Emerald Grove and Karlach across the Risen Road river.',
        location: 'Ravaged Beach / Emerald Grove / Risen Road',
        completed: false,
      },
      {
        id: 'bg3-step-2',
        stepNumber: 2,
        title: 'Unlock Withers in the Dank Crypt',
        detail:
          'Clear the overgrown ruins northeast of the Nautiloid crash site to bring Withers permanently to your camp for 100g respecs and companion resurrections.',
        location: 'Dank Crypt',
        completed: false,
      },
      {
        id: 'bg3-step-3',
        stepNumber: 3,
        title: 'Clear Waukeen’s Rest Before Walking Away',
        detail:
          'The moment you trigger the fire cutscene at Waukeen’s Rest, enter Turn-Based Mode or rescue Counsellor Florrick immediately—leaving the area after starting it causes the inn to burn down.',
        location: 'Waukeen’s Rest (Northwest)',
        completed: false,
      },
      {
        id: 'bg3-step-4',
        stepNumber: 4,
        title: 'Resolve the Goblin Camp at Level 4–5',
        detail:
          'Reach Level 4 via Blighted Village, Harpies, and Owlbear Cave before confronting Dror Ragzlin, Priestess Gut, and Minthara.',
        location: 'Shattered Sanctum',
        completed: false,
      },
    ],
    proTips: [
      'Right-click any consumable food and send it straight to Camp—Supplies weigh down inventory unnecessarily.',
      'Hold Alt (PC) / R3 (Console) constantly in new rooms to highlight interactive notes, keys, and hidden containers.',
    ],
    bookmarked: false,
    updatedAt: '2026-11-18T00:00:00.000Z',
  },
];
