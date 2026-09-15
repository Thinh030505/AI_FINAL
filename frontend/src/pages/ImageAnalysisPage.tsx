import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Scan,
  Compass,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Copy,
  Check,
  Eye,
  Sun,
  MapPin,
  Maximize2,
  Image as ImageIcon,
  User,
  Tag,
  Activity,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { ImageRecord, ImageAnalysisRecord, DetectionItem, SemanticRegion } from '../types';

const CLASS_COLORS = [
  { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.2)', text: '#93c5fd', solid: 'bg-blue-500' },
  { border: '#10b981', bg: 'rgba(16, 185, 129, 0.2)', text: '#6ee7b7', solid: 'bg-emerald-500' },
  { border: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.2)', text: '#c4b5fd', solid: 'bg-purple-500' },
  { border: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)', text: '#fcd34d', solid: 'bg-amber-500' },
  { border: '#ec4899', bg: 'rgba(236, 72, 153, 0.2)', text: '#f9a8d4', solid: 'bg-pink-500' },
  { border: '#06b6d4', bg: 'rgba(6, 182, 212, 0.2)', text: '#67e8f9', solid: 'bg-cyan-500' },
  { border: '#f97316', bg: 'rgba(249, 115, 22, 0.2)', text: '#fdba74', solid: 'bg-orange-500' },
  { border: '#14b8a6', bg: 'rgba(20, 184, 166, 0.2)', text: '#5eead4', solid: 'bg-teal-500' },
];

const REGION_COLORS: Record<string, string> = {
  sky: '#38bdf8',
  'water/sea': '#0284c7',
  sand: '#fde047',
  ground: '#ca8a04',
  road: '#64748b',
  grass: '#22c55e',
  building: '#a855f7',
  'tree/foliage': '#15803d',
  floor: '#d97706',
  wall: '#94a3b8',
  ceiling: '#cbd5e1',
  mountain: '#65a30d',
  sidewalk: '#9ca3af',
};

