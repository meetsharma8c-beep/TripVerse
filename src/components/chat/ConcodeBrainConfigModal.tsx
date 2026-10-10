import React, { useState, useEffect } from 'react';
import { 
  X, 
  Server, 
  Cpu, 
  Zap, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { 
  getStoredConcodeConfig, 
  saveConcodeConfig, 
  removeConcodeConfig, 
  checkBrainStatus 
} from '../../services/concodeBrainService';
import { triggerHaptic } from '../../services/deviceService';

interface ConcodeBrainConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const ConcodeBrainConfigModal: React.FC<ConcodeBrainConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved
}) => {
  const [url, setUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    latency?: number;
    gpu?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getStoredConcodeConfig();
      setUrl(config?.url || '');
      setApiKey(config?.apiKey || '');
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTest = async () => {
    const trimmedUrl = url.trim().replace(/\/$/, '');
    if (!trimmedUrl) {
      setTestResult({
        success: false,
        message: 'Please enter a valid HTTP/HTTPS URL (e.g. your Kaggle Cloudflare Tunnel or ngrok URL).'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    triggerHaptic('light');

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7_000);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'TripVerse-Client/1.0'
      };
      if (apiKey.trim()) {
        headers['X-API-Key'] = apiKey.trim();
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const res = await fetch(`${trimmedUrl}/health`, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      clearTimeout(timeout);

      const elapsed = Date.now() - start;
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        const gpuInfo = data.gpu || data.device || 'NVIDIA GPU';
        setTestResult({
          success: true,
          message: `Connected successfully! Kaggle Brain is online.`,
          latency: elapsed,
          gpu: gpuInfo
        });
        triggerHaptic('success');
      } else {
        setTestResult({
          success: false,
          message: `Endpoint responded with HTTP ${res.status}. Check your Kaggle notebook server.`,
          latency: elapsed
        });
        triggerHaptic('warning');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.name === 'AbortError' 
          ? 'Connection timed out. Ensure your Kaggle notebook is active and tunnel is running.'
          : (err?.message || 'Failed to connect to endpoint.')
      });
      triggerHaptic('warning');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = () => {
    const trimmedUrl = url.trim().replace(/\/$/, '');
    if (!trimmedUrl) {
      removeConcodeConfig();
    } else {
      saveConcodeConfig({
        url: trimmedUrl,
        apiKey: apiKey.trim() || undefined
      });
    }
    triggerHaptic('success');
    if (onSaved) onSaved();
    onClose();
  };

  const handleClear = () => {
    removeConcodeConfig();
    setUrl('');
    setApiKey('');
    setTestResult(null);
    triggerHaptic('light');
    if (onSaved) onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90dvh] animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm">ConCode AI Brain Gateway</h3>
              <p className="text-[11px] text-slate-300">Kaggle GPU & Model API Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 overflow-y-auto text-sm">
          {/* Architecture Badge */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-xs text-emerald-950 leading-relaxed">
              <span className="font-bold text-emerald-800">Genuine End-to-End AI:</span> Connects TripVerse directly to your ConCode reasoning model hosted on Kaggle GPU.
            </div>
          </div>

          {/* Endpoint URL Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>Kaggle API URL (Tunnel Endpoint)</span>
              <span className="text-[10px] text-slate-400 font-normal">Cloudflare / ngrok / localtunnel</span>
            </label>
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xxxx.trycloudflare.com or https://xxxx.ngrok-free.app"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              <Server className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>
            <p className="text-[11px] text-slate-500">
              Paste the public HTTPS URL printed by your Kaggle notebook tunnel.
            </p>
          </div>

          {/* API Key (Optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span>API Key / Secret Token (Optional)</span>
              <span className="text-[10px] text-slate-400 font-normal">Optional</span>
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="e.g. your-kaggle-secret-token"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Test Status Banner */}
          {testResult && (
            <div 
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
                testResult.success 
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                  : 'bg-red-50 border-red-300 text-red-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latency !== undefined && (
                  <p className="text-[11px] text-slate-600 font-mono">
                    Roundtrip Latency: {testResult.latency}ms
                    {testResult.gpu ? ` • Hardware: ${testResult.gpu}` : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Quick Setup Instructions Box */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>How to deploy on Kaggle GPU</span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[11px] text-slate-600">
              <li>Open your Kaggle notebook with <strong>GPU T4 x 2</strong> or <strong>P100</strong> enabled.</li>
              <li>Run the ConCode FastAPI server script (located in <code className="bg-slate-200 px-1 rounded text-slate-800">scripts/kaggle_concode_brain.py</code>).</li>
              <li>Copy the public Cloudflare or ngrok tunnel URL output.</li>
              <li>Paste it into the box above and click <strong>Test Connection</strong>.</li>
            </ol>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3 sm:p-4 bg-slate-100 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleClear}
            className="w-full sm:w-auto px-3 py-2 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer font-medium border border-transparent hover:border-red-200"
            title="Reset to default local proxy"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !url.trim()}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-emerald-600' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-xl bg-[#2D5A3D] hover:bg-[#244931] text-white transition-colors cursor-pointer shadow-xs active:scale-95 text-center"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
