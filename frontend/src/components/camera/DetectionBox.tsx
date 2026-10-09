import React from 'react';
import { RealtimeDetection, DetectionCategory } from '../../types/smartCamera';
import { DisplayRect } from '../../utils/coordinateTransforms';

interface DetectionBoxProps {
  detection: RealtimeDetection;
  isSelected: boolean;
  isParentOfSelected: boolean;
  isChildOfSelected: boolean;
  isDimmed?: boolean;
  spatialDebug?: boolean;
  displayRect: DisplayRect;
  onSelect: (detection: RealtimeDetection) => void;
  showConfidence?: boolean;
  labelPosition?: 'top' | 'bottom' | 'inside';
}

export const CATEGORY_STYLES: Record<
  DetectionCategory,
  {
    border: string;
    bg: string;
    text: string;
    solid: string;
    glow: string;
  }
> = {
  person: {
    border: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.12)',
    text: '#c7d2fe',
    solid: 'bg-indigo-500',
    glow: 'rgba(99, 102, 241, 0.5)',
  },
  human_part: {
    border: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    text: '#fde68a',
    solid: 'bg-amber-500',
    glow: 'rgba(245, 158, 11, 0.5)',
  },
  accessory: {
    border: '#c084fc',
    bg: 'rgba(192, 132, 252, 0.14)',
    text: '#e9d5ff',
    solid: 'bg-purple-500',
    glow: 'rgba(192, 132, 252, 0.5)',
  },
  natural_object: {
    border: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    text: '#a7f3d0',
    solid: 'bg-emerald-500',
    glow: 'rgba(16, 185, 129, 0.5)',
  },
  device: {
    border: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.12)',
    text: '#a5f3fc',
    solid: 'bg-cyan-500',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
  furniture: {
    border: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    text: '#fed7aa',
    solid: 'bg-orange-500',
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  vehicle: {
    border: '#38bdf8',
    bg: 'rgba(56, 189, 248, 0.12)',
    text: '#bae6fd',
    solid: 'bg-sky-500',
    glow: 'rgba(56, 189, 248, 0.5)',
  },
  ocr_text: {
    border: '#eab308',
    bg: 'rgba(234, 179, 8, 0.18)',
    text: '#fef08a',
    solid: 'bg-yellow-500',
    glow: 'rgba(234, 179, 8, 0.5)',
  },
  open_vocab: {
    border: '#14b8a6',
    bg: 'rgba(20, 184, 166, 0.12)',
    text: '#99f6e4',
    solid: 'bg-teal-500',
    glow: 'rgba(20, 184, 166, 0.5)',
  },
  general_object: {
    border: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.12)',
    text: '#bfdbfe',
    solid: 'bg-blue-500',
    glow: 'rgba(59, 130, 246, 0.5)',
  },
};

export const DetectionBox: React.FC<DetectionBoxProps> = ({
  detection,
  isSelected,
  isParentOfSelected,
  isChildOfSelected,
  isDimmed = false,
  spatialDebug = false,
  displayRect,
  onSelect,
  showConfidence = true,
  labelPosition = 'top',
}) => {
  const { bbox, label, confidence, category, level, trackId, source, parentId } = detection;
  const style = CATEGORY_STYLES[category] || CATEGORY_STYLES.general_object;

  const { left, top, width, height } = displayRect;
  const confPercent = Math.round(confidence * 100);

  // Level abbreviation badge
  const levelBadge =
    level === 'part'
      ? 'PART'
      : level === 'fine_grained'
      ? 'FINE'
      : level === 'ocr'
      ? 'OCR'
      : level === 'open_vocab'
      ? 'VOCAB'
      : 'OBJ';

  // Opacity for focus mode (Section 19)
  const containerOpacity = isDimmed && !isSelected && !isParentOfSelected && !isChildOfSelected ? 0.35 : 1.0;

  // Position label dynamically to avoid stacking collisions (Section 18)
  const getLabelPlacementStyle = () => {
    if (labelPosition === 'bottom') {
      return 'bottom-0 left-0 translate-y-full rounded-b';
    }
    if (labelPosition === 'inside') {
      return 'top-1 left-1 rounded';
    }
    // Default top edge (placed slightly above or clamped to viewport top)
    return top < 24 ? 'top-0 left-0 rounded-b' : '-top-5 left-0 rounded-t';
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(detection);
      }}
      className={`absolute cursor-pointer transition-all duration-150 group select-none ${
        isSelected
          ? 'z-40 ring-2 ring-white shadow-xl'
          : isParentOfSelected || isChildOfSelected
          ? 'z-30 ring-1 ring-cyan-300'
          : 'z-10 hover:z-30'
      }`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
        borderColor: style.border,
        borderWidth: isSelected ? '2.5px' : level === 'part' ? '1.5px' : '2px',
        borderStyle: level === 'part' ? 'dashed' : 'solid',
        backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.18)' : style.bg,
        opacity: containerOpacity,
        boxShadow: isSelected
          ? `0 0 18px ${style.glow}`
          : '0 1px 3px rgba(0,0,0,0.4)',
      }}
    >
      {/* Corner Label Chip with collision-aware placement */}
      <div
        className={`absolute flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap shadow-sm backdrop-blur-sm pointer-events-none transition-all ${getLabelPlacementStyle()}`}
        style={{
          backgroundColor: isSelected ? '#ffffff' : style.border,
          color: isSelected ? '#0f172a' : '#ffffff',
        }}
      >
        <span className="opacity-80 text-[8px] uppercase">{levelBadge}</span>
        <span className="capitalize">{label}</span>
        {showConfidence && (
          <span className="opacity-85 text-[9px] font-mono">{confPercent}%</span>
        )}
        {trackId && (
          <span className="opacity-75 text-[8px] font-mono">#{trackId}</span>
        )}
      </div>

      {/* Spatial Debug Mode HUD Tag (Section 24) */}
      {spatialDebug && (
        <div className="absolute -bottom-8 left-0 z-50 bg-slate-950/95 border border-slate-700 rounded px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 whitespace-nowrap shadow-lg pointer-events-none">
          <div>src:{source} | id:{detection.id} {parentId ? `| p:${parentId}` : ''}</div>
          <div className="text-slate-300">canon: [{bbox.x1},{bbox.y1},{bbox.x2},{bbox.y2}]</div>
          <div className="text-indigo-300">disp: [{left},{top},{width},{height}]</div>
        </div>
      )}

      {/* Selected Indicator Corner markers */}
      {isSelected && (
        <>
          <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-white border border-slate-900 rounded-full" />
          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-white border border-slate-900 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-white border border-slate-900 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-white border border-slate-900 rounded-full" />
        </>
      )}
    </div>
  );
};
