import React from 'react';
import { RealtimeDetection } from '../../types/smartCamera';
import { GitBranch, X, Layers, ChevronRight } from 'lucide-react';
import { CATEGORY_STYLES } from './DetectionBox';

interface HierarchyTreeViewProps {
  detections: RealtimeDetection[];
  selectedDetection: RealtimeDetection | null;
  onSelectDetection: (det: RealtimeDetection) => void;
  onClose: () => void;
}

export const HierarchyTreeView: React.FC<HierarchyTreeViewProps> = ({
  detections,
  selectedDetection,
  onSelectDetection,
  onClose,
}) => {
  const rootDetections = detections.filter((d) => !d.parentId);

  const renderNode = (det: RealtimeDetection, depth: number = 0) => {
    const isSelected = selectedDetection?.id === det.id;
    const style = CATEGORY_STYLES[det.category] || CATEGORY_STYLES.general_object;
    const children = (det.childrenIds || [])
      .map((cid) => detections.find((d) => d.id === cid))
      .filter(Boolean) as RealtimeDetection[];

    return (
      <div key={det.id} className="relative">
        <div
          onClick={() => onSelectDetection(det)}
          className={`flex items-center gap-2 py-1.5 px-2.5 rounded-lg cursor-pointer transition text-xs select-none ${
            isSelected
              ? 'bg-indigo-600 text-white font-semibold shadow-sm'
              : 'hover:bg-slate-100 text-slate-700'
          }`}
          style={{ marginLeft: `${depth * 16}px` }}
        >
          {depth > 0 && (
            <span className="text-slate-400 font-mono -ml-2 mr-1">└──</span>
          )}
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: style.border }}
          />
          <span className="capitalize font-medium">{det.label}</span>
          <span className="text-[10px] font-mono opacity-70 ml-auto">
            {Math.round(det.confidence * 100)}%
          </span>
          {det.trackId && (
            <span className="text-[9px] font-mono px-1 py-0.2 bg-slate-100 rounded text-slate-500">
              #{det.trackId}
            </span>
          )}
        </div>

        {children.length > 0 && (
          <div className="space-y-0.5">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="absolute top-16 left-4 z-40 w-72 max-h-[70vh] bg-white/98 backdrop-blur-md border border-slate-200 rounded-2xl p-3.5 shadow-elevated text-slate-800 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
          <GitBranch className="w-4 h-4 text-indigo-600" />
          <span>Hierarchy Tree ({detections.length})</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-y-auto space-y-1 flex-1 pr-1">
        {rootDetections.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            No objects detected yet
          </div>
        ) : (
          rootDetections.map((root) => renderNode(root, 0))
        )}
      </div>
    </div>
  );
};

export default HierarchyTreeView;
