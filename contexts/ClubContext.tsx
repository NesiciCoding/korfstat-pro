import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Club, ClubMember, ClubRole, ClubWithSubscription, Subscription, hasFeature, SubscriptionPlan } from '../types/subscription';

interface ClubContextType {
  activeClub: ClubWithSubscription | null | undefined;
  clubId: string | null;
  role: ClubRole | null;
  plan: SubscriptionPlan;
  isLoading: boolean;
  hasFeature: (feature: string) => boolean;
  refreshClub: () => Promise<boolean>;
  setActiveClub: (club: ClubWithSubscription | null) => void;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const ClubProvider: React.FC<{ userId: string | null; children: React.ReactNode }> = ({ userId, children }) => {
  const [activeClub, setActiveClub] = useState<ClubWithSubscription | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);

  const loadClub = useCallback(async (): Promise<boolean> => {
    if (!userId || userId === 'guest') {
      setActiveClub(null);
      return false;
    }

    setIsLoading(true);
    try {
      // Get the user's club membership(s) - for now, pick the first (owner) club containing actual club data
      const { data: memberships, error: memberError } = await supabase
        .from('club_members')
        .select(`
          id, club_id, user_id, role, created_at,
          clubs (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (memberError || !memberships?.length) {
        setActiveClub(null);
        return false;
      }

      // Filter out orphaned memberships where club doesn't exist
      const validMembership = memberships.find(m => m.clubs != null);

      if (!validMembership) {
        setActiveClub(null);
        return false;
      }

      const club: any = Array.isArray(validMembership.clubs) ? validMembership.clubs[0] : validMembership.clubs;

      if (!club) {
        setActiveClub(null);
        return false;
      }

      const { data: sub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('club_id', validMembership.club_id)
        .eq('status', 'active')
        .maybeSingle();

      setActiveClub({
        id: club.id,
        name: club.name,
        shortName: club.short_name,
        primaryColor: club.primary_color,
        secondaryColor: club.secondary_color,
        logoUrl: club.logo_url,
        createdAt: club.created_at,
        updatedAt: club.updated_at,
        role: validMembership.role as ClubRole,
        subscription: sub ? {
          id: sub.id,
          clubId: sub.club_id,
          plan: sub.plan,
          status: sub.status,
          trialEndsAt: sub.trial_ends_at,
          currentPeriodEndsAt: sub.current_period_ends_at,
          stripeCustomerId: sub.stripe_customer_id,
          stripeSubscriptionId: sub.stripe_subscription_id,
        } : null,
      });
      return true;
    } catch (err) {
      console.error('[Club] Failed to load club:', err);
      setActiveClub(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadClub();
  }, [loadClub]);

  const plan: SubscriptionPlan = activeClub?.subscription?.plan ?? 'free';

  const checkFeature = useCallback(
    (feature: string) => hasFeature(plan, feature),
    [plan]
  );

  return (
    <ClubContext.Provider value={{
      activeClub,
      clubId: activeClub?.id ?? null,
      role: activeClub?.role ?? null,
      plan,
      isLoading,
      hasFeature: checkFeature,
      refreshClub: loadClub,
      setActiveClub,
    }}>
      {children}
    </ClubContext.Provider>
  );
};

export const useClub = () => {
  const ctx = useContext(ClubContext);
  if (!ctx) throw new Error('useClub must be used within a ClubProvider');
  return ctx;
};
