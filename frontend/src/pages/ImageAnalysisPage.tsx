import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Scan,
  Compass,
  FileText,
  Copy,
  Check,
  Sun,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { ImageRecord, ImageAnalysisRecord } from '../types';
import { Button } from '../components/ui/Button';

const CLASS_COLORS = [
  { border: '#4F46E5', bg: 'rgba(79, 70, 229, 0.1)', text: '#4338CA' },
  { border: '#059669', bg: 'rgba(5, 150, 105, 0.1)', text: '#047857' },
  { border: '#D97706', bg: 'rgba(217, 119, 6, 0.1)', text: '#B45309' },
  { border: '#DB2777', bg: 'rgba(219, 39, 119, 0.1)', text: '#BE185D' },
  { border: '#7C3AED', bg: 'rgba(124, 58, 237, 0.1)', text: '#6D28D9' },
  { border: '#0284C7', bg: 'rgba(2, 132, 199, 0.1)', text: '#0369A1' },
];

const REGION_COLORS: Record<string, string> = {
  sky: '#0284C7',
  'water/sea': '#0369A1',
  sand: '#D97706',
  ground: '#92400E',
  road: '#64748B',
  grass: '#16A34A',
  building: '#7C3AED',
  'tree/foliage': '#15803D',
  floor: '#B45309',
  wall: '#64748B',
  ceiling: '#94A3B8',
  mountain: '#4D7C0F',
  sidewalk: '#64748B',
};

export const ImageAnalysisPage: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisRecord | null>(null);

  const [isLoadingImages, setIsLoadingImages] = useState<boolean>(true);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<'both' | 'objects' | 'segmentation'>('both');
  const [activeTab, setActiveTab] = useState<'objects' | 'regions' | 'ocr'>('objects');
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

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const response = await imageAnalysisService.analyzeImage(
        selectedImage.id,
        'balanced',
        false,
      );
      if (response.success && response.data.analysis) {
        setAnalysisResult(response.data.analysis);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message ||
          err.message ||
          'Analysis failed. Please try again.',
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

  const filteredDetections = (analysisResult?.objectDetection.detections || []).filter(
    (item) => item.confidence >= 0.25,
  );

  const dominantRegions = analysisResult?.segmentation.regions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          Multimodal AI
        </h1>

        {/* View Mode Switcher */}
        {analysisResult && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'both' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Unified View
            </button>
            <button
              onClick={() => setViewMode('objects')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'objects' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Objects
            </button>
            <button
              onClick={() => setViewMode('segmentation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'segmentation' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Regions
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Visual Viewport & Quick Pick (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-card space-y-4">
            
            {/* Visual Viewport */}
            {selectedImage ? (
              <div className="relative w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 flex items-center justify-center min-h-[380px]">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.originalName}
                  className="w-full h-auto max-h-[560px] object-contain block select-none rounded-xl"
                />

                {/* SVG Bounding Boxes */}
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

                      return (
                        <rect
                          key={`det-${index}`}
                          x={det.box.x1}
                          y={det.box.y1}
                          width={width}
                          height={height}
                          fill={color.bg}
                          stroke={color.border}
                          strokeWidth={2}
                          rx="4"
                        />
                      );
                    })}
                  </svg>
                )}

                {/* Semantic Regions Pill Strip */}
                {analysisResult && (viewMode === 'both' || viewMode === 'segmentation') && dominantRegions.length > 0 && (
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
                    {dominantRegions.slice(0, 5).map((reg) => {
                      const color = REGION_COLORS[reg.label.toLowerCase()] || '#4F46E5';
                      return (
                        <span
                          key={reg.label}
                          className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/95 text-slate-900 border border-slate-200 shadow-sm flex items-center gap-1.5"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="capitalize">{reg.label}</span>
                          <span className="text-slate-400 font-mono">{reg.regionPercentage}%</span>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="min-h-[380px] flex flex-col items-center justify-center text-slate-400 text-xs">
                <ImageIcon className="w-10 h-10 mb-2 text-slate-300" />
                Select an image to analyze
              </div>
            )}

            {/* Quick-select Image Strip */}
            {images.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => {
                      setSelectedImage(img);
                      setAnalysisResult(null);
                    }}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border shrink-0 transition-all ${
                      selectedImage?.id === img.id
                        ? 'border-indigo-600 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:border-slate-400'
                    }`}
                    title={img.originalName}
                  >
                    <img src={img.imageUrl} alt={img.originalName} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Controls & Results (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Analyze Action Card */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-3">
            <Button
              onClick={() => handleAnalyzeImage()}
              disabled={isAnalyzing || !selectedImage}
              isLoading={isAnalyzing}
              className="w-full"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {isAnalyzing ? 'Analyzing Scene...' : 'Analyze Scene'}
            </Button>
          </div>

          {/* Results Card */}
          {analysisResult && (
            <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-card space-y-4">
              
              {/* Scene Synthesis Description */}
              <div className="space-y-2 pb-3 border-b border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                    {analysisResult.fusedResult.sceneType}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                    {analysisResult.fusedResult.environment}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[11px] font-semibold flex items-center gap-1">
                    <Sun className="w-3 h-3 text-amber-500" />
                    {analysisResult.fusedResult.weather}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed pt-1">
                  {analysisResult.fusedResult.description}
                </p>
              </div>

              {/* Segmented Inspection Tabs */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('objects')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'objects' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Objects ({filteredDetections.length})
                </button>
                <button
                  onClick={() => setActiveTab('regions')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'regions' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Regions ({dominantRegions.length})
                </button>
                <button
                  onClick={() => setActiveTab('ocr')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'ocr' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Text ({analysisResult.ocr.lineCount})
                </button>
              </div>

              {/* TAB 1: OBJECTS */}
              {activeTab === 'objects' && (
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredDetections.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                      No objects identified.
                    </div>
                  ) : (
                    filteredDetections.map((det, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-slate-900 capitalize">{det.label}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {Math.round(det.confidence * 100)}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: REGIONS */}
              {activeTab === 'regions' && (
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {dominantRegions.map((reg, idx) => {
                    const color = REGION_COLORS[reg.label.toLowerCase()] || '#4F46E5';
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/70 text-xs flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-slate-900 capitalize">{reg.label}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-500 font-bold">{reg.regionPercentage}%</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: TEXT */}
              {activeTab === 'ocr' && (
                <div className="space-y-2">
                  {analysisResult.ocr.fullText ? (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                      {analysisResult.ocr.fullText}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                      No text detected in scene.
                    </div>
                  )}
                </div>
              )}

            </div>
          )}

        </div>

      </div>

    </div>
  );
};

export default ImageAnalysisPage;
