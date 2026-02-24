export const PRICE_MAP = {
  // Starter
  starter_monthly:      "price_1T4UM3CTVQHwswgojzCUGSYV",
  starter_annual:       "price_1T4TipCTVQHwswgo3i7Wxi0p",

  // Growth
  growth_monthly:       "price_1T4TjxCTVQHwswgobYyRRe10",
  growth_annual:        "price_1T4TkFCTVQHwswgop7yCPQRM",

  // Professional
  professional_monthly: "price_1T4TksCTVQHwswgoItMP8J6n",
  professional_annual:  "price_1T4Tl8CTVQHwswgoHkYuB2S9",
} as const;

export const ALLOWED_PRICE_IDS = new Set(Object.values(PRICE_MAP));

export type TierKey = "starter" | "growth" | "professional";
export type BillingInterval = "monthly" | "annual";

export const TIER_INFO: Record<TierKey, { label: string; cap: number }> = {
  starter: { label: "Starter", cap: 25 },
  growth: { label: "Growth", cap: 75 },
  professional: { label: "Professional", cap: 200 },
};

export function getPriceId(tier: TierKey, interval: BillingInterval): string {
  return PRICE_MAP[`${tier}_${interval}`];
}
