export const TERMS_VERSION = "1.0";
export const PRIVACY_VERSION = "1.0";

export function needsConsent(profile: {
  terms_accepted_at: string | null;
  terms_version: string | null;
  privacy_version: string | null;
} | null): boolean {
  if (!profile) return true;
  if (!profile.terms_accepted_at) return true;
  if (profile.terms_version !== TERMS_VERSION) return true;
  if (profile.privacy_version !== PRIVACY_VERSION) return true;
  return false;
}
