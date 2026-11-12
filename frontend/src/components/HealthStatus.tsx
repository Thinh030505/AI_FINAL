import React, { useEffect, useState, useRef } from 'react';
import { getBackendHealth } from '../services/healthService';
import { HealthResponse } from '../types';
import { Sparkles } from 'lucide-react';

export const HealthStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    const data = await getBackendHealth();
    setHealth(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowDetails(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isBackendOk = health?.status === 'ok';
  const isDbOk = health?.database === 'connected';
  const isAiOk = health?.ai_service === 'connected';
  const isAllGood = isBackendOk && isDbOk && isAiOk;

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all shadow-subtle"
        title="Platform service status"
      >
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            loading
              ? 'bg-amber-400 animate-pulse'
              : isAllGood
              ? 'bg-emerald-500'
              : 'bg-amber-500'
          }`}
        />
        <span className="hidden xl:inline text-slate-600 font-medium">
          {loading ? 'Checking status...' : isAllGood ? 'All features ready' : 'Reconnecting...'}
        </span>
      </button>

      {/* User-friendly Popover Details */}
      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-elevated border border-slate-200 p-3.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100">
            <span className="font-semibold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Platform Status
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                isAllGood ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isAllGood ? 'Ready to Learn' : 'Connecting'}
            </span>
          </div>

          <div className="space-y-2 text-slate-600 text-xs">
            <div className="flex items-center justify-between">
              <span>Object & Vocabulary Studio</span>
              <span className={`font-semibold ${isAllGood ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isAllGood ? 'Available' : 'Connecting'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Live Smart Camera</span>
              <span className={`font-semibold ${isAllGood ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isAllGood ? 'Available' : 'Connecting'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Text & OCR Translation</span>
              <span className={`font-semibold ${isAllGood ? 'text-emerald-600' : 'text-amber-600'}`}>
                {isAllGood ? 'Available' : 'Connecting'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthStatus;
