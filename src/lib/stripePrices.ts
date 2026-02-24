export const PRICE_MAP = {
  starter_monthly: "price_1T4Q47CTZs6lfaVYaVf2mLWJ",
  starter_annual: "price_1T4Q5FCTZs6lfaVYJcUidzzL",
  growth_monthly: "price_1T4Q5nCTZs6lfaVYNr3gobm3",
  growth_annual: "price_1T4Q6HCTZs6lfaVYoReiRSXM",
  professional_monthly: "price_1T4Q6iCTZs6lfaVYZEZNA1yo",
  professional_annual: "price_1T4Q78CTZs6lfaVYkfdJW4eq",
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
