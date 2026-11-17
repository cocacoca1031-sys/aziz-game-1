import type { BossGuide, ChatMessage, TrackedGame } from '../types/gaming';

export const SEED_BOSS_GUIDES: BossGuide[] = [
  {
    id: 'malenia-elden-ring',
    bossName: 'Malenia, Blade of Miquella',
    gameTitle: 'Elden Ring',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'Elphael, Brace of the Haligtree',
    weaknesses: ['Frostbite', 'Hemorrhage', 'Fire / Stance Break'],
    imageUrl: '/src/assets/images/boss_crimson_valkyrie_1794871669777.jpg',
    summary:
      'Relentless two-phase duelist who heals on every landed strike—even through blocked shields. Victory depends on breaking her low poise during recovery frames and neutralizing Waterfowl Dance.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Blade of Miquella',
        hpThreshold: '100% – 0% (First Bar)',
        attackPatterns: [
          'Triple Slash Flurry: Three rapid diagonal sweeps ending in either a delayed wide horizontal cleave or an instant double-spin.',
          'Waterfowl Dance: Rises mid-air at ~70% HP and below, unleashing three chained spherical blade storms with tight tracking.',
          'Thrust Lunge & Grab: Long-range forward pierce or telegraphed open-hand grab with brief audio cue.',
        ],
        safeWindows: [
          'Immediately after her overhead slam or final delayed horizontal cleave (1–2 jumping heavy attacks).',
          'During her passive walk spacing between combos—a single Freezing Pot interrupts Waterfowl Dance startup.',
          'Post-thrust recovery frames when dodging diagonally past her sword arm.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Goddess of Rot',
        hpThreshold: '100% – 0% (Second Bar)',
        attackPatterns: [
          'Scarlet Aeonia: Opens Phase 2 with an aerial dive slam followed by a lingering Scarlet Rot bloom.',
          'Phantom Clones: Hovers and sends 6 sequential spirit valkyries across the arena before diving herself.',
          'Winged Kick & Rot Slam: Aggressive gap closer chaining into an explosive Scarlet Rot puddle.',
        ],
        safeWindows: [
          '3-second window on the outer rim of Scarlet Aeonia while the petals dissipate (ideal for ranged skills or buffs).',
          'Directly after her ground slam following Phantom Clones—roll inward on the final thrust.',
          'Post-kick punish when she lands upright without extending into a combo.',
        ],
      },
    ],
    positioningTips: [
      'Maintain medium distance (~3–4 character lengths) after hitting 70% Phase 1 HP so you have space to sprint back on Waterfowl startup.',
      'Fight near the center of the Haligtree arena to avoid getting pinned against root walls during Phantom Clones.',
      'Unlock the camera briefly when sprinting away from Waterfowl Dance first flurry, then re-lock to dodge through the second.',
    ],
    dodgingTips: [
      'Waterfowl Dance close-range escape: Sprint away from flurry 1, roll INTO flurry 2, then walk or roll forward under flurry 3.',
      'Dodge forward-left (past her sword hand) on Triple Slash so the follow-up whiffs behind you.',
      'Roll straight backward twice against Scarlet Aeonia impact, then pause before re-engaging until the rot mist clears.',
    ],
    loadouts: [
      {
        playstyle: 'Frostbite Bleed (Optimal)',
        weapon: 'Nagakiba / Rivers of Blood + Cold Uchigatana',
        charmsOrRelics: [
          'Dragoncrest Greatshield Talisman',
          'Lord of Blood’s Exultation',
          'Shard of Alexander',
          'Green Turtle Talisman',
        ],
        skillsOrArts: ['Unsheathe or Corpse Piler', 'Chilling Mist (offhand)', 'Flame, Cleanse Me'],
        defensiveGear: ['Medium Weight Armor (51+ Poise)', 'Opaline Hardtear'],
        consumables: ['Freezing Pot (x3)', 'Preserving Boluses', 'Flask of Crimson Tears'],
        rationale:
          'Stacks Frostbite and Hemorrhage rapidly while Freezing Pots cancel Waterfowl Dance mid-air during startup frames.',
      },
      {
        playstyle: 'Stance-Break Heavy',
        weapon: 'Blasphemous Blade +10 / Giant-Crusher',
        charmsOrRelics: [
          'Axe Talisman',
          'Claw Talisman',
          'Ritual Shield Talisman',
          'Carian Filigreed Crest',
        ],
        skillsOrArts: ['Taker’s Flames', 'Lion’s Claw', 'Golden Vow'],
        defensiveGear: ['Bull-Goat Gauntlets + Knight Set', 'Stonebarb Cracked Tear'],
        consumables: ['Boiled Crab', 'Preserving Boluses'],
        rationale:
          'Knocks Malenia down repeatedly with Taker’s Flames and jumping heavy strikes, minimizing prolonged melee exchanges.',
      },
      {
        playstyle: 'Safe Sorcery / Ranged',
        weapon: 'Carian Regal Scepter +10 / Moonveil',
        charmsOrRelics: [
          'Graven-Mass Talisman',
          'Godfrey Icon',
          'Radagon Icon',
          'Dragoncrest Greatshield Talisman',
        ],
        skillsOrArts: ['Night Comet (un-dodged by AI)', 'Ranni’s Dark Moon', 'Bloodhound’s Step'],
        defensiveGear: ['Light Roll Load (<30% Equip)', 'Magic-Shrouding Cracked Tear'],
        consumables: ['Cerulean Hidden Tear', 'Freezing Pot'],
        rationale:
          'Night Comet bypasses Malenia’s input-reading side-step AI while Light Roll + Bloodhound’s Step ensures clean spacing.',
      },
    ],
  },
  {
    id: 'nightmare-king-grimm-hollow-knight',
    bossName: 'Nightmare King Grimm',
    gameTitle: 'Hollow Knight',
    genre: 'Metroidvania',
    difficulty: 'Extreme',
    arenaLocation: 'Dirtmouth Crimson Tent',
    weaknesses: ['Abyss Shriek Burst', 'Shadow Dash Counter'],
    imageUrl: '/src/assets/images/boss_hollow_sovereign_1794871670855.jpg',
    summary:
      'Double-damage rhythmic duel where every move has a clean telegraph and a dedicated counter-window. Never chase him—let each attack come to you.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Crimson Dance (100% – 75% HP)',
        hpThreshold: '100% – 75% HP',
        attackPatterns: [
          'Fire Bats: Fires 4 horizontal spiral bats at alternating heights.',
          'Dash Uppercut: Ground dash followed by an upward slash raining 5 fireballs.',
          'Flame Pillars: Teleports overhead and summons 4 sequential vertical flame geysers.',
        ],
        safeWindows: [
          'Jump over the lower Fire Bat, dash through the gap, and land 2–3 Nail slashes.',
          'Stutter-step toward the 4th Flame Pillar to charge Abyss Shriek directly beneath him.',
          'Heal 1 mask safely during the Pufferfish stagger transitions.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Escalated Tempo (75% – 0% HP)',
        hpThreshold: '75%, 50%, 25% Pufferfish + Faster Recovery',
        attackPatterns: [
          'Pufferfish Barrage: Anchors center-stage at 75%, 50%, and 25% HP, firing radial fireball rings.',
          'Dive Dash & Trail: Diagonal aerial dive leaving a burning ground trail.',
          'Cloak Spikes: Ground floor spikes erupt across the arena.',
        ],
        safeWindows: [
          'Pogo (down-slash) once on his head during Dive Dash before landing safely behind the trail.',
          'Quick Focus heal window during Cloak Spikes once you stand in a clear gap.',
          'Bat-form stagger phases allow up to 2–3 safe mask heals.',
        ],
      },
    ],
    positioningTips: [
      'Anchor near the center-third of the stage after every exchange so Cloak Spikes and Pufferfish patterns stay predictable.',
      'During Pufferfish Barrage, hug either far corner and perform small micro-hops over low-lane fireballs.',
    ],
    dodgingTips: [
      'Shadow Dash through Dash Uppercut and stand slightly beside the impact point—the falling embers miss cleanly.',
      'Walk steadily at a constant pace during Flame Pillars rather than dashing early, leaving room to double back.',
    ],
    loadouts: [
      {
        playstyle: 'Nail Rhythm DPS',
        weapon: 'Pure Nail',
        charmsOrRelics: ['Unbreakable Strength', 'Quick Slash', 'Mark of Pride', 'Sharp Shadow'],
        skillsOrArts: ['Abyss Shriek', 'Shade Soul', 'Descending Dark'],
        defensiveGear: ['Shade Cloak (Shadow Dash)', 'Monarch Wings'],
        consumables: ['Soul Vessel Reserve'],
        rationale:
          'Sharp Shadow deals passive nail damage on every Dash Uppercut evade while Mark of Pride keeps Dive Dash pogos effortless.',
      },
      {
        playstyle: 'Defensive Heal & Spell',
        weapon: 'Pure Nail',
        charmsOrRelics: ['Quick Focus', 'Shape of Unn', 'Shaman Stone', 'Grubsong'],
        skillsOrArts: ['Abyss Shriek', 'Descending Dark'],
        defensiveGear: ['Shade Cloak', '9 Masks'],
        consumables: ['Soul Reserve'],
        rationale:
          'Shape of Unn + Quick Focus lets you slide underneath Fire Bats while healing full masks mid-combat.',
      },
    ],
  },
  {
    id: 'isshin-sekiro',
    bossName: 'Isshin, the Sword Saint',
    gameTitle: 'Sekiro: Shadows Die Twice',
    genre: 'Action Adventure',
    difficulty: 'Nightmare',
    arenaLocation: 'Ashina Reservoir Silvergrass Field',
    weaknesses: ['Posture Deflects', 'Mikiri Counter', 'Lightning Reversal'],
    imageUrl: '/src/assets/images/boss_abyssal_colossus_1794871670403.jpg',
    summary:
      'The ultimate posture exam across four phases (including Genichiro). Hesitation slows posture recovery—stay in sword-lock range and deflect rhythmically.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Genichiro + Sword Saint Katana',
        hpThreshold: 'Phase 0 & Phase 1',
        attackPatterns: [
          'Ashina Cross: Sheathes blade with glint flash before rapid double draw.',
          'Dragon Flash / Ichimonji Double: Charged vertical shockwave or overhead crush.',
          '3-Hit Katana Combo into Thrust Perilous.',
        ],
        safeWindows: [
          'Mikiri Counter the perilous thrust after his shoulder-bump combo.',
          'Circle behind Ichimonji Double for a free Mortal Draw or 2 clean slashes.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Spear & Pistol Mastery',
        hpThreshold: 'Phase 2 & Phase 3 (Lightning)',
        attackPatterns: [
          '7-Hit Halberd-Sword Chain ending in guaranteed Mikiri-able thrust.',
          '4-Shot Semiautomatic Volley into leaping spear slam.',
          'Phase 3 Lightning Reversal arcs across the reed field.',
        ],
        safeWindows: [
          'Deflect the leaping spear slam (or Umbrella-counter) to interrupt follow-up pressure.',
          'Jump and R1 Lightning Reversal in Phase 3 for massive vitality + posture shock.',
        ],
      },
    ],
    positioningTips: [
      'Hold mid-close range in Phases 2 and 3; running far away triggers rapid pistol volleys and unpunished posture decay.',
      'Use tall grass clearing sightlines carefully—keep Isshin slightly uphill or level so perilous kanji stay visible.',
    ],
    dodgingTips: [
      'Deflect rather than dodge on 90% of swings; only step-dodge sideways on overhead Ichimonji or Dragon Flash windups.',
      'For Ashina Cross, step back slightly to bait his swipe or use Loaded Umbrella at the flash.',
    ],
    loadouts: [
      {
        playstyle: 'Posture Breaker (Balanced)',
        weapon: 'Kusabimaru + Mortal Blade',
        charmsOrRelics: ['Kuro’s Charm Retained', 'Shinobi Eyes', 'Ascending & Descending Carp'],
        skillsOrArts: ['Ichimonji: Double', 'Mortal Draw'],
        defensiveGear: ['Suzaku’s Lotus Umbrella', 'Mist Raven'],
        consumables: ['Gokan’s Sugar', 'Ako’s Sugar', 'Pellet', 'Divine Grass'],
        rationale:
          'Lotus Umbrella absorbs Dragon Flash and 7-hit spear finales cleanly, converting blocked energy into Projected Force posture damage.',
      },
      {
        playstyle: 'Aggressive Speed Kill',
        weapon: 'Kusabimaru',
        charmsOrRelics: ['Breath of Nature: Light', 'Projected Force'],
        skillsOrArts: ['Empowered Mortal Draw', 'High Monk'],
        defensiveGear: ['Firecrackers (Long Spark)', 'Loaded Shuriken'],
        consumables: ['Yashariku’s Sugar', 'Divine Confetti'],
        rationale:
          'High Monk punishes perilous sweeps for massive posture chunks while Firecrackers interrupt Spear transition startups.',
      },
    ],
  },
  {
    id: 'sigrun-god-of-war',
    bossName: 'Sigrun, Valkyrie Queen',
    gameTitle: 'God of War (2018)',
    genre: 'Action Adventure',
    difficulty: 'Hard',
    arenaLocation: 'Council of Valkyries, Midgard',
    weaknesses: ['Axe Throw Aerial Interrupt', 'Realm Shift Runics'],
    summary:
      'Combines every Valkyrie moveset with high health and lethal Valhalla stomps. Watch her wing movement direction before every dash.',
    phases: [
      {
        phaseNumber: 1,
        title: 'All-Valkyrie Arsenal',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Right-Wing vs Left-Wing Dash: Dash to her right signals unblockable stab; dash to her left signals blockable wing combo.',
          'Aerial Blinding Flash: Hovers and charges a room-wide stun flash.',
          'Scythe Spin & Feather Barrage.',
        ],
        safeWindows: [
          'Throw Leviathan Axe (or Atreus Shock Arrow) the instant she floats for the Blinding Flash.',
          'Block the spinning wing sweep and counter immediately with Light Runic into Heavy Runic.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Relentless Valhalla Chains',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Triple Valhalla Stomp: Delayed sky drop grab chained up to 3 times.',
          'Fire Trail Slam + Unblockable Shield Slam.',
        ],
        safeWindows: [
          'Evade (single X sidestep, NOT double-roll) on each Valhalla shout to stay poised for a full 4-hit counter.',
          'Use Spartan Rage purely as an emergency stun interrupt or health recovery tool.',
        ],
      },
    ],
    positioningTips: [
      'Keep Sigrun centered in front of the camera so wing-direction telegraphs never slip off-screen.',
      'Stay off the arena rim—you need space to sidestep right against her unblockable wing jab.',
    ],
    dodgingTips: [
      'Wait half a beat after the "Valhalla!" audio cue before tapping X once; double-rolling breaks rhythm on triple stomps.',
      'Hit Down on the D-pad for a quick 180-turn if you miss the axe throw on her aerial blind.',
    ],
    loadouts: [
      {
        playstyle: 'Runic Cooldown Burst',
        weapon: 'Leviathan Axe + Blades of Chaos',
        charmsOrRelics: [
          'Talisman of the Realms (Realm Shift)',
          'Amulet of Kvasir+',
          'Ivaldi’s Deadly Mist Set',
        ],
        skillsOrArts: [
          'Hel’s Touch (fast stagger)',
          'Blessings of the Frost',
          'Blast of Hephaestus',
          'Hyperion Grapple',
        ],
        defensiveGear: ['Sindri’s Royal Dwarven Chest (Runic Invulnerability)'],
        consumables: ['Berserker Resurrection Stone', 'Atreus Murder of Crows'],
        rationale:
          'High Runic + Cooldown lets you cycle fast-animation Runic attacks during Realm Shift slow-motion windows.',
      },
    ],
  },
  {
    id: 'radahn-consort-elden-ring',
    bossName: 'Promised Consort Radahn',
    gameTitle: 'Elden Ring',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'Gate of Divinity, Enir-Ilim',
    weaknesses: ['Scarlet Rot', 'Pierce Damage', 'Parry / Greatshield'],
    imageUrl: '/src/assets/images/boss_radahn_gravity_1794916706162.jpg',
    summary:
      'Relentless two-phase powerhouse combining twin-greatsword gravity combos with Phase 2 holy light afterimages. High Holy negation and shield-poke or parry rhythm win cleanly.',
    phases: [
      {
        phaseNumber: 1,
        title: 'General Radahn',
        hpThreshold: '100% – 66% HP',
        attackPatterns: [
          'Gravity Pull Slam: Pulls player inward before radial rock eruption.',
          'Cross-Slash Combo: Rapid left-right-cross twin greatsword cleave.',
        ],
        safeWindows: [
          'Roll left around his knee after the Cross-Slash finisher for 1 charged heavy or shield poke.',
          'Sprint backward out of Gravity Pull Slam, then jump-attack as rocks subside.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Consort of Miquella',
        hpThreshold: '66% – 0% HP',
        attackPatterns: [
          'Light of Miquella: Massive arena-wide holy orbital blast at phase transition.',
          'Phantom Dash Chains: 4-hit teleporting afterimage strikes ending in a ground slam.',
        ],
        safeWindows: [
          'Sprint straight backward immediately on Light of Miquella startup to clear the blast ring.',
          'Dodge forward-left into his real body on the final slam after Phantom Dash Chains.',
        ],
      },
    ],
    positioningTips: [
      'Hug his left leg (your right) during sword combos so Phase 2 vertical holy beams miss behind you.',
    ],
    dodgingTips: [
      'Avoid rolling backward in Phase 2—every swing spawns delayed holy beams directly in front of him.',
    ],
    loadouts: [
      {
        playstyle: 'Greatshield Antspur Poke (Safest)',
        weapon: 'Blood Antspur Rapier +25 + Fingerprint Stone Shield',
        charmsOrRelics: [
          'Golden Braid (Holy Negation)',
          'Dragoncrest Greatshield Talisman',
          'Greatshield Talisman',
          'Two-Headed Turtle Talisman',
        ],
        skillsOrArts: ['Seppuku / Blood Tax', 'Barricade Shield'],
        defensiveGear: ['Verdigris Armor Set', 'Opaline Hardtear'],
        consumables: ['Pickled Turtle Neck', 'Lord’s Divine Fortification'],
        rationale:
          'Stacks Scarlet Rot + Bleed safely behind maximum Holy & Guard Boost stability.',
      },
    ],
  },
  {
    id: 'fatalis-mhw-iceborne',
    bossName: 'Fatalis',
    gameTitle: 'Monster Hunter World: Iceborne',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'Castle Schrade',
    weaknesses: ['Dragon Element', 'Fireball Head Baits', 'Heavy Artillery'],
    summary:
      'Endgame Black Dragon encounter with a strict 30-minute timer. Breaking its horns twice prevents lethal Phase 3 blue-flame one-shots.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Castle Schrade Opening',
        hpThreshold: '100% – 75% HP',
        attackPatterns: [
          'Cone Fire Breath: Sweeping wide flame carpet with long stationary head window.',
          'Charged Fireball & Body Slam.',
        ],
        safeWindows: [
          'Bait Cone Breath at medium range, sprint in beside its neck, and punish the head.',
          'Use Heavy Artillery Roaming Ballista after Phase 1 barricade drop.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Blue Flame & Nova Thresholds',
        hpThreshold: '75% – 0% HP',
        attackPatterns: [
          '360 Spinning Flame Sweep & Triple Charged Fireballs.',
          'Arena Schrade Novas requiring Dragonator or Gate cover.',
        ],
        safeWindows: [
          'Clutch-claw tenderize chest/head after Triple Fireballs and trigger Dragonator at 35% HP.',
        ],
      },
    ],
    positioningTips: [
      'Stay just in front of its forelegs at mid-range to bait safe Cone Breath head openings.',
    ],
    dodgingTips: [
      'Superman-dive perpendicular to sweeping breath attacks when caught out of position.',
    ],
    loadouts: [
      {
        playstyle: 'Partbreaker Heavy Artillery',
        weapon: 'Alatreon / Lightbreak Switch Axe or Greatsword',
        charmsOrRelics: [
          'Heavy Artillery Lv2',
          'Partbreaker Lv3',
          'Evade Window Lv3',
          'Divine Blessing Lv5',
        ],
        skillsOrArts: ['Zero Sum Discharge (ZSD Head)', 'Weakness Exploit Lv3'],
        defensiveGear: ['Gold Rathian 2pc + Raging Brachy 3pc', 'Temporal + Rocksteady Mantle'],
        consumables: ['Max Potion + Craftables', 'Smoke Bombs (for Ballista)', 'Farcaster'],
        rationale:
          'Heavy Artillery doubles Roaming Ballista damage while Partbreaker secures double horn breaks before Phase 3.',
      },
    ],
  },
  {
    id: 'starscourge-radahn-elden-ring',
    bossName: 'Starscourge Radahn',
    gameTitle: 'Elden Ring',
    genre: 'Action RPG',
    difficulty: 'Hard',
    arenaLocation: 'Wailing Dunes, Caelid',
    weaknesses: ['Scarlet Rot', 'Hemorrhage', 'Frostbite'],
    imageUrl: '/src/assets/images/boss_radahn_gravity_1794916706162.jpg',
    summary:
      'Festival raid encounter across open desert dunes. Roll his opening Gravity Arrows using debris cover, summon festival allies, and evade his Phase 2 orbital meteor drop.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Dune Archer & Twin Greatswords',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Gravity Greatbow Snipes & Arrow Rain: Fires high-velocity violet bolts until you close distance.',
          'Sweeping Mounted Cleaves & Gravity Pull Slam.',
        ],
        safeWindows: [
          'Sprint between weapon piles and summon Blaidd, Alexander, and Therolina to draw aggro.',
          'Hug behind his horse Leonard during wide horizontal twin-blade sweeps.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Starscourge Meteor & Orbiting Spheres',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Crimson Meteor Crash: Launches into the sky and dives across the horizon like a comet.',
          'Four Gravity Meteors: Summons homing rock spheres that detonate on approach.',
        ],
        safeWindows: [
          'Sprint perpendicular on Torrent the moment the sky dims to avoid the meteor impact cleanly.',
          'Apply Rotten Breath once after he lands to tick Scarlet Rot across the rest of the fight.',
        ],
      },
    ],
    positioningTips: [
      'Stay close behind his rear right flank on foot; wide sweeps often sail over your head when hugging Leonard.',
      'Re-summon fallen festival NPCs at glowing golden signs scattered across the dune crests.',
    ],
    dodgingTips: [
      'Roll sideways through single Gravity Arrows rather than hiding behind Torrent.',
      'At 50% HP, dismount or dash perpendicularly down a dune slope until the meteor explosion finishes.',
    ],
    loadouts: [
      {
        playstyle: 'Scarlet Rot + Bleed Hybrid',
        weapon: 'Bloodhound’s Fang +3 / Uchigatana + Dragon Communion Seal',
        charmsOrRelics: [
          'Radagon’s Soreseal (early game)',
          'Green Turtle Talisman',
          'Claw Talisman',
        ],
        skillsOrArts: ['Rotten Breath', 'Bloodhound’s Finesse', 'Flame, Grant Me Strength'],
        defensiveGear: ['Knight / Carian Knight Armor', 'Opaline Bubbletear'],
        consumables: ['Preserving Boluses', 'Exalted Flesh', 'Flask of Crimson Tears'],
        rationale:
          'Two casts of Rotten Breath inflict Scarlet Rot that drains nearly half of Radahn’s HP while festival summons hold attention.',
      },
    ],
  },
  {
    id: 'apex-slaughterspine-hfw',
    bossName: 'Apex Slaughterspine',
    gameTitle: 'Horizon Forbidden West',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'San Francisco Coastal Ruins',
    weaknesses: ['Frost (Brittle +200%)', 'Purgewater (Drenched)', 'Acid'],
    imageUrl: '/src/assets/images/boss_horizon_slaughterspine_1794916706022.jpg',
    summary:
      'Apex plasma colossus that charges its dorsal spines for sweeping laser barrages and ground-splitting plasma detonations. Shut down its Plasma Energizers early and exploit Frost Brittle.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Stalk & Plasma Charge',
        hpThreshold: '100% – 60% HP',
        attackPatterns: [
          'Spinelancer Plasma Barrage: Fires rapid sweeping plasma bolts from dorsal fins.',
          'Tail Sweep & Ground Lunge: Closes medium distance quickly with heavy shockwaves.',
        ],
        safeWindows: [
          'Open from stealth or Focus slow-down with Tear Precision Arrows on the Plasma Earthblasters and Tail Weapon.',
          'Trigger Brittle state via Frost Hunter Arrows from The Sun Scourge before firing Powershot.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Overcharged Plasma Earthblaster',
        hpThreshold: '60% – 0% HP',
        attackPatterns: [
          '360° Plasma Ground Eruption: Charges glowing cyan/purple nodes before slamming radial plasma waves.',
          'Laser Sweep: Sweeps continuous high-damage plasma beam across cover.',
        ],
        safeWindows: [
          'Drench with Purgewater to disable Plasma attacks entirely and remove elemental resistances.',
          'Unleash Sustained Burst (Boltgnaster) or Focused Shot (Forgefall) into exposed chest core while Brittle.',
        ],
      },
    ],
    positioningTips: [
      'Use coastal concrete pillars and shallow water terrain to break line of sight during Laser Sweeps.',
      'Target the Plasma Earthblasters along the thighs and dorsal Spines first to shrink its deadliest Phase 2 attacks.',
    ],
    dodgingTips: [
      'Slide into a dodge roll perpendicular to the charging Tail Sweep—sliding alone carries you under high arcs.',
      'Equip Cleanse Potions on your Hunter’s Kit to clear Plasma status before its timed explosion ticks.',
    ],
    loadouts: [
      {
        playstyle: 'Frost Brittle + Powershot Burst',
        weapon: 'Forgefall (Sharpshot) + The Sun Scourge (Frost) + Death-Seeker’s Shadow',
        charmsOrRelics: [
          'Valor Surge: Powershot Lv3',
          'Weapon Technique: Focused Shot',
          'Overdraw Potion + Critical Boost Coils',
        ],
        skillsOrArts: ['Focused Shot', 'Triple Notch (Frost)', 'Braced Shot'],
        defensiveGear: ['Nora Thunder Warrior Armor (Plasma/Concentration weaves)'],
        consumables: ['Cleanse Potion', 'Large Health Potion', 'Volatile Sludge Ammo'],
        rationale:
          'Applying Brittle triples impact damage on Forgefall’s Powershot-buffed Precision Arrows straight into exposed core plates.',
      },
    ],
  },
  {
    id: 'specter-prime-hfw',
    bossName: 'Specter Prime (Tilda)',
    gameTitle: 'Horizon Forbidden West',
    genre: 'Action RPG',
    difficulty: 'Hard',
    arenaLocation: 'Far Zenith Launch Tower',
    weaknesses: ['Acid (Corrosive)', 'Plasma', 'Explosive Spikes'],
    summary:
      'Far Zenith gold-nano exosuit final boss with agile teleport dashes, homing nano-swarms, and gravity singularity orbs. Strip its gold armor plates with Acid and Explosive Spike Throwers.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Pulse Lasers & Nano Swarms',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Twin Arm Pulse Cannons & Homing Gold Swarms.',
          'Aerial Dive Slam & Teleport Reposition.',
        ],
        safeWindows: [
          'Build Corrosive Acid state early with Corrosive Blast Sling or Acid Shredders to melt armor plating.',
          'Punish its landing pause after every Aerial Dive Slam with Splitting Spike or Drill Spikes.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Singularity Core & Overdrive',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Gravity Vortex Pull: Creates expanding shockwave fields across the circular arena.',
          'Rapid Whip-Blade Dash Combos.',
        ],
        safeWindows: [
          'Activate Ranged Master Valor Surge as soon as Phase 2 starts for sustained 60% ranged damage and healing.',
          'Throw Drill Spikes at its glowing central core to trigger repeated knockdown staggers.',
        ],
      },
    ],
    positioningTips: [
      'Stay near mid-arena rather than hugging outer railings so you have clear sightlines after teleport dashes.',
    ],
    dodgingTips: [
      'Sprint laterally and slide-dodge through homing gold bolts rather than jumping.',
    ],
    loadouts: [
      {
        playstyle: 'Corrosive & Explosive Spike',
        weapon: 'The Skykiller (Spike Thrower) + Ancestor’s Return (Shredder) + Sun Scourge',
        charmsOrRelics: [
          'Valor Surge: Ranged Master Lv3',
          'Explosive Damage +15% Coils',
          'Agility Damage Coils',
        ],
        skillsOrArts: ['Propelled Spike', 'Spike Trap', 'Triple Notch Acid'],
        defensiveGear: ['Tenakth Vanquisher or Carja Stalker Elite'],
        consumables: ['Large Health Potion', 'Stamina Potion'],
        rationale:
          'Acid softens Specter Prime’s gold shell while Drill and Explosive Spikes force repeated stagger knockdowns.',
      },
    ],
  },
  {
    id: 'king-hrolf-kraki-ragnarok',
    bossName: 'King Hrólf Kraki',
    gameTitle: 'God of War Ragnarök',
    genre: 'Action Adventure',
    difficulty: 'Nightmare',
    arenaLocation: 'King’s Grave, Midgard',
    weaknesses: ['Dauntless Parry Stagger', 'Spear Detonation Interrupts', 'Realm Shift Burst'],
    imageUrl: '/src/assets/images/boss_ragnarok_berserker_1794916707106.jpg',
    summary:
      'Supreme Berserker King combining every Berserker elemental arsenal—Frost, Flame, Poison, and Bifrost—with a massive health pool. Interrupt his floating realm orbs immediately and parry yellow combos.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Multi-Element Berserker Duel',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Bifrost/Frost/Fire Projectile Barrages & Teleport Slam.',
          'Yellow-Ring 3-Hit Greatsword Chain + Blue-Ring Runic Shockwave.',
        ],
        safeWindows: [
          'Parry yellow-ring strikes with Dauntless Shield into instant Shield Bash stagger + Runic combo.',
          'Throw Draupnir Spear or Leviathan Axe immediately when he floats up for aerial Bifrost AoEs.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Elemental Armor & Berserker Fury',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Elemental Shield Phase: Gains temporary Frost/Burn aura requiring opposite weapon hits.',
          'Tracking Ground Explosions + Double-Red Unblockable Dash.',
        ],
        safeWindows: [
          'Trigger Hilt of Skofnung + Berserker Cuirass damage buff during Realm Shift for huge burst.',
          'Activate Spartan Valor right before unblockables or to cleanse Bifrost safely.',
        ],
      },
    ],
    positioningTips: [
      'Keep Hrólf centered in front of the grave stone and match his elemental armor color with the opposite weapon (Flame vs Frost, or Spear).',
      'Shoot glowing aerial Bifrost orbs with Freya’s arrows or a quick Spear throw before they detonate.',
    ],
    dodgingTips: [
      'Double-tap L1 strictly on blue rings to interrupt room-wide Runic blasts.',
      'Step-dodge sideways once (not roll) against red-ring lunges so you stay in melee punish range.',
    ],
    loadouts: [
      {
        playstyle: 'Berserker Relic Burst',
        weapon: 'Leviathan Axe + Blades of Chaos + Draupnir Spear',
        charmsOrRelics: [
          'Hilt of Skofnung (Relic)',
          'Seal of Runic Storm',
          'Midgard / Svartalfheim Enchantment Sets',
        ],
        skillsOrArts: [
          'Frost Awaken + Breath of Thamur',
          'Flame Whiplash + Atlas Eruption',
          'Artillery of the Ancients',
        ],
        defensiveGear: ['Berserker Cuirass + Radiance Waist/Wrist (Realm Shift)', 'Dauntless Shield'],
        consumables: ['Berserker Resurrection Stone', 'Spartan Valor'],
        rationale:
          'Last-second dodges trigger Radiance Realm Shift while Berserker Cuirass + Hilt of Skofnung melt massive chunks of HP.',
      },
    ],
  },
  {
    id: 'gna-valkyrie-queen-ragnarok',
    bossName: 'Gná, Valkyrie Queen',
    gameTitle: 'God of War Ragnarök',
    genre: 'Action Adventure',
    difficulty: 'Nightmare',
    arenaLocation: 'The Crucible, Muspelheim',
    weaknesses: ['Sonic vs Sigil Element Matching', 'Runic Stun Interrupts', 'Poison Debuff'],
    summary:
      'Ragnarök’s true Valkyrie Queen rematch. Match Freya’s Sonic/Sigil arrows to Gná’s shifting Bifrost/Soundstone attacks and master the delayed "For Asgard!" triple sky-drop cadence.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Asgardian Wing & Arrow Trials',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Wing-Direction Dash: Dash right = unblockable red wing stab; dash left = blockable wing spin.',
          'Soundstone vs Sigil Charge: Fires green Sonic projectiles or purple Runic boulders.',
        ],
        safeWindows: [
          'Fire Freya’s Sonic Arrow (green) at Soundstone windups and Sigil Arrow (purple) at Runic charges for huge staggers.',
          'Hold Spear detonations to interrupt her mid-air Bifrost feather sweeps.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'For Asgard! Valkyrie Frenzy',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'For Asgard! Triple Stomp: Sky drops chaining up to 3 times with Bifrost pools.',
          'Bifrost Whirlwind + Unblockable Grab.',
        ],
        safeWindows: [
          'Wait a half-beat after "For Asgard!" before sidestepping once—punish immediately after the 3rd stomp.',
          'Stack Lúnda’s Poison via bare-hand parries/strikes to drop Gná’s effective level by 1.',
        ],
      },
    ],
    positioningTips: [
      'Keep your back clear of Muspelheim lava edges and watch her wing movement direction after every backstep.',
    ],
    dodgingTips: [
      'Never panic-roll during "For Asgard!"; single sidesteps recover fast enough to evade consecutive stomps.',
    ],
    loadouts: [
      {
        playstyle: 'Lúnda Poison + Steinbjörn Tank',
        weapon: 'Draupnir Spear + Leviathan Axe + Bare-Handed Parry',
        charmsOrRelics: [
          'Hilt of Hofud (Realm Shift)',
          'Vanaheim’s Power (Poison Bonus)',
          'Emblem of Elusion',
        ],
        skillsOrArts: ['Mountain Splitter', 'Thrust of a Thousand Soldiers', 'Hel’s Touch'],
        defensiveGear: ['Lúnda’s Lost Cuirass (or Steinbjörn Plackart)', 'Stone Wall Shield'],
        consumables: ['Superior Resurrection Stone', 'Spartan Fury'],
        rationale:
          'Poison reduces enemy Power Level, softening Gná’s lethal red-ring bursts while Stone Wall Shield absorbs yellow strings safely.',
      },
    ],
  },
  {
    id: 'lace-silksong',
    bossName: 'Lace',
    gameTitle: 'Hollow Knight: Silksong',
    genre: 'Metroidvania',
    difficulty: 'Hard',
    arenaLocation: 'Deep Docks Forge Arena',
    weaknesses: ['Sting Shard Ground Traps', 'Post-Lunge Counter Hits', 'Warding Bell Bind'],
    imageUrl: '/src/assets/images/boss_silksong_duelist_1794916707321.jpg',
    summary:
      'High-tempo agile needle duelist in Pharloom’s Deep Docks. Never spam slashes into her raised parry stance—bait her forward lunge, slip behind, and punish with Sting Shards and Straight Pins.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Needle Lunge & Parry Stance',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Double Slash / Needle Lunge: Swift horizontal dash thrusts with brief crouch telegraph.',
          'Guard Parry & Riposte: Raises her pin defensively—striking her triggers an instant counter-combo.',
        ],
        safeWindows: [
          'Jump or diagonal-pogo over her forward Lunge, then land 1–2 quick slashes at her back.',
          'Pause immediately when she assumes a defensive guard—throw a Straight Pin only after she drops stance.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Whirlwind Aerials & Silk Flurries',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Aerial Whirlwind Dive: Leaps skyward and spins into wide sweeping arcs.',
          'Extended Lunge Chains across the docks platform.',
        ],
        safeWindows: [
          'Drop Sting Shard floor traps along center lane—Lace’s aggressive rushes walk straight through them.',
          'Execute Silk Bind right after she whiffs an Aerial Whirlwind recovery.',
        ],
      },
    ],
    positioningTips: [
      'Avoid trapping yourself against the Deep Docks wall edges where her Double Slash covers your jump arc.',
      'Equip Reaper Crest if you prefer classic downward pogos and bonus Silk generation after each Bind.',
    ],
    dodgingTips: [
      'Wait for her lunge animation to commit before dashing over her—early jumps get caught by Aerial Whirlwind.',
      'Keep Warding Bell equipped so accidental mid-Bind hits won’t waste Silk or cost masks.',
    ],
    loadouts: [
      {
        playstyle: 'Reaper Silk Sustain & Trap',
        weapon: 'Hornet’s Needle (Reaper Crest)',
        charmsOrRelics: [
          'Blue Tool: Warding Bell',
          'Blue Tool: Fractured Mask',
          'Blue Tool: Weavelight',
        ],
        skillsOrArts: ['Red Tool: Sting Shard', 'Red Tool: Straight Pin', 'Silk Bind'],
        defensiveGear: ['Reaper Crest (bonus Silk on follow-ups)', 'Sprint Dash'],
        consumables: ['Crafted Tool Pouch Refills at Bench'],
        rationale:
          'Sting Shards deal passive damage every time Lace charges while Warding Bell and Fractured Mask safeguard aggressive Silk Bind healing.',
      },
      {
        playstyle: 'Hunter Crest Speed',
        weapon: 'Hornet’s Needle (Hunter Crest)',
        charmsOrRelics: ['Blue Tool: Weavelight', 'Blue Tool: Fractured Mask'],
        skillsOrArts: ['Red Tool: Straight Pin', 'Diagonal Aerial Pogo'],
        defensiveGear: ['Hunter Crest'],
        consumables: ['Tool Pouch'],
        rationale:
          'Maximizes raw needle tempo and diagonal pogo follow-ups for players comfortable with Hornet’s default mobility.',
      },
    ],
  },
  {
    id: 'moss-mother-silksong',
    bossName: 'Moss Mother',
    gameTitle: 'Hollow Knight: Silksong',
    genre: 'Metroidvania',
    difficulty: 'Standard',
    arenaLocation: 'Moss Grotto Sanctuary',
    weaknesses: ['Diagonal Pogo', 'Straight Pin Aerial Poke'],
    summary:
      'Pharloom’s opening Moss Grotto guardian that drills Hornet’s diagonal pogo, space management, and Silk Bind timing against diving charges and ceiling rockfalls.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Sliding Sting & Roof Cave-In',
        hpThreshold: '100% – 0% HP',
        attackPatterns: [
          'Sliding Sting Charge: Skims low across the cavern floor from side to side.',
          'Roof Smash & Cave-In: Slams the ceiling, dropping glowing rocks and small mossgrub adds.',
        ],
        safeWindows: [
          'Bounce off her back with Hornet’s diagonal pogo as she skims underneath you.',
          'Track light beams along the cavern ceiling to stand in safe lanes, clear adds quickly for Silk, then punish her landing.',
        ],
      },
    ],
    positioningTips: [
      'Hold mid-chamber so you can read which wall she dives from and dodge ceiling rock telegraphs cleanly.',
    ],
    dodgingTips: [
      'Jump slightly ahead of Sliding Sting and angle your downward strike diagonally along her flight path.',
    ],
    loadouts: [
      {
        playstyle: 'Acrobatic Pogo Fundamentals',
        weapon: 'Hornet’s Needle (Hunter Crest)',
        charmsOrRelics: ['Weavelight (if unlocked)', 'Silk Spool Capacity'],
        skillsOrArts: ['Diagonal Downward Pogo', 'Silk Bind'],
        defensiveGear: ['Sprint Dash & Aerial Float'],
        consumables: ['Bench Reset'],
        rationale:
          'Builds crisp muscle memory for Hornet’s diagonal bounce trajectory and burst Silk Bind healing windows.',
      },
    ],
  },
  {
    id: 'khotun-khan-tsushima',
    bossName: 'Khotun Khan',
    gameTitle: 'Ghost of Tsushima',
    genre: 'Action Adventure',
    difficulty: 'Hard',
    arenaLocation: 'Port Izumi Mongol Flagship',
    weaknesses: ['Wind / Water Stance', 'Sarugami Perfect Parry', 'Way of the Flame'],
    imageUrl: '/src/assets/images/boss_tsushima_duel_1794916708323.jpg',
    summary:
      'Two-stage final confrontation against the Mongol invasion leader: an honorable spear-and-halberd duel followed by a chaotic ship-deck clash against Khotun Khan, elites, and fire traps.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Flagship Cabin Spear Duel',
        hpThreshold: 'Phase 1 (1v1 Duel)',
        attackPatterns: [
          'Blue-Glint Halberd Flurry: Multi-hit sweeping spear thrusts with delayed final strike.',
          'Red-Glint Overhead Smash & Poison Mist Kick.',
        ],
        safeWindows: [
          'Switch to Wind Stance for faster spear-counter heavy staggers and Perfect Parry windows.',
          'Sidestep red-glint overhead slams and immediately punish with Heavenly Strike.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Main Deck Warship Chaos',
        hpThreshold: 'Phase 2 (Ship Deck)',
        attackPatterns: [
          'Shield-Bash & Flaming Halberd Combos alongside Mongol Brute/Archer reinforcements.',
          'Explosive Black Powder Bomb Tosses across the deck.',
        ],
        safeWindows: [
          'Use Ghost Stance, Kunai, and Smoke Bombs to isolate Khan and thin reinforcements instantly.',
          'Ignite Way of the Flame or chain Dance of Wrath whenever Khan guards up.',
        ],
      },
    ],
    positioningTips: [
      'In Phase 2, circle around the ship mast and supply crates to block archer sightlines while focusing Khan.',
      'Equip Charm of Mizu-no-Kami before boarding to widen Perfect Parry and Perfect Dodge timing.',
    ],
    dodgingTips: [
      'Hold L1 late on blue-glint thrusts; his third sweep has a slight half-beat delay before impact.',
      'Roll away immediately when black powder fuses hiss near your feet in Phase 2.',
    ],
    loadouts: [
      {
        playstyle: 'Sarugami Perfect Parry & Resolve',
        weapon: 'Sakai Katana + Ghost Tools (Kunai & Smoke Bomb)',
        charmsOrRelics: [
          'Charm of Mizu-no-Kami',
          'Charm of Inari’s Might',
          'Charm of Silence',
          'Charm of Versatile Skills',
        ],
        skillsOrArts: ['Dance of Wrath', 'Heavenly Strike', 'Way of the Flame'],
        defensiveGear: ['Sarugami Armor (or Gosaku’s Armor for Stagger)'],
        consumables: ['Full Resolve Reserve', 'Kunai & Smoke Bombs (Phase 2)'],
        rationale:
          'Sarugami Armor converts every Perfect Parry into 3 blinding counter-slashes while Mizu-no-Kami keeps parry frames forgiving.',
      },
    ],
  },
  {
    id: 'the-eagle-tsushima',
    bossName: 'The Eagle (Ankhsar Khatun)',
    gameTitle: 'Ghost of Tsushima',
    genre: 'Action Adventure',
    difficulty: 'Nightmare',
    arenaLocation: 'Sacred Mountain Shrine, Iki Island',
    weaknesses: ['Water + Wind Stance Switching', 'Perfect Dodge Counters'],
    summary:
      'Relentless Iki Island mystic who alternates mid-duel between a sweeping Halberd and a twin-bladed Staff while triggering hallucination pressure.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Halberd & Staff Weapon Swaps',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Halberd Spinning Sweeps (Wind Stance matchup).',
          'Double-Bladed Staff Rapid Flurries (Water Stance matchup).',
        ],
        safeWindows: [
          'Swap between Wind Stance (for Halberd) and Water Stance Surging Strikes (for Staff) to break guard fast.',
          'Interrupt her red-glint potion/incense lunges with a crisp Perfect Dodge or Heavenly Strike.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Sacred Poison Frenzy',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          '4-Hit Unrelenting Blue-Glint Combos ending in delayed red unblockable sweep.',
          'Leaping Staff Slam.',
        ],
        safeWindows: [
          'Jump straight over low red sweeping staff attacks, then drop into a heavy plunge punish.',
        ],
      },
    ],
    positioningTips: [
      'Stay in the open shrine courtyard away from tent edges so camera angles never clip during her spinning weapon swaps.',
    ],
    dodgingTips: [
      'Watch her left hand when she switches weapons—Staff transitions immediately into a 4-hit flurry.',
    ],
    loadouts: [
      {
        playstyle: 'Gosaku Stagger Breaker',
        weapon: 'Sakai Katana (Water + Wind Stances)',
        charmsOrRelics: [
          'Charm of Bludgeoning (x2)',
          'Charm of Mizu-no-Kami',
          'Charm of Resolve II',
        ],
        skillsOrArts: ['Surging Strikes (Water)', 'Heavenly Strike', 'Dance of Wrath'],
        defensiveGear: ['Gosaku’s Armor (Max Stagger + Heal on Stagger Kill)'],
        consumables: ['Resolve Healing'],
        rationale:
          'Stacked Stagger charms shred The Eagle’s guard bar in 1–2 Water Stance Surging Strike chains.',
      },
    ],
  },
  {
    id: 'erlang-shen-wukong',
    bossName: 'Erlang, the Sacred Divinity',
    gameTitle: 'Black Myth: Wukong',
    genre: 'Action RPG',
    difficulty: 'Nightmare',
    arenaLocation: 'Mount Mei Snow Peak',
    weaknesses: ['Plantain Fan Shield Strip', 'See-Through Resolute Strikes', 'Azure Dust'],
    summary:
      'Secret Mount Mei powerhouse protected by a regenerating golden posture shield and multi-weapon heavenly transformations. Strip his shield with the Plantain Fan and chain Qi-regen bursts.',
    phases: [
      {
        phaseNumber: 1,
        title: 'Axe Slam & Golden Shield',
        hpThreshold: '100% – 50% HP',
        attackPatterns: [
          'Floating Flying Swords + Crimson Lightning Spear Slams.',
          'Golden Posture Shield: Blocks most raw damage until shattered.',
        ],
        safeWindows: [
          'Activate Plantain Fan at fight start—its tornado strips his entire golden shield automatically for free heavy punishes.',
          'Land Staff Spin hits while he is staggered to recharge Vessel Qi back to 100%.',
        ],
      },
      {
        phaseNumber: 2,
        title: 'Heavenly Eye Laser & Spear Barrage',
        hpThreshold: '50% – 0% HP',
        attackPatterns: [
          'Aerial Sword Rain + Red Beam Sweeps.',
          'Delayed 7-Hit Spear-Axe Combo.',
        ],
        safeWindows: [
          'Transform into Azure Dust (Rock Guai)—Erlang often pauses instead of attacking, letting you shatter his shield cleanly.',
          'Use Cloud Step to charge a 3-Focus Smash safely through his aerial barrages.',
        ],
      },
    ],
    positioningTips: [
      'Stay close during his spear strings so Staff Spin can build Qi on every stagger window.',
    ],
    dodgingTips: [
      'Deflect Flying Sword volleys by holding Staff Spin (L2/V) before rolling the final red dive slam.',
    ],
    loadouts: [
      {
        playstyle: 'Golden Qi & Plantain Fan Loop',
        weapon: 'Jingubang / Tri-Point Double-Edged Spear',
        charmsOrRelics: [
          'Vessel: Plantain Fan',
          'Spirit: Apramana Bat (Freeze)',
          'Curios: Amber Prayer Beads + Cat Eye Beads',
        ],
        skillsOrArts: ['Cloud Step', 'Mobile Staff Spin', 'See-Through Resolute Strike'],
        defensiveGear: ['Golden Embroidered Armor (4pc Qi Regen on Crit)'],
        consumables: ['Sunset of the Nine Skies (Drink)', 'Loong Aura Amplification Pellet'],
        rationale:
          'Drinking Sunset of the Nine Skies + Golden Armor crits restores Plantain Fan every phase, turning Erlang’s shield into repeatable stun loops.',
      },
    ],
  },
];

