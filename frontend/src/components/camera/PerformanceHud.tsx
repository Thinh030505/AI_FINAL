import React, { useState } from 'react';
import { SmartCameraTiming, DeviceInfo } from '../../types/smartCamera';
import { CameraDiagnosticInfo, CameraLifecycleState } from './CameraPreview';
import {
  Activity,
  Cpu,
  Gauge,
  Layers,
  ChevronDown,
  ChevronUp,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Sliders,
} from 'lucide-react';

export type AIProcessingState = 'idle' | 'warming' | 'running' | 'degraded' | 'error' | 'offline';

interface PerformanceHudProps {
  cameraState: CameraLifecycleState;
  aiState: AIProcessingState;
  cameraFps: number;
  aiFps: number;
  resolution?: { width: number; height: number };
  timings?: SmartCameraTiming;
  device?: DeviceInfo;
  detectionCount: number;
  trackCount: number;
  skippedFrames: number;
  isInFlight: boolean;
  diagnostics?: CameraDiagnosticInfo;
}

export const PerformanceHud: React.FC<PerformanceHudProps> = ({
  cameraState,
  aiState,
  cameraFps,
  aiFps,
  resolution,
  timings,
  device,
  detectionCount,
  trackCount,
  skippedFrames,
  isInFlight,
  diagnostics,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const getCameraBadgeColor = () => {
    switch (cameraState) {
      case 'live':
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'error':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'idle':
        return 'text-slate-600 bg-slate-100 border-slate-200';
      default:
        return 'text-amber-700 bg-amber-50 border-amber-200';
    }
  };

  const getAiBadgeColor = () => {
    switch (aiState) {
      case 'running':
        return 'text-sky-700 bg-sky-50 border-sky-200';
      case 'warming':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'offline':
      case 'error':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-600 bg-slate-100 border-slate-200';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-40 bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-2.5 text-xs text-slate-800 shadow-elevated select-none transition-all duration-200 min-w-[280px] max-w-[340px]">
      {/* Compact Primary Strip */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to toggle diagnostic breakdown"
      >
        {/* Camera Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-semibold text-[11px] ${getCameraBadgeColor()}`}
        >
          <Activity className="w-3 h-3 animate-pulse" />
          <span>CAM {cameraFps} FPS</span>
        </div>

        {/* AI Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-semibold text-[11px] ${getAiBadgeColor()}`}
        >
          <Gauge className="w-3 h-3" />
          <span>AI {aiFps} FPS</span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-1 text-slate-600 font-mono text-[11px] ml-auto font-medium">
          <span>{timings?.totalMs ? `${Math.round(timings.totalMs)}ms` : '--'}</span>
        </div>

        <button
          className="text-slate-400 hover:text-slate-700 p-0.5 rounded-md hover:bg-slate-100 transition"
          aria-label={isExpanded ? 'Collapse HUD' : 'Expand HUD'}
        >
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Sub-strip summary info */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1.5 px-0.5">
        <span className="flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 text-indigo-600" />
          <span>
            {resolution && resolution.width > 0
              ? `${resolution.width}x${resolution.height}`
              : cameraState.toUpperCase()}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span>Objects: <strong className="text-slate-900">{detectionCount}</strong></span>
          <span className="text-slate-300">|</span>
          <span>In-flight: <strong className={isInFlight ? 'text-amber-600' : 'text-slate-600'}>{isInFlight ? 1 : 0}</strong></span>
          <span className="text-slate-300">|</span>
          <span>Skip: <strong className="text-slate-600">{skippedFrames}</strong></span>
        </span>
      </div>

      {/* Expanded Profiling & Diagnostic Details */}
      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2 font-mono text-[11px]">
          {/* Detailed Timings */}
          {timings ? (
            <div className="space-y-0.5 text-slate-600">
              <div className="flex justify-between">
                <span>Preprocess:</span>
                <span className="text-slate-800">{timings.preprocessMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>General YOLO:</span>
                <span className="text-indigo-600">{timings.generalDetectionMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Specialists:</span>
                <span className="text-purple-600">{timings.specialistMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Open-Vocab:</span>
                <span className="text-teal-600">{timings.openVocabMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-100 pt-1 text-slate-900">
                <span>Total Inference:</span>
                <span className="text-emerald-600">{timings.totalMs.toFixed(1)} ms</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-400 italic py-1 text-center">
              {aiState === 'offline' ? 'AI microservice offline. Camera running independently.' : 'Awaiting first inference frame...'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PerformanceHud;
