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

  // Status badges
  const getCameraBadgeColor = () => {
    switch (cameraState) {
      case 'live':
        return 'text-emerald-400 bg-emerald-950/60 border-emerald-700/50';
      case 'error':
        return 'text-rose-400 bg-rose-950/60 border-rose-700/50';
      case 'idle':
        return 'text-slate-400 bg-slate-800/60 border-slate-700/50';
      default:
        return 'text-amber-400 bg-amber-950/60 border-amber-700/50';
    }
  };

  const getAiBadgeColor = () => {
    switch (aiState) {
      case 'running':
        return 'text-sky-400 bg-sky-950/60 border-sky-700/50';
      case 'warming':
        return 'text-amber-400 bg-amber-950/60 border-amber-700/50';
      case 'offline':
      case 'error':
        return 'text-rose-400 bg-rose-950/60 border-rose-700/50';
      default:
        return 'text-slate-400 bg-slate-800/60 border-slate-700/50';
    }
  };

  return (
    <div className="absolute top-4 left-4 z-40 bg-slate-900/90 backdrop-blur-md border border-slate-700/70 rounded-2xl p-2.5 text-xs text-slate-200 shadow-2xl select-none transition-all duration-200 min-w-[290px] max-w-[340px]">
      {/* Compact Primary Strip */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to expand full diagnostic & latency breakdown"
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
        <div className="flex items-center gap-1 text-slate-300 font-mono text-[11px] ml-auto">
          <span>{timings?.totalMs ? `${Math.round(timings.totalMs)}ms` : '--'}</span>
        </div>

        <button
          className="text-slate-400 hover:text-white p-0.5 rounded-md hover:bg-slate-800 transition"
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
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1.5 px-0.5">
        <span className="flex items-center gap-1">
          <Radio className="w-2.5 h-2.5 text-indigo-400" />
          <span>
            {resolution && resolution.width > 0
              ? `${resolution.width}x${resolution.height}`
              : cameraState.toUpperCase()}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <span>Objects: <strong className="text-emerald-400">{detectionCount}</strong></span>
          <span className="text-slate-600">|</span>
          <span>In-flight: <strong className={isInFlight ? 'text-amber-400' : 'text-slate-300'}>{isInFlight ? 1 : 0}</strong></span>
          <span className="text-slate-600">|</span>
          <span>Skip: <strong className="text-slate-300">{skippedFrames}</strong></span>
        </span>
      </div>

      {/* Expanded Profiling & Diagnostic Details */}
      {isExpanded && (
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 space-y-2 font-mono text-[11px]">
          {/* Diagnostic Subsystem Panel */}
          <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/80 space-y-1">
            <div className="flex items-center justify-between text-slate-300 font-sans font-bold text-[10px] uppercase tracking-wider text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Sliders className="w-3 h-3 text-cyan-400" /> Subsystem Diagnostics
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-slate-400">
              <div className="flex justify-between">
                <span>Secure Context:</span>
                <span className={diagnostics?.secureContext ? 'text-emerald-400' : 'text-rose-400'}>
                  {diagnostics?.secureContext ? 'true' : 'false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>MediaDevices:</span>
                <span className={diagnostics?.mediaDevicesAvailable ? 'text-emerald-400' : 'text-rose-400'}>
                  {diagnostics?.mediaDevicesAvailable ? 'available' : 'missing'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Permission:</span>
                <span className="text-slate-200">{diagnostics?.permissionState || 'granted'}</span>
              </div>
              <div className="flex justify-between">
                <span>Stream Active:</span>
                <span className={diagnostics?.streamActive ? 'text-emerald-400' : 'text-amber-400'}>
                  {diagnostics?.streamActive ? 'true' : 'false'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ReadyState:</span>
                <span className="text-slate-200">{diagnostics?.videoReadyState ?? '--'}</span>
              </div>
              <div className="flex justify-between">
                <span>Track State:</span>
                <span className="text-slate-200">{diagnostics?.trackReadyState || 'live'}</span>
              </div>
            </div>
          </div>

          {/* Detailed Timings */}
          {timings ? (
            <div className="space-y-0.5 text-slate-400">
              <div className="flex justify-between">
                <span>Preprocess:</span>
                <span className="text-slate-200">{timings.preprocessMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>General YOLO:</span>
                <span className="text-amber-400">{timings.generalDetectionMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Specialists:</span>
                <span className="text-purple-400">{timings.specialistMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Open-Vocab:</span>
                <span className="text-teal-400">{timings.openVocabMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>OCR Gated:</span>
                <span className="text-yellow-400">{timings.ocrMs.toFixed(1)} ms</span>
              </div>
              <div className="flex justify-between">
                <span>Fusion & Track:</span>
                <span className="text-cyan-400">
                  {(timings.fusionMs + timings.trackingMs).toFixed(1)} ms
                </span>
              </div>
              <div className="flex justify-between font-bold border-t border-slate-800/80 pt-1 text-slate-100">
                <span>Total Inference:</span>
                <span className="text-emerald-400">{timings.totalMs.toFixed(1)} ms</span>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-slate-500 italic py-1 text-center">
              {aiState === 'offline' ? 'AI microservice offline. Camera running independently.' : 'Awaiting first inference frame...'}
            </div>
          )}

          {/* Hardware & Execution Provider */}
          {device && (
            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3 text-slate-400" /> Device:
              </span>
              <span
                className={`font-semibold uppercase ${
                  device.cuda ? 'text-emerald-400' : 'text-slate-300'
                }`}
              >
                {device.cuda ? `CUDA (${device.gpuName || 'GPU'})` : 'CPU (Optimized)'}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
