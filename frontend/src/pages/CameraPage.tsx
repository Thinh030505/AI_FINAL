import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CameraPreview,
  CameraPreviewHandle,
  CameraLifecycleState,
  CameraDiagnosticInfo,
} from '../components/camera/CameraPreview';
import { DetectionOverlay } from '../components/camera/DetectionOverlay';
import { PerformanceHud, AIProcessingState } from '../components/camera/PerformanceHud';
import { DetectionModeSelector } from '../components/camera/DetectionModeSelector';
import { DetectionDetailsPanel } from '../components/camera/DetectionDetailsPanel';
import { HierarchyTreeView } from '../components/camera/HierarchyTreeView';
import { CameraControls } from '../components/camera/CameraControls';
import {
  RealtimeDetection,
  SmartCameraTiming,
  DeviceInfo,
  CameraDetectionMode,
} from '../types/smartCamera';
import { smartCameraService } from '../services/smartCameraService';
import { imageService } from '../services/imageService';
import { imageAnalysisService } from '../services/imageAnalysisService';
import { Sparkles, RotateCcw, Loader2, Download, AlertCircle, Crosshair, Snowflake } from 'lucide-react';

export const CameraPage: React.FC = () => {
  const navigate = useNavigate();
  const cameraRef = useRef<CameraPreviewHandle | null>(null);

  // Explicit Camera Lifecycle State Machine
  const [cameraState, setCameraState] = useState<CameraLifecycleState>('idle');
  const [diagnostics, setDiagnostics] = useState<CameraDiagnosticInfo | undefined>(undefined);

  // Explicit AI Subsystem State Machine
  const [aiState, setAiState] = useState<AIProcessingState>('idle');

  // Camera stream configuration
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>(() => {
    return window.innerWidth < 768 ? 'environment' : 'user';
  });
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [streamResolution, setStreamResolution] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  // Detection Mode & Sensitivity Controls
  const [detectionMode, setDetectionMode] = useState<CameraDetectionMode>('simple');
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.30);
  const [enableOcr, setEnableOcr] = useState<boolean>(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    new Set([
      'person',
      'human_part',
      'accessory',
      'general_object',
      'natural_object',
      'device',
      'furniture',
      'ocr_text',
      'open_vocab',
    ])
  );

  // Spatial Debug Mode (Section 24) & Static Frame Freeze (Section 26)
  const [spatialDebug, setSpatialDebug] = useState<boolean>(false);
  const [isFrozen, setIsFrozen] = useState<boolean>(false);

  // Live Stream Inference & Tracking State
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [detections, setDetections] = useState<RealtimeDetection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<RealtimeDetection | null>(null);
  const [timings, setTimings] = useState<SmartCameraTiming | undefined>(undefined);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | undefined>(undefined);
  const [activeTrackCount, setActiveTrackCount] = useState<number>(0);

  // HUD and Backpressure Tracking Metrics
  const [isInFlight, setIsInFlight] = useState<boolean>(false);
  const [skippedFrames, setSkippedFrames] = useState<number>(0);
  const skippedFramesCountRef = useRef<number>(0);
  const inFlightRef = useRef<boolean>(false);
  const latestAppliedFrameIdRef = useRef<number>(0);
  const frameIdCounterRef = useRef<number>(1);
  const activeAbortControllerRef = useRef<AbortController | null>(null);

  // UI Panels
  const [isModeDrawerOpen, setIsModeDrawerOpen] = useState<boolean>(false);
  const [isHierarchyTreeOpen, setIsHierarchyTreeOpen] = useState<boolean>(false);

  // Performance FPS Counters (Real camera presentation vs AI cadence)
  const [cameraFps, setCameraFps] = useState<number>(30);
  const [aiFps, setAiFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastAiFpsCalcRef = useRef<number>(performance.now());

  // Snapshot / Offline Deep Multimodal Analysis Modal
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);
  const [isUploadingToCloud, setIsUploadingToCloud] = useState<boolean>(false);
  const [offlineStatus, setOfflineStatus] = useState<string | null>(null);

  // Check camera hardware devices
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoDevices.length > 1);
      });
    }
  }, []);

  // Update front camera default mirror
  useEffect(() => {
    setIsMirrored(facingMode === 'user');
  }, [facingMode]);

  // Real Camera FPS calculation using HTMLVideoElement.requestVideoFrameCallback (Section 12)
  // Ensures screen refresh rate (e.g. 144Hz) is not reported as camera FPS
  useEffect(() => {
    let isActive = true;
    let frameCounter = 0;
    let lastTime = performance.now();
    let callbackHandle: number | null = null;

    const setupCallback = () => {
      if (!isActive) return;
      const video = cameraRef.current?.getVideoElement();
      if (video && 'requestVideoFrameCallback' in video) {
        callbackHandle = (video as any).requestVideoFrameCallback((now: DOMHighResTimeStamp) => {
          if (!isActive) return;
          frameCounter += 1;
          const elapsed = now - lastTime;
          if (elapsed >= 1000) {
            setCameraFps(Math.round((frameCounter * 1000) / elapsed));
            frameCounter = 0;
            lastTime = now;
          }
          setupCallback();
        });
      } else {
        // Fallback: estimate from video currentTime ticks
        const interval = setInterval(() => {
          if (!isActive) return;
          const v = cameraRef.current?.getVideoElement();
          if (v && !v.paused && v.readyState >= 2) {
            setCameraFps(30);
          }
        }, 1000);
        return () => clearInterval(interval);
      }
    };

    const initTimer = setTimeout(setupCallback, 600);

    return () => {
      isActive = false;
      clearTimeout(initTimer);
      const video = cameraRef.current?.getVideoElement();
      if (video && callbackHandle !== null && 'cancelVideoFrameCallback' in video) {
        (video as any).cancelVideoFrameCallback(callbackHandle);
      }
    };
  }, [cameraState]);

  // Poll diagnostics periodically when expanded or during state transitions
  useEffect(() => {
    const diagInterval = setInterval(() => {
      if (cameraRef.current) {
        setDiagnostics(cameraRef.current.getDiagnostics());
      }
    }, 1000);
    return () => clearInterval(diagInterval);
  }, []);

  // Handle Camera Lifecycle state changes from CameraPreview
  const handleCameraStateChange = useCallback((newState: CameraLifecycleState) => {
    setCameraState(newState);
    if (cameraRef.current) {
      setDiagnostics(cameraRef.current.getDiagnostics());
    }
  }, []);

  // Handle stream dimensions ready
  const handleStreamReady = useCallback(
    (_video: HTMLVideoElement, res: { width: number; height: number }) => {
      setStreamResolution(res);
      setCameraState('live');
      if (aiState === 'idle') {
        setAiState('warming');
      }
    },
    [aiState]
  );

  // Toggle Freeze Frame verification (Section 26)
  const handleToggleFreeze = useCallback(() => {
    const video = cameraRef.current?.getVideoElement();
    if (!video) return;

    if (!isFrozen) {
      video.pause();
      setIsFrozen(true);
    } else {
      video.play().catch(() => {});
      setIsFrozen(false);
    }
  }, [isFrozen]);

  // Real-Time Asynchronous Inference Loop with Canonical Coordinate Grounding & Backpressure
  useEffect(() => {
    let isActive = true;
    let failureBackoffUntil = 0;

    const runInferenceCycle = async () => {
      // 1. Guard: camera must be LIVE and streaming active (unless running single pass on frozen frame)
      if (!isActive || !isStreaming || cameraState !== 'live') {
        return;
      }

      // If user froze frame, do not re-run in a loop continuously
      if (isFrozen && detections.length > 0) {
        return;
      }

      // 2. Guard: backoff if previous AI request failed (avoids reconnect storm)
      const now = performance.now();
      if (now < failureBackoffUntil) {
        return;
      }

      // 3. ONE-IN-FLIGHT BACKPRESSURE: Skip frame if previous request is still in flight
      if (inFlightRef.current) {
        skippedFramesCountRef.current += 1;
        setSkippedFrames(skippedFramesCountRef.current);
        return;
      }

      if (!cameraRef.current) return;

      inFlightRef.current = true;
      setIsInFlight(true);

      const currentFrameId = frameIdCounterRef.current++;
      const abortController = new AbortController();
      activeAbortControllerRef.current = abortController;

      try {
        // Extract resized frame blob from video canvas (640px downscaled for low latency)
        const frameBlob = await cameraRef.current.captureFrameBlob(0.70, 640);
        if (!frameBlob || !isActive || !isStreaming || cameraState !== 'live') {
          return;
        }

        const video = cameraRef.current.getVideoElement();
        const origW = video?.videoWidth || streamResolution.width || 1280;
        const origH = video?.videoHeight || streamResolution.height || 720;

        // Send ephemeral frame with canonical original dimensions
        const resp = await smartCameraService.analyzeFrame(frameBlob, {
          frameId: currentFrameId,
          mode: detectionMode,
          confidenceThreshold,
          enableOcr,
          targetLang: 'vi',
          originalWidth: origW,
          originalHeight: origH,
          signal: abortController.signal,
          timeoutMs: 2200,
        });

        // 4. DROP STALE RESULTS: Discard out-of-order responses
        if (resp.frameId && resp.frameId <= latestAppliedFrameIdRef.current) {
          return;
        }

        if (resp.frameId) {
          latestAppliedFrameIdRef.current = resp.frameId;
        }

        if (isActive) {
          setDetections(resp.detections || []);
          setTimings(resp.timings);
          setDeviceInfo(resp.device);
          setActiveTrackCount(resp.activeTrackCount || 0);
          setAiState('running');

          // Update AI FPS counter
          frameCountRef.current += 1;
          const elapsed = performance.now() - lastAiFpsCalcRef.current;
          if (elapsed >= 1000) {
            setAiFps(Math.round((frameCountRef.current * 1000) / elapsed));
            frameCountRef.current = 0;
            lastAiFpsCalcRef.current = performance.now();
          }
        }
      } catch (err: any) {
        if (!isActive) return;

        if (err.name === 'CanceledError' || err.name === 'AbortError') {
          console.warn('[SmartCamera] Inference request aborted due to timeout.');
        } else {
          console.warn('[SmartCamera] AI inference error (camera remains live):', err.message);
          setAiState('offline');
          failureBackoffUntil = performance.now() + 800;
        }
      } finally {
        inFlightRef.current = false;
        setIsInFlight(false);
        activeAbortControllerRef.current = null;
      }
    };

    // Cadence interval: evaluate next frame every 120ms (~8 FPS max AI cadence)
    const intervalId = setInterval(runInferenceCycle, 120);

    return () => {
      isActive = false;
      clearInterval(intervalId);
      if (activeAbortControllerRef.current) {
        activeAbortControllerRef.current.abort();
        activeAbortControllerRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [isStreaming, cameraState, detectionMode, confidenceThreshold, enableOcr, isFrozen, streamResolution]);

  // Reset tracker on camera unmount
  useEffect(() => {
    return () => {
      smartCameraService.resetTracker();
    };
  }, []);

  // Category toggle handler
  const handleToggleCategory = (cat: string) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  // High-Resolution Snapshot Capture
  const handleCaptureSnapshot = async () => {
    if (!cameraRef.current) return;
    const blob = await cameraRef.current.captureFullResolutionBlob();
    if (blob) {
      const url = URL.createObjectURL(blob);
      setCapturedBlob(blob);
      setCapturedPreviewUrl(url);
      setIsStreaming(false);
    }
  };

  // Retake photo / cancel snapshot
  const handleRetakeSnapshot = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
    }
    setCapturedBlob(null);
    setCapturedPreviewUrl(null);
    setOfflineStatus(null);
    setIsStreaming(true);
  };

  // Deep Offline Multimodal Analysis (preserving existing Cloudinary & MongoDB flow)
  const handleRunDeepAnalysis = async () => {
    if (!capturedBlob) return;
    setIsUploadingToCloud(true);
    setOfflineStatus('Uploading photo to Cloudinary CDN...');

    try {
      const file = new File([capturedBlob], `smart_camera_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });
      const uploadResp = await imageService.uploadImage(file, 'camera');
      const uploadedRecord = uploadResp.data.image;

      setOfflineStatus('Running deep multimodal AI analysis...');
      await imageAnalysisService.analyzeImage(uploadedRecord.id, 'everything', true);

      navigate('/history');
    } catch (err: any) {
      setOfflineStatus(`Analysis error: ${err.message || 'Failed'}`);
    } finally {
      setIsUploadingToCloud(false);
    }
  };

  // Toggle fullscreen
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-slate-950 overflow-hidden flex flex-col">
      {/* Top Header Floating Status & Vision Mode Bar */}
      <div className="absolute top-4 inset-x-0 z-30 flex items-center justify-between px-4 pointer-events-none">
        {/* Left space reserved for PerformanceHud */}
        <div className="pointer-events-auto flex items-center gap-2" />

        {/* Right Status Banner */}
        <div className="pointer-events-auto flex items-center gap-2">
          {/* Spatial Debug Active Indicator */}
          {spatialDebug && (
            <div className="bg-emerald-950/80 backdrop-blur-md border border-emerald-700/60 rounded-full px-3 py-1 text-xs text-emerald-300 flex items-center gap-1.5 shadow-lg">
              <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-[11px]">Spatial Debug Active</span>
            </div>
          )}

          {/* Freeze Mode Active Indicator */}
          {isFrozen && (
            <div className="bg-sky-950/80 backdrop-blur-md border border-sky-700/60 rounded-full px-3 py-1 text-xs text-sky-300 flex items-center gap-1.5 shadow-lg animate-pulse">
              <Snowflake className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-[11px]">Frame Frozen</span>
            </div>
          )}

          {/* AI Connection Status Badge */}
          {aiState === 'offline' && (
            <div className="bg-rose-950/80 backdrop-blur-md border border-rose-700/60 rounded-full px-3 py-1 text-xs text-rose-300 flex items-center gap-1.5 shadow-lg animate-pulse">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-semibold text-[11px]">AI: Offline (Camera Live)</span>
            </div>
          )}

          {/* Vision Mode Indicator Banner */}
          <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-full px-4 py-1.5 text-xs text-slate-300 flex items-center gap-2 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-white uppercase tracking-wider text-[11px]">
              {detectionMode} Mode
            </span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                cameraState === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span className="text-slate-400 font-mono text-[11px]">
              {detections.length} objects
            </span>
          </div>
        </div>
      </div>

      {/* Main Camera Live Viewport */}
      <div className="relative flex-1 w-full h-full">
        <CameraPreview
          ref={cameraRef}
          facingMode={facingMode}
          isMirrored={isMirrored}
          onStreamReady={handleStreamReady}
          onStateChange={handleCameraStateChange}
        >
          {/* Performance HUD */}
          <PerformanceHud
            cameraState={cameraState}
            aiState={aiState}
            cameraFps={cameraFps}
            aiFps={aiFps}
            resolution={streamResolution}
            timings={timings}
            device={deviceInfo}
            detectionCount={detections.length}
            trackCount={activeTrackCount}
            skippedFrames={skippedFrames}
            isInFlight={isInFlight}
            diagnostics={diagnostics}
          />

          {/* Interactive Live Bounding Box Overlay with Canonical Coordinate Transform */}
          <DetectionOverlay
            detections={detections}
            selectedDetection={selectedDetection}
            onSelectDetection={(d) => setSelectedDetection(d)}
            videoElement={cameraRef.current?.getVideoElement() || null}
            sourceWidth={streamResolution.width || 1280}
            sourceHeight={streamResolution.height || 720}
            isMirrored={isMirrored}
            showConfidence={true}
            confidenceThreshold={confidenceThreshold}
            activeCategories={activeCategories}
            spatialDebug={spatialDebug}
          />
        </CameraPreview>
      </div>

      {/* Detection Mode & Settings Floating Drawer */}
      {isModeDrawerOpen && (
        <div className="absolute bottom-24 left-4 z-40 w-80 animate-in fade-in slide-in-from-bottom-2 duration-150">
          <DetectionModeSelector
            mode={detectionMode}
            onModeChange={(m) => setDetectionMode(m)}
            confidenceThreshold={confidenceThreshold}
            onConfidenceChange={(c) => setConfidenceThreshold(c)}
            enableOcr={enableOcr}
            onToggleOcr={() => setEnableOcr(!enableOcr)}
            activeCategories={activeCategories}
            onToggleCategory={handleToggleCategory}
          />
        </div>
      )}

      {/* Scene Hierarchy Tree Drawer */}
      {isHierarchyTreeOpen && (
        <HierarchyTreeView
          detections={detections}
          selectedDetection={selectedDetection}
          onSelectDetection={(d) => setSelectedDetection(d)}
          onClose={() => setIsHierarchyTreeOpen(false)}
        />
      )}

      {/* Selected Entity Details Panel */}
      {selectedDetection && (
        <DetectionDetailsPanel
          detection={selectedDetection}
          allDetections={detections}
          onClose={() => setSelectedDetection(null)}
          onSelectDetection={(d) => setSelectedDetection(d)}
        />
      )}

      {/* Floating Camera Stream Controls */}
      <CameraControls
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        onFlipCamera={() =>
          setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
        }
        hasMultipleCameras={hasMultipleCameras}
        isMirrored={isMirrored}
        onToggleMirror={() => setIsMirrored(!isMirrored)}
        onCaptureSnapshot={handleCaptureSnapshot}
        onToggleModeDrawer={() => setIsModeDrawerOpen(!isModeDrawerOpen)}
        isModeDrawerOpen={isModeDrawerOpen}
        onToggleHierarchyTree={() => setIsHierarchyTreeOpen(!isHierarchyTreeOpen)}
        isHierarchyTreeOpen={isHierarchyTreeOpen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        spatialDebug={spatialDebug}
        onToggleSpatialDebug={() => setSpatialDebug(!spatialDebug)}
        isFrozen={isFrozen}
        onToggleFreeze={handleToggleFreeze}
      />

      {/* Snapshot Preview & Deep Multimodal Analysis Modal */}
      {capturedPreviewUrl && (
        <div className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Photo Captured</span>
              </div>
              <button
                onClick={handleRetakeSnapshot}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Photo Preview */}
            <div className="relative w-full max-h-[60vh] bg-black flex items-center justify-center overflow-hidden">
              <img
                src={capturedPreviewUrl}
                alt="Captured Snapshot"
                className="max-w-full max-h-[60vh] object-contain"
              />
            </div>

            {/* Status Message */}
            {offlineStatus && (
              <div className="px-5 py-2.5 bg-slate-950 text-xs font-mono text-indigo-300 border-t border-slate-800 flex items-center gap-2">
                {isUploadingToCloud && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{offlineStatus}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3 bg-slate-900/80">
              <button
                onClick={handleRetakeSnapshot}
                disabled={isUploadingToCloud}
                className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Retake
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={capturedPreviewUrl}
                  download={`smart_camera_${Date.now()}.jpg`}
                  className="py-2.5 px-4 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Save Photo
                </a>

                <button
                  onClick={handleRunDeepAnalysis}
                  disabled={isUploadingToCloud}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold transition shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploadingToCloud ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  Save & Deep Multimodal Analysis
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