export const ImageAnalysisPage: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisRecord | null>(null);

  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Multimodal Intelligence Mode & Controls
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'balanced' | 'accurate' | 'everything'>('balanced');
  const [forceOcr, setForceOcr] = useState<boolean>(false);

  // Studio Controls
  const [viewMode, setViewMode] = useState<'both' | 'objects' | 'segmentation'>('both');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [activeTab, setActiveTab] = useState<'objects' | 'regions' | 'ocr' | 'people' | 'relationships' | 'raw'>('objects');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  useEffect(() => {
    fetchUserImages();
  }, []);

  const fetchUserImages = async () => {
    setIsLoadingImages(true);
    try {
      const response = await imageService.getImages();
      if (response.success && response.data.images) {
        setImages(response.data.images);
        if (response.data.images.length > 0 && !selectedImage) {
          setSelectedImage(response.data.images[0]);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || 'Failed to load images.');
    } finally {
      setIsLoadingImages(false);
    }
  };

  const handleAnalyzeImage = async (overrideForceOcr?: boolean) => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    const effectiveForceOcr = overrideForceOcr !== undefined ? overrideForceOcr : forceOcr;
    try {
      const response = await imageAnalysisService.analyzeImage(
        selectedImage.id,
        analysisMode,
        effectiveForceOcr,
      );
      if (response.success && response.data.analysis) {
        setAnalysisResult(response.data.analysis);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Multimodal analysis failed. Please try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Filter detected objects by confidence slider
  const filteredDetections = (analysisResult?.objectDetection.detections || []).filter(
    (item) => item.confidence >= confidenceThreshold,
  );

  const dominantRegions = analysisResult?.segmentation.regions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            AI Multimodal Image Understanding & Fusion
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Seamlessly combine YOLO11 Object Detection, SegFormer Semantic Segmentation, PaddleOCR, and Vision-Language AI.
          </p>
        </div>

        {/* View Mode Switcher */}
        {analysisResult && (
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'both'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Unified View
            </button>
            <button
              onClick={() => setViewMode('objects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'objects'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Objects Only
            </button>
            <button
              onClick={() => setViewMode('segmentation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'segmentation'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Regions Only
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-2xl text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Studio Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Image Canvas & Visual Overlays */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel p-4 rounded-3xl border border-slate-800 relative overflow-hidden bg-slate-950">
            {/* Visual Viewport */}
            {selectedImage ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900/90 border border-slate-800/80 flex items-center justify-center min-h-[380px]">
                {/* Base Cloudinary Image */}
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.originalName}
                  className="w-full h-auto max-h-[560px] object-contain block select-none"
                />

                {/* SVG Bounding Box Overlay for YOLO */}
                {analysisResult && (viewMode === 'both' || viewMode === 'objects') && (
                  <svg
                    viewBox={`0 0 ${analysisResult.imageWidth} ${analysisResult.imageHeight}`}
                    preserveAspectRatio="xMidYMid meet"
                    className="absolute inset-0 w-full h-full pointer-events-none"
                  >
                    {filteredDetections.map((det, index) => {
                      const color = CLASS_COLORS[det.classId % CLASS_COLORS.length];
                      const width = Math.max(1, det.box.x2 - det.box.x1);
                      const height = Math.max(1, det.box.y2 - det.box.y1);
                      const fontSize = Math.max(12, Math.min(24, Math.round(analysisResult.imageWidth * 0.022)));
                      const padding = 4;
                      const textLabel = `${det.label} ${Math.round(det.confidence * 100)}%`;
                      const textWidth = textLabel.length * (fontSize * 0.62) + padding * 2;
                      const labelY = Math.max(fontSize + 6, det.box.y1);

                      return (
                        <g key={`det-${index}`}>
                          {/* Box outline */}
                          <rect
                            x={det.box.x1}
                            y={det.box.y1}
                            width={width}
                            height={height}
                            fill={color.bg}
                            stroke={color.border}
                            strokeWidth={Math.max(2, Math.round(analysisResult.imageWidth * 0.003))}
                            rx="4"
                          />
                          {/* Label badge background */}
                          <rect
                            x={det.box.x1}
                            y={labelY - fontSize - 4}
                            width={textWidth}
                            height={fontSize + 6}
                            fill="#0f172a"
                            stroke={color.border}
                            strokeWidth="1.5"
                            rx="3"
                          />
                          {/* Label badge text */}
                          <text
                            x={det.box.x1 + padding}
                            y={labelY - 3}
                            fill={color.text}
                            fontSize={fontSize}
                            fontFamily="monospace"
                            fontWeight="bold"
                          >
                            {textLabel}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Environmental Region Strip Overlay */}
                {analysisResult && (viewMode === 'both' || viewMode === 'segmentation') && dominantRegions.length > 0 && (
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
                    {dominantRegions.slice(0, 5).map((reg) => {
                      const color = REGION_COLORS[reg.label.toLowerCase()] || '#6366f1';
                      return (
                        <span
                          key={reg.label}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-950/90 text-white border border-slate-700/80 shadow-lg flex items-center gap-1.5"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="capitalize">{reg.label}</span>
                          <span className="font-mono text-slate-300 font-bold">{reg.regionPercentage}%</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[380px] flex flex-col items-center justify-center text-slate-500 text-xs">
                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                No image selected. Choose an image below to start analysis.
              </div>
            )}

            {/* Slider & Action Bar */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-slate-800/80">
              {/* Left Controls: Confidence Slider & Mode Selector */}
              <div className="flex flex-wrap items-center gap-4">
                {/* Confidence Slider */}
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span className="text-xs text-slate-300 whitespace-nowrap">
                    Confidence: <strong className="text-indigo-400 font-mono">{Math.round(confidenceThreshold * 100)}%</strong>
                  </span>
                  <input
                    type="range"
                    min="0.05"
                    max="0.95"
                    step="0.05"
                    value={confidenceThreshold}
                    onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                    className="w-24 sm:w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Multimodal Intelligence Mode Switcher */}
                <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400 px-1.5">Mode:</span>
                  {(['fast', 'balanced', 'accurate', 'everything'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setAnalysisMode(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                        analysisMode === m
                          ? m === 'everything'
                            ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white shadow-md shadow-purple-500/30'
                            : 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {m === 'balanced' ? 'Balanced' : m === 'everything' ? '✨ Everything' : m}
                    </button>
                  ))}
                  <label className="flex items-center gap-1.5 ml-2 cursor-pointer text-xs text-slate-300 select-none pr-1">
                    <input
                      type="checkbox"
                      checked={forceOcr}
                      onChange={(e) => setForceOcr(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-[11px]">Force OCR</span>
                  </label>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => handleAnalyzeImage()}
                disabled={isAnalyzing || !selectedImage}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Synthesizing Multimodal AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Analyze Image ({analysisMode.toUpperCase()})
                  </>
                )}
              </button>
            </div>
          </div>

          {/* AI Multimodal Fused Scene Banner */}
          {analysisResult && (
            <div className="glass-panel p-5 rounded-3xl border border-indigo-500/40 bg-gradient-to-br from-indigo-950/30 via-slate-900/60 to-purple-950/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Compass className="w-4 h-4" /> Scene Understanding
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                    {analysisResult.fusedResult.sceneType}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/80 uppercase">
                    {analysisResult.fusedResult.environment}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-300 border border-slate-700/80 flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    {analysisResult.fusedResult.weather}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1 text-indigo-300 font-bold">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Total: {analysisResult.timings?.totalMs ? `${analysisResult.timings.totalMs.toFixed(1)} ms` : `${analysisResult.totalProcessingTimeMs} ms`}
                  </span>
                </div>
              </div>

              {/* Natural Language Synthesis Description */}
              <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800/90 text-sm text-slate-200 leading-relaxed font-sans">
                {analysisResult.fusedResult.description}
              </div>

              {/* Phase 9: Detailed Execution Breakdown */}
              {analysisResult.timings && (
                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" /> Latency Breakdown
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Mode: {analysisResult.analysisMode || 'balanced'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">Quality</div>
                      <div className="font-mono text-slate-200 font-semibold">{analysisResult.timings.qualityCheckMs?.toFixed(1) || 0}ms</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">Router</div>
                      <div className="font-mono text-slate-200 font-semibold">{analysisResult.timings.routingMs?.toFixed(1) || 0}ms</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">YOLO11</div>
                      <div className="font-mono text-slate-200 font-semibold">{analysisResult.timings.objectDetectionMs?.toFixed(1) || 0}ms</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">SegFormer</div>
                      <div className="font-mono text-slate-200 font-semibold">
                        {analysisResult.modules?.segmentation === 'skipped' ? (
                          <span className="text-amber-400 font-sans text-[10px]">Skipped</span>
                        ) : (
                          `${analysisResult.timings.segmentationMs?.toFixed(1) || 0}ms`
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">PaddleOCR</div>
                      <div className="font-mono text-slate-200 font-semibold">
                        {analysisResult.modules?.ocr === 'skipped' ? (
                          <span className="text-amber-400 font-sans text-[10px]">Skipped</span>
                        ) : (
                          `${analysisResult.timings.ocrMs?.toFixed(1) || 0}ms`
                        )}
                      </div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">Gemini</div>
                      <div className="font-mono text-slate-200 font-semibold">{analysisResult.timings.visionMs?.toFixed(1) || 0}ms</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/70">
                      <div className="text-[10px] text-slate-400">AI Fusion</div>
                      <div className="font-mono text-slate-200 font-semibold">{analysisResult.timings.fusionMs?.toFixed(1) || 0}ms</div>
                    </div>
                  </div>
                  {analysisResult.routingDecision?.reason && (
                    <div className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-slate-500 font-semibold">Routing Reason:</span>
                      <span className="italic text-slate-300">{analysisResult.routingDecision.reason}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Detailed Inspection Tabs */}
          {analysisResult && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
              {/* Tab Navigation */}
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('objects')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'objects' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  Objects ({filteredDetections.length})
                </button>
                <button
                  onClick={() => setActiveTab('regions')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'regions' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Semantic Regions ({dominantRegions.length})
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'ocr' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  OCR Text ({analysisResult.ocr.lineCount} lines)
                </button>
                <button
                  onClick={() => setActiveTab('people')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'people' ? 'bg-pink-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  People & Accessories ({analysisResult.people?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('relationships')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'relationships' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  Relationships ({analysisResult.relationships?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('raw')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    activeTab === 'raw' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Module Breakdown
                </button>
              </div>

              {/* Tab Content 1: Detected Objects */}
              {activeTab === 'objects' && (
                <div className="space-y-3">
                  {filteredDetections.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No objects detected above {Math.round(confidenceThreshold * 100)}% confidence.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {filteredDetections.map((obj, i) => {
                        const color = CLASS_COLORS[obj.classId % CLASS_COLORS.length];
                        return (
                          <div
                            key={i}
                            className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className={`w-3 h-3 rounded-full ${color.solid}`} />
                              <span className="font-semibold text-white capitalize truncate">{obj.label}</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-slate-400">
                                [{Math.round(obj.box.x1)}, {Math.round(obj.box.y1)}, {Math.round(obj.box.x2)}, {Math.round(obj.box.y2)}]
                              </span>
                              <span className="px-2 py-0.5 rounded bg-slate-950 font-bold text-indigo-300 border border-slate-800">
                                {Math.round(obj.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 2: Semantic Regions */}
              {activeTab === 'regions' && (
                <div className="space-y-3">
                  {dominantRegions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No environmental regions identified above 1% area.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {dominantRegions.map((reg, idx) => {
                        const color = REGION_COLORS[reg.label.toLowerCase()] || '#6366f1';
                        return (
                          <div key={idx} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-white capitalize flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                {reg.label}
                                {reg.rawLabel && reg.rawLabel !== reg.label && (
                                  <span className="text-[10px] text-slate-500 font-mono">({reg.rawLabel})</span>
                                )}
                              </span>
                              <span className="font-mono text-emerald-400 font-bold text-xs">{reg.regionPercentage}%</span>
                            </div>
                            {/* Percentage Progress Bar */}
                            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${Math.min(100, reg.regionPercentage)}%`,
                                  backgroundColor: color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 3: OCR Text */}
              {activeTab === 'ocr' && (
                <div className="space-y-3">
                  {analysisResult.modules?.ocr === 'skipped' && (
                    <div className="p-3 bg-amber-950/30 border border-amber-700/50 rounded-xl text-amber-300 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>OCR was skipped by adaptive routing (low text scene detected).</span>
                      </div>
                      <button
                        onClick={() => handleAnalyzeImage(true)}
                        disabled={isAnalyzing}
                        className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all whitespace-nowrap"
                      >
                        Run OCR Anyway
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Average Confidence: <strong className="text-purple-300 font-mono">{Math.round(analysisResult.ocr.avgConfidence * 100)}%</strong>
                    </span>
                    {analysisResult.ocr.fullText && (
                      <button
                        onClick={() => handleCopyText(analysisResult.ocr.fullText)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                      >
                        {copiedText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy Text
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[220px] overflow-y-auto">
                    {analysisResult.ocr.fullText || (
                      <span className="text-slate-500 italic">
                        {analysisResult.modules?.ocr === 'skipped'
                          ? 'OCR was skipped for this image to maximize inference speed. Click "Run OCR Anyway" above if text is present.'
                          : 'No textual characters detected in this image.'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: People & Fine-Grained Accessories */}
              {activeTab === 'people' && (
                <div className="space-y-4">
                  {(!analysisResult.people || analysisResult.people.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-2">
                      <User className="w-8 h-8 text-slate-600 mx-auto" />
                      <div>No people detected in this image.</div>
                      <div className="text-[11px] text-slate-600 max-w-sm mx-auto">
                        People-First Intelligence scans for body regions (head, ears, neck, wrists, hands, waist, feet) and micro-accessories whenever people are present.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysisResult.people.map((person, pIdx) => {
                        const allAccessories = [
                          ...(person.head_accessories || []).map((a: any) => ({ ...a, region: 'Head / Face' })),
                          ...(person.ear_accessories || []).map((a: any) => ({ ...a, region: 'Ears' })),
                          ...(person.neck_accessories || []).map((a: any) => ({ ...a, region: 'Neck' })),
                          ...(person.wrist_accessories || []).map((a: any) => ({ ...a, region: 'Wrist / Arm' })),
                          ...(person.hand_accessories || []).map((a: any) => ({ ...a, region: 'Hands / Fingers' })),
                          ...(person.carried_objects || []).map((a: any) => ({ ...a, region: 'Carried' })),
                        ];

                        return (
                          <div
                            key={pIdx}
                            className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-pink-500/40 transition-all space-y-3.5"
                          >
                            {/* Person Header */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 text-pink-400 flex items-center justify-center font-bold text-xs">
                                  #{person.personId || pIdx + 1}
                                </div>
                                <div>
                                  <div className="text-xs font-bold text-white flex items-center gap-2">
                                    <span>Person #{person.personId || pIdx + 1}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-pink-950/80 text-pink-300 border border-pink-800">
                                      {Math.round((person.confidence || 0.9) * 100)}% Conf
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono">
                                    Box: [{person.bbox?.map((v: number) => Math.round(v)).join(', ')}]
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Clothing & Apparel Section */}
                            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                <Tag className="w-3 h-3 text-indigo-400" />
                                Clothing & Garments ({person.clothing?.length || 0})
                              </div>
                              {(!person.clothing || person.clothing.length === 0) ? (
                                <div className="text-xs text-slate-500 italic">No specific garment classification detected.</div>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {person.clothing.map((c, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 flex items-center gap-2"
                                    >
                                      {c.color && (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-slate-700 shrink-0"
                                          style={{ backgroundColor: c.color.toLowerCase() }}
                                          title={`Color: ${c.color}`}
                                        />
                                      )}
                                      <span className="font-semibold capitalize">{c.displayName || c.type}</span>
                                      <span className="text-[10px] text-indigo-400 font-mono">
                                        {c.color && <span className="text-slate-400 font-sans mr-1">{c.color}</span>}
                                        {Math.round((c.confidence || 0.8) * 100)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Fine-Grained Accessories Scanned via YOLO-World & Zoom Router */}
                            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800/80 space-y-2">
                              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                                <span className="flex items-center gap-1.5">
                                  <Sparkles className="w-3 h-3 text-pink-400" />
                                  Micro-Accessories & Fine Gear ({allAccessories.length})
                                </span>
                              </div>
                              {allAccessories.length === 0 ? (
                                <div className="text-xs text-slate-500 italic">No micro-accessories detected for this individual.</div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {allAccessories.map((acc: any, accIdx: number) => (
                                    <div
                                      key={accIdx}
                                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs flex items-center justify-between gap-2"
                                    >
                                      <div className="min-w-0">
                                        <div className="font-semibold text-pink-300 capitalize truncate">
                                          {acc.label || acc.type || 'Accessory'}
                                        </div>
                                        <div className="text-[10px] text-slate-400 font-sans">
                                          {acc.region || acc.category || 'Body Region'}
                                        </div>
                                      </div>
                                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-950 text-pink-400 border border-slate-800">
                                        {Math.round((acc.confidence || 0.75) * 100)}%
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Spatial Relationships */}
              {activeTab === 'relationships' && (
                <div className="space-y-4">
                  {(!analysisResult.relationships || analysisResult.relationships.length === 0) ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800 space-y-2">
                      <Tag className="w-8 h-8 text-slate-600 mx-auto" />
                      <div>No spatial relationships identified.</div>
                      <div className="text-[11px] text-slate-600 max-w-sm mx-auto">
                        Spatial Relationship Engine infers interaction tuples (e.g. subject wearing/holding/next-to target) with geometric IoU validation.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                      {analysisResult.relationships.map((rel, rIdx) => (
                        <div
                          key={rIdx}
                          className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-col justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 font-semibold border border-indigo-800 capitalize text-[11px]">
                              {rel.subject}
                            </span>
                            <span className="text-amber-400 font-mono text-[10px] uppercase font-bold">
                              ➔ {rel.relation} ➔
                            </span>
                            <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 font-semibold border border-purple-800 capitalize text-[11px]">
                              {rel.object}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300 italic font-sans">
                            "{rel.description}"
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                            <span>IoU Grounded</span>
                            <span className="text-amber-400 font-bold">{Math.round((rel.confidence || 0.8) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content 4: Module Breakdown */}
              {activeTab === 'raw' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">YOLO Detection</div>
                    <div className="font-bold text-white mt-1">{analysisResult.objectDetection.model}</div>
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5">
                      {analysisResult.timings?.objectDetectionMs?.toFixed(1) || analysisResult.objectDetection.processingTimeMs} ms
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">SegFormer</div>
                    <div className="font-bold text-white mt-1">
                      {analysisResult.modules?.segmentation === 'skipped' ? (
                        <span className="text-amber-400">Skipped (Doc Mode)</span>
                      ) : (
                        analysisResult.segmentation.model
                      )}
                    </div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">
                      {analysisResult.modules?.segmentation === 'skipped'
                        ? '0 ms'
                        : `${analysisResult.timings?.segmentationMs?.toFixed(1) || analysisResult.segmentation.processingTimeMs} ms`}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">PaddleOCR</div>
                    <div className="font-bold text-white mt-1">
                      {analysisResult.modules?.ocr === 'skipped' ? (
                        <span className="text-amber-400">Skipped (Auto Router)</span>
                      ) : (
                        'Multi-Pass vi'
                      )}
                    </div>
                    <div className="text-[11px] text-purple-400 font-mono mt-0.5">
                      {analysisResult.modules?.ocr === 'skipped'
                        ? '0 ms'
                        : `${analysisResult.timings?.ocrMs?.toFixed(1) || analysisResult.ocr.processingTimeMs} ms`}
                    </div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Vision LLM</div>
                    <div className="font-bold text-white mt-1">
                      {analysisResult.vision.isFallback ? 'Evidence Grounded' : 'Gemini 1.5'}
                    </div>
                    <div className="text-[11px] text-pink-400 font-mono mt-0.5">
                      {analysisResult.timings?.visionMs?.toFixed(1) || 'Ready'} ms
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Image Selection Gallery */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-indigo-400" /> Select Image to Analyze
            </h3>

            {isLoadingImages ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                Loading your images...
              </div>
            ) : images.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
                No images uploaded yet. Please go to OCR Scanner or Dashboard to upload an image.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 max-h-[580px] overflow-y-auto pr-1">
                {images.map((img) => {
                  const isSelected = selectedImage?.id === img.id;
                  return (
                    <div
                      key={img.id}
                      onClick={() => {
                        setSelectedImage(img);
                        setAnalysisResult(null);
                      }}
                      className={`cursor-pointer rounded-2xl overflow-hidden border transition-all p-1.5 flex flex-col justify-between ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-600/10 shadow-md shadow-indigo-500/20'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="aspect-square bg-slate-950 rounded-xl overflow-hidden mb-2">
                        <img src={img.imageUrl} alt={img.originalName} className="w-full h-full object-cover" />
                      </div>
                      <div className="px-1 pb-1">
                        <div className="text-[11px] font-medium text-white truncate" title={img.originalName}>
                          {img.originalName}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{(img.size / 1024).toFixed(1)} KB</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
