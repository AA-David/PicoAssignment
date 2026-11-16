// Single source of truth for game rules shared by the models and services.

// Rarity tiers, lowest to highest. A rarity is stored as its index here.
export const RARITIES = [
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
] as const;

export const MIN_RARITY = 0;
export const MAX_RARITY = RARITIES.length - 1;

// Upgrade levels start at 0 and are capped at these values
export const MAX_LUCK_LEVEL = 5;
export const MAX_ROD_LEVEL = MAX_RARITY;

// Indexed by rarity. `satisfies` makes the compiler fail if a rarity is added or removed without also updating respective array.
export const BAIT_PRICES = [0, 250, 800, 1500, 2500] as const satisfies {
    length: (typeof RARITIES)['length'];
};

export const ROD_PRICES = [0, 300, 1800, 5000, 10000] as const satisfies {
    length: (typeof RARITIES)['length'];
};

// Indexed by luck level (0 to MAX_LUCK_LEVEL). Level 0 is the free starting level.
export const LUCK_PRICES = [
    0, 500, 1500, 4000, 10000, 25000,
] as const satisfies {
    length: 6; // MAX_LUCK_LEVEL + 1
};

// Every user starts out owning (and with equipped) the cheapest bait
export const STARTER_BAIT = MIN_RARITY;

export function isValidRarity(value: unknown): value is number {
    return (
        Number.isInteger(value) &&
        (value as number) >= MIN_RARITY &&
        (value as number) <= MAX_RARITY
    );
}
