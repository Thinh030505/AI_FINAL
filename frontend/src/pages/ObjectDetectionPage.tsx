import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Upload,
  Sparkles,
  Eye,
  EyeOff,
  Image as ImageIcon,
  SlidersHorizontal,
  X,
  Maximize2,
  Minimize2,
  BookOpen,
  Scan,
  FileText,
  Copy,
  Check,
  Languages,
  Loader2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { visualIntelligenceService } from '../services/visualIntelligenceService';
import {
  ImageRecord,
  VisualIntelligenceRecord,
  VisualIntelligenceObject,
  VisualIntelligenceText,
  DetectionItem,
} from '../types';
import { getVocabularyByClassId, getVocabularyByLabel } from '../data/cocoDictionary';
import { FloatingCardsOverlay } from '../components/vocabulary/FloatingCardsOverlay';
import { GroupedVocabularyCard } from '../components/vocabulary/GroupedVocabularyCard';
import { LanguageSelector, getStoredLanguage } from '../components/common/LanguageSelector';
import { Button } from '../components/ui/Button';
import {
  aggregateObjectsByClass,
  computeStudioStats,
} from '../utils/vocabularyAggregation';
import { translateOcrTextWithCache } from '../utils/synchronizedTranslation';

const OBJECT_COLORS = [
  { stroke: '#4F46E5', fill: 'rgba(79, 70, 229, 0.08)', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  { stroke: '#059669', fill: 'rgba(5, 150, 105, 0.08)', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  { stroke: '#D97706', fill: 'rgba(217, 119, 6, 0.08)', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { stroke: '#DB2777', fill: 'rgba(219, 39, 119, 0.08)', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  { stroke: '#7C3AED', fill: 'rgba(124, 58, 237, 0.08)', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { stroke: '#0284C7', fill: 'rgba(2, 132, 199, 0.08)', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' },
  { stroke: '#DC2626', fill: 'rgba(220, 38, 38, 0.08)', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  { stroke: '#0D9488', fill: 'rgba(13, 148, 136, 0.08)', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
];

export const ObjectDetectionPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<ImageRecord | null>(null);
  const [analysisResult, setAnalysisResult] = useState<VisualIntelligenceRecord | null>(null);

  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Learn Mode vs Compact Mode
  const [displayMode, setDisplayMode] = useState<'learn' | 'compact'>('learn');

  // Shared Multi-Language Translation
  const [targetLanguage, setTargetLanguage] = useState<string>(() => getStoredLanguage('vi'));

  // Layer toggles: 'all' | 'objects' | 'text' | 'none'
  const [viewLayer, setViewLayer] = useState<'all' | 'objects' | 'text' | 'none'>('all');
  const [showLabels, setShowLabels] = useState(true);
  const [activeTab, setActiveTab] = useState<'objects' | 'text'>('objects');

  // Confidence Filter
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0.25);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement | null>(null);

  // Zoom and Fullscreen
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Cross-highlighting states
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [hoveredClassId, setHoveredClassId] = useState<number | null>(null);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [hoveredTextId, setHoveredTextId] = useState<string | null>(null);

  // OCR Translation state (Part 4)
  const [ocrFullTextTranslation, setOcrFullTextTranslation] = useState<string | null>(null);
  const [isTranslatingOcr, setIsTranslatingOcr] = useState(false);
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  const [lineTranslations, setLineTranslations] = useState<Record<string, string>>({});
  const [translatingLineId, setTranslatingLineId] = useState<string | null>(null);

  // Responsive image dimensions tracking
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [renderedDimensions, setRenderedDimensions] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const updateDimensions = useCallback(() => {
    if (imageRef.current) {
      const width = imageRef.current.clientWidth;
      const height = imageRef.current.clientHeight;
      if (width > 0 && height > 0) {
        setRenderedDimensions((prev) => {
          if (prev.width === width && prev.height === height) return prev;
          return { width, height };
        });
      }
    }
  }, []);

  useEffect(() => {
    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    let observer: ResizeObserver | null = null;
    if (imageRef.current && typeof window.ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        updateDimensions();
      });
      observer.observe(imageRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (observer) observer.disconnect();
    };
  }, [updateDimensions, previewUrl, analysisResult, zoomLevel]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        const res = await imageService.getImages();
        if (res.success && res.data.images) {
          setRecentImages(res.data.images.slice(0, 8));
        }
      } catch (err) {
        // Silently handle
      }
    };
    fetchRecentImages();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedImage(null);
      setAnalysisResult(null);
      setOcrFullTextTranslation(null);
      setSelectedObjectId(null);
      setSelectedClassId(null);
      setSelectedTextId(null);
      setErrorMessage(null);
      setZoomLevel(1);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadedImage(null);
      setAnalysisResult(null);
      setOcrFullTextTranslation(null);
      setSelectedObjectId(null);
      setSelectedClassId(null);
      setSelectedTextId(null);
      setErrorMessage(null);
      setZoomLevel(1);
    }
  };

  const handleSelectRecentImage = (img: ImageRecord) => {
    setSelectedFile(null);
    setPreviewUrl(img.imageUrl);
    setUploadedImage(img);
    setAnalysisResult(null);
    setOcrFullTextTranslation(null);
    setSelectedObjectId(null);
    setSelectedClassId(null);
    setSelectedTextId(null);
    setErrorMessage(null);
    setZoomLevel(1);
  };

  // Unified Parallel Dual-Engine Analysis (Part 3.1)
  const handleRunAnalysis = async () => {
    let imageId = uploadedImage?.id;
    setErrorMessage(null);
    setOcrFullTextTranslation(null);

    try {
      if (!imageId && selectedFile) {
        setIsUploading(true);
        const uploadRes = await imageService.uploadImage(selectedFile, 'upload');
        imageId = uploadRes.data.image.id;
        setUploadedImage(uploadRes.data.image);
        setIsUploading(false);
      }

      if (!imageId) {
        setErrorMessage('Please select or upload an image first.');
        return;
      }

      setIsAnalyzing(true);
      // Calls unified backend visual intelligence (YOLO11 + PaddleOCR in parallel)
      const res = await visualIntelligenceService.analyzeImage(imageId, confidenceFilter);

      if (res.success && res.data.visualIntelligence) {
        const record = res.data.visualIntelligence;
        // Enrich detected objects with COCO dictionary
        if (record.analysis?.objects) {
          record.analysis.objects = record.analysis.objects.map((obj) => ({
            ...obj,
            vocabulary: getVocabularyByClassId(obj.classId) || getVocabularyByLabel(obj.label),
          }));
        }
        setAnalysisResult(record);
        if (record.analysis?.objects && record.analysis.objects.length > 0) {
          setSelectedClassId(record.analysis.objects[0].classId);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.message || 'Analysis failed. Please try again.');
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // OCR Translation Handlers (Part 4)
  const handleTranslateOcrFullText = async () => {
    const text = analysisResult?.analysis.fullText;
    if (!text || !text.trim()) return;

    setIsTranslatingOcr(true);
    try {
      const translated = await translateOcrTextWithCache(text, targetLanguage, 'auto');
      setOcrFullTextTranslation(translated);
    } catch {
      // Graceful fallback
    } finally {
      setIsTranslatingOcr(false);
    }
  };

  const handleTranslateOcrLine = async (lineText: string, lineId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lineText.trim()) return;

    setTranslatingLineId(lineId);
    try {
      const translated = await translateOcrTextWithCache(lineText, targetLanguage, 'auto');
      setLineTranslations((prev) => ({ ...prev, [lineId]: translated }));
    } catch {
      // Graceful fallback
    } finally {
      setTranslatingLineId(null);
    }
  };

  const handleCopyOriginalText = () => {
    if (analysisResult?.analysis.fullText) {
      navigator.clipboard.writeText(analysisResult.analysis.fullText);
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    }
  };

  const handleCopyTranslatedText = () => {
    if (ocrFullTextTranslation) {
      navigator.clipboard.writeText(ocrFullTextTranslation);
      setCopiedTranslated(true);
      setTimeout(() => setCopiedTranslated(false), 2000);
    }
  };

  const handleCopyLine = (text: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 2000);
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  // Filtered lists
  const rawObjects = analysisResult?.analysis.objects || [];
  const rawTexts = analysisResult?.analysis.texts || [];

  const filteredObjects: VisualIntelligenceObject[] = useMemo(() => {
    return rawObjects.filter((obj) => obj.confidence >= confidenceFilter);
  }, [rawObjects, confidenceFilter]);

  const filteredTexts: VisualIntelligenceText[] = useMemo(() => {
    return rawTexts;
  }, [rawTexts]);

  // Duplicate Class Aggregation (Part 5)
  const groupedVocabularyItems = useMemo(() => {
    return aggregateObjectsByClass(filteredObjects);
  }, [filteredObjects]);

  // Statistics (Part 5.3)
  const studioStats = useMemo(() => {
    return computeStudioStats(filteredObjects, filteredTexts);
  }, [filteredObjects, filteredTexts]);

  // Map counts by classId for small labels and floating cards
  const countsByClassId = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const grp of groupedVocabularyItems) {
      counts[grp.classId] = grp.count;
    }
    return counts;
  }, [groupedVocabularyItems]);

  // Convert objects to DetectionItem format for FloatingCardsOverlay
  const overlayDetections: DetectionItem[] = useMemo(() => {
    return filteredObjects.map((obj) => ({
      label: obj.label,
      classId: obj.classId,
      confidence: obj.confidence,
      box: { ...obj.bbox },
      vocabulary: obj.vocabulary,
    }));
  }, [filteredObjects]);

  const selectedOverlayIndex = useMemo(() => {
    if (!selectedObjectId) return null;
    const idx = filteredObjects.findIndex((o) => o.id === selectedObjectId);
    return idx >= 0 ? idx : null;
  }, [selectedObjectId, filteredObjects]);

  const hoveredOverlayIndex = useMemo(() => {
    if (!hoveredObjectId) return null;
    const idx = filteredObjects.findIndex((o) => o.id === hoveredObjectId);
    return idx >= 0 ? idx : null;
  }, [hoveredObjectId, filteredObjects]);

  const showObjects = viewLayer === 'all' || viewLayer === 'objects';
  const showTexts = viewLayer === 'all' || viewLayer === 'text';

  const getColor = (index: number) => OBJECT_COLORS[index % OBJECT_COLORS.length];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-14">
      {/* ─────────────────────────────────────────────────────────────
          HEADER & TOOLBAR: Title, Layer Controls, Language Selector, Mode Switcher
          ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Object Detection & Vocabulary Studio</span>
            <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              YOLO11 + PaddleOCR
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visual vocabulary learning, synchronized multilingual translation & text extraction
          </p>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Synchronized Multi-Language Selector (Part 2.1) */}
          <LanguageSelector
            value={targetLanguage}
            onChange={(code) => setTargetLanguage(code)}
            size="md"
          />

          {/* Mode Switcher: Learn Mode vs Compact Mode */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayMode('learn')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'learn'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Full Vocabulary Learning Cards"
            >
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
              <span>Learn Mode</span>
            </button>
            <button
              onClick={() => setDisplayMode('compact')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                displayMode === 'compact'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Compact Quick Inspector"
            >
              <span>Compact</span>
            </button>
          </div>

          {/* Settings Popover (Confidence Threshold & Label Toggle) */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-2 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 ${
                isSettingsOpen
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Detection Settings"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono text-[11px]">
                {Math.round(confidenceFilter * 100)}%
              </span>
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-elevated border border-slate-200 p-4 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
                  <span className="text-xs font-bold text-slate-800">Confidence Threshold</span>
                  <span className="text-xs font-mono font-bold text-indigo-600">
                    {Math.round(confidenceFilter * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>10% (More)</span>
                  <span>90% (Strict)</span>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700">Display Canvas Labels</span>
                  <button
                    onClick={() => setShowLabels(!showLabels)}
                    className={`p-1.5 rounded-lg border text-xs font-medium ${
                      showLabels ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}
                  >
                    {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layer Controls Bar (Part 3.4) & Simple Statistics (Part 5.3) */}
      {analysisResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-subtle">
          {/* Simple Statistics Chips (Part 5.3) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs font-bold">
              <Scan className="w-3.5 h-3.5 text-indigo-600" />
              <span>Objects:</span>
              <strong className="font-extrabold">{studioStats.totalObjects}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-900 text-xs font-bold">
              <span>Classes:</span>
              <strong className="font-extrabold">{studioStats.uniqueClasses}</strong>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 border border-amber-100 text-amber-900 text-xs font-bold">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              <span>Text Regions:</span>
              <strong className="font-extrabold">{studioStats.textRegions}</strong>
            </div>
          </div>

          {/* Layer Controls Buttons (Part 3.4) */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
            <button
              onClick={() => setViewLayer('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewLayer === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Show All
            </button>
            <button
              onClick={() => setViewLayer('objects')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewLayer === 'objects'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Objects ({filteredObjects.length})
            </button>
            <button
              onClick={() => setViewLayer('text')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewLayer === 'text'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Text ({filteredTexts.length})
            </button>
            <button
              onClick={() => setViewLayer('none')}
              className={`p-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewLayer === 'none'
                  ? 'bg-white text-slate-800 shadow-xs'
                  : 'text-slate-400 hover:text-slate-800'
              }`}
              title="Hide All Overlays"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MAIN WORKSPACE GRID: CANVAS (LEFT) & SIDEBAR (RIGHT)
          ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Image Canvas Workspace (8 cols) */}
        <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/95 p-4 flex flex-col justify-center' : 'lg:col-span-8'}`}>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-4 sm:p-5 space-y-4 relative">
            {/* Viewport Zoom & Fullscreen Toolbar */}
            {previewUrl && (
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-xs">
                    {uploadedImage?.originalName || selectedFile?.name || 'Image Workspace'}
                  </span>
                  {analysisResult && (
                    <span className="text-[10px] font-mono text-slate-400">
                      ({analysisResult.imageWidth} × {analysisResult.imageHeight})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-mono font-semibold"
                    title="Reset Zoom"
                  >
                    {Math.round(zoomLevel * 100)}%
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  >
                    {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Viewport Canvas */}
            {previewUrl ? (
              <div
                className="relative w-full rounded-2xl overflow-hidden bg-slate-900/5 border border-slate-200/80 flex items-center justify-center min-h-[380px]"
                onClick={() => {
                  setSelectedObjectId(null);
                  setSelectedClassId(null);
                  setSelectedTextId(null);
                }}
              >
                <div
                  className="relative transition-transform duration-150 inline-block"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
                >
                  <img
                    ref={imageRef}
                    src={previewUrl}
                    alt="Analysis Target"
                    className="w-full h-auto max-h-[580px] object-contain block select-none rounded-xl"
                  />

                  {/* SVG Unified Canvas Overlays (Part 3.2 & 3.3) */}
                  {analysisResult && (
                    <svg
                      viewBox={`0 0 ${analysisResult.imageWidth} ${analysisResult.imageHeight}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="absolute inset-0 w-full h-full pointer-events-none"
                    >
                      {/* OCR Text Bounding Boxes (Amber / Orange theme with dashed stroke) */}
                      {showTexts &&
                        filteredTexts.map((txt) => {
                          const isHovered = hoveredTextId === txt.id;
                          const isSelected = selectedTextId === txt.id;
                          const isHighlighted = isHovered || isSelected;

                          const width = Math.max(1, txt.bbox.x2 - txt.bbox.x1);
                          const height = Math.max(1, txt.bbox.y2 - txt.bbox.y1);

                          return (
                            <g key={`svg-text-${txt.id}`}>
                              <rect
                                x={txt.bbox.x1}
                                y={txt.bbox.y1}
                                width={width}
                                height={height}
                                fill={isHighlighted ? 'rgba(217, 119, 6, 0.22)' : 'rgba(245, 158, 11, 0.12)'}
                                stroke={isHighlighted ? '#D97706' : '#F59E0B'}
                                strokeWidth={isHighlighted ? 3 : 1.8}
                                strokeDasharray={isHighlighted ? 'none' : '4 2'}
                                rx="3"
                                className="pointer-events-auto cursor-pointer transition-all"
                                onMouseEnter={() => setHoveredTextId(txt.id)}
                                onMouseLeave={() => setHoveredTextId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTextId(txt.id);
                                  setSelectedObjectId(null);
                                  setActiveTab('text');
                                }}
                              />
                            </g>
                          );
                        })}

                      {/* Object Bounding Boxes (Indigo / Violet theme with solid stroke) */}
                      {showObjects &&
                        filteredObjects.map((obj, idx) => {
                          const col = getColor(obj.classId);
                          const isHovered =
                            hoveredObjectId === obj.id || hoveredClassId === obj.classId;
                          const isSelected =
                            selectedObjectId === obj.id || selectedClassId === obj.classId;
                          const isHighlighted = isHovered || isSelected;

                          const width = Math.max(1, obj.bbox.x2 - obj.bbox.x1);
                          const height = Math.max(1, obj.bbox.y2 - obj.bbox.y1);

                          return (
                            <g key={`svg-object-${obj.id}`}>
                              <rect
                                x={obj.bbox.x1}
                                y={obj.bbox.y1}
                                width={width}
                                height={height}
                                fill={isHighlighted ? `${col.stroke}24` : col.fill}
                                stroke={col.stroke}
                                strokeWidth={isHighlighted ? 3.5 : 2}
                                rx="4"
                                className="pointer-events-auto cursor-pointer transition-all"
                                onMouseEnter={() => {
                                  setHoveredObjectId(obj.id);
                                  setHoveredClassId(obj.classId);
                                }}
                                onMouseLeave={() => {
                                  setHoveredObjectId(null);
                                  setHoveredClassId(null);
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedObjectId(obj.id);
                                  setSelectedClassId(obj.classId);
                                  setSelectedTextId(null);
                                  setActiveTab('objects');
                                }}
                              />
                            </g>
                          );
                        })}
                    </svg>
                  )}

                  {/* HTML Overlay: Smart Labels & Rich Expanded Vocabulary Card */}
                  {analysisResult && showObjects && (
                    <FloatingCardsOverlay
                      detections={overlayDetections}
                      originalWidth={analysisResult.imageWidth}
                      originalHeight={analysisResult.imageHeight}
                      renderedWidth={renderedDimensions.width}
                      renderedHeight={renderedDimensions.height}
                      getColor={getColor}
                      hoveredIndex={hoveredOverlayIndex}
                      selectedIndex={selectedOverlayIndex}
                      onHoverIndex={(idx) => {
                        if (idx === null) {
                          setHoveredObjectId(null);
                          setHoveredClassId(null);
                        } else {
                          const obj = filteredObjects[idx];
                          if (obj) {
                            setHoveredObjectId(obj.id);
                            setHoveredClassId(obj.classId);
                          }
                        }
                      }}
                      onSelectIndex={(idx) => {
                        if (idx === null) {
                          setSelectedObjectId(null);
                          setSelectedClassId(null);
                        } else {
                          const obj = filteredObjects[idx];
                          if (obj) {
                            setSelectedObjectId(obj.id);
                            setSelectedClassId(obj.classId);
                            setActiveTab('objects');
                          }
                        }
                      }}
                      showLabels={showLabels}
                      mode={displayMode}
                      targetLanguage={targetLanguage}
                      countsByClassId={countsByClassId}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                  <ImageIcon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No Image Selected</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Upload an image or select from your recent history to simultaneously detect objects and extract text
                  </p>
                </div>
              </div>
            )}

            {/* Recent Images Strip */}
            {recentImages.length > 0 && (
              <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[11px] font-semibold text-slate-400 shrink-0">Recent:</span>
                {recentImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectRecentImage(img)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden border shrink-0 transition-all ${
                      uploadedImage?.id === img.id
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

        {/* RIGHT COLUMN: Upload Dropzone & Results Inspector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Upload Dropzone */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-card space-y-3">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all relative ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1.5 py-1">
                <Upload className="w-6 h-6 text-indigo-600 mx-auto" />
                <div className="text-xs font-bold text-slate-800">
                  {selectedFile ? selectedFile.name : 'Choose or drop image'}
                </div>
                <p className="text-[10px] text-slate-400">JPG, PNG, WebP up to 20MB</p>
              </div>
            </div>

            <Button
              onClick={handleRunAnalysis}
              disabled={(!selectedFile && !uploadedImage) || isUploading || isAnalyzing}
              isLoading={isUploading || isAnalyzing}
              className="w-full"
              size="md"
              icon={<Sparkles className="w-4 h-4" />}
            >
              {isUploading ? 'Uploading...' : isAnalyzing ? 'Running Dual Engine...' : 'Analyze Objects & Text'}
            </Button>
          </div>

          {/* Results Inspector Tabs (Objects vs Text) */}
          {analysisResult && (
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-card space-y-4">
              {/* Segmented Tab Buttons (Part 6) */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setActiveTab('objects')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'objects'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Scan className="w-3.5 h-3.5" />
                  <span>Objects ({groupedVocabularyItems.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('text')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'text'
                      ? 'bg-white text-amber-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Text ({filteredTexts.length})</span>
                </button>
              </div>

              {/* ─────────────────────────────────────────────────────────────
                  TAB 1: OBJECTS (DUPLICATE CLASS AGGREGATION & VOCABULARY CARDS)
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === 'objects' && (
                <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                  {groupedVocabularyItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                      No objects detected above {Math.round(confidenceFilter * 100)}% confidence.
                    </div>
                  ) : (
                    groupedVocabularyItems.map((grp) => {
                      const col = getColor(grp.classId);
                      const isSelected = selectedClassId === grp.classId;
                      const isHovered = hoveredClassId === grp.classId;

                      return (
                        <GroupedVocabularyCard
                          key={`grp-${grp.classId}`}
                          item={grp}
                          color={col}
                          isSelected={isSelected}
                          isHovered={isHovered}
                          targetLanguage={targetLanguage}
                          displayMode={displayMode}
                          onSelect={() => {
                            setSelectedClassId(isSelected ? null : grp.classId);
                            // Highlight the primary instance
                            setSelectedObjectId(isSelected ? null : grp.primaryInstance.id);
                          }}
                          onHover={(h) => {
                            setHoveredClassId(h ? grp.classId : null);
                            setHoveredObjectId(h ? grp.primaryInstance.id : null);
                          }}
                          onSelectInstance={(instId) => {
                            setSelectedObjectId(instId);
                            setSelectedClassId(grp.classId);
                          }}
                          selectedInstanceId={selectedObjectId}
                        />
                      );
                    })
                  )}
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────
                  TAB 2: TEXT (OCR RESULTS PANEL & SYNCHRONIZED TRANSLATION - PART 4)
                  ───────────────────────────────────────────────────────────── */}
              {activeTab === 'text' && (
                <div className="space-y-4">
                  {/* Full Text Block (Part 4.1) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Original Extracted Text:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyOriginalText}
                        icon={copiedOriginal ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      >
                        {copiedOriginal ? 'Copied' : 'Copy Original'}
                      </Button>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed font-mono">
                      {analysisResult.analysis.fullText || 'No text recognized.'}
                    </div>
                  </div>

                  {/* Translate Full Text Action */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Button
                        onClick={handleTranslateOcrFullText}
                        disabled={isTranslatingOcr || !analysisResult.analysis.fullText}
                        isLoading={isTranslatingOcr}
                        variant="primary"
                        size="sm"
                        icon={<Languages className="w-3.5 h-3.5" />}
                      >
                        Translate All Text
                      </Button>

                      {ocrFullTextTranslation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyTranslatedText}
                          icon={copiedTranslated ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        >
                          {copiedTranslated ? 'Copied' : 'Copy Translation'}
                        </Button>
                      )}
                    </div>

                    {/* Translated Full Text Output */}
                    {ocrFullTextTranslation && (
                      <div className="p-3 bg-purple-50/80 rounded-xl border border-purple-200 text-xs text-purple-950 whitespace-pre-wrap max-h-40 overflow-y-auto leading-relaxed animate-in fade-in">
                        {ocrFullTextTranslation}
                      </div>
                    )}
                  </div>

                  {/* Line by line breakdown with individual translate & copy actions */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">
                      Detected Lines ({filteredTexts.length}):
                    </span>
                    {filteredTexts.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400 italic bg-slate-50 rounded-xl">
                        No text lines detected.
                      </div>
                    ) : (
                      filteredTexts.map((txt) => {
                        const isHovered = hoveredTextId === txt.id;
                        const isSelected = selectedTextId === txt.id;
                        const isHighlighted = isHovered || isSelected;
                        const lineTrans = lineTranslations[txt.id];
                        const isLineTranslating = translatingLineId === txt.id;

                        return (
                          <div
                            key={txt.id}
                            onMouseEnter={() => setHoveredTextId(txt.id)}
                            onMouseLeave={() => setHoveredTextId(null)}
                            onClick={() => setSelectedTextId(isSelected ? null : txt.id)}
                            className={`p-2.5 rounded-xl border text-xs transition-all cursor-pointer space-y-1 ${
                              isHighlighted
                                ? 'bg-amber-50/90 border-amber-400 ring-1 ring-amber-400/50 shadow-subtle'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-slate-100/70'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-slate-900 truncate block flex-1" title={txt.content}>
                                {txt.content}
                              </span>

                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-[10px] font-mono text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  {Math.round(txt.confidence * 100)}%
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => handleTranslateOcrLine(txt.content, txt.id, e)}
                                  disabled={isLineTranslating}
                                  className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-white"
                                  title="Translate line"
                                >
                                  {isLineTranslating ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                  ) : (
                                    <Languages className="w-3 h-3" />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => handleCopyLine(txt.content, txt.id, e)}
                                  className="p-1 rounded text-slate-400 hover:text-amber-600 hover:bg-white"
                                  title="Copy line"
                                >
                                  {copiedTextId === txt.id ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Translated line if translated */}
                            {lineTrans && (
                              <div className="text-[11px] text-purple-900 bg-purple-50/70 p-1.5 rounded-lg border border-purple-100 font-medium">
                                {lineTrans}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ObjectDetectionPage;