export const SEED_TRACKED_GAMES: TrackedGame[] = [
  {
    id: 'elden-ring-tracker',
    title: 'Elden Ring: Shadow of the Erdtree',
    platform: 'PS5',
    genre: 'Action RPG',
    hoursPlayed: 84.5,
    imageUrl: '/src/assets/images/boss_crimson_valkyrie_1794871669777.jpg',
    lastUpdated: '2026-11-15T18:00:00Z',
    items: [
      {
        id: 'er-1',
        title: 'Defeat Starscourge Radahn & Mohg',
        type: 'story',
        completed: true,
        description: 'Unlock Realm of Shadow entry at Cocoon of the Empyrean.',
      },
      {
        id: 'er-2',
        title: 'Clear Shadow Keep & Messmer the Impaler',
        type: 'story',
        completed: true,
        description: 'Obtain Messmer’s Kindling to burn the Sealing Tree.',
      },
      {
        id: 'er-3',
        title: 'Defeat Romina, Saint of the Bud',
        type: 'story',
        completed: false,
        description: 'Ancient Ruins of Rauh progression milestone.',
      },
      {
        id: 'er-4',
        title: 'Conquer Enir-Ilim Final Confrontation',
        type: 'story',
        completed: false,
      },
      {
        id: 'er-a1',
        title: 'Shardbearer Malenia',
        type: 'achievement',
        completed: true,
        description: 'Defeated Malenia, Blade of Miquella in Elphael.',
      },
      {
        id: 'er-a2',
        title: 'Legendary Armaments Collected',
        type: 'achievement',
        completed: false,
        description: 'Collect all 9 legendary weapons across the Lands Between.',
      },
      {
        id: 'er-a3',
        title: 'Elden Lord Ending',
        type: 'achievement',
        completed: true,
      },
    ],
  },
  {
    id: 'hollow-knight-tracker',
    title: 'Hollow Knight',
    platform: 'Steam Deck',
    genre: 'Metroidvania',
    hoursPlayed: 42.0,
    imageUrl: '/src/assets/images/boss_hollow_sovereign_1794871670855.jpg',
    lastUpdated: '2026-11-14T20:15:00Z',
    items: [
      {
        id: 'hk-1',
        title: 'Awaken all three Dreamers',
        type: 'story',
        completed: true,
      },
      {
        id: 'hk-2',
        title: 'Obtain Void Heart',
        type: 'story',
        completed: true,
      },
      {
        id: 'hk-3',
        title: 'Banish or Defeat Nightmare King Grimm',
        type: 'story',
        completed: true,
      },
      {
        id: 'hk-4',
        title: 'Complete Pantheon of Hallownest',
        type: 'story',
        completed: false,
      },
      {
        id: 'hk-a1',
        title: 'Pure Completion (112%)',
        type: 'achievement',
        completed: false,
      },
      {
        id: 'hk-a2',
        title: 'Ritual Completed',
        type: 'achievement',
        completed: true,
      },
      {
        id: 'hk-a3',
        title: 'Dream No More',
        type: 'achievement',
        completed: true,
      },
    ],
  },
  {
    id: 'sekiro-tracker',
    title: 'Sekiro: Shadows Die Twice',
    platform: 'PC',
    genre: 'Action Adventure',
    hoursPlayed: 31.5,
    imageUrl: '/src/assets/images/boss_abyssal_colossus_1794871670403.jpg',
    lastUpdated: '2026-11-12T12:30:00Z',
    items: [
      {
        id: 'sk-1',
        title: 'Defeat Genichiro Ashina atop Ashina Castle',
        type: 'story',
        completed: true,
      },
      {
        id: 'sk-2',
        title: 'Gather Shelter Stone, Lotus & Mortal Blade',
        type: 'story',
        completed: true,
      },
      {
        id: 'sk-3',
        title: 'Defeat Divine Dragon in Fountainhead Palace',
        type: 'story',
        completed: false,
      },
      {
        id: 'sk-a1',
        title: 'Man Without Equal',
        type: 'achievement',
        completed: false,
        description: 'Defeat all bosses on a single save file.',
      },
      {
        id: 'sk-a2',
        title: 'Master of the Prosthetic',
        type: 'achievement',
        completed: false,
      },
    ],
  },
];

export const SEED_WELCOME_MESSAGES: ChatMessage[] = [
  {
    id: 'welcome-1',
    role: 'agent',
    kind: 'general_gaming',
    timestamp: '2026-11-16T15:25:00Z',
    content:
      'RADAHN ready. Ask about any video game mechanic, boss fight strategy, optimized loadout build, gaming hardware setup, or achievement unlock. Non-gaming topics are strictly declined.',
  },
];
