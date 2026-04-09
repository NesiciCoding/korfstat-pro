export type ClubRole = 'owner' | 'admin' | 'scorer' | 'viewer';
export type SubscriptionPlan = 'free' | 'starter' | 'pro' | 'elite';
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'none';

export interface Club {
  id: string;
  name: string;
  shortName?: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClubMember {
  id: string;
  clubId: string;
  userId: string;
  role: ClubRole;
  createdAt: string;
}

export interface Subscription {
  id: string;
  clubId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  trialEndsAt?: string;
  currentPeriodEndsAt?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export interface ClubWithSubscription extends Club {
  role: ClubRole;
  subscription: Subscription | null;
}

/** Feature gates per subscription plan */
export const PLAN_FEATURES: Record<SubscriptionPlan, string[]> = {
  free: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY'],
  starter: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC', 'TRAINING', 'SEASON_MANAGER'],
  pro: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC', 'TRAINING', 'SEASON_MANAGER', 'ANALYSIS', 'SCOUTING', 'BROADCASTING', 'TICKER', 'PHYSICAL_TESTING'],
  elite: ['MATCH_TRACKING', 'BASIC_STATS', 'MATCH_HISTORY', 'CLOUD_SYNC', 'TRAINING', 'SEASON_MANAGER', 'ANALYSIS', 'SCOUTING', 'BROADCASTING', 'TICKER', 'PHYSICAL_TESTING', 'COMPANION', 'STRATEGY', 'API_ACCESS'],
};

export function hasFeature(plan: SubscriptionPlan | undefined, feature: string): boolean {
  if (!plan) return PLAN_FEATURES.free.includes(feature);
  return PLAN_FEATURES[plan].includes(feature);
}
