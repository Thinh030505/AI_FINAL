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
  { id: 'person', label: 'People', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'human_part', label: 'Parts', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'accessory', label: 'Accessories', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'general_object', label: 'Objects', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'natural_object', label: 'Nature/Plants', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'device', label: 'Devices', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'ocr_text', label: 'Text/OCR', color: 'bg-yellow-50 text-yellow-800 border-yellow-200' },
  { id: 'open_vocab', label: 'Open-Vocab', color: 'bg-teal-50 text-teal-700 border-teal-200' },
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
    <div className="bg-white/95 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-elevated text-slate-800 select-none space-y-3.5">
      {/* 3-Mode Primary Pill Switcher */}
      <div>
        <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span>Vision Intelligence Mode</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => onModeChange('simple')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'simple'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Simple
          </button>
          <button
            onClick={() => onModeChange('detailed')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              mode === 'detailed'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Detailed
          </button>
          <button
            onClick={() => onModeChange('everything')}
            className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 ${
              mode === 'everything'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-500" />
            Everything
          </button>
        </div>
      </div>

      {/* Confidence Slider & OCR Toggle */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
        <div>
          <div className="flex justify-between items-center text-[11px] text-slate-600 mb-1">
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-slate-400" /> Confidence:
            </span>
            <span className="font-mono text-indigo-600 font-bold">
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
            className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        {/* OCR Toggle */}
        <div className="flex items-center justify-end">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={enableOcr}
              onChange={onToggleOcr}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-indigo-600" /> OCR Text
            </span>
          </label>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="pt-2 border-t border-slate-100">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
          Active Categories ({activeCategories.size}/{CATEGORY_CHIPS.length}):
        </div>
        <div className="flex flex-wrap gap-1">
          {CATEGORY_CHIPS.map((chip) => {
            const isActive = activeCategories.has(chip.id);
            return (
              <button
                key={chip.id}
                onClick={() => onToggleCategory(chip.id)}
                className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-all ${
                  isActive
                    ? chip.color
                    : 'bg-slate-100 border-slate-200 text-slate-400 line-through'
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DetectionModeSelector;
