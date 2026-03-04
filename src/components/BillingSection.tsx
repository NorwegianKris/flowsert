import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

export interface BillingSubscription {
  status: string | null;
  stripe_price_id: string | null;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface BillingSectionProps {
  businessId: string | null | undefined;
  embedded?: boolean;
  subscription?: BillingSubscription | null;
  entitlement?: BusinessEntitlement | null;
  activeCount?: number | null;
}

export function BillingSection({ businessId, embedded, subscription: subProp, entitlement: entProp, activeCount: countProp }: BillingSectionProps) {
  const [entitlement, setEntitlement] = useState<BusinessEntitlement | null>(null);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [activeCount, setActiveCount] = useState<number | null>(0);
  const [interval, setInterval] = useState<BillingInterval>('monthly');
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const shouldFetchSub = subProp === undefined;
  const shouldFetchEnt = entProp === undefined;
  const shouldFetchCount = countProp === undefined;

  // Use props when provided
  const effectiveEntitlement = shouldFetchEnt ? entitlement : entProp;
  const effectiveSubscription = shouldFetchSub ? subscription : subProp;
  const effectiveActiveCount = shouldFetchCount ? activeCount : countProp;

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    if (!shouldFetchSub && !shouldFetchEnt && !shouldFetchCount) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const entPromise = shouldFetchEnt
        ? getBusinessEntitlement(businessId)
        : Promise.resolve(null);
      const subPromise = shouldFetchSub
        ? supabase
            .from('billing_subscriptions')
            .select('status, stripe_price_id, trial_end, current_period_end, cancel_at_period_end')
            .eq('business_id', businessId)
            .maybeSingle()
            .then(r => r)
        : Promise.resolve(null);
      const countPromise = shouldFetchCount
        ? supabase
            .from('personnel')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', businessId)
            .eq('activated', true)
            .then(r => r)
        : Promise.resolve(null);

      const [ent, subResult, countResult] = await Promise.all([entPromise, subPromise, countPromise]);
      if (shouldFetchEnt && ent) setEntitlement(ent);
      if (shouldFetchSub && subResult) setSubscription(subResult.data as BillingSubscription | null);
      if (shouldFetchCount && countResult) setActiveCount(typeof countResult.count === 'number' ? countResult.count : null);
    } catch (err) {
      console.error('BillingSection fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId, shouldFetchSub, shouldFetchEnt, shouldFetchCount]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const hasActiveSub = effectiveSubscription && (effectiveSubscription.status === 'active' || effectiveSubscription.status === 'trialing');
  const hasSubscriptionRow = !!effectiveSubscription;
  const isEnterprise = !!effectiveEntitlement?.is_unlimited;
  const isDelinquent = ['past_due', 'unpaid', 'incomplete', 'incomplete_expired'].includes(effectiveSubscription?.status ?? '');
  const isCanceled = effectiveSubscription?.status === 'canceled';
  const isPortalManaged = hasSubscriptionRow && !isEnterprise && !isDelinquent && !isCanceled;

  const handleSubscribe = async (tier: TierKey) => {
    const priceId = getPriceId(tier, interval);
    setLoadingPrice(priceId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Please sign in first'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ price_id: priceId }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (!data.url) throw new Error('No checkout URL returned');
      window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || 'Failed to start checkout');
    } finally {
      setLoadingPrice(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) { toast.error('Please sign in first'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({}),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Portal failed');
      if (!data.url) throw new Error('No portal URL returned');
      window.open(data.url, '_blank');
    } catch (err: any) {
      toast.error(err.message || 'Failed to open billing portal');
    } finally {
      setPortalLoading(false);
    }
  };

  const status = effectiveSubscription?.status?.trim();
  const statusLabel = status
    ? status.charAt(0).toUpperCase() + status.slice(1)
    : effectiveEntitlement?.is_unlimited
      ? 'Manual billing'
      : 'No subscription';

  const statusVariant = effectiveSubscription?.status === 'active'
    ? 'active'
    : effectiveSubscription?.status === 'trialing'
      ? 'default'
      : effectiveSubscription?.status === 'canceled'
        ? 'destructive'
        : 'secondary';

  const displayCount = effectiveActiveCount ?? 0;
  const capPercent = effectiveEntitlement
    ? Math.min(100, Math.round((displayCount / effectiveEntitlement.profile_cap) * 100))
    : 0;

  if (!businessId) return null;

  const content = (
    <div className={embedded ? "p-4 space-y-6" : "p-4 space-y-6 border border-t-0 border-border/50 rounded-b-lg"}>
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
              <p className="text-lg font-semibold">
                {effectiveEntitlement?.is_unlimited
                  ? 'Enterprise'
                  : (effectiveEntitlement?.tier
                      ? effectiveEntitlement.tier.charAt(0).toUpperCase() + effectiveEntitlement.tier.slice(1)
                      : 'Starter')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subscription Status</p>
              <Badge variant={statusVariant}>{statusLabel}</Badge>
            </div>

            {effectiveSubscription?.status === 'trialing' && effectiveSubscription.trial_end && (
              <div>
                <p className="text-sm text-muted-foreground">Trial Ends</p>
                <p className="font-medium">{format(new Date(effectiveSubscription.trial_end), 'MMM d, yyyy')}</p>
              </div>
            )}
            {effectiveSubscription?.current_period_end && (
              <div>
                <p className="text-sm text-muted-foreground">Current Period End</p>
                <p className="font-medium">{format(new Date(effectiveSubscription.current_period_end), 'MMM d, yyyy')}</p>
              </div>
            )}
          </div>

          {/* Active profiles usage */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Active Profiles</p>
              <p className="text-sm font-medium">
                {effectiveActiveCount === null ? '—' : effectiveActiveCount} / {effectiveEntitlement?.is_unlimited ? '∞' : effectiveEntitlement?.profile_cap ?? 25}
              </p>
            </div>
            {!effectiveEntitlement?.is_unlimited && (
              <Progress value={capPercent} className="h-2" />
            )}
          </div>

          {/* Cancel at period end warning */}
          {effectiveSubscription?.cancel_at_period_end && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Your subscription will cancel at the end of the current period.</span>
            </div>
          )}

          {/* Fix billing CTA for delinquent statuses */}
          {effectiveSubscription && !effectiveSubscription.cancel_at_period_end && isDelinquent && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
              <span className="text-sm text-destructive">Your subscription needs attention.</span>
              <Button size="sm" variant="destructive" onClick={handleManageBilling}
                disabled={portalLoading} className="ml-auto">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fix billing'}
              </Button>
            </div>
          )}

          {/* Canceled subscription callout */}
          {isCanceled && !isEnterprise && (
            <div className="flex items-center gap-2 rounded-md bg-muted/50 border border-border/50 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Your subscription has been canceled. Restart it in the billing portal.</span>
              <Button size="sm" variant="outline" onClick={handleManageBilling}
                disabled={portalLoading} className="ml-auto">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Manage Billing'}
              </Button>
            </div>
          )}

          {/* Enterprise callout */}
          {effectiveEntitlement?.is_unlimited && (
            <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium">Enterprise Plan — Manual Billing</p>
                <p className="text-xs text-muted-foreground">
                  You're on an Enterprise plan with manual billing. Contact us to change your agreement.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => navigate('/contact')}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Contact support
              </Button>
            </div>
          )}

          {/* Subscribe buttons (only for non-enterprise without active/trialing subscription) */}
          {!hasSubscriptionRow && !isEnterprise && (
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
                      className="flex flex-col h-auto py-4 gap-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD]"
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

          {/* Portal-managed helper callout */}
          {isPortalManaged && (
            <div className="rounded-md border border-border/50 bg-muted/30 p-4 space-y-1">
              <p className="text-sm font-medium">Plan changes happen in billing</p>
              <p className="text-xs text-muted-foreground">
                Upgrades, downgrades, and cancellations are managed in the billing portal.
              </p>
            </div>
          )}

          {/* Manage billing button */}
          {effectiveSubscription && (
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
  );

  if (embedded) return content;

  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center justify-between w-full p-4 rounded-lg border border-border/50 bg-card hover:shadow-md hover:ring-2 hover:ring-[#C4B5FD] hover:shadow-[#C4B5FD]/20 transition-all group">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">Payment & Billing</span>
          {effectiveSubscription && (
            <Badge variant={statusVariant} className="ml-2">{statusLabel}</Badge>
          )}
        </div>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {content}
      </CollapsibleContent>
    </Collapsible>
  );
}
