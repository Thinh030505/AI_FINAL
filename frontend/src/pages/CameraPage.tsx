import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Camera,
  RotateCcw,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Layers,
  Scan,
  Compass,
  FileText,
  Clock,
  Copy,
  Check,
  Languages,
  Loader2,
  ChevronRight,
  Sun,
  ShieldCheck,
  History,
  FlipHorizontal,
  Maximize2,
  Eye,
  Info,
  XCircle,
  User,
  Tag,
  Activity,
} from 'lucide-react';
import { imageService } from '../services/imageService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { translationService, TranslationRecord } from '../services/translationService';
import { ImageRecord, ImageAnalysisRecord, DetectionItem, SemanticRegion } from '../types';

export type CameraState =
  | 'idle'
  | 'requesting_permission'
  | 'live'
  | 'captured'
  | 'uploading'
  | 'analyzing'
  | 'success'
  | 'partial_success'
  | 'error';

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

export const CameraPage: React.FC = () => {
  // State Machine (Single Source of Truth)
  const [cameraState, setCameraState] = useState<CameraState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  // Camera stream controls
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    // Desktop defaults to 'user', mobile defaults to 'environment'
    return window.innerWidth < 768 ? 'environment' : 'user';
  });
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number } | null>(null);

  // Captured media
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedDimensions, setCapturedDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  // AI Pipeline Analysis state
  const [analysisStep, setAnalysisStep] = useState<string>('Preparing...');
  const [uploadedImage, setUploadedImage] = useState<ImageRecord | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisRecord | null>(null);

  // Multimodal Intelligence Mode & Controls
  const [analysisMode, setAnalysisMode] = useState<'fast' | 'balanced' | 'accurate' | 'everything'>('balanced');
  const [forceOcr, setForceOcr] = useState<boolean>(false);

  // Result View Controls
  const [viewMode, setViewMode] = useState<'both' | 'objects' | 'segmentation'>('both');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);
  const [activeTab, setActiveTab] = useState<'objects' | 'regions' | 'ocr' | 'people' | 'relationships' | 'raw'>('objects');
  const [copiedText, setCopiedText] = useState<boolean>(false);

  // Translation in OCR tab
  const [translationResult, setTranslationResult] = useState<TranslationRecord | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<'vi' | 'en' | 'zh'>('vi');
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Safely stop all MediaStream tracks and reset references
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          // ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check available camera devices
  const checkCameraDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setHasMultipleCameras(videoDevices.length > 1);
    } catch {
      setHasMultipleCameras(false);
    }
  }, []);

  // Request & Start Camera MediaStream
  const startCamera = useCallback(async () => {
    stopStream();
    setErrorMessage(null);
    setErrorDetails(null);
    setCameraState('requesting_permission');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('error');
      setErrorMessage('Browser Not Supported');
      setErrorDetails('Camera API is not supported in this browser. Please use Chrome, Edge, or Safari over localhost or HTTPS.');
      return;
    }

    try {
      // First attempt: High quality 1080p with ideal facingMode
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        // Fallback: standard resolution without overconstraints
        console.warn('High-resolution camera constraint failed, falling back to default video constraints:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const videoTrack = stream.getVideoTracks()[0];
        const settings = videoTrack.getSettings();
        if (settings.width && settings.height) {
          setStreamResolution({ width: settings.width, height: settings.height });
        }
      }

      setCameraState('live');
      checkCameraDevices();
    } catch (err: any) {
      console.error('Camera access error:', err);
      stopStream();
      setCameraState('error');

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setErrorMessage('Camera Access Denied');
        setErrorDetails('You denied camera permission. Click the camera icon in your browser URL address bar to grant permission, then click Try Again.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setErrorMessage('No Camera Detected');
        setErrorDetails('No video capture hardware was found on your computer or phone. Please plug in a webcam and try again.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setErrorMessage('Camera Busy');
        setErrorDetails('The camera is currently in use by another application (Zoom, Teams, etc.). Please close other applications and retry.');
      } else if (err.name === 'OverconstrainedError') {
        setErrorMessage('Camera Constraints Unmet');
        setErrorDetails('Requested camera resolution or facing mode could not be met by your device hardware.');
      } else {
        setErrorMessage('Camera Initialization Failed');
        setErrorDetails(err.message || 'An unknown error occurred while trying to access the camera.');
      }
    }
  }, [facingMode, stopStream, checkCameraDevices]);

  // Initial load: start camera
  useEffect(() => {
    startCamera();

    // Stream cleanup on unmount or navigate away
    return () => {
      stopStream();
      if (capturedImageUrl) {
        URL.revokeObjectURL(capturedImageUrl);
      }
    };
  }, []);

  // Switch facing camera (user <-> environment)
  const handleSwitchCamera = () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    // When switching to environment (rear), unmirror preview
    setIsMirrored(nextMode === 'user');
    setTimeout(() => {
      startCamera();
    }, 50);
  };

  // Capture frame from video element
  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      alert('Camera stream is not ready yet. Please wait a moment.');
      return;
    }

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw unmirrored frame to ensure 1:1 pixel coordinate precision with YOLO & SegFormer
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          alert('Failed to capture frame as image blob.');
          return;
        }

        // Revoke previous object URL if any
        if (capturedImageUrl) {
          URL.revokeObjectURL(capturedImageUrl);
        }

        const now = new Date();
        const timestamp = now
          .toISOString()
          .replace(/[-:]/g, '')
          .replace('T', '-')
          .slice(0, 15);
        const filename = `camera-capture-${timestamp}.jpg`;
        const file = new File([blob], filename, { type: 'image/jpeg' });
        const objectUrl = URL.createObjectURL(blob);

        setCapturedBlob(blob);
        setCapturedFile(file);
        setCapturedImageUrl(objectUrl);
        setCapturedDimensions({ width, height });

        // Stop camera stream while reviewing preview to save device battery & resources
        stopStream();
        setCameraState('captured');
      },
      'image/jpeg',
      0.9,
    );
  };

  // Retake photo: clear captured state and restart camera
  const handleRetake = () => {
    if (capturedImageUrl) {
      URL.revokeObjectURL(capturedImageUrl);
    }
    setCapturedBlob(null);
    setCapturedFile(null);
    setCapturedImageUrl(null);
    setUploadedImage(null);
    setAnalysisResult(null);
    setTranslationResult(null);
    setTranslationError(null);
    setErrorMessage(null);
    setErrorDetails(null);

    startCamera();
  };

  // Analyze Captured Image via existing API (Phase 9: Adaptive Routing)
  const handleAnalyze = async (overrideForceOcr?: boolean) => {
    if (!capturedFile || cameraState === 'uploading' || cameraState === 'analyzing') {
      return; // Prevent duplicate clicks
    }

    const effectiveForceOcr = overrideForceOcr !== undefined ? overrideForceOcr : forceOcr;
    setErrorMessage(null);
    setErrorDetails(null);
    setCameraState('uploading');
    setAnalysisStep('Uploading captured photo to cloud storage...');

    try {
      // Step 1: Upload image with camera source metadata
      const capturedAtIso = new Date().toISOString();
      const uploadRes = await imageService.uploadImage(capturedFile, 'camera', capturedAtIso);

      if (!uploadRes.success || !uploadRes.data.image) {
        throw new Error(uploadRes.message || 'Image upload failed');
      }

      const imgRecord = uploadRes.data.image;
      setUploadedImage(imgRecord);

      // Step 2: Trigger unified multimodal AI analysis with Adaptive Routing
      setCameraState('analyzing');
      setAnalysisStep('Analyzing image with adaptive AI orchestration...');

      const analysisRes = await imageAnalysisService.analyzeImage(
        imgRecord.id,
        analysisMode,
        effectiveForceOcr,
      );

      if (!analysisRes.success || !analysisRes.data.analysis) {
        throw new Error(analysisRes.message || 'AI Multimodal analysis failed');
      }

      const analysis = analysisRes.data.analysis;
      setAnalysisResult(analysis);

      if (analysis.status === 'partial_success') {
        setCameraState('partial_success');
      } else {
        setCameraState('success');
      }
    } catch (err: any) {
      console.error('Analysis pipeline failure:', err);
      setCameraState('error');
      setErrorMessage('AI Analysis Failed');
      setErrorDetails(
        err.response?.data?.message ||
          err.message ||
          'Failed to complete multimodal analysis. Please check AI service connectivity and retry.',
      );
    }
  };

  // Re-run OCR explicitly if skipped by adaptive router
  const handleReanalyzeWithOcr = async () => {
    if (!uploadedImage || cameraState === 'analyzing') return;

    setCameraState('analyzing');
    setAnalysisStep('Re-running analysis with Force OCR enabled...');
    try {
      const analysisRes = await imageAnalysisService.analyzeImage(
        uploadedImage.id,
        analysisMode,
        true,
      );
      if (analysisRes.success && analysisRes.data.analysis) {
        setAnalysisResult(analysisRes.data.analysis);
        setCameraState('success');
      }
    } catch (err: any) {
      console.error('Failed to re-run OCR:', err);
      setErrorMessage('OCR Re-run Failed');
    }
  };

  // Copy OCR Text to clipboard
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Translate OCR Text
  const handleTranslate = async () => {
    if (!analysisResult?.ocr.fullText || isTranslating) return;

    setIsTranslating(true);
    setTranslationError(null);
    try {
      const res = await translationService.translate(
        analysisResult.ocr.fullText,
        'auto',
        targetLanguage,
      );
      if (res.success && res.data.translation) {
        setTranslationResult(res.data.translation);
      }
    } catch (err: any) {
      setTranslationError(err.response?.data?.message || 'Translation service failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  // Filter detected objects by confidence threshold
  const filteredDetections = (analysisResult?.objectDetection.detections || []).filter(
    (item) => item.confidence >= confidenceThreshold,
  );

  const dominantRegions = analysisResult?.segmentation.regions || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase tracking-wider">
              <Camera className="w-3.5 h-3.5" /> Smart Camera Studio
            </span>
            <span className="text-xs text-slate-500 font-mono">• Phase 8 Multimodal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            Capture & Unified AI Analysis
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
            Live browser viewfinder with real-time camera framing, high-resolution JPEG capture, and instant multi-model inference (YOLO11, SegFormer, PaddleOCR, and Gemini Vision).
          </p>
        </div>

        {/* Top Status & History Links */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/history"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            <History className="w-3.5 h-3.5 text-indigo-400" />
            View History
          </Link>
          <Link
            to="/image-analysis"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            File Upload Studio
          </Link>
        </div>
      </div>

      {/* Partial Success Alert Banner */}
      {cameraState === 'partial_success' && (
        <div className="p-4 bg-amber-950/40 border border-amber-600/50 rounded-2xl text-amber-200 text-xs flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0 text-amber-400" />
          <div>
            <strong className="font-semibold">Partial Analysis Complete:</strong> One or more AI modules completed with fallback heuristics. All available detections and scene understandings are rendered below.
          </div>
        </div>
      )}

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Area: Viewfinder / Capture Preview / Analysis Visualizer */}
        <div className="lg:col-span-8 space-y-4">
          <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-950 relative overflow-hidden shadow-2xl">
            {/* 1. STATE: LIVE VIEW CAMERA */}
            {cameraState === 'live' && (
              <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-800">
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover select-none ${
                    isMirrored && facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* HUD Camera Viewfinder Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4">
                  {/* Top HUD Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-rose-600/90 text-white font-mono text-[10px] font-bold flex items-center gap-1.5 shadow-lg animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-white" />
                        LIVE
                      </span>
                      {streamResolution && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">
                          {streamResolution.width}×{streamResolution.height}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-indigo-300 font-mono text-[10px] uppercase">
                        {facingMode}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsMirrored((prev) => !prev)}
                      title="Toggle Mirror View"
                      className="pointer-events-auto p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700/70 transition-all text-xs flex items-center gap-1"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline text-[10px] font-medium">Mirror</span>
                    </button>
                  </div>

                  {/* Viewfinder Target Framing Brackets */}
                  <div className="relative flex-1 flex items-center justify-center">
                    <div className="w-48 h-48 sm:w-64 sm:h-64 border border-dashed border-indigo-400/40 rounded-3xl relative pointer-events-none">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-400/70" />
                      </div>
                    </div>
                  </div>

                  {/* Bottom Rule-of-Thirds Prompt */}
                  <div className="text-center">
                    <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 font-medium shadow-md">
                      Center object or text within frame and press Capture
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. STATE: CAPTURED PREVIEW */}
            {cameraState === 'captured' && capturedImageUrl && (
              <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                <img
                  src={capturedImageUrl}
                  alt="Captured Frame"
                  className="w-full h-full object-contain select-none"
                />

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 text-white font-mono text-[10px] font-bold flex items-center gap-1 shadow-lg">
                    <CheckCircle2 className="w-3 h-3" />
                    PHOTO CAPTURED
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">
                    {capturedDimensions.width}×{capturedDimensions.height}
                  </span>
                  {capturedBlob && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-slate-300 font-mono text-[10px]">
                      {(capturedBlob.size / 1024).toFixed(1)} KB
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 3. STATE: UPLOADING / ANALYZING PROGRESS */}
            {(cameraState === 'uploading' || cameraState === 'analyzing') && capturedImageUrl && (
              <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                <img
                  src={capturedImageUrl}
                  alt="Captured Frame"
                  className="w-full h-full object-contain opacity-30 filter blur-sm select-none"
                />

                {/* Animated Analysis Stepper HUD */}
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shadow-2xl relative">
                    <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                    <Sparkles className="w-4 h-4 text-violet-300 absolute -top-1 -right-1 animate-bounce" />
                  </div>

                  <div className="space-y-1 max-w-sm">
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {cameraState === 'uploading' ? 'Uploading Image...' : 'Synthesizing Multimodal AI...'}
                    </h3>
                    <p className="text-xs text-indigo-300 font-medium animate-pulse">
                      {analysisStep}
                    </p>
                  </div>

                  {/* Stepper Pill Indicators */}
                  <div className="flex items-center gap-2 pt-2">
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        cameraState === 'uploading'
                          ? 'w-8 bg-indigo-500'
                          : 'w-4 bg-emerald-500'
                      }`}
                    />
                    <span
                      className={`h-2 rounded-full transition-all duration-300 ${
                        cameraState === 'analyzing'
                          ? 'w-8 bg-purple-500 animate-pulse'
                          : 'w-4 bg-slate-800'
                      }`}
                    />
                    <span className="h-2 w-4 rounded-full bg-slate-800" />
                  </div>
                </div>
              </div>
            )}

            {/* 4. STATE: SUCCESS / PARTIAL SUCCESS (RESULT VISUALIZER) */}
            {(cameraState === 'success' || cameraState === 'partial_success') && analysisResult && (
              <div className="space-y-4">
                {/* Visual Viewport with Bounding Box SVG & Segmentation Overlay */}
                <div className="relative w-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center min-h-[380px]">
                  {/* Cloudinary Base Image */}
                  <img
                    src={analysisResult.imageUrl || capturedImageUrl || ''}
                    alt={analysisResult.originalName || 'Camera Capture'}
                    className="w-full h-auto max-h-[560px] object-contain block select-none"
                  />

                  {/* SVG Bounding Box Overlay for YOLO */}
                  {(viewMode === 'both' || viewMode === 'objects') && (
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
                  {(viewMode === 'both' || viewMode === 'segmentation') && dominantRegions.length > 0 && (
                    <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center gap-1.5 pointer-events-none">
                      {dominantRegions.slice(0, 5).map((reg) => {
                        const color = REGION_COLORS[reg.label.toLowerCase()] || '#6366f1';
                        return (
                          <span
                            key={reg.label}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-950/90 text-white border border-slate-700/80 shadow-lg flex items-center gap-1.5"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                            <span className="capitalize">{reg.label}</span>
                            <span className="font-mono text-slate-300 font-bold">{reg.regionPercentage}%</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* View Mode & Confidence Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                    <button
                      onClick={() => setViewMode('both')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'both' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Unified View
                    </button>
                    <button
                      onClick={() => setViewMode('objects')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'objects' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Objects Only
                    </button>
                    <button
                      onClick={() => setViewMode('segmentation')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === 'segmentation' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Regions Only
                    </button>
                  </div>

                  <div className="flex items-center gap-3 w-full sm:w-auto">
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
                      className="w-28 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 5. STATE: ERROR CARD */}
            {cameraState === 'error' && (
              <div className="min-h-[380px] rounded-2xl bg-slate-900/60 border border-rose-900/50 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-800/80 flex items-center justify-center text-rose-400 shadow-xl">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 className="text-lg font-bold text-rose-300">{errorMessage || 'Camera Error'}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {errorDetails || 'An unexpected error occurred while managing camera hardware.'}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Try Again
                  </button>
                  <Link
                    to="/image-analysis"
                    className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs border border-slate-700 transition-all"
                  >
                    Upload File Instead
                  </Link>
                </div>
              </div>
            )}

            {/* 6. STATE: REQUESTING PERMISSION */}
            {cameraState === 'requesting_permission' && (
              <div className="min-h-[380px] rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <h3 className="text-sm font-semibold text-white">Requesting Camera Permission</h3>
                <p className="text-xs text-slate-400 max-w-sm">
                  Please allow camera access in the browser prompt to activate the live viewfinder.
                </p>
              </div>
            )}

            {/* Control Bar Below Viewfinder */}
            <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
              {/* Left Buttons: Switch Camera / Retake */}
              <div className="flex items-center gap-2">
                {cameraState === 'live' && hasMultipleCameras && (
                  <button
                    onClick={handleSwitchCamera}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Switch Camera
                  </button>
                )}

                {(cameraState === 'captured' || cameraState === 'success' || cameraState === 'partial_success') && (
                  <button
                    onClick={handleRetake}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                    {cameraState === 'captured' ? 'Retake Photo' : 'Capture Another'}
                  </button>
                )}
              </div>

              {/* Center / Right Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                {cameraState === 'captured' && (
                  <div className="flex flex-wrap items-center gap-2 bg-slate-950/90 p-1.5 rounded-xl border border-slate-800">
                    <span className="text-[11px] font-semibold text-slate-400 px-1 flex items-center gap-1">
                      <Sliders className="w-3 h-3 text-indigo-400" /> Mode:
                    </span>
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
                        {m === 'balanced' ? 'Balanced (Default)' : m === 'everything' ? '✨ Everything' : m}
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
                )}

                {cameraState === 'live' && (
                  <button
                    onClick={handleCapture}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 group"
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white group-hover:scale-125 transition-transform" />
                    Capture Photo
                  </button>
                )}

                {cameraState === 'captured' && (
                  <button
                    onClick={() => handleAnalyze()}
                    className="flex items-center justify-center gap-2 px-8 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    Analyze Image ({analysisMode.toUpperCase()})
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI Fused Scene Understanding Banner (Shown on Success) */}
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

              {/* Description */}
              <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/90 text-sm text-slate-200 leading-relaxed font-sans">
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

          {/* Detailed Inspection Tabs (Shown on Success) */}
          {analysisResult && (
            <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
              {/* Tab Selector */}
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
                  OCR & Translation ({analysisResult.ocr.lineCount} lines)
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
                  Pipeline Breakdown
                </button>
              </div>

              {/* Tab 1: Objects */}
              {activeTab === 'objects' && (
                <div className="space-y-3">
                  {filteredDetections.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
                      No objects detected above {Math.round(confidenceThreshold * 100)}% confidence threshold.
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

              {/* Tab 2: Semantic Regions */}
              {activeTab === 'regions' && (
                <div className="space-y-3">
                  {dominantRegions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 bg-slate-900/30 rounded-2xl border border-slate-800">
                      No environmental regions identified above 1% threshold.
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

              {/* Tab 3: OCR Text & In-Place Translation */}
              {activeTab === 'ocr' && (
                <div className="space-y-4">
                  {analysisResult.modules?.ocr === 'skipped' ? (
                    <div className="p-6 bg-slate-950/80 rounded-2xl border border-dashed border-amber-500/40 text-center space-y-3">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        <Info className="w-3.5 h-3.5" /> Skipped by Adaptive Routing
                      </div>
                      <p className="text-xs text-slate-400 max-w-md mx-auto">
                        PaddleOCR was bypassed because the adaptive router classified this scene as having low text density, saving ~20s.
                      </p>
                      <button
                        type="button"
                        onClick={handleReanalyzeWithOcr}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md inline-flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Run OCR Anyway
                      </button>
                    </div>
                  ) : (
                    <>
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

                      <div className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap max-h-[180px] overflow-y-auto">
                        {analysisResult.ocr.fullText || (
                          <span className="text-slate-500 italic">No textual characters detected in this camera frame.</span>
                        )}
                      </div>
                    </>
                  )}

                  {/* Translation Control if OCR text exists */}
                  {analysisResult.ocr.fullText && (
                    <div className="p-4 bg-slate-900/60 rounded-2xl border border-slate-800 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                          <Languages className="w-4 h-4 text-indigo-400" /> Translate Extracted Text
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={targetLanguage}
                            onChange={(e) => setTargetLanguage(e.target.value as any)}
                            className="bg-slate-950 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 border border-slate-800 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="vi">Vietnamese (Tiếng Việt)</option>
                            <option value="en">English</option>
                            <option value="zh">Chinese (中文)</option>
                          </select>
                          <button
                            onClick={handleTranslate}
                            disabled={isTranslating}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                          >
                            {isTranslating ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" /> Translating...
                              </>
                            ) : (
                              'Translate'
                            )}
                          </button>
                        </div>
                      </div>

                      {translationError && (
                        <div className="text-xs text-rose-400">{translationError}</div>
                      )}

                      {translationResult && (
                        <div className="p-3 bg-slate-950 rounded-xl border border-indigo-500/30 text-xs text-slate-200 font-sans leading-relaxed">
                          <div className="text-[10px] text-indigo-400 uppercase font-mono mb-1">
                            Translated ({translationResult.sourceLanguage} → {translationResult.targetLanguage}):
                          </div>
                          {translationResult.translatedText}
                        </div>
                      )}
                    </div>
                  )}
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

              {/* Tab: Pipeline Breakdown */}
              {activeTab === 'raw' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">YOLO Detection</div>
                    <div className="font-bold text-white mt-1">{analysisResult.objectDetection.model}</div>
                    <div className="text-[11px] text-indigo-400 font-mono mt-0.5">{analysisResult.objectDetection.processingTimeMs} ms</div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">SegFormer</div>
                    <div className="font-bold text-white mt-1">{analysisResult.segmentation.model}</div>
                    <div className="text-[11px] text-emerald-400 font-mono mt-0.5">{analysisResult.segmentation.processingTimeMs} ms</div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">PaddleOCR</div>
                    <div className="font-bold text-white mt-1">Multi-Pass vi</div>
                    <div className="text-[11px] text-purple-400 font-mono mt-0.5">{analysisResult.ocr.processingTimeMs} ms</div>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Vision LLM</div>
                    <div className="font-bold text-white mt-1">
                      {analysisResult.vision.isFallback ? 'Evidence Grounded' : 'Gemini 1.5'}
                    </div>
                    <div className="text-[11px] text-pink-400 font-mono mt-0.5">Status: Ready</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Area: Instructions & AI Stack Overview */}
        <div className="lg:col-span-4 space-y-4">
          {/* Quick Guide Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-indigo-400" /> Camera Workflow
            </h3>
            <div className="space-y-3 text-xs text-slate-400">
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <strong className="text-white">Allow Permissions</strong>: Ensure camera access is allowed in your browser address bar.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <strong className="text-white">Capture Frame</strong>: Position objects or documents inside the viewfinder and click Capture.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <strong className="text-white">Review & Analyze</strong>: Confirm preview quality and launch the full-stack AI analysis pipeline.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 font-bold flex items-center justify-center shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <strong className="text-white">Inspect Results</strong>: Explore detected bounding boxes, environmental regions, OCR text, and AI descriptions.
                </div>
              </div>
            </div>
          </div>

          {/* AI Multimodal Architecture Card */}
          <div className="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" /> Active AI Pipeline
            </h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">YOLO11n</div>
                  <div className="text-[10px] text-slate-400">80 COCO Classes Detection</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">SegFormer-B0</div>
                  <div className="text-[10px] text-slate-400">ADE20k Environmental Regions</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">PaddleOCR v4</div>
                  <div className="text-[10px] text-slate-400">Text Line Extraction</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono">
                  ACTIVE
                </span>
              </div>

              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Gemini 1.5 Vision</div>
                  <div className="text-[10px] text-slate-400">Multimodal Scene Fusion</div>
                </div>
                <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-mono">
                  CONNECTED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
