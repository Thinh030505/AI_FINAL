import React from 'react';
import {
  Camera,
  FlipHorizontal,
  RefreshCw,
  Sliders,
  Play,
  Pause,
  GitBranch,
  Maximize2,
  Minimize2,
  Crosshair,
  Snowflake,
} from 'lucide-react';

interface CameraControlsProps {
  isStreaming: boolean;
  onToggleStreaming: () => void;
  onFlipCamera: () => void;
  hasMultipleCameras: boolean;
  isMirrored: boolean;
  onToggleMirror: () => void;
  onCaptureSnapshot: () => void;
  onToggleModeDrawer: () => void;
  isModeDrawerOpen: boolean;
  onToggleHierarchyTree: () => void;
  isHierarchyTreeOpen: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  spatialDebug?: boolean;
  onToggleSpatialDebug?: () => void;
  isFrozen?: boolean;
  onToggleFreeze?: () => void;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isStreaming,
  onToggleStreaming,
  onFlipCamera,
  hasMultipleCameras,
  isMirrored,
  onToggleMirror,
  onCaptureSnapshot,
  onToggleModeDrawer,
  isModeDrawerOpen,
  onToggleHierarchyTree,
  isHierarchyTreeOpen,
  isFullscreen,
  onToggleFullscreen,
  spatialDebug = false,
  onToggleSpatialDebug,
  isFrozen = false,
  onToggleFreeze,
}) => {
  return (
    <div className="absolute bottom-5 inset-x-0 z-40 flex items-center justify-center gap-2.5 px-4 pointer-events-auto select-none flex-wrap">
      {/* Settings / Mode Switcher Toggle */}
      <button
        onClick={onToggleModeDrawer}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
          isModeDrawerOpen
            ? 'bg-indigo-600 border-indigo-400 text-white'
            : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Vision Settings & Detection Modes"
      >
        <Sliders className="w-5 h-5" />
      </button>

      {/* Hierarchy Tree Toggle */}
      <button
        onClick={onToggleHierarchyTree}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
          isHierarchyTreeOpen
            ? 'bg-indigo-600 border-indigo-400 text-white'
            : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title="Scene Entity Hierarchy Tree"
      >
        <GitBranch className="w-5 h-5" />
      </button>

      {/* Spatial Debug Mode Toggle (Section 24) */}
      {onToggleSpatialDebug && (
        <button
          onClick={onToggleSpatialDebug}
          className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
            spatialDebug
              ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/20'
              : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={spatialDebug ? 'Hide Spatial Coordinates Debug' : 'Show Spatial Coordinates Debug'}
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}

      {/* Freeze Frame Verification Toggle (Section 26) */}
      {onToggleFreeze && (
        <button
          onClick={onToggleFreeze}
          className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
            isFrozen
              ? 'bg-sky-600 border-sky-400 text-white shadow-sky-500/20 animate-pulse'
              : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
          }`}
          title={isFrozen ? 'Unfreeze Live Video' : 'Freeze Frame & Inspect Static Alignment'}
        >
          <Snowflake className="w-5 h-5" />
        </button>
      )}

      {/* Snapshot Shutter Button */}
      <button
        onClick={onCaptureSnapshot}
        className="w-16 h-16 rounded-full bg-white/20 p-1 backdrop-blur-sm border-2 border-white flex items-center justify-center transition hover:scale-105 active:scale-95 shadow-2xl group mx-1"
        title="Capture High-Res Photo"
      >
        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-slate-950 group-hover:bg-slate-100">
          <Camera className="w-7 h-7" />
        </div>
      </button>

      {/* Pause / Resume Live AI Inference */}
      <button
        onClick={onToggleStreaming}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
          !isStreaming
            ? 'bg-amber-600 border-amber-400 text-white'
            : 'bg-slate-900/85 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
        }`}
        title={isStreaming ? 'Pause AI Inference' : 'Resume AI Inference'}
      >
        {isStreaming ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 text-amber-300" />}
      </button>

      {/* Mirror Camera Flip */}
      <button
        onClick={onToggleMirror}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-lg ${
          isMirrored
            ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
            : 'bg-slate-900/85 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
        title="Mirror Video Preview"
      >
        <FlipHorizontal className="w-5 h-5" />
      </button>

      {/* Switch Camera (User / Environment) */}
      {hasMultipleCameras && (
        <button
          onClick={onFlipCamera}
          className="p-3 rounded-2xl bg-slate-900/85 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md transition-all shadow-lg"
          title="Switch Front/Rear Camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        onClick={onToggleFullscreen}
        className="p-3 rounded-2xl bg-slate-900/85 border border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800 backdrop-blur-md transition-all shadow-lg"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
    </div>
  );
};
