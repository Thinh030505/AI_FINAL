import React from 'react';
import { RealtimeDetection } from '../../types/smartCamera';
import { CATEGORY_STYLES } from './DetectionBox';
import { X, Tag, ShieldCheck, GitBranch, FileText, Languages, Cpu } from 'lucide-react';

interface DetectionDetailsPanelProps {
  detection: RealtimeDetection | null;
  allDetections: RealtimeDetection[];
  onClose: () => void;
  onSelectDetection: (det: RealtimeDetection) => void;
}

export const DetectionDetailsPanel: React.FC<DetectionDetailsPanelProps> = ({
  detection,
  allDetections,
  onClose,
  onSelectDetection,
}) => {
  if (!detection) return null;

  const style = CATEGORY_STYLES[detection.category] || CATEGORY_STYLES.general_object;
  const parentObj = detection.parentId
    ? allDetections.find((d) => d.id === detection.parentId)
    : null;
  const childrenObjs = (detection.childrenIds || [])
    .map((cid) => allDetections.find((d) => d.id === cid))
    .filter(Boolean) as RealtimeDetection[];

  return (
    <div className="absolute bottom-24 right-4 z-40 w-80 bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-elevated text-slate-800 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      {/* Header */}
      <div className="flex items-start justify-between pb-2.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full shadow-xs"
            style={{ backgroundColor: style.border }}
          />
          <div>
            <h3 className="text-sm font-bold text-slate-900 capitalize leading-tight">
              {detection.label}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                {detection.level}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 font-bold">
                {Math.round(detection.confidence * 100)}%
              </span>
              {detection.trackId && (
                <span className="text-[10px] font-mono text-slate-400">
                  Track #{detection.trackId}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Details */}
      <div className="py-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-slate-400" /> Detector:
          </span>
          <span className="font-mono text-slate-800 font-medium">{detection.source}</span>
        </div>

        <div className="flex items-center justify-between text-slate-500">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-slate-400" /> Coordinates:
          </span>
          <span className="font-mono text-slate-700 text-[11px]">
            [{Math.round(detection.bbox.x1)}, {Math.round(detection.bbox.y1)}] → [
            {Math.round(detection.bbox.x2)}, {Math.round(detection.bbox.y2)}]
          </span>
        </div>

        {/* Parent Relationship */}
        {parentObj && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 mb-1 flex items-center gap-1.5 font-medium">
              <GitBranch className="w-3.5 h-3.5 text-amber-600" /> Parent Entity:
            </div>
            <button
              onClick={() => onSelectDetection(parentObj)}
              className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200 transition flex items-center justify-between"
            >
              <span className="capitalize font-semibold">{parentObj.label}</span>
              <span className="text-[10px] font-mono text-slate-500">
                {Math.round(parentObj.confidence * 100)}%
              </span>
            </button>
          </div>
        )}

        {/* Children Sub-Entities */}
        {childrenObjs.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="text-[11px] text-slate-500 mb-1 font-medium">Sub-components:</div>
            <div className="flex flex-wrap gap-1">
              {childrenObjs.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onSelectDetection(child)}
                  className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] capitalize font-medium"
                >
                  {child.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DetectionDetailsPanel;
