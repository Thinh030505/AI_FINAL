import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, Trash2, Calendar, FileText, Loader2, AlertCircle, RefreshCw, Clock, Sparkles, CheckCircle2, Languages, Copy, Check, Scan, ExternalLink, Layers, Compass, Eye, Camera, User, Tag } from 'lucide-react';
import { imageService } from '../services/imageService';
import { ocrService } from '../services/ocrService';
import { translationService } from '../services/translationService';
import { objectDetectionService } from '../services/objectDetectionService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { ImageRecord, OCRResultRecord, TranslationRecord, ObjectDetectionRecord, ImageAnalysisRecord } from '../types';

export const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'images' | 'ocr' | 'translation' | 'detection' | 'analysis'>('images');

  const [images, setImages] = useState<ImageRecord[]>([]);
  const [ocrResults, setOcrResults] = useState<OCRResultRecord[]>([]);
  const [translations, setTranslations] = useState<TranslationRecord[]>([]);
  const [detectionResults, setDetectionResults] = useState<ObjectDetectionRecord[]>([]);
  const [analysisResults, setAnalysisResults] = useState<ImageAnalysisRecord[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistoryData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'images') {
        const response = await imageService.getImages();
        if (response.success && response.data.images) {
          setImages(response.data.images);
        }
      } else if (activeTab === 'ocr') {
        const response = await ocrService.getOcrHistory();
        if (response.success && response.data.ocrResults) {
          setOcrResults(response.data.ocrResults);
        }
      } else if (activeTab === 'translation') {
        const response = await translationService.getTranslationHistory();
        if (response.success && response.data.translations) {
          setTranslations(response.data.translations);
        }
      } else if (activeTab === 'detection') {
        const response = await objectDetectionService.getHistory();
        if (response.success && response.data.objectDetections) {
          setDetectionResults(response.data.objectDetections);
        }
      } else if (activeTab === 'analysis') {
        const response = await imageAnalysisService.getHistory();
        if (response.success && response.data.analyses) {
          setAnalysisResults(response.data.analyses);
        }
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to load history data.';
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [activeTab]);

  const handleDeleteImage = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    setDeletingId(id);
    try {
      const response = await imageService.deleteImage(id);
      if (response.success) {
        setImages((prev) => prev.filter((img) => img.id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete image.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recent';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateAvgConfidence = (lines: Array<{ confidence: number }>) => {
    if (!lines || lines.length === 0) return 0;
    const sum = lines.reduce((acc, l) => acc + l.confidence, 0);
    return Math.round((sum / lines.length) * 100);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-purple-400" />
            History & Assets Gallery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            View uploaded Cloudinary document images, review past PaddleOCR recognitions, and inspect translation history.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
          {/* Tab Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('images')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'images'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              Uploaded Images
            </button>
            <button
              onClick={() => setActiveTab('ocr')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'ocr'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              OCR History
            </button>
            <button
              onClick={() => setActiveTab('translation')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'translation'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Languages className="w-3.5 h-3.5" />
              Translation History
            </button>
            <button
              onClick={() => setActiveTab('detection')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'detection'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              Object Detection
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'analysis'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              AI Understanding
            </button>
          </div>

          <button
            onClick={fetchHistoryData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="min-h-[320px] glass-panel rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <span className="text-sm text-slate-400">Loading {activeTab} history...</span>
        </div>
      ) : activeTab === 'images' ? (
        /* Tab 1: Uploaded Images Grid */
        images.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center py-16">
            <ImageIcon className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Images Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't uploaded any document images yet. Go to OCR Studio to upload your first image.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {images.map((img) => (
              <div
                key={img.id}
                className="glass-card rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between group hover:border-indigo-500/50 transition-all"
              >
                <div className="relative aspect-video bg-slate-950 border-b border-slate-800/80 overflow-hidden flex items-center justify-center">
                  <img
                    src={img.imageUrl}
                    alt={img.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => handleDeleteImage(img.id)}
                    disabled={deletingId === img.id}
                    className="absolute top-2 right-2 p-2 rounded-xl bg-slate-950/80 hover:bg-rose-950/90 text-slate-300 hover:text-rose-300 border border-slate-700/80 transition-colors shadow-md disabled:opacity-50"
                    title="Delete image"
                  >
                    {deletingId === img.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <div className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-white truncate" title={img.originalName}>
                      {img.originalName}
                    </div>
                    {img.source === 'camera' && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-semibold flex items-center gap-1 shrink-0">
                        <Camera className="w-3 h-3" /> Camera
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(img.createdAt)}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px]">
                      {formatFileSize(img.size)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'ocr' ? (
        /* Tab 2: OCR Recognition History */
        ocrResults.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center py-16">
            <FileText className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No OCR Recognition History Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't run PaddleOCR on any images yet. Go to OCR Studio to extract text from your images.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {ocrResults.map((ocr) => {
              const avgConf = calculateAvgConfidence(ocr.lines);
              return (
                <div
                  key={ocr.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {ocr.imageUrl ? (
                      <img
                        src={ocr.imageUrl}
                        alt="OCR target"
                        className="w-16 h-16 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-purple-950/40 border border-purple-800/60 flex items-center justify-center text-purple-400 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm truncate">
                          {ocr.originalName || 'Document Image'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-950/80 text-purple-300 border border-purple-800">
                          {ocr.lines.length} lines detected
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Avg Conf: {avgConf}%
                        </span>
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs font-mono text-slate-300 truncate max-w-2xl">
                        {ocr.fullText || <span className="text-slate-500 italic">No text recognized</span>}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(ocr.createdAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {ocr.processingTimeMs} ms
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : activeTab === 'translation' ? (
        /* Tab 3: Translation History */
        translations.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center py-16">
            <Languages className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Translation History Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't translated any text yet. Go to OCR Studio to translate extracted text.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {translations.map((trans) => (
              <div
                key={trans.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all space-y-3"
              >
                <div className="flex items-center justify-between gap-4 flex-wrap pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-white">
                      Translation ({trans.sourceLanguage.toUpperCase()} → {trans.targetLanguage.toUpperCase()})
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-500" />
                      {formatDate(trans.createdAt)}
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-800">
                      <Clock className="w-3 h-3" />
                      {trans.processingTimeMs} ms
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">Source Text</span>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-slate-300 whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                      {trans.sourceText}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-indigo-300">Translated Text</span>
                      <button
                        onClick={() => handleCopyText(trans.translatedText, trans.id)}
                        className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 transition-colors"
                      >
                        {copiedId === trans.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-indigo-200 whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                      {trans.translatedText}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'detection' ? (
        /* Tab 4: Object Detection History */
        detectionResults.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center py-16">
            <Scan className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No Object Detection History Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't run YOLO detection on any images yet. Go to Object Detection studio to detect objects.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {detectionResults.map((record) => {
              const classCounts = (record.detections || []).reduce((acc: Record<string, number>, item) => {
                acc[item.label] = (acc[item.label] || 0) + 1;
                return acc;
              }, {});

              return (
                <div
                  key={record.id}
                  className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-violet-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {record.imageUrl ? (
                      <img
                        src={record.imageUrl}
                        alt="Detection target"
                        className="w-20 h-20 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-violet-950/40 border border-violet-800/60 flex items-center justify-center text-violet-400 shrink-0">
                        <Scan className="w-8 h-8" />
                      </div>
                    )}

                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white text-sm truncate">
                          {record.originalName || 'Image Detection Record'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-violet-950/80 text-violet-300 border border-violet-800">
                          {record.model || 'yolo11n'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800">
                          {record.objectCount} objects detected
                        </span>
                        {record.imageWidth && record.imageHeight && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-slate-900 text-slate-400 border border-slate-800">
                            {record.imageWidth}×{record.imageHeight} px
                          </span>
                        )}
                      </div>

                      {/* Class Summary Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {Object.entries(classCounts).length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No objects detected above threshold</span>
                        ) : (
                          Object.entries(classCounts).map(([cls, count]) => (
                            <span
                              key={cls}
                              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 font-medium flex items-center gap-1.5"
                            >
                              <span className="w-2 h-2 rounded-full bg-violet-400"></span>
                              <span className="capitalize">{cls}</span>
                              <span className="text-[10px] font-mono text-violet-400 font-semibold">×{count}</span>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          {formatDate(record.createdAt)}
                        </span>
                        <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {record.processingTimeMs} ms
                        </span>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/object-detection"
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-violet-950/40 text-slate-300 hover:text-violet-300 border border-slate-800 hover:border-violet-800/60 text-xs font-medium transition-all"
                  >
                    Open Studio
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* Tab 5: AI Understanding History */
        analysisResults.length === 0 ? (
          <div className="glass-panel p-8 rounded-2xl border border-slate-800 text-center py-16">
            <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No AI Understanding History Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              You haven't run multimodal AI analysis on any images yet. Go to AI Understanding studio to extract fused insights.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analysisResults.map((analysis) => (
              <div
                key={analysis.id}
                className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {analysis.imageUrl ? (
                    <img
                      src={analysis.imageUrl}
                      alt="Analysis target"
                      className="w-24 h-24 rounded-xl object-cover bg-slate-950 border border-slate-800 shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-xl bg-emerald-950/40 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0">
                      <Layers className="w-8 h-8" />
                    </div>
                  )}

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-sm truncate">
                        {analysis.originalName || 'Multimodal Analysis Record'}
                      </span>
                      {analysis.source === 'camera' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 font-mono text-[10px] font-semibold flex items-center gap-1">
                          <Camera className="w-3 h-3" /> Camera
                        </span>
                      )}
                      {analysis.analysisMode && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${
                            analysis.analysisMode === 'everything'
                              ? 'bg-gradient-to-r from-purple-950 to-pink-950 text-pink-300 border-pink-700/60 shadow-sm'
                              : 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          {analysis.analysisMode === 'everything' ? '✨ EVERYTHING' : analysis.analysisMode}
                        </span>
                      )}
                      {analysis.people && analysis.people.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-pink-950/80 text-pink-300 border border-pink-800 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" />
                          {analysis.people.length} {analysis.people.length === 1 ? 'person' : 'people'}
                        </span>
                      )}
                      {analysis.relationships && analysis.relationships.length > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-950/80 text-amber-300 border border-amber-800 flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5" />
                          {analysis.relationships.length} relations
                        </span>
                      )}
                      {analysis.fusedResult?.sceneType && (
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider bg-emerald-950/90 text-emerald-300 border border-emerald-800">
                          {analysis.fusedResult.sceneType}
                        </span>
                      )}
                      {analysis.fusedResult?.environment && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-teal-950/80 text-teal-300 border border-teal-800">
                          {analysis.fusedResult.environment}
                        </span>
                      )}
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-violet-950/80 text-violet-300 border border-violet-800">
                        {analysis.objectDetection?.objectCount ?? 0} objects
                      </span>
                      {analysis.ocr?.lineCount > 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-purple-950/80 text-purple-300 border border-purple-800">
                          {analysis.ocr.lineCount} text lines
                        </span>
                      ) : analysis.modules?.ocr === 'skipped' ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-amber-950/60 text-amber-300 border border-amber-800/80">
                          OCR Skipped
                        </span>
                      ) : null}
                    </div>

                    {/* Fused Description preview */}
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-300 line-clamp-2">
                      {analysis.fusedResult?.description || analysis.vision?.description || 'No synthesis available'}
                    </div>

                    {/* Dominant Regions */}
                    {analysis.segmentation?.regions && analysis.segmentation.regions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1">Regions:</span>
                        {analysis.segmentation.regions.slice(0, 4).map((region, idx) => (
                          <span
                            key={idx}
                            className="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700/80 text-slate-300 flex items-center gap-1.5"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400"></span>
                            <span className="capitalize">{region.label}</span>
                            <span className="text-[10px] font-mono text-teal-400 font-semibold">{region.regionPercentage}%</span>
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(analysis.createdAt)}
                      </span>
                      <span className="flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {analysis.totalProcessingTimeMs} ms
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  to={`/image-analysis?imageId=${analysis.imageId}`}
                  className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-emerald-950/40 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-800/60 text-xs font-medium transition-all"
                >
                  Open Studio
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};
