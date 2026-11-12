import React, { useMemo } from 'react';
import { DetectionItem } from '../../types';
import { SmallObjectLabel } from './SmallObjectLabel';
import { FloatingVocabularyCard } from './FloatingVocabularyCard';
import {
  computeSmallLabelLayout,
  computeExpandedCardLayout,
  SmallLabelLayoutItem,
  ExpandedCardLayoutItem,
} from '../../utils/cardLayoutEngine';

interface FloatingCardsOverlayProps {
  detections: DetectionItem[];
  originalWidth: number;
  originalHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  getColor: (index: number) => { stroke: string; fill: string; bg: string; text: string; border: string };
  hoveredIndex: number | null;
  selectedIndex: number | null;
  onHoverIndex: (index: number | null) => void;
  onSelectIndex: (index: number | null) => void;
  showLabels?: boolean;
  mode?: 'learn' | 'compact' | 'inspector';
  targetLanguage?: string;
  countsByClassId?: Record<number, number>;
}

export const FloatingCardsOverlay: React.FC<FloatingCardsOverlayProps> = ({
  detections,
  originalWidth,
  originalHeight,
  renderedWidth,
  renderedHeight,
  getColor,
  hoveredIndex,
  selectedIndex,
  onHoverIndex,
  onSelectIndex,
  showLabels = true,
  mode = 'learn',
  targetLanguage = 'vi',
  countsByClassId = {},
}) => {
  // 1. Compute non-overlapping Small Labels for all visible detections
  const smallLabels: SmallLabelLayoutItem[] = useMemo(() => {
    if (!showLabels || !renderedWidth || !renderedHeight) {
      return [];
    }
    return computeSmallLabelLayout(detections, {
      renderedWidth,
      renderedHeight,
      originalWidth,
      originalHeight,
    });
  }, [detections, renderedWidth, renderedHeight, originalWidth, originalHeight, showLabels]);

  // 2. Compute position for the SINGLE expanded detail card (if an object is selected)
  const expandedCard: ExpandedCardLayoutItem | null = useMemo(() => {
    if (
      selectedIndex === null ||
      selectedIndex === undefined ||
      selectedIndex < 0 ||
      selectedIndex >= detections.length ||
      !renderedWidth ||
      !renderedHeight
    ) {
      return null;
    }

    return computeExpandedCardLayout(detections[selectedIndex], selectedIndex, {
      renderedWidth,
      renderedHeight,
      originalWidth,
      originalHeight,
    });
  }, [detections, selectedIndex, renderedWidth, renderedHeight, originalWidth, originalHeight]);

  if (!showLabels && !expandedCard) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ width: renderedWidth, height: renderedHeight }}
    >
      {/* SVG Layer: Leader lines for displaced small labels + glowing leader for selected expanded card */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={renderedWidth}
        height={renderedHeight}
      >
        <defs>
          <filter id="clean-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* Short connector lines for small labels that had to be displaced due to collision */}
        {smallLabels.map((item) => {
          if (!item.hasConnector) return null;
          const col = getColor(item.detectionIndex);
          return (
            <line
              key={`label-conn-${item.detectionIndex}`}
              x1={item.connectorStart.x}
              y1={item.connectorStart.y}
              x2={item.connectorEnd.x}
              y2={item.connectorEnd.y}
              stroke={col.stroke}
              strokeWidth={1.5}
              strokeDasharray="3 2"
              strokeOpacity={0.8}
            />
          );
        })}

        {/* Leader connector curve for the SINGLE expanded detail card */}
        {expandedCard && (() => {
          const col = getColor(expandedCard.detectionIndex);
          const { lineStart, lineEnd } = expandedCard;
          const midX = (lineStart.x + lineEnd.x) / 2;
          const pathD = `M ${lineStart.x} ${lineStart.y} C ${midX} ${lineStart.y}, ${midX} ${lineEnd.y}, ${lineEnd.x} ${lineEnd.y}`;

          return (
            <g key={`expanded-leader-${expandedCard.detectionIndex}`}>
              {/* Anchor point circle on bounding box edge */}
              <circle
                cx={lineStart.x}
                cy={lineStart.y}
                r={4}
                fill={col.stroke}
                className="transition-all"
              />

              {/* Connecting curve */}
              <path
                d={pathD}
                fill="none"
                stroke={col.stroke}
                strokeWidth={2.5}
                strokeOpacity={0.9}
                filter="url(#clean-shadow)"
                className="transition-all"
              />

              {/* Anchor point circle on card edge */}
              <circle
                cx={lineEnd.x}
                cy={lineEnd.y}
                r={3.5}
                fill={col.stroke}
                className="transition-all"
              />
            </g>
          );
        })()}
      </svg>

      {/* HTML Layer: Small Object Labels */}
      {smallLabels.map((item) => {
        const col = getColor(item.detectionIndex);
        const isHovered = hoveredIndex === item.detectionIndex;
        const isSelected = selectedIndex === item.detectionIndex;
        const count = countsByClassId[item.detection.classId] || 1;

        return (
          <SmallObjectLabel
            key={`small-label-${item.detectionIndex}`}
            detection={item.detection}
            index={item.detectionIndex}
            color={col}
            isHovered={isHovered}
            isSelected={isSelected}
            count={count}
            mode={mode}
            onHover={(h) => onHoverIndex(h ? item.detectionIndex : null)}
            onClick={() => {
              onSelectIndex(isSelected ? null : item.detectionIndex);
            }}
            style={{
              left: `${item.x}px`,
              top: `${item.y}px`,
              minWidth: `${item.width}px`,
            }}
          />
        );
      })}

      {/* HTML Layer: Single Expanded Vocabulary Detail Card */}
      {expandedCard && (() => {
        const col = getColor(expandedCard.detectionIndex);
        const isHovered = hoveredIndex === expandedCard.detectionIndex;
        const count = countsByClassId[expandedCard.detection.classId] || 1;

        return (
          <FloatingVocabularyCard
            key={`expanded-card-${expandedCard.detectionIndex}`}
            detection={expandedCard.detection}
            index={expandedCard.detectionIndex}
            color={col}
            isHovered={isHovered}
            isSelected={true}
            count={count}
            mode={mode}
            targetLanguage={targetLanguage}
            onHover={(h) => onHoverIndex(h ? expandedCard.detectionIndex : null)}
            onClick={() => {}}
            onClose={() => onSelectIndex(null)}
            style={{
              left: `${expandedCard.cardX}px`,
              top: `${expandedCard.cardY}px`,
              width: `${expandedCard.cardWidth}px`,
            }}
          />
        );
      })()}
    </div>
  );
};

export default FloatingCardsOverlay;
