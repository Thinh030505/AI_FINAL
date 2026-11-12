import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Image as ImageIcon,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { ocrService } from '../services/ocrService';
import { objectDetectionService } from '../services/objectDetectionService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { visualIntelligenceService } from '../services/visualIntelligenceService';
import {
  ImageRecord,
  OCRResultRecord,
  ObjectDetectionRecord,
  ImageAnalysisRecord,
  VisualIntelligenceRecord,
} from '../types';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

export const HistoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'images' | 'visual' | 'detection' | 'ocr' | 'analysis'>('images');

  const [images, setImages] = useState<ImageRecord[]>([]);
  const [visualResults, setVisualResults] = useState<VisualIntelligenceRecord[]>([]);
  const [detectionResults, setDetectionResults] = useState<ObjectDetectionRecord[]>([]);
  const [ocrResults, setOcrResults] = useState<OCRResultRecord[]>([]);
  const [analysisResults, setAnalysisResults] = useState<ImageAnalysisRecord[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHistoryData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'images') {
        const response = await imageService.getImages();
        if (response.success && response.data.images) {
          setImages(response.data.images);
        }
      } else if (activeTab === 'visual') {
        const response = await visualIntelligenceService.getHistory();
        if (response.success && response.data.visualIntelligences) {
          setVisualResults(response.data.visualIntelligences);
        }
      } else if (activeTab === 'detection') {
        const response = await objectDetectionService.getHistory();
        if (response.success && response.data.objectDetections) {
          setDetectionResults(response.data.objectDetections);
        }
      } else if (activeTab === 'ocr') {
        const response = await ocrService.getOcrHistory();
        if (response.success && response.data.ocrResults) {
          setOcrResults(response.data.ocrResults);
        }
      } else if (activeTab === 'analysis') {
        const response = await imageAnalysisService.getHistory();
        if (response.success && response.data.analyses) {
          setAnalysisResults(response.data.analyses);
        }
      }
    } catch (err) {
      // Silently handle
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, [activeTab]);

  const confirmDeleteImage = async () => {
    if (!pendingDeleteId) return;
    const idToDelete = pendingDeleteId;
    setPendingDeleteId(null);

    try {
      const response = await imageService.deleteImage(idToDelete);
      if (response.success) {
        setImages((prev) => prev.filter((img) => img.id !== idToDelete));
      }
    } catch (err) {
      // Silently handle
    }
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          History Gallery
        </h1>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          {[
            { id: 'images', label: 'Images' },
            { id: 'visual', label: 'Visual Studio' },
            { id: 'detection', label: 'Objects' },
            { id: 'ocr', label: 'OCR' },
            { id: 'analysis', label: 'Multimodal' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeTab === 'images' ? (
        images.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <ImageIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No images saved yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-2.5 flex flex-col justify-between transition-all hover:shadow-subtle"
              >
                <div>
                  <div className="aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
                    <img
                      src={img.imageUrl}
                      alt={img.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate px-0.5">
                    {img.originalName}
                  </div>
                  <div className="text-[11px] text-slate-400 px-0.5">
                    {formatDate(img.createdAt)}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100">
                  <Link
                    to="/object-detection"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="w-3 h-3" />
                  </Link>
                  <button
                    onClick={() => setPendingDeleteId(img.id)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'visual' ? (
        visualResults.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <p className="text-xs text-slate-500">No visual intelligence analyses recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visualResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-purple-300 p-4 space-y-3 transition-all hover:shadow-subtle"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {item.analysis.objects.length} Objects • {item.analysis.texts.length} Lines
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                {item.analysis.fullText && (
                  <p className="text-xs text-slate-600 line-clamp-2 italic">
                    "{item.analysis.fullText}"
                  </p>
                )}
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Link
                    to="/visual-intelligence"
                    className="text-xs text-purple-600 hover:text-purple-700 font-medium inline-flex items-center gap-1"
                  >
                    Open in Studio <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'detection' ? (
        detectionResults.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <p className="text-xs text-slate-500">No object detections recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {detectionResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-4 space-y-3 transition-all hover:shadow-subtle"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {item.detections.length} Objects Detected
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {item.detections.slice(0, 5).map((d, i) => (
                    <span key={i} className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] capitalize">
                      {d.label}
                    </span>
                  ))}
                  {item.detections.length > 5 && (
                    <span className="text-[10px] text-slate-400 self-center">
                      +{item.detections.length - 5} more
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Link
                    to="/object-detection"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                  >
                    Open Studio <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'ocr' ? (
        ocrResults.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <p className="text-xs text-slate-500">No OCR scans recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ocrResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 hover:shadow-subtle transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900">
                    {item.lines?.length || 0} Text Lines
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                    <button
                      onClick={() => handleCopyText(item.fullText, item.id)}
                      className="p-1 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                      title="Copy"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-3">
                  {item.fullText}
                </p>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'analysis' ? (
        analysisResults.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 p-8 space-y-2">
            <p className="text-xs text-slate-500">No multimodal scene analyses recorded yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {analysisResults.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 hover:shadow-subtle transition-all"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-700 capitalize">
                    {item.fusedResult.sceneType}
                  </span>
                  <span className="text-[11px] text-slate-400">{formatDate(item.createdAt)}</span>
                </div>
                <p className="text-xs text-slate-700 line-clamp-3 leading-relaxed">
                  {item.fusedResult.description}
                </p>
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Link
                    to="/image-analysis"
                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1"
                  >
                    Open Multimodal <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <Modal
          isOpen={true}
          onClose={() => setPendingDeleteId(null)}
          title="Delete Image"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete this image? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPendingDeleteId(null)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={confirmDeleteImage}>
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default HistoryPage;
