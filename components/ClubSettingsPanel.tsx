import React, { useState, useEffect } from 'react';
import {
  Copy, Check, Users, Crown, Shield, Eye, Edit2,
  Loader2, AlertCircle, RefreshCw, ChevronRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useClub } from '../contexts/ClubContext';
import { ClubRole, SubscriptionPlan } from '../types/subscription';

const PLAN_COLORS: Record<SubscriptionPlan, string> = {
  free: 'bg-gray-700 text-gray-300',
  starter: 'bg-blue-900/60 text-blue-300',
  pro: 'bg-indigo-900/60 text-indigo-300',
  elite: 'bg-yellow-900/60 text-yellow-300',
};

const ROLE_ICONS: Record<ClubRole, React.ReactNode> = {
  owner: <Crown size={14} className="text-yellow-400" />,
  admin: <Shield size={14} className="text-blue-400" />,
  scorer: <Edit2 size={14} className="text-green-400" />,
  viewer: <Eye size={14} className="text-gray-400" />,
};

interface Member {
  id: string;
  user_id: string;
  role: ClubRole;
  created_at: string;
  email?: string;
}

const ClubSettingsPanel: React.FC = () => {
  const { activeClub, role, plan, refreshClub } = useClub();
  const [copied, setCopied] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeClub?.id) loadMembers();
  }, [activeClub?.id]);

  const loadMembers = async () => {
    if (!activeClub?.id) return;
    setMembersLoading(true);
    setMembersError(null);
    try {
      const { data, error } = await supabase
        .from('club_members')
        .select('id, user_id, role, created_at')
        .eq('club_id', activeClub.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMembers(data ?? []);
    } catch (err: any) {
      setMembersError(err.message ?? 'Failed to load members');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!activeClub?.id) return;
    navigator.clipboard.writeText(activeClub.id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveName = async () => {
    if (!activeClub?.id || !editName.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('clubs')
        .update({ name: editName.trim() })
        .eq('id', activeClub.id);
      if (error) throw error;
      await refreshClub();
      setIsEditingName(false);
    } catch (err: any) {
      console.error('Failed to update club name:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      setMembers(prev => prev.filter(m => m.id !== memberId));
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    }
  };

  if (!activeClub) {
    return (
      <div className="text-center py-12 text-gray-500" data-testid="club-settings-no-club">
        No club connected. Sign in and create or join a club first.
      </div>
    );
  }

  const isOwnerOrAdmin = role === 'owner' || role === 'admin';

  return (
    <div className="space-y-6" data-testid="club-settings-panel">

      {/* Club identity */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Your Club</h3>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${PLAN_COLORS[plan]}`}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
          </span>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
            style={{ backgroundColor: activeClub.primaryColor ?? '#4f46e5' }}
            data-testid="club-color-swatch"
          >
            {activeClub.shortName?.slice(0, 3) ?? activeClub.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            {isEditingName && isOwnerOrAdmin ? (
              <div className="flex items-center gap-2">
                <input
                  data-testid="edit-club-name-input"
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="flex-1 bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <button
                  data-testid="save-club-name-btn"
                  onClick={handleSaveName}
                  disabled={isSaving || !editName.trim()}
                  className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded disabled:opacity-50"
                >
                  {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-1 text-gray-400 hover:text-white rounded"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-bold text-white truncate" data-testid="club-name">
                  {activeClub.name}
                </span>
                {isOwnerOrAdmin && (
                  <button
                    data-testid="edit-club-name-btn"
                    onClick={() => { setEditName(activeClub.name); setIsEditingName(true); }}
                    className="p-1 text-gray-500 hover:text-white rounded"
                  >
                    <Edit2 size={12} />
                  </button>
                )}
              </div>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              {ROLE_ICONS[role ?? 'viewer']}
              <span className="text-xs text-gray-400 capitalize">{role}</span>
            </div>
          </div>
        </div>

        {/* Club ID */}
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Club ID</span>
            <span className="text-xs text-gray-500">Share this to invite members</span>
          </div>
          <div className="flex items-center gap-2">
            <code
              data-testid="club-id-display"
              className="flex-1 text-xs text-gray-300 font-mono truncate"
            >
              {activeClub.id}
            </code>
            <button
              data-testid="copy-club-id-btn"
              onClick={handleCopyId}
              className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded text-xs font-semibold transition-colors shrink-0"
            >
              {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Members */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Users size={14} /> Members
          </h3>
          <button
            data-testid="refresh-members-btn"
            onClick={loadMembers}
            disabled={membersLoading}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <RefreshCw size={14} className={membersLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {membersError && (
          <div className="flex items-center gap-2 text-red-400 text-sm mb-3" data-testid="members-error">
            <AlertCircle size={14} /> {membersError}
          </div>
        )}

        {membersLoading ? (
          <div className="flex justify-center py-4" data-testid="members-loading">
            <Loader2 size={20} className="animate-spin text-gray-500" />
          </div>
        ) : (
          <div className="space-y-2">
            {members.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-2">No members found</p>
            ) : (
              members.map(member => (
                <div
                  key={member.id}
                  data-testid={`member-row-${member.id}`}
                  className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {ROLE_ICONS[member.role]}
                    <span className="text-sm text-gray-300 font-mono truncate text-xs">
                      {member.user_id.slice(0, 12)}…
                    </span>
                    <span className="text-xs text-gray-500 capitalize">{member.role}</span>
                  </div>
                  {isOwnerOrAdmin && member.role !== 'owner' && (
                    <button
                      data-testid={`remove-member-${member.id}`}
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors ml-2 shrink-0"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Plan info */}
      {plan === 'free' || plan === 'starter' ? (
        <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-700/40 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">Upgrade your plan</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Unlock AI analysis, broadcasting, and more
              </p>
            </div>
            <button
              data-testid="upgrade-plan-btn"
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors"
            >
              Upgrade <ChevronRight size={12} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default ClubSettingsPanel;
