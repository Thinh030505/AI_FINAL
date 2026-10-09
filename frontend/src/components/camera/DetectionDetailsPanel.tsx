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
    <div className="absolute bottom-24 right-4 z-40 w-80 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-200 select-none animate-in fade-in slide-in-from-bottom-3 duration-200">
      {/* Header */}
      <div className="flex items-start justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span
            className="w-3.5 h-3.5 rounded-full shadow-sm"
            style={{ backgroundColor: style.border }}
          />
          <div>
            <h3 className="text-base font-bold text-white capitalize leading-tight">
              {detection.label}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
                {detection.level}
              </span>
              <span className="text-[11px] font-mono text-emerald-400 font-bold">
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
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Details */}
      <div className="py-3 space-y-2.5 text-xs">
        {/* Source Model */}
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-sky-400" /> Detector Source:
          </span>
          <span className="font-mono text-slate-200 font-medium">{detection.source}</span>
        </div>

        {/* Bounding Box Coordinates */}
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-indigo-400" /> Coordinates:
          </span>
          <span className="font-mono text-slate-300 text-[11px]">
            [{Math.round(detection.bbox.x1)}, {Math.round(detection.bbox.y1)}] → [
            {Math.round(detection.bbox.x2)}, {Math.round(detection.bbox.y2)}]
          </span>
        </div>

        {/* Parent Relationship */}
        {parentObj && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-amber-400" /> Parent Entity:
            </div>
            <button
              onClick={() => onSelectDetection(parentObj)}
              className="w-full text-left py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 transition flex items-center justify-between"
            >
              <span className="capitalize font-medium">{parentObj.label}</span>
              <span className="text-[10px] font-mono text-slate-400">
                {Math.round(parentObj.confidence * 100)}%
              </span>
            </button>
          </div>
        )}

        {/* Children Sub-Entities */}
        {childrenObjs.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-purple-400 rotate-180" /> Sub-Parts & Nested Objects ({childrenObjs.length}):
            </div>
            <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {childrenObjs.map((child) => (
                <button
                  key={child.id}
                  onClick={() => onSelectDetection(child)}
                  className="w-full text-left py-1 px-2 rounded bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-slate-700/40 text-[11px] transition flex items-center justify-between"
                >
                  <span className="capitalize">{child.label}</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {Math.round(child.confidence * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* OCR Recognized Text */}
        {detection.ocrText && (
          <div className="pt-2 border-t border-slate-800/80">
            <div className="text-[11px] text-yellow-400 font-semibold mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Recognized Text:
            </div>
            <div className="p-2 bg-slate-950 rounded-lg text-slate-100 font-mono text-xs border border-yellow-500/30">
              "{detection.ocrText}"
            </div>
          </div>
        )}

        {/* Translation */}
        {detection.translatedText && (
          <div className="pt-1.5">
            <div className="text-[11px] text-emerald-400 font-semibold mb-1 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5" /> Vietnamese Translation:
            </div>
            <div className="p-2 bg-slate-950 rounded-lg text-emerald-300 font-mono text-xs border border-emerald-500/30">
              "{detection.translatedText}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
