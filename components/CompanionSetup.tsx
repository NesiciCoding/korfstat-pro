import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDialog } from '../hooks/useDialog';
import { Copy, Download, CheckCircle, XCircle, RefreshCw, Wifi, Zap, ChevronDown, ChevronUp, ExternalLink, ShieldCheck } from 'lucide-react';

interface SetupInfo {
  serverUrl: string;
  serverPort: number;
  token: string;
  localIp: string;
  hostname: string;
}

interface ConnectionStatus {
  connected: boolean;
  active: boolean;
  scoreDisplay?: string;
  checking: boolean;
}

const COMPANION_DOWNLOAD_URL = 'https://bitfocus.io/companion';

interface CompanionSetupProps {
  onNavigate?: (view: any) => void;
}

const CompanionSetup: React.FC<CompanionSetupProps> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const { alert } = useDialog();
  const [setupInfo, setSetupInfo] = useState<SetupInfo | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>({ connected: false, active: false, checking: true });
  const [copied, setCopied] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [downloadSucceeded, setDownloadSucceeded] = useState(false);
  const [companionUrl, setCompanionUrl] = useState('');
  const [pushSaved, setPushSaved] = useState(false);
  const [pushError, setPushError] = useState('');

  const serverBase = `${window.location.protocol}//${window.location.hostname}:3002`;

  // Fetch setup info (token, IPs) from the server
  const fetchSetupInfo = useCallback(async () => {
    try {
      const res = await fetch(`${serverBase}/api/companion/setup-info`);
      if (res.ok) {
        const data = await res.json();
        setSetupInfo(data);
        // Pre-populate from server's stored value
        if (data.companionUrl) setCompanionUrl(data.companionUrl);
      }
    } catch {
      // Server may not be running locally
    }
  }, [serverBase]);

  // Save push URL to server
  const savePushUrl = useCallback(async () => {
    setPushError('');
    try {
      const token = setupInfo?.token || 'korfstat';
      const res = await fetch(`${serverBase}/api/companion/configure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Companion-Token': token },
        body: JSON.stringify({ companionUrl }),
      });
      if (!res.ok) throw new Error('Server rejected the request');
      setPushSaved(true);
      setTimeout(() => setPushSaved(false), 3000);
    } catch (e: any) {
      setPushError(e?.message || 'Failed to save');
    }
  }, [serverBase, companionUrl, setupInfo?.token]);

  // Poll connection status every 3 seconds
  const checkStatus = useCallback(async () => {
    setStatus(s => ({ ...s, checking: true }));
    try {
      const token = setupInfo?.token || 'korfstat';
      const res = await fetch(`${serverBase}/api/companion/status`, {
        headers: { 'X-Companion-Token': token },
      });
      if (res.ok) {
        const data = await res.json();
        setStatus({ connected: true, active: data.active, scoreDisplay: data.scoreDisplay, checking: false });
      } else {
        setStatus({ connected: false, active: false, checking: false });
      }
    } catch {
      setStatus({ connected: false, active: false, checking: false });
    }
  }, [serverBase, setupInfo?.token]);

  useEffect(() => {
    fetchSetupInfo();
  }, [fetchSetupInfo]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const downloadProfile = async () => {
    try {
      const token = setupInfo?.token || 'korfstat';
      const res = await fetch(`${serverBase}/api/companion/korfstat.companionconfig`, {
        headers: { 'X-Companion-Token': token },
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'korfstat-pro-v9.companionconfig';
      a.click();
      URL.revokeObjectURL(url);
      setDownloadSucceeded(true);
      setTimeout(() => setDownloadSucceeded(false), 3000);
    } catch {
      await alert('Could not download profile — ensure the server is running.');
    }
  };

  // Build the connection string encoded into a QR code
  const connectionString = setupInfo
    ? `korfstat://${setupInfo.localIp}:${setupInfo.serverPort}?token=${setupInfo.token}`
    : `${serverBase}`;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(connectionString)}&bgcolor=1e293b&color=e2e8f0&margin=2`;

  const InfoRow = ({ label, value, copyKey }: { label: string; value: string; copyKey: string }) => (
    <div className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2 border border-gray-700">
      <div>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-mono text-emerald-400">{value}</p>
      </div>
      <button
        onClick={() => copy(value, copyKey)}
        className="p-1.5 text-gray-400 hover:text-white transition-colors rounded"
        title="Copy"
      >
        {copied === copyKey ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Master Dashboard Entry */}
      {onNavigate && (
        <button
          onClick={() => onNavigate('COMPANION_DASHBOARD')}
          className="w-full flex items-center justify-between p-4 bg-indigo-900 shadow-lg shadow-indigo-900/20 border-2 border-indigo-500 rounded-xl group transition-all hover:bg-indigo-800 hover:-translate-y-0.5 active:translate-y-0"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
              <ShieldCheck className="text-white" size={20} />
            </div>
            <div className="text-left">
              <p className="text-xs font-black text-indigo-300 uppercase tracking-widest leading-none mb-1">Advanced Control</p>
              <h3 className="text-sm font-bold text-white">Open Master Companion Dashboard</h3>
            </div>
          </div>
          <ExternalLink size={18} className="text-indigo-400 group-hover:text-white group-hover:translate-x-1 transition-all" />
        </button>
      )}

      {/* Status Bar */}
      <div className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${status.checking
          ? 'bg-gray-800/60 border-gray-700 text-gray-400'
          : status.connected
            ? 'bg-emerald-900/30 border-emerald-700/60 text-emerald-400'
            : 'bg-red-900/20 border-red-700/40 text-red-400'
        }`}>
        {status.checking ? (
          <RefreshCw size={15} className="animate-spin" />
        ) : status.connected ? (
          <CheckCircle size={15} />
        ) : (
          <XCircle size={15} />
        )}
        <span>
          {status.checking
            ? 'Checking server…'
            : status.connected
              ? status.active
                ? `Server online · Match active · ${status.scoreDisplay}`
                : 'Server online · No active match'
              : 'Server offline — start the server first'}
        </span>
        <button onClick={checkStatus} className="ml-auto opacity-60 hover:opacity-100 transition-opacity">
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Main Layout: QR + Info */}
      <div className="flex gap-4">
        {/* QR Code */}
        <div className="flex-shrink-0 bg-gray-900/70 border border-gray-700 rounded-xl p-3 flex flex-col items-center gap-2">
          <img
            src={qrUrl}
            alt="Companion QR Code"
            className="rounded-lg w-[100px] h-[100px]"
            style={{ imageRendering: 'pixelated' }}
          />
          <p className="text-[10px] text-gray-500 text-center leading-tight">Scan in<br />Companion</p>
        </div>

        {/* Connection Details */}
        <div className="flex-1 space-y-2">
          <InfoRow
            label="Server URL"
            value={setupInfo ? `http://${setupInfo.localIp}:${setupInfo.serverPort}` : serverBase}
            copyKey="url"
          />
          <InfoRow
            label="Auth Token (X-Companion-Token)"
            value={setupInfo?.token ?? 'korfstat'}
            copyKey="token"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={downloadProfile}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${downloadSucceeded
              ? 'bg-emerald-600 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
        >
          {downloadSucceeded ? <CheckCircle size={16} /> : <Download size={16} />}
          {downloadSucceeded ? 'Downloaded!' : 'Download Companion Profile'}
        </button>
        <a
          href={COMPANION_DOWNLOAD_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm bg-gray-700 hover:bg-gray-600 text-gray-200 transition-colors"
        >
          <ExternalLink size={16} />
          Get Companion
        </a>
      </div>

      {/* Push-to-Companion URL */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-3 space-y-2">
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
            📡 Instant Push — Companion URL
          </p>
          <p className="text-[11px] text-gray-500 leading-snug mb-2">
            Set your Companion address (e.g. <code className="text-gray-400">http://localhost:8888</code>) to push live variables instantly on every match event — no polling delay.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            placeholder="http://localhost:8888"
            value={companionUrl}
            onChange={e => setCompanionUrl(e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-200 font-mono placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={savePushUrl}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${pushSaved
                ? 'bg-emerald-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
          >
            {pushSaved ? <CheckCircle size={16} /> : 'Save'}
          </button>
        </div>
        {pushError && <p className="text-xs text-red-400">{pushError}</p>}
        {companionUrl && (
          <p className="text-[11px] text-emerald-500">
            ✓ Variables will be pushed to Companion at: <code>{companionUrl}</code>
          </p>
        )}
      </div>

      {/* Step-by-step Guide (collapsible) */}
      <button
        onClick={() => setShowGuide(g => !g)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 transition-colors"
      >
        <span className="flex items-center gap-2 font-medium">
          <Zap size={15} className="text-yellow-400" />
          Setup Guide (5 steps)
        </span>
        {showGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>

      {showGuide && (
        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 space-y-3 text-sm text-gray-300">
          {[
            {
              n: 1,
              title: 'Install Bitfocus Companion',
              body: 'Download from bitfocus.io/companion and install on the same machine as this server (or any machine on the same local network).',
            },
            {
              n: 2,
              title: 'Add a "Generic HTTP" connection',
              body: `In Companion's web UI (port 8888), go to Connections → Add. Search for "Generic HTTP". Set Base URL to: http://${setupInfo?.localIp ?? window.location.hostname}:3002 and add a default header X-Companion-Token = ${setupInfo?.token ?? 'korfstat'}.`,
            },
            {
              n: 3,
              title: 'Import the KorfStat Profile',
              body: 'Click "Download Companion Profile" above, then in Companion go to Settings → Import/Export → Import and select the downloaded file. You\'ll get a ready-made 15-button layout.',
            },
            {
              n: 4,
              title: 'Set up variables for live labels',
              body: `The profile includes triggers that automatically poll KorfStat. Use variables like $(custom:ks_home) or $(custom:ks_match) in button labels so your Stream Deck always shows the live match state.`,
            },
            {
              n: 5,
              title: 'Test without hardware',
              body: 'In Companion go to Emulator (the grid icon). You can click virtual buttons to test all actions. No physical device required.',
            },
          ].map(step => (
            <div key={step.n} className="flex gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600/80 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {step.n}
              </div>
              <div>
                <p className="font-semibold text-gray-200">{step.title}</p>
                <p className="text-gray-400 text-xs leading-relaxed mt-0.5">{step.body}</p>
              </div>
            </div>
          ))}

          {/* Variable reference table */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Wifi size={12} /> Live Variable Reference
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {[
                'ks_home',
                'ks_away',
                'ks_match',
                'ks_shotclock',
                'ks_period',
                'ks_fouls_home',
                'ks_fouls_away',
                'ks_name_home',
                'ks_name_away',
                'ks_last_event',
                'ks_running'
              ].map((varName) => (
                <div key={varName} className="flex items-baseline gap-1 text-[11px]">
                  <code className="text-emerald-400 font-mono shrink-0">$(internal:custom_{varName})</code>
                  <span className="text-gray-500">— {t(`settings.companion_vars.${varName}`)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanionSetup;
