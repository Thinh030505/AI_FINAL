import React, { useState, useEffect } from 'react';
import {
  Scan,
  Upload,
  Layers,
  Clock,
  Cpu,
  Maximize2,
  Filter,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { objectDetectionService } from '../services/objectDetectionService';
import { ImageRecord, ObjectDetectionRecord, DetectionItem } from '../types';

const COLOR_PALETTE = [
  { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.2)', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.2)', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  { stroke: '#f59e0b', fill: 'rgba(245, 158, 11, 0.2)', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  { stroke: '#ec4899', fill: 'rgba(236, 72, 153, 0.2)', bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40' },
  { stroke: '#8b5cf6', fill: 'rgba(139, 92, 246, 0.2)', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
  { stroke: '#06b6d4', fill: 'rgba(6, 182, 212, 0.2)', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  { stroke: '#ef4444', fill: 'rgba(239, 68, 68, 0.2)', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/40' },
  { stroke: '#14b8a6', fill: 'rgba(20, 184, 166, 0.2)', bg: 'bg-teal-500/20', text: 'text-teal-400', border: 'border-teal-500/40' },
];

export const ObjectDetectionPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  const [uploadedImage, setUploadedImage] = useState<ImageRecord | null>(null);
  const [detectionResult, setDetectionResult] = useState<ObjectDetectionRecord | null>(null);

  const [recentImages, setRecentImages] = useState<ImageRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overlay visual options
  const [showBoxes, setShowBoxes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0.25);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchRecentImages = async () => {
      try {
        const res = await imageService.getImages();
        if (res.success && res.data.images) {
          setRecentImages(res.data.images.slice(0, 6));
        }
      } catch (err) {
        // Silently fail if images list cannot be loaded initially
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
      setDetectionResult(null);
      setErrorMessage(null);
    }
  };

  const handleSelectRecentImage = (img: ImageRecord) => {
    setSelectedFile(null);
    setPreviewUrl(img.imageUrl);
    setUploadedImage(img);
    setDetectionResult(null);
    setErrorMessage(null);
  };

  const handleRunDetection = async () => {
    setErrorMessage(null);
    let targetImageId = uploadedImage?.id;

    try {
      // Step 1: Upload to Cloudinary if new file selected
      if (selectedFile) {
        setIsUploading(true);
        const imgRes = await imageService.uploadImage(selectedFile);
        if (imgRes.success && imgRes.data.image) {
          targetImageId = imgRes.data.image.id;
          setUploadedImage(imgRes.data.image);
          setPreviewUrl(imgRes.data.image.imageUrl);
          setRecentImages((prev) => [imgRes.data.image, ...prev.slice(0, 5)]);
        }
        setIsUploading(false);
      }

      if (!targetImageId) {
        setErrorMessage('Please select or upload an image first.');
        return;
      }

      // Step 2: Call NestJS Object Detection API
      setIsDetecting(true);
      const res = await objectDetectionService.analyzeObjects(targetImageId);
      if (res.success && res.data.objectDetection) {
        setDetectionResult(res.data.objectDetection);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || err.message || 'Failed to perform object detection',
      );
    } finally {
      setIsUploading(false);
      setIsDetecting(false);
    }
  };

  const getColor = (index: number) => {
    return COLOR_PALETTE[index % COLOR_PALETTE.length];
  };

  const filteredDetections = (detectionResult?.detections || []).filter(
    (d) => d.confidence >= confidenceFilter,
  );

  // Group by label for class summary
  const classSummary = filteredDetections.reduce((acc, curr) => {
    acc[curr.label] = (acc[curr.label] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
          <span className="p-2.5 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <Scan className="w-7 h-7" />
          </span>
          AI Object Detection Studio (YOLO11)
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          High-performance multi-object detection using Ultralytics YOLO11n with responsive bounding box visualization.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-rose-200">
            ✕
          </button>
        </div>
      )}

      {/* Main Grid: Left Image & Overlay / Right Controls & Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Visual Stage */}
        <div className="lg:col-span-7 space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-400" />
                Image Preview & Bounding Box Overlay
              </h2>

              {/* Toggle Controls */}
              {detectionResult && (
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setShowBoxes(!showBoxes)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                      showBoxes
                        ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    {showBoxes ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    Boxes
                  </button>
                  <button
                    onClick={() => setShowLabels(!showLabels)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                      showLabels
                        ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Labels
                  </button>
                </div>
              )}
            </div>

            {/* Display Canvas / Image + SVG Overlay */}
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950/80 min-h-[380px] flex items-center justify-center p-2">
              {previewUrl ? (
                <div className="relative inline-block max-w-full max-h-[560px] overflow-hidden rounded-xl">
                  {/* Base Image */}
                  <img
                    src={previewUrl}
                    alt="Target scan"
                    className="block max-w-full max-h-[560px] w-auto h-auto object-contain rounded-xl select-none"
                  />

                  {/* SVG Responsive Bounding Box Overlay */}
                  {detectionResult && showBoxes && detectionResult.imageWidth > 0 && (
                    <svg
                      viewBox={`0 0 ${detectionResult.imageWidth} ${detectionResult.imageHeight}`}
                      className="absolute inset-0 w-full h-full pointer-events-none"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      {filteredDetections.map((det, idx) => {
                        const col = getColor(idx);
                        const isHovered = hoveredIndex === idx;
                        const w = Math.max(1, det.box.x2 - det.box.x1);
                        const h = Math.max(1, det.box.y2 - det.box.y1);
                        const fontSize = Math.max(12, Math.min(22, Math.round(detectionResult.imageWidth / 60)));
                        const padX = 6;
                        const padY = 4;
                        const labelText = `${det.label} ${Math.round(det.confidence * 100)}%`;
                        const textWidth = labelText.length * (fontSize * 0.6) + padX * 2;
                        const textHeight = fontSize + padY * 2;

                        return (
                          <g key={idx} className="transition-opacity duration-200">
                            {/* Box Rectangle */}
                            <rect
                              x={det.box.x1}
                              y={det.box.y1}
                              width={w}
                              height={h}
                              fill={col.fill}
                              stroke={col.stroke}
                              strokeWidth={isHovered ? 4 : 2}
                              strokeDasharray={isHovered ? '4 2' : undefined}
                              rx={4}
                            />

                            {/* Label Badge */}
                            {showLabels && (
                              <g
                                transform={`translate(${det.box.x1}, ${
                                  det.box.y1 > textHeight + 4 ? det.box.y1 - textHeight : det.box.y1
                                })`}
                              >
                                <rect
                                  width={textWidth}
                                  height={textHeight}
                                  fill={col.stroke}
                                  rx={3}
                                />
                                <text
                                  x={padX}
                                  y={fontSize + padY - 2}
                                  fill="#ffffff"
                                  fontSize={fontSize}
                                  fontWeight="bold"
                                  fontFamily="monospace"
                                >
                                  {labelText}
                                </text>
                              </g>
                            )}
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 text-slate-600 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-8 h-8" />
                  </div>
                  <p className="text-slate-400 text-sm font-medium">No image selected</p>
                  <p className="text-slate-500 text-xs max-w-xs mx-auto">
                    Select an image from below or upload a new picture from your device to run YOLO object detection.
                  </p>
                </div>
              )}
            </div>

            {/* Quick-Pick From Previously Uploaded Images */}
            {recentImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <span className="text-xs font-medium text-slate-400">Or pick from your recently uploaded images:</span>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {recentImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => handleSelectRecentImage(img)}
                      className={`relative w-16 h-16 rounded-xl overflow-hidden border shrink-0 transition-all ${
                        uploadedImage?.id === img.id
                          ? 'border-indigo-500 ring-2 ring-indigo-500/40'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <img src={img.imageUrl} alt={img.originalName} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Controls, Upload & Detection Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* Action Box: Upload / Run */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h2 className="text-base font-semibold text-slate-200 flex items-center gap-2">
              <Upload className="w-4 h-4 text-indigo-400" />
              Analyze Document / Scene Image
            </h2>

            {/* File Dropzone */}
            <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-5 text-center cursor-pointer transition-colors relative bg-slate-950/40">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-1">
                <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                <div className="text-xs font-medium text-slate-300">
                  {selectedFile ? selectedFile.name : 'Choose or drop a new image'}
                </div>
                <div className="text-[10px] text-slate-500">Supports JPG, PNG, WEBP</div>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={handleRunDetection}
              disabled={(!selectedFile && !uploadedImage) || isUploading || isDetecting}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center space-x-2 text-sm"
            >
              {isUploading ? (
                <>
                  <span className="animate-spin text-base">🌀</span>
                  <span>Uploading to Cloudinary...</span>
                </>
              ) : isDetecting ? (
                <>
                  <span className="animate-spin text-base">⚡</span>
                  <span>YOLO11 Object Inference Running...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Analyze Objects</span>
                </>
              )}
            </button>
          </div>

          {/* Results Summary Box */}
          {detectionResult && (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Detection Metrics
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono">
                  {detectionResult.model}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    Objects
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {filteredDetections.length}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Latency
                  </div>
                  <div className="text-xl font-extrabold text-white mt-1">
                    {detectionResult.processingTimeMs}
                    <span className="text-xs font-normal text-slate-400 ml-1">ms</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs">
                    <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
                    Resolution
                  </div>
                  <div className="text-xs font-semibold text-white mt-2 font-mono">
                    {detectionResult.imageWidth}×{detectionResult.imageHeight}
                  </div>
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-indigo-400" />
                    Confidence Threshold:
                  </span>
                  <span className="text-indigo-300 font-mono font-bold">
                    {Math.round(confidenceFilter * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={confidenceFilter}
                  onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Detected Class Badges */}
              {Object.keys(classSummary).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-medium text-slate-400">Class Summary:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(classSummary).map(([cls, count], idx) => {
                      const col = getColor(idx);
                      return (
                        <span
                          key={cls}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${col.bg} ${col.border} ${col.text}`}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.stroke }} />
                          {cls} <span className="font-bold">×{count}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Itemized Detected Objects List */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-medium text-slate-400">
                  All Detected Objects ({filteredDetections.length}):
                </span>
                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {filteredDetections.map((det, idx) => {
                    const col = getColor(idx);
                    const isHovered = hoveredIndex === idx;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors cursor-pointer ${
                          isHovered
                            ? 'bg-slate-800/90 border-indigo-500'
                            : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: col.stroke }}
                          />
                          <span className="font-semibold text-slate-200 capitalize">{det.label}</span>
                          <span className="text-[10px] text-slate-500 font-mono">id:{det.classId}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-400 text-[10px]">
                            [{Math.round(det.box.x1)}, {Math.round(det.box.y1)}, {Math.round(det.box.x2)}, {Math.round(det.box.y2)}]
                          </span>
                          <span
                            className="px-2 py-0.5 rounded text-[11px] font-bold"
                            style={{ backgroundColor: col.fill, color: col.stroke }}
                          >
                            {Math.round(det.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredDetections.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-950/40 rounded-xl border border-slate-800">
                      No objects detected above {Math.round(confidenceFilter * 100)}% confidence.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
