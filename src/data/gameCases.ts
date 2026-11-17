import type { GameCaseDossier } from '../types/gaming';

export const GAME_CASE_DOSSIERS: GameCaseDossier[] = [
  {
    gameTitle: 'Elden Ring',
    genre: 'Action RPG',
    platforms: 'PS5 · Xbox Series X|S · PC',
    coreCombatLoop:
      'Break boss stance via charged R2s, jumping heavies, and weapon skills while stacking Frostbite (20% defense debuff) or Hemorrhage.',
    keyMechanics: [
      'Scadutree Blessing scaling in Shadow of the Erdtree directly multiplies damage output and negation.',
      'Freezing Pots and stance-breaking Ashes of War (Lion’s Claw, Square Off, Impaling Thrust) interrupt lethal boss startups.',
      'Golden Vow + Flame, Grant Me Strength or Lord’s Divine Fortification cover offensive and elemental survival caps.',
    ],
    recommendedEndgameLoadout:
      'Dragoncrest Greatshield Talisman + Shard of Alexander + Opaline Hardtear (60 Vigor baseline).',
    elementalOrStaggerNotes:
      'Frostbite resets on Fire damage; Bleed scales with Arcane on Blood/Occult infusions.',
  },
  {
    gameTitle: 'Horizon Forbidden West',
    genre: 'Action RPG',
    platforms: 'PS5 · PS4 · PC',
    coreCombatLoop:
      'Focus-scan weak spots, apply Brittle (Frost) for +200% impact damage, tear off heavy plasma/spark components, and burst with Valor Surges.',
    keyMechanics: [
      'Brittle (Frost) removes armor penalties on impact hits—chain Sustained Burst Boltgnaster or Powershot Sharpshot hits immediately.',
      'Tear Precision Arrows strip machine cannons and armor plates cleanly before heavy DPS phases.',
      'Slide-dodging grants extended i-frames and triggers instant Hunter Bow Concentration draw speed.',
    ],
    recommendedEndgameLoadout:
      'Nora Thunder Warrior / Tenakth Vanquisher + Death-Seeker’s Shadow + The Sun Scourge + Forgefall.',
    elementalOrStaggerNotes:
      'Apex Slaughterspines resist Shock and Plasma; use Frost/Purgewater or Corrosive Acid against Zenith Specters.',
  },
  {
    gameTitle: 'God of War Ragnarök',
    genre: 'Action Adventure',
    platforms: 'PS5 · PS4 · PC',
    coreCombatLoop:
      'Chain Leviathan Axe Frost, Blades of Chaos Burn, and Draupnir Spear detonations while parrying yellow rings and shield-striking blue rings.',
    keyMechanics: [
      'Double-tap L1 breaks blue-ring attacks; Dauntless Shield parries refund massive stun and stagger.',
      'Pressing Triangle activates Frost Awaken / Flame Whiplash or detonates embedded Draupnir Spears to interrupt boss charges.',
      'Companion Sonic Arrows break green shields while Sigil Arrows amplify Burn/Frost status buildup and spread explosions.',
    ],
    recommendedEndgameLoadout:
      'Berserker Cuirass + Lúnda’s/Vidar’s Waist & Wrist + Hilt of Skofnung + Seal of Runic Storm.',
    elementalOrStaggerNotes:
      'Remove Bifrost buildup quickly with Spartan Valor/Fury or clean dodges before taking a follow-up hit.',
  },
  {
    gameTitle: 'Hollow Knight: Silksong',
    genre: 'Metroidvania',
    platforms: 'PC · Switch · PlayStation · Xbox',
    coreCombatLoop:
      'Control spacing with Hornet’s diagonal aerial pogo and sprint dash, spend Silk on instant Bind healing, and layer Red/Blue Tools.',
    keyMechanics: [
      'Silk Bind heals rapidly in one burst rather than channeling slowly—execute immediately after dodging slow recovery slams.',
      'Crests reshape Hornet’s moveset: Reaper Crest restores downward pogoing and bonus Silk after Binding; Hunter Crest boosts speed.',
      'Red Tools (Straight Pin, Sting Shard floor traps) punish charging bosses while Blue Tools (Fractured Mask, Warding Bell) protect binds.',
    ],
    recommendedEndgameLoadout:
      'Reaper Crest + Sting Shard + Straight Pin + Warding Bell + Fractured Mask + Weavelight.',
    elementalOrStaggerNotes:
      'Watch guard stances on agile duelists like Lace—striking her raised needle triggers an instant parry riposte.',
  },
  {
    gameTitle: 'Ghost of Tsushima',
    genre: 'Action Adventure',
    platforms: 'PS5 · PS4 · PC',
    coreCombatLoop:
      'Match Jin’s Katana Stance to enemy archetypes, fish for Perfect Parries and Perfect Dodges, and dump Resolve into unblockable Mythic Arts.',
    keyMechanics: [
      'Stone Stance counters Swordsmen, Water Stance breaks Shieldmen, Wind Stance counters Spearmen, and Moon Stance breaks Brutes.',
      'Sarugami Armor disables standard parries in exchange for devastating 3-hit Perfect Parry counter-chains.',
      'Blue glints are parryable; red glints require sidestepping or jumping—follow immediately with Heavenly Strike or Dance of Wrath.',
    ],
    recommendedEndgameLoadout:
      'Sarugami / Gosaku’s Armor + Charm of Mizu-no-Kami + Charm of Inari’s Might + Charm of Versatile Skills.',
    elementalOrStaggerNotes:
      'Way of the Flame bypasses enemy guards and applies Burn chip damage during tight duel openings.',
  },
  {
    gameTitle: 'Black Myth: Wukong',
    genre: 'Action RPG',
    platforms: 'PS5 · PC · Xbox',
    coreCombatLoop:
      'Build Focus Points via light combos and Perfect Dodges, weave See-Through Resolute Strikes mid-combo, and break shields with Vessels.',
    keyMechanics: [
      'Resolute Strike (Heavy input mid-Light combo) grants brief invulnerability and staggers bosses out of multi-hit strings.',
      'Vessels like the Plantain Fan strip golden posture shields automatically over several seconds.',
      'Cloud Step lets you reposition, charge a 3-4 Focus Heavy Smash safely, and land huge crit bursts.',
    ],
    recommendedEndgameLoadout:
      'Golden Embroidered Armor (Qi regen) + Jingubang / Tri-Point Double-Edged Spear + Plantain Fan + Apramana Bat.',
    elementalOrStaggerNotes:
      'Use Spell Binder for pure raw crit/attack scaling once a boss phase becomes resistant to Immobilize.',
  },
  {
    gameTitle: 'Sekiro: Shadows Die Twice',
    genre: 'Action Adventure',
    platforms: 'PS4 · Xbox One · PC',
    coreCombatLoop:
      'Maintain relentless sword-lock pressure, deflect to build Posture damage instead of chasing HP, and counter Perilous kanji decisively.',
    keyMechanics: [
      'Mikiri Counter (forward circle/B) deals massive posture damage to Perilous Thrusts; Jump-kick punishes Perilous Sweeps.',
      'Bosses recover Posture slower when their vitality drops below 75%—chip early HP with Mortal Draw or Double Ichimonji.',
      'Suzaku’s Lotus Umbrella safely deflects multi-hit weapon arts and converts blocked hits into Projected Force counters.',
    ],
    recommendedEndgameLoadout:
      'Kusabimaru + Mortal Draw / Ichimonji Double + Suzaku’s Lotus Umbrella + Ako’s/Gokan’s Sugar.',
    elementalOrStaggerNotes:
      'Catch Lightning mid-air (Jump + L1 block, then R1 before landing) for huge vitality shock and free posture openings.',
  },
  {
    gameTitle: 'Hollow Knight',
    genre: 'Metroidvania',
    platforms: 'PC · Switch · PS4 · Xbox',
    coreCombatLoop:
      'Read boss audio/visual telegraphs, stay centered, weave Nail slashes with Abyss Shriek/Descending Dark, and heal strictly in stagger windows.',
    keyMechanics: [
      'Descending Dark grants generous invulnerability frames to escape corner traps or overlapping hazards.',
      'Shade Cloak Shadow Dash refreshes every ~1.5 seconds—save it for wide horizontal sweeps.',
      'Quick Slash + Unbreakable Strength + Shaman Stone delivers top hybrid Nail + Spell DPS.',
    ],
    recommendedEndgameLoadout:
      'Pure Nail + Unbreakable Strength + Quick Slash + Shaman Stone + Mark of Pride / Sharp Shadow.',
    elementalOrStaggerNotes:
      'Upward Abyss Shriek deals massive multi-hit spell burst whenever a boss hovers overhead.',
  },
  {
    gameTitle: 'Monster Hunter World: Iceborne',
    genre: 'Action RPG',
    platforms: 'PS4 · Xbox One · PC',
    coreCombatLoop:
      'Keep key hitzones tenderized with Clutch Claw, open hunts with Wall-Bang flinch shots, and break horns/parts to weaken endgame novas.',
    keyMechanics: [
      'Heavy Artillery Lv2 doubles damage on Castle Schrade’s Roaming Ballista and cannons for scripted topples.',
      'Evade Window Lv3–5 turns lethal breath sweeps and tail slams into clean roll-through punish windows.',
      'Max Potion crafting via Radial Menu gives near-instant full heals without slow Mega Potion chugging.',
    ],
    recommendedEndgameLoadout:
      'Alatreon / Fatalis Weapon + Partbreaker Lv3 + Weakness Exploit Lv3 + Divine Blessing Lv5 + Health Augment.',
    elementalOrStaggerNotes:
      'Breaking Fatalis’s head twice before Phase 3 lowers its blue flame lethality significantly.',
  },
  {
    gameTitle: 'God of War (2018)',
    genre: 'Action Adventure',
    platforms: 'PS4 · PS5 · PC',
    coreCombatLoop:
      'Interrupt Valkyrie aerial attacks with Leviathan Axe throws, chain Realm Shift slow-motion with Runic cooldown bursts.',
    keyMechanics: [
      'Watch Valkyrie dash direction: dashing to your right cues an unblockable thrust; dashing left cues a blockable wing combo.',
      'Tap D-pad Down for instant 180-degree turns if a boss leaps behind you.',
      'Use Spartan Rage as an emergency stagger cancel or quick health recovery.',
    ],
    recommendedEndgameLoadout:
      'Ivaldi’s Deadly Mist / Sindri’s Royal Chest + Talisman of the Realms + Amulet of Kvasir+.',
    elementalOrStaggerNotes:
      'Wait half a beat on the "Valhalla!" shout before single-tapping X evade rather than double-rolling.',
  },
];

export const GAME_CASE_MAP: Record<string, GameCaseDossier> = Object.fromEntries(
  GAME_CASE_DOSSIERS.map((entry) => [entry.gameTitle, entry])
);
