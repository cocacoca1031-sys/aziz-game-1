export const STRICT_REFUSAL = "I don't have knowledge about this subject.";

const GAMING_ALLOW_PATTERNS: RegExp[] = [
  /\b(game|games|gaming|video game|videogame|boss|loadout|build|charm|weapon|skill|gear|armor|talisman|relic|achievement|trophy|trophies|platinum|quest|mission|level|campaign|multiplayer|co-op|coop|pvp|pve|fps|rpg|jrpg|mmorpg|roguelike|metroidvania|soulslike|souls|elden ring|hollow knight|sekiro|god of war|monster hunter|hades|zelda|mario|cyberpunk|baldur|witcher|dark souls|bloodborne|minecraft|fortnite|valorant|counter-strike|cs2|overwatch|apex|league of legends|dota|starcraft|factorio|civilization|diablo|destiny|halo|doom|resident evil|final fantasy|persona|silksong|armored core|black myth|wukong|palworld|helldivers|steam|playstation|ps5|ps4|xbox|nintendo|switch|gpu|cpu|graphics card|rtx|radeon|ryzen|intel|controller|dualsense|joystick|keyboard|mouse|monitor|refresh rate|hz|frame rate|framerate|dlss|fsr|ray tracing|vram|ram|ssd|handheld|steam deck|rog ally|android gaming|emulator|parry|dodge|i-frames|iframes|hitbox|dps|nerf|buff|patch notes|speedrun|walkthrough|npc|lore|crafting|enchant|loot|raid|dungeon|deck|mana|stamina|poise|crit|aggro|tank|healer|support|stealth|cooldown|respawn|checkpoint|save file|mod|mods|modding|console|esports|twitch|arcade)\b/i,
];

const CLEAR_OFF_TOPIC_PATTERNS: RegExp[] = [
  // Pure arithmetic / math questions
  /^\s*(what\s+is|calculate|solve|compute|evaluate)?\s*[-+]?\d+(\.\d+)?\s*([+\-*/^%×÷]\s*[-+]?\d+(\.\d+)?)+\s*\??\s*$/i,
  /\b(calculus|derivative|integral|quadratic equation|linear algebra|eigenvalue|trigonometry|pythagorean theorem)\b/i,
  // Cooking / recipes
  /\b(recipe|bake|baking|chocolate chip|sourdough|marinade|preheat the oven|tablespoon|teaspoon|simmer|boil pasta|lasagna|omelette|pancake|risotto)\b/i,
  // Politics / government / elections
  /\b(president|prime minister|congress|senate|parliament|election|political party|democrat|republican|legislation|tax policy|geopolitics|foreign policy|supreme court)\b/i,
  // General coding / software dev unrelated to games
  /\b(react component|useeffect|sql query|database migration|kubernetes|docker compose|terraform|rest api|oauth|jwt token|sort an array|binary search tree|leetcode|html div|css flexbox|python pandas)\b/i,
  // Medical / legal / finance / weather / trivia
  /\b(diagnose|symptom|ibuprofen|prescription|blood pressure|mortgage|stock market|tax return|irs|weather forecast|capital of france|capital of|who won the world cup|solar system|photosynthesis|periodic table|write a poem|translate to spanish)\b/i,
];

export function hasGamingSignal(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) return false;
  return GAMING_ALLOW_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Deterministic fast-path guardrail for unmistakable non-gaming queries
 * (math, cooking, politics, non-gaming coding, general trivia) when no
 * gaming context is present. Semantic edge cases are enforced by Gemini's
 * strict system instruction and normalized via normalizeAgentReply.
 */
export function isDefinitelyOffTopic(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) return false;
  if (hasGamingSignal(normalized)) {
    return false;
  }
  return CLEAR_OFF_TOPIC_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function normalizeAgentReply(
  rawText: string,
  classification?: string
): { isRefusal: boolean; text: string } {
  const trimmed = rawText.trim();
  const normalizedLower = trimmed.toLowerCase().replace(/^["'`]+|["'`]+$/g, '').trim();

  if (
    classification === 'REFUSAL' ||
    normalizedLower === STRICT_REFUSAL.toLowerCase() ||
    normalizedLower.startsWith("i don't have knowledge about this subject") ||
    normalizedLower.startsWith('i dont have knowledge about this subject') ||
    normalizedLower.startsWith('i do not have knowledge about this subject')
  ) {
    return {
      isRefusal: true,
      text: STRICT_REFUSAL,
    };
  }

  return {
    isRefusal: false,
    text: trimmed || STRICT_REFUSAL,
  };
}
