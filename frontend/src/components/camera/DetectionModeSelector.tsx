import React from 'react';
import { CameraDetectionMode } from '../../types/smartCamera';
import { Sparkles, Sliders, Eye, FileText, Check } from 'lucide-react';

interface DetectionModeSelectorProps {
  mode: CameraDetectionMode;
  onModeChange: (mode: CameraDetectionMode) => void;
  confidenceThreshold: number;
  onConfidenceChange: (conf: number) => void;
  enableOcr: boolean;
  onToggleOcr: () => void;
  activeCategories: Set<string>;
  onToggleCategory: (cat: string) => void;
}

const CATEGORY_CHIPS: Array<{ id: string; label: string; color: string }> = [
  { id: 'person', label: 'People', color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' },
  { id: 'human_part', label: 'Parts', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
  { id: 'accessory', label: 'Accessories', color: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
  { id: 'general_object', label: 'Objects', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
  { id: 'natural_object', label: 'Nature/Plants', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
  { id: 'device', label: 'Devices', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' },
  { id: 'ocr_text', label: 'Text/OCR', color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40' },
  { id: 'open_vocab', label: 'Open-Vocab', color: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
];

export const DetectionModeSelector: React.FC<DetectionModeSelectorProps> = ({
  mode,
  onModeChange,
  confidenceThreshold,
  onConfidenceChange,
  enableOcr,
  onToggleOcr,
  activeCategories,
  onToggleCategory,
}) => {
  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-3.5 shadow-2xl text-slate-200 select-none space-y-3">
      {/* 3-Mode Primary Pill Switcher */}
      <div>
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Vision Intelligence Mode</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onModeChange('simple')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'simple'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => onModeChange('detailed')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
              mode === 'detailed'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Detailed
          </button>
          <button
            onClick={() => onModeChange('everything')}
            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
              mode === 'everything'
                ? 'bg-gradient-to-r from-amber-500 to-indigo-600 text-white font-semibold shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-200" />
            Everything
          </button>
        </div>
      </div>

      {/* Confidence Slider & OCR Toggle */}
      <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800">
        <div>
          <div className="flex justify-between items-center text-[11px] text-slate-400 mb-1">
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400" /> Confidence:
            </span>
            <span className="font-mono text-white font-medium">
              {Math.round(confidenceThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.80"
            step="0.05"
            value={confidenceThreshold}
            onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
            className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <div>
          <div className="text-[11px] text-slate-400 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3 text-yellow-400" /> Text Recognition:
          </div>
          <button
            onClick={onToggleOcr}
            className={`w-full py-1 px-2.5 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
              enableOcr
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${enableOcr ? 'bg-yellow-400' : 'bg-slate-500'}`} />
            {enableOcr ? 'OCR Active' : 'Enable OCR'}
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="pt-1 border-t border-slate-800">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Eye className="w-3 h-3" /> Visible Categories
          </span>
          <span className="text-[10px] text-slate-500">
            {activeCategories.size} of {CATEGORY_CHIPS.length}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = activeCategories.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => onToggleCategory(chip.id)}
                className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-all flex items-center gap-1 ${
                  isActive
                    ? chip.color
                    : 'bg-slate-900 border-slate-800 text-slate-500 opacity-60'
                }`}
              >
                {isActive && <Check className="w-2.5 h-2.5" />}
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
