import { supabase } from '@/integrations/supabase/client';

export interface BusinessEntitlement {
  tier: string;
  is_active: boolean;
  profile_cap: number;
  is_unlimited: boolean;
}

const DEFAULT_ENTITLEMENT: BusinessEntitlement = {
  tier: 'starter',
  is_active: false,
  profile_cap: 25,
  is_unlimited: false,
};

export async function getBusinessEntitlement(businessId: string): Promise<BusinessEntitlement> {
  try {
    const { data, error } = await supabase
      .from('entitlements')
      .select('tier, is_active, profile_cap, is_unlimited')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error || !data) return DEFAULT_ENTITLEMENT;

    return {
      tier: data.tier,
      is_active: data.is_active,
      profile_cap: data.profile_cap,
      is_unlimited: data.is_unlimited,
    };
  } catch {
    return DEFAULT_ENTITLEMENT;
  }
}
