import React, { useState } from 'react';
import { Trophy, Users, ArrowRight, Check, Loader2, AlertCircle, Palette } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useClub } from '../contexts/ClubContext';

type Step = 'WELCOME' | 'CREATE' | 'JOIN' | 'SUCCESS';

const PRESET_COLORS = [
  '#4f46e5', '#0ea5e9', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#6366f1', '#84cc16', '#64748b',
];

const ClubOnboarding: React.FC = () => {
  const { refreshClub } = useClub();
  const [step, setStep] = useState<Step>('WELCOME');
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4f46e5');
  const [inviteCode, setInviteCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdClubName, setCreatedClubName] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error: rpcError } = await supabase.rpc('create_club_with_owner', {
        p_name: name.trim(),
        p_short_name: shortName.trim() || null,
        p_primary_color: primaryColor,
      });
      if (rpcError) throw rpcError;
      setCreatedClubName(name.trim());
      let success = await refreshClub();
      if (!success) {
        // Wait briefly for DB trigger/replication in edge cases
        await new Promise(r => setTimeout(r, 1000));
        await refreshClub();
      }
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message ?? 'Failed to create club. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      // Invite code = club_id (UUID) for now — extend to invite tokens later
      const { data: club, error: clubError } = await supabase
        .from('clubs')
        .select('id, name')
        .eq('id', inviteCode.trim())
        .single();

      if (clubError || !club) throw new Error('Club not found. Check the invite code and try again.');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error: memberError } = await supabase
        .from('club_members')
        .insert({ club_id: club.id, user_id: user.id, role: 'scorer' });

      if (memberError) {
        if (memberError.code === '23505') throw new Error('You are already a member of this club.');
        throw memberError;
      }

      setCreatedClubName(club.name);
      let success = await refreshClub();
      if (!success) {
        await new Promise(r => setTimeout(r, 1000));
        await refreshClub();
      }
      setStep('SUCCESS');
    } catch (err: any) {
      setError(err.message ?? 'Failed to join club. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* WELCOME */}
        {step === 'WELCOME' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Trophy size={40} className="text-indigo-400" />
            </div>
            <h1 className="text-3xl font-black text-white mb-2">Welcome to KorfStat Pro</h1>
            <p className="text-gray-400 mb-8">
              All features are organised around a <span className="text-indigo-400 font-semibold">Club</span>.
              Create yours to get started, or join an existing one.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => setStep('CREATE')}
                className="w-full flex items-center justify-between bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-4 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Trophy size={20} />
                  Create a new club
                </span>
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setStep('JOIN')}
                className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 text-gray-200 font-bold px-6 py-4 rounded-xl transition-colors"
              >
                <span className="flex items-center gap-3">
                  <Users size={20} />
                  Join an existing club
                </span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* CREATE */}
        {step === 'CREATE' && (
          <div>
            <button onClick={() => { setStep('WELCOME'); setError(null); }} className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-2xl font-black text-white mb-1">Create your club</h2>
            <p className="text-gray-400 text-sm mb-6">You'll be the owner and can invite others later.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Club name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sporting Club Amsterdam"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                  maxLength={80}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Short name / abbreviation</label>
                <input
                  type="text"
                  value={shortName}
                  onChange={e => setShortName(e.target.value)}
                  placeholder="e.g. SCA"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2 flex items-center gap-2">
                  <Palette size={14} /> Club colour
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setPrimaryColor(c)}
                      className={`w-8 h-8 rounded-lg transition-transform ${primaryColor === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-gray-900' : 'hover:scale-110'}`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={e => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
                  />
                  <span className="text-gray-400 text-sm font-mono">{primaryColor}</span>
                  <div className="flex-1 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleCreate}
                disabled={!name.trim() || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-4 rounded-xl transition-colors"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {isLoading ? 'Creating club…' : 'Create club'}
              </button>
            </div>
          </div>
        )}

        {/* JOIN */}
        {step === 'JOIN' && (
          <div>
            <button onClick={() => { setStep('WELCOME'); setError(null); }} className="text-gray-500 hover:text-gray-300 text-sm mb-6 flex items-center gap-1">
              ← Back
            </button>
            <h2 className="text-2xl font-black text-white mb-1">Join a club</h2>
            <p className="text-gray-400 text-sm mb-6">
              Ask your club's owner for the <span className="font-semibold text-white">Club ID</span> (found in Club Settings).
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Club ID <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-gray-500 font-mono text-sm"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-red-900/30 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                onClick={handleJoin}
                disabled={!inviteCode.trim() || isLoading}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-4 rounded-xl transition-colors"
              >
                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Users size={20} />}
                {isLoading ? 'Joining club…' : 'Join club'}
              </button>
            </div>
          </div>
        )}

        {/* SUCCESS */}
        {step === 'SUCCESS' && (
          <div className="text-center">
            <div className="w-20 h-20 bg-green-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Check size={40} className="text-green-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-2">You're in!</h2>
            <p className="text-gray-400 mb-2">
              <span className="text-white font-semibold">{createdClubName}</span> is ready to go.
            </p>
            <p className="text-gray-500 text-sm mb-8">
              Your free plan includes match tracking, basic stats, and match history.
              Upgrade anytime in Club Settings.
            </p>
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-gray-600 text-xs mt-3">Loading your dashboard…</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default ClubOnboarding;
