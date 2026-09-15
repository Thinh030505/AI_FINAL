import React, { useEffect, useState } from 'react';
import { getBackendHealth } from '../services/healthService';
import { HealthResponse } from '../types';
import { Activity, Database, Cpu, CheckCircle2, XCircle } from 'lucide-react';

export const HealthStatus: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    setLoading(true);
    const data = await getBackendHealth();
    setHealth(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !health) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-full border border-slate-800 animate-pulse">
        <Activity className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
        Checking system health...
      </div>
    );
  }

  const isBackendOk = health?.status === 'ok';
  const isDbOk = health?.database === 'connected';
  const isAiOk = health?.ai_service === 'connected';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Backend Status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isBackendOk ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'}`}>
        <Activity className="w-3.5 h-3.5" />
        <span>Backend: {isBackendOk ? 'Online' : 'Offline'}</span>
      </div>

      {/* Database Status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isDbOk ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
        <Database className="w-3.5 h-3.5" />
        <span>MongoDB: {isDbOk ? 'Connected' : 'Standby'}</span>
      </div>

      {/* AI Service Status */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${isAiOk ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
        <Cpu className="w-3.5 h-3.5" />
        <span>AI Service: {isAiOk ? 'Ready' : 'Standby'}</span>
      </div>
    </div>
  );
};
