import React from 'react';
import { DetectionItem } from '../../types';

interface SmallObjectLabelProps {
  detection: DetectionItem;
  index: number;
  color: { stroke: string; fill: string; bg: string; text: string; border: string };
  isSelected: boolean;
  isHovered: boolean;
  count?: number;
  mode?: 'learn' | 'compact' | 'inspector';
  onHover: (hovered: boolean) => void;
  onClick: () => void;
  style?: React.CSSProperties;
  className?: string;
}

export const SmallObjectLabel: React.FC<SmallObjectLabelProps> = ({
  detection,
  index,
  color,
  isSelected,
  isHovered,
  count = 1,
  mode = 'learn',
  onHover,
  onClick,
  style,
  className = '',
}) => {
  const isHighlighted = isHovered || isSelected;
  const word = detection.vocabulary?.word || detection.label;
  const vietnamese = detection.vocabulary?.vietnamese;
  const confidencePercent = Math.round(detection.confidence * 100);

  return (
    <button
      type="button"
      style={style}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      role="button"
      aria-label={`Select ${word}${count > 1 ? ` × ${count}` : ''}`}
      className={`absolute z-20 pointer-events-auto select-none cursor-pointer h-7 px-3 rounded-full flex items-center gap-1.5 backdrop-blur-md border text-xs transition-all duration-150 whitespace-nowrap ${
        isSelected
          ? 'bg-white ring-2 ring-indigo-600 border-indigo-500 text-slate-900 scale-[1.05] z-30 shadow-elevated'
          : isHovered
          ? 'bg-white border-indigo-300 text-slate-900 scale-[1.02] z-25 shadow-card'
          : 'bg-white/95 hover:bg-white border-slate-200/90 text-slate-800 shadow-subtle hover:border-slate-300'
      } ${className}`}
    >
      {/* Object Category Color Dot */}
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
        style={{ backgroundColor: color.stroke }}
      />

      {/* English Word: Never truncate abruptly into P... */}
      <span className="font-bold capitalize tracking-tight text-slate-900">
        {word}
      </span>

      {/* Aggregation Count Badge if multiple instances exist */}
      {count > 1 && (
        <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200">
          ×{count}
        </span>
      )}

      {/* Mode-specific content */}
      {mode === 'learn' && vietnamese && count <= 1 && (
        <span className="text-[11px] text-slate-500 hidden sm:inline">
          ({vietnamese})
        </span>
      )}

      {mode === 'inspector' && (
        <span
          className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded"
          style={{
            backgroundColor: color.fill,
            color: color.stroke,
          }}
        >
          {confidencePercent}%
        </span>
      )}

      {/* Subtle indicator when selected */}
      {isSelected && (
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse shrink-0 ml-0.5" />
      )}
    </button>
  );
};

export default SmallObjectLabel;
