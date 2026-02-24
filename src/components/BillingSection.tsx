import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getBusinessEntitlement, BusinessEntitlement } from '@/lib/entitlements';
import { TIER_INFO, getPriceId, TierKey, BillingInterval } from '@/lib/stripePrices';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CreditCard, ChevronDown, ExternalLink, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface BillingSectionProps {
  businessId: string | null | undefined;
}

interface BillingSubscription {
  status: string | null;
  stripe_price_id: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

export function BillingSection({ businessId }: BillingSectionProps) {
  const [entitlement, setEntitlement] = useState<BusinessEntitlement | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [activeCount, setActiveCount] = useState(0);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const [ent, subResult, countResult] = await Promise.all([
        getBusinessEntitlement(businessId),
        supabase
          .from('billing_subscriptions')
          .select('status, stripe_price_id, trial_end, current_period_end, cancel_at_period_end')
          .eq('business_id', businessId)
          .maybeSingle(),
        supabase
          .from('personnel')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', businessId)
          .eq('activated', true),
      ]);
      setEntitlement(ent);
      setSubscription(subResult.data as BillingSubscription | null);
      setActiveCount(countResult.count ?? 0);
    } catch (err) {
      console.error('BillingSection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasActiveSub = subscription && (subscription.status === 'active' || subscription.status === 'trialing');

  const handleSubscribe = async (tier: TierKey) => {
    const priceId = getPriceId(tier, interval);
    setLoadingPrice(priceId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Please sign in first'); return; }

      const res = await supabase.functions.invoke('create-checkout-session', {
        body: { price_id: priceId },
      });

      if (res.error) throw new Error(res.error.message);
      const { url } = res.data;
      if (url) window.location.href = url;
      else throw new Error('No checkout URL returned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingPrice(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await supabase.functions.invoke('create-portal-session', {});
      if (res.error) throw new Error(res.error.message);
      const { url } = res.data;
      if (url) window.open(url, '_blank');
      else throw new Error('No portal URL returned');
    } catch (err: any) {
      toast.error(err.message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const statusLabel = subscription?.status
    ? subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)
    : 'No subscription';

  const statusVariant = subscription?.status === 'active'
    ? 'active'
    : subscription?.status === 'trialing'
      ? 'default'
      : subscription?.status === 'canceled'
        ? 'destructive'
        : 'secondary';

  const capPercent = entitlement
    ? Math.min(100, Math.round((activeCount / entitlement.profile_cap) * 100))
    : 0;

  if (!businessId) return null;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:bg-muted/50 transition-colors group">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Payment & Billing</span>
          {subscription && (
            <Badge variant={statusVariant} className="ml-2">{statusLabel}</Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-4 space-y-6 border border-t-0 border-border/50 rounded-b-lg">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Status overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Tier</p>
                  <p className="text-lg font-semibold capitalize">{entitlement?.tier || 'Starter'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Status</p>
                  <Badge variant={statusVariant}>{statusLabel}</Badge>
                </div>

                {subscription?.status === 'trialing' && subscription.trial_end && (
                  <div>
                    <p className="text-sm text-muted-foreground">Trial Ends</p>
                    <p className="font-medium">{format(new Date(subscription.trial_end), 'MMM d, yyyy')}</p>
                  </div>
                )}
                {subscription?.current_period_end && (
                  <div>
                    <p className="text-sm text-muted-foreground">Current Period End</p>
                    <p className="font-medium">{format(new Date(subscription.current_period_end), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>

              {/* Active profiles usage */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-muted-foreground">Active Profiles</p>
                  <p className="text-sm font-medium">
                    {activeCount} / {entitlement?.is_unlimited ? '∞' : entitlement?.profile_cap ?? 25}
                  </p>
                </div>
                {!entitlement?.is_unlimited && (
                  <Progress value={capPercent} className="h-2" />
                )}
              </div>

              {/* Cancel at period end warning */}
              {subscription?.cancel_at_period_end && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Your subscription will cancel at the end of the current period.</span>
                </div>
              )}

              {/* Subscribe buttons (only when no active/trialing subscription) */}
              {!hasActiveSub && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold">Choose a Plan</p>
                    <ToggleGroup
                      type="single"
                      value={interval}
                      onValueChange={(v) => v && setInterval(v as BillingInterval)}
                      size="sm"
                    >
                      <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
                      <ToggleGroupItem value="annual">Annual</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {(Object.keys(TIER_INFO) as TierKey[]).map((tier) => {
                      const priceId = getPriceId(tier, interval);
                      const isLoading = loadingPrice === priceId;
                      return (
                        <Button
                          key={tier}
                          variant="outline"
                          className="flex flex-col h-auto py-4 gap-1"
                          disabled={!!loadingPrice}
                          onClick={() => handleSubscribe(tier)}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <span className="font-semibold">{TIER_INFO[tier].label}</span>
                              <span className="text-xs text-muted-foreground">
                                Up to {TIER_INFO[tier].cap} profiles
                              </span>
                            </>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Manage billing button */}
              {subscription && (
                <Button
                  variant="outline"
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="w-full sm:w-auto"
                >
                  {portalLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Billing
                </Button>
              )}
            </>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
