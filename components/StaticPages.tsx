import React from 'react';
import { 
  ArrowLeft, 
  Shield, 
  HelpCircle, 
  Book, 
  Info, 
  Mail, 
  Github, 
  Twitter, 
  Globe,
  Zap,
  Lock,
  MessageSquare,
  Code,
  Terminal,
  Database,
  Cpu
} from 'lucide-react';

interface StaticPagesProps {
  view: 'ABOUT' | 'PRIVACY' | 'SUPPORT' | 'API_DOCS';
  onBack: () => void;
}

export default function StaticPages({ view, onBack }: StaticPagesProps) {
  const renderHeader = (title: string, subtitle: string, icon: React.ReactNode) => (
    <div className="relative pt-20 pb-12 mb-12 border-b border-white/10">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
      <button 
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors group"
      >
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
        Back to Landing
      </button>
      <div className="flex items-center gap-6">
        <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
          {icon}
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tight">{title}</h1>
          <p className="text-zinc-400 text-lg mt-1">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-12 text-zinc-300 leading-relaxed">
      {renderHeader("About KorfStat Pro", "Elevating the sport of Korfball through data.", <Info size={32} />)}
      
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Our Vision</h2>
          <p>
            KorfStat Pro was born out of a passion for Korfball and a desire to bring professional-grade analytics to every level of the game. Whether you're coaching a local club or a national team, data-driven decisions shouldn't be a luxury.
          </p>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">The Platform</h2>
          <p>
            Built with modern web technologies and AI, KorfStat Pro provides real-time match tracking, automated scouting reports, and seamless cloud synchronization. We focus on visual excellence and intuitive UX, so you can focus on the game.
          </p>
        </div>
      </section>

      <section className="bg-zinc-900/50 rounded-3xl p-8 border border-white/5">
        <h2 className="text-2xl font-bold text-white mb-6">Built by NesiciCoding</h2>
        <div className="flex flex-wrap gap-8 items-center">
          <div className="flex items-center gap-3 text-zinc-500">
            <Globe size={20} />
            <span>Official Website Coming Soon</span>
          </div>
          <div className="flex items-center gap-3">
            <Github size={20} className="text-zinc-500" />
            <a href="#" className="hover:text-indigo-400 transition-colors">@nesici-coding</a>
          </div>
          <div className="flex items-center gap-3">
            <Twitter size={20} className="text-zinc-500" />
            <a href="#" className="hover:text-indigo-400 transition-colors">@KorfStatPro</a>
          </div>
        </div>
      </section>
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-12 text-zinc-300 leading-relaxed">
      {renderHeader("Privacy Policy", "Transparent data practices for athlete security.", <Shield size={32} />)}
      
      <div className="prose prose-invert max-w-none">
        <section className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Database className="text-indigo-400" size={20} />
            Data Ownership
          </h3>
          <p>
            Your match data belongs to you. KorfStat Pro acts as a processor, storing your data in a secure Supabase instance protected by Row Level Security (RLS). We do not sell or share your match statistics with third parties.
          </p>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Lock className="text-indigo-400" size={20} />
            Security Measures
          </h3>
          <p>
            All cloud communication is encrypted via SSL/TLS. Passwords are never stored in plain text and are managed by Supabase Auth (BCrypt hashing). Local match data in your browser is inaccessible to other websites.
          </p>
        </section>

        <section className="mb-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-3">
            <Cpu className="text-indigo-400" size={20} />
            AI Processing
          </h3>
          <p>
            When using AI features (Scouting Reports, Analysis), only relevant anonymized match events are sent to Google Gemini for processing. No personal identifiers beyond player numbers are transmitted.
          </p>
        </section>
      </div>
    </div>
  );

  const renderSupport = () => (
    <div className="space-y-12 text-zinc-300 leading-relaxed">
      {renderHeader("Support Center", "We're here to help you win.", <HelpCircle size={32} />)}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
          <Mail className="text-indigo-400 mb-4" size={24} />
          <h3 className="text-lg font-bold text-white mb-2">Email Support</h3>
          <p className="text-sm text-zinc-500 mb-4">Direct assistance for clubs and officials.</p>
          <span className="text-indigo-400 font-bold italic">support@your-domain.com</span>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
          <MessageSquare className="text-indigo-400 mb-4" size={24} />
          <h3 className="text-lg font-bold text-white mb-2">Community & Feedback</h3>
          <p className="text-sm text-zinc-500 mb-4">Connect with other coaches and users.</p>
          <span className="text-indigo-400 font-bold italic">Discord link coming soon</span>
        </div>

        <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5 group hover:border-indigo-500/30 transition-all">
          <Book className="text-indigo-400 mb-4" size={24} />
          <h3 className="text-lg font-bold text-white mb-2">Documentation</h3>
          <p className="text-sm text-zinc-500 mb-4">Guides for every view and feature.</p>
          <button onClick={() => window.open('https://github.com/NesiciCoding/korfstat-pro/wiki')} className="text-indigo-400 font-bold hover:underline">Open Wiki</button>
        </div>
      </div>

      <section className="bg-zinc-900/30 rounded-3xl p-8 border border-white/5">
        <h2 className="text-2xl font-bold text-white mb-6">Frequently Asked Questions</h2>
        <div className="space-y-6">
          <div>
            <h4 className="font-bold text-indigo-300">How do I connect my Wear OS watch?</h4>
            <p className="text-sm text-zinc-500 mt-1">Ensure your watch is on the same Wi-Fi. Enter the Server IP shown in your Dashboard settings into the Ref-Watch app.</p>
          </div>
          <div>
            <h4 className="font-bold text-indigo-300">Can I use KorfStat Pro offline?</h4>
            <p className="text-sm text-zinc-500 mt-1">Yes! All core tracking features work completely offline via LocalStorage. Cloud sync will resume Once you're back online.</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderApiDocs = () => (
    <div className="space-y-12 text-zinc-300 leading-relaxed">
      {renderHeader("API Documentation", "Build custom integrations for your club.", <Code size={32} />)}
      
      <section className="space-y-6">
        <div className="bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5">
          <div className="bg-zinc-800/50 px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <Terminal size={18} className="text-indigo-400" />
            <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase">WebSocket (Real-time)</span>
          </div>
          <div className="p-6">
            <p className="text-sm text-zinc-400 mb-4">Connect to the local server on port 3002 to receive live match events.</p>
            <pre className="bg-black/40 p-4 rounded-xl text-xs font-mono text-indigo-300 overflow-x-auto">
{`// Join a specific match room
socket.emit('join-match', 'match-uuid');

// Listen for updates
socket.on('match-update', (state) => {
  console.log('Current Score:', state.homeTeam.score, '-', state.awayTeam.score);
});`}
            </pre>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-3xl overflow-hidden border border-white/5">
          <div className="bg-zinc-800/50 px-6 py-4 border-b border-white/5 flex items-center gap-3">
            <Database size={18} className="text-indigo-400" />
            <span className="text-sm font-bold tracking-widest text-zinc-400 uppercase">REST Endpoints</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-green-500/20 text-green-400 text-[10px] font-black rounded uppercase">GET</span>
              <code className="text-sm">/api/matches/active</code>
              <span className="text-xs text-zinc-500">— Returns list of running matches.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-[10px] font-black rounded uppercase">GET</span>
              <code className="text-sm">/health</code>
              <span className="text-xs text-zinc-500">— Server health check.</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 selection:bg-indigo-500/30 selection:text-indigo-200">
      <div className="max-w-4xl mx-auto px-6">
        {view === 'ABOUT' && renderAbout()}
        {view === 'PRIVACY' && renderPrivacy()}
        {view === 'SUPPORT' && renderSupport()}
        {view === 'API_DOCS' && renderApiDocs()}
      </div>
      
      {/* Mini Footer */}
      <div className="max-w-4xl mx-auto px-6 mt-24 pt-12 border-t border-white/5 flex items-center justify-between text-zinc-600 text-xs font-bold uppercase tracking-widest">
        <span>KorfStat Pro Informational</span>
        <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-white transition-colors">Back to top</button>
      </div>
    </div>
  );
}
