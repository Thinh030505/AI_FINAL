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
    <div className="absolute bottom-6 inset-x-0 z-40 flex items-center justify-center gap-2.5 px-4 pointer-events-auto select-none flex-wrap">
      {/* Settings / Mode Switcher Toggle */}
      <button
        onClick={onToggleModeDrawer}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
          isModeDrawerOpen
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
        }`}
        title="Vision Settings & Detection Modes"
      >
        <Sliders className="w-5 h-5" />
      </button>

      {/* Hierarchy Tree Toggle */}
      <button
        onClick={onToggleHierarchyTree}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
          isHierarchyTreeOpen
            ? 'bg-indigo-600 border-indigo-500 text-white'
            : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
        }`}
        title="Scene Entity Hierarchy Tree"
      >
        <GitBranch className="w-5 h-5" />
      </button>

      {/* Spatial Debug Mode Toggle */}
      {onToggleSpatialDebug && (
        <button
          onClick={onToggleSpatialDebug}
          className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
            spatialDebug
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
          title={spatialDebug ? 'Hide Spatial Coordinates Debug' : 'Show Spatial Coordinates Debug'}
        >
          <Crosshair className="w-5 h-5" />
        </button>
      )}

      {/* Freeze Frame Verification Toggle */}
      {onToggleFreeze && (
        <button
          onClick={onToggleFreeze}
          className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
            isFrozen
              ? 'bg-sky-600 border-sky-500 text-white animate-pulse'
              : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
          }`}
          title={isFrozen ? 'Unfreeze Live Video' : 'Freeze Frame & Inspect'}
        >
          <Snowflake className="w-5 h-5" />
        </button>
      )}

      {/* Snapshot Shutter Button */}
      <button
        onClick={onCaptureSnapshot}
        className="w-16 h-16 rounded-full bg-white/40 p-1 backdrop-blur-md border-2 border-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 shadow-elevated group mx-1.5"
        title="Capture High-Res Photo"
      >
        <div className="w-full h-full rounded-full bg-indigo-600 flex items-center justify-center text-white group-hover:bg-indigo-700 transition-colors shadow-sm">
          <Camera className="w-7 h-7" />
        </div>
      </button>

      {/* Pause / Resume Live AI Inference */}
      <button
        onClick={onToggleStreaming}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
          !isStreaming
            ? 'bg-amber-600 border-amber-500 text-white'
            : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
        }`}
        title={isStreaming ? 'Pause AI Inference' : 'Resume AI Inference'}
      >
        {isStreaming ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 text-amber-600" />}
      </button>

      {/* Mirror Camera Flip */}
      <button
        onClick={onToggleMirror}
        className={`p-3 rounded-2xl border backdrop-blur-md transition-all shadow-elevated ${
          isMirrored
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
            : 'bg-white/90 border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white'
        }`}
        title="Mirror Video Preview"
      >
        <FlipHorizontal className="w-5 h-5" />
      </button>

      {/* Switch Camera */}
      {hasMultipleCameras && (
        <button
          onClick={onFlipCamera}
          className="p-3 rounded-2xl bg-white/90 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white backdrop-blur-md transition-all shadow-elevated"
          title="Switch Front/Rear Camera"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      )}

      {/* Fullscreen Toggle */}
      <button
        onClick={onToggleFullscreen}
        className="p-3 rounded-2xl bg-white/90 border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-white backdrop-blur-md transition-all shadow-elevated"
        title="Toggle Fullscreen"
      >
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </button>
    </div>
  );
};

export default CameraControls;
