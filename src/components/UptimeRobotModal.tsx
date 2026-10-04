import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Globe, 
  Radio, 
  RefreshCw, 
  Server, 
  ShieldCheck, 
  X,
  Zap,
  Clock,
  Database
} from 'lucide-react';

interface HeartbeatLog {
  id: string;
  timestamp: string;
  source: string;
  userAgent: string;
  ip: string;
  responseTimeMs: number;
}

interface UptimeMetrics {
  success: boolean;
  status: string;
  operational: boolean;
  uptimeSeconds: number;
  uptimeFormatted: string;
  bootTime: string;
  totalHeartbeats: number;
  lastHeartbeatTime: string | null;
  lastHeartbeatUserAgent: string | null;
  lastHeartbeatIp: string | null;
  recentLogs: HeartbeatLog[];
  activePositionsCount: number;
  activePredictionsCount: number;
}

interface UptimeRobotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UptimeRobotModal: React.FC<UptimeRobotModalProps> = ({ isOpen, onClose }) => {
  const [metrics, setMetrics] = useState<UptimeMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [testingPing, setTestingPing] = useState(false);
  const [testResult, setTestResult] = useState<{ status: string; ms: number; time: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Construct target URL for UptimeRobot
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://ais-pre-li7ezaooehxqdz4alry4eg-53902426265.asia-east1.run.app';
  const healthUrl = `${currentOrigin}/api/health`;

  // Fetch metrics
  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/uptime/metrics');
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Failed to fetch uptime metrics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(healthUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleTestPing = async () => {
    try {
      setTestingPing(true);
      const start = performance.now();
      const res = await fetch('/api/uptime/test-ping', { method: 'POST' });
      const data = await res.json();
      const duration = Math.round(performance.now() - start);
      setTestResult({
        status: data.statusCode === 200 ? '200 OK' : 'Failed',
        ms: duration,
        time: new Date().toLocaleTimeString(),
      });
      fetchMetrics();
    } catch (err) {
      setTestResult({
        status: 'Error connecting',
        ms: 0,
        time: new Date().toLocaleTimeString(),
      });
    } finally {
      setTestingPing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950/30 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Radio className="w-5 h-5 animate-pulse text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">UptimeRobot 24/7 Heartbeat Command Center</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Ping Guard
                </span>
              </div>
              <p className="text-xs text-slate-400">Keeps your cloud application awake and running without sleep cycles</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Status Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-emerald-400" />
                Server Status
              </div>
              <div className="mt-1 text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                Active (24/7)
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Zero Cloud Sleep</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Continuous Uptime
              </div>
              <div className="mt-1 text-sm font-bold text-white font-mono">
                {metrics?.uptimeFormatted || 'Calculating...'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Since last container reboot</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                Total Heartbeats
              </div>
              <div className="mt-1 text-sm font-bold text-amber-300 font-mono">
                {metrics?.totalHeartbeats ?? 0}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Pings registered</div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/70">
              <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-cyan-400" />
                Cloud Database
              </div>
              <div className="mt-1 text-sm font-bold text-cyan-300">
                Connected
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Auto-synced on ping</div>
            </div>
          </div>

          {/* Webhook URL Box */}
          <div className="bg-slate-950/80 border border-indigo-900/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Your UptimeRobot Ping URL (HTTP GET / HEAD)
              </label>
              <span className="text-[11px] text-emerald-400 font-medium">Ready for monitoring</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={healthUrl}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-indigo-200 select-all focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 shadow-sm"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-400">
              <span>Returns: <code className="text-emerald-400 font-mono">200 OK</code> with system health &amp; active trades audit</span>
              <button
                onClick={handleTestPing}
                disabled={testingPing}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <Zap className={`w-3 h-3 text-amber-400 ${testingPing ? 'animate-spin' : ''}`} />
                <span>{testingPing ? 'Pinging...' : 'Send Test Ping Now'}</span>
              </button>
            </div>

            {testResult && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between animate-in fade-in">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Heartbeat acknowledged: <strong>{testResult.status}</strong>
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Latency: <span className="text-emerald-300 font-semibold">{testResult.ms}ms</span> at {testResult.time}
                </span>
              </div>
            )}
          </div>

          {/* 3-Step Setup Instructions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                How to set up Free UptimeRobot in 60 seconds
              </h3>
              <a 
                href="https://uptimerobot.com" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                <span>Open uptimerobot.com</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                  1
                </div>
                <div className="font-semibold text-slate-200">Create Free Account</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Sign up for free at <strong className="text-slate-300">uptimerobot.com</strong> (no credit card required, includes 50 free monitors).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                  2
                </div>
                <div className="font-semibold text-slate-200">Add New Monitor</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Click <strong className="text-slate-300">+ Add New Monitor</strong>. Set Monitor Type to <strong className="text-indigo-300">HTTP(s)</strong>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1.5">
                <div className="w-5 h-5 rounded-full bg-indigo-600/30 text-indigo-400 font-bold flex items-center justify-center text-[11px]">
                  3
                </div>
                <div className="font-semibold text-slate-200">Paste URL &amp; Interval</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Paste the URL above, set Monitoring Interval to <strong className="text-emerald-300">5 minutes</strong>, and click Create.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Heartbeat Logs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-medium text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                Live Heartbeat Activity Feed
              </span>
              <button 
                onClick={fetchMetrics}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] hover:text-white transition-colors"
              >
                <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {metrics && metrics.recentLogs && metrics.recentLogs.length > 0 ? (
                <div className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {metrics.recentLogs.map((log) => (
                    <div key={log.id} className="px-3.5 py-2 flex items-center justify-between hover:bg-slate-900/60 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span className="text-slate-300 font-medium">{log.source}</span>
                        <span className="text-slate-500 text-[10px] hidden sm:inline">({log.ip})</span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <span className="text-emerald-400 text-[10px] font-semibold">{log.responseTimeMs}ms</span>
                        <span className="text-slate-500 text-[10px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-xs text-slate-500">
                  No heartbeats recorded yet. Click &quot;Send Test Ping Now&quot; above to log the first heartbeat.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Automatic cloud sleep prevention enabled</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
