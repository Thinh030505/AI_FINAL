import React, { useRef, useState, useEffect, useMemo } from 'react';
import { RealtimeDetection } from '../../types/smartCamera';
import { DetectionBox } from './DetectionBox';
import {
  getDisplayTransform,
  cameraBBoxToDisplayBBox,
  cameraPointToDisplayPoint,
} from '../../utils/coordinateTransforms';

interface DetectionOverlayProps {
  detections: RealtimeDetection[];
  selectedDetection: RealtimeDetection | null;
  onSelectDetection: (detection: RealtimeDetection | null) => void;
  videoElement: HTMLVideoElement | null;
  sourceWidth: number;
  sourceHeight: number;
  isMirrored: boolean;
  showConfidence?: boolean;
  confidenceThreshold?: number;
  activeCategories?: Set<string>;
  spatialDebug?: boolean;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  selectedDetection,
  onSelectDetection,
  sourceWidth,
  sourceHeight,
  isMirrored,
  showConfidence = true,
  confidenceThreshold = 0.25,
  activeCategories,
  spatialDebug = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Track container dimensions with ResizeObserver for exact responsiveness (Section 23)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute canonical display transform parameters (Section 4 & 22)
  const transform = useMemo(() => {
    return getDisplayTransform(
      containerSize.width,
      containerSize.height,
      sourceWidth,
      sourceHeight
    );
  }, [containerSize.width, containerSize.height, sourceWidth, sourceHeight]);

  // Filter detections based on confidence threshold and selected categories
  const visibleDetections = useMemo(() => {
    return detections.filter((d) => {
      if (d.confidence < confidenceThreshold) return false;
      if (activeCategories && activeCategories.size > 0 && !activeCategories.has(d.category)) {
        return false;
      }
      return true;
    });
  }, [detections, confidenceThreshold, activeCategories]);

  // Hierarchy relationship lookups for selection highlights
  const parentIdOfSelected = selectedDetection?.parentId;
  const childIdsOfSelected = useMemo(() => {
    return new Set(selectedDetection?.childrenIds || []);
  }, [selectedDetection]);

  // Calculate box centers for hierarchy connection lines
  const getBoxCenter = (det: RealtimeDetection) => {
    const cx = (det.bbox.x1 + det.bbox.x2) / 2.0;
    const cy = (det.bbox.y1 + det.bbox.y2) / 2.0;
    return cameraPointToDisplayPoint(cx, cy, transform, isMirrored);
  };

  const selectedCenter = selectedDetection ? getBoxCenter(selectedDetection) : null;
  const parentDet = selectedDetection?.parentId
    ? visibleDetections.find((d) => d.id === selectedDetection.parentId)
    : null;
  const parentCenter = parentDet ? getBoxCenter(parentDet) : null;

  return (
    <div
      ref={containerRef}
      onClick={() => onSelectDetection(null)}
      className="absolute inset-0 pointer-events-auto overflow-hidden select-none"
    >
      {/* Hierarchy SVG Connectors */}
      {selectedCenter && parentCenter && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
          <line
            x1={selectedCenter.x}
            y1={selectedCenter.y}
            x2={parentCenter.x}
            y2={parentCenter.y}
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="4 4"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Render All Detection Boxes with exact canonical display coordinates */}
      {visibleDetections.map((det) => {
        const displayRect = cameraBBoxToDisplayBBox(det.bbox, transform, isMirrored);

        // Smart label collision handling (Section 18):
        // If detection is a child (e.g. face inside head, or eye inside face), place label inside
        const isChild = !!det.parentId;
        const labelPosition = isChild ? 'inside' : 'top';

        return (
          <DetectionBox
            key={det.id}
            detection={det}
            isSelected={selectedDetection?.id === det.id}
            isParentOfSelected={parentIdOfSelected === det.id}
            isChildOfSelected={childIdsOfSelected.has(det.id)}
            isDimmed={!!selectedDetection}
            spatialDebug={spatialDebug}
            displayRect={displayRect}
            onSelect={(d) => onSelectDetection(d)}
            showConfidence={showConfidence}
            labelPosition={labelPosition}
          />
        );
      })}
    </div>
  );
};
