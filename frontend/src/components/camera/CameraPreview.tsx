import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { Camera, AlertCircle, RefreshCw, ShieldAlert, VideoOff } from 'lucide-react';

export type CameraLifecycleState =
  | 'idle'
  | 'checking_environment'
  | 'requesting_permission'
  | 'stream_acquired'
  | 'attaching_video'
  | 'waiting_metadata'
  | 'playing'
  | 'live'
  | 'error'
  | 'stopped';

export interface CameraDiagnosticInfo {
  secureContext: boolean;
  mediaDevicesAvailable: boolean;
  permissionState: string;
  lifecycleState: CameraLifecycleState;
  streamActive: boolean;
  trackLabel: string;
  trackReadyState: string;
  videoWidth: number;
  videoHeight: number;
  videoReadyState: number;
  videoPaused: boolean;
  lastError: string | null;
  timings: Record<string, number>;
}

export interface CameraPreviewHandle {
  captureFrameBlob: (quality?: number, maxWidth?: number) => Promise<Blob | null>;
  captureFullResolutionBlob: () => Promise<Blob | null>;
  getVideoElement: () => HTMLVideoElement | null;
  getDiagnostics: () => CameraDiagnosticInfo;
  restartCamera: () => void;
}

interface CameraPreviewProps {
  facingMode: 'user' | 'environment';
  isMirrored: boolean;
  onStreamReady?: (video: HTMLVideoElement, resolution: { width: number; height: number }) => void;
  onError?: (errorMessage: string) => void;
  onStateChange?: (state: CameraLifecycleState) => void;
  children?: React.ReactNode;
}

export const CameraPreview = forwardRef<CameraPreviewHandle, CameraPreviewProps>(
  ({ facingMode, isMirrored, onStreamReady, onError, onStateChange, children }, ref) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    // Generation counter to protect against React StrictMode double-mount race conditions
    const generationRef = useRef<number>(0);
    const isMountedRef = useRef<boolean>(true);
    const timeoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [lifecycleState, setLifecycleState] = useState<CameraLifecycleState>('idle');
    const [statusMessage, setStatusMessage] = useState<string>('Initializing camera subsystem...');
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [resolution, setResolution] = useState<{ width: number; height: number }>({
      width: 0,
      height: 0,
    });

    // Detailed diagnostic instrumentation
    const [diagnostics, setDiagnostics] = useState<CameraDiagnosticInfo>({
      secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      mediaDevicesAvailable: typeof navigator !== 'undefined' && !!navigator.mediaDevices,
      permissionState: 'unknown',
      lifecycleState: 'idle',
      streamActive: false,
      trackLabel: 'none',
      trackReadyState: 'none',
      videoWidth: 0,
      videoHeight: 0,
      videoReadyState: 0,
      videoPaused: true,
      lastError: null,
      timings: {},
    });

    const timingMapRef = useRef<Record<string, number>>({});
    const recordPhase = useCallback((phase: string) => {
      const now = Math.round(performance.now());
      timingMapRef.current[phase] = now;
      console.log(`[SmartCamera] ${phase.padEnd(28)}: ${now} ms`);
    }, []);

    const updateState = useCallback(
      (state: CameraLifecycleState, message: string) => {
        setLifecycleState(state);
        setStatusMessage(message);
        onStateChange?.(state);
      },
      [onStateChange]
    );

    // Safely stop stream tracks
    const stopStream = useCallback(() => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }, []);

    // Main camera acquisition with progressive constraint fallbacks
    const startCamera = useCallback(async () => {
      const currentGeneration = ++generationRef.current;
      timingMapRef.current = {};
      recordPhase('CAMERA_INIT');

      stopStream();
      setCameraError(null);
      updateState('checking_environment', 'Checking camera environment & permissions...');

      // 1. Verify Browser Security Context
      const isSecure = window.isSecureContext;
      const hasMediaDevices = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

      if (!isSecure && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        const errorMsg =
          'Camera access requires a secure context (HTTPS or http://localhost). Insecure LAN addresses block WebRTC.';
        setCameraError(errorMsg);
        updateState('error', errorMsg);
        onError?.(errorMsg);
        return;
      }

      if (!hasMediaDevices) {
        const errorMsg =
          'MediaDevices API is unavailable in this browser. Please ensure camera access is supported and permissions are allowed.';
        setCameraError(errorMsg);
        updateState('error', errorMsg);
        onError?.(errorMsg);
        return;
      }

      // Check permission query if available
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const permStatus = await navigator.permissions.query({ name: 'camera' as any });
          setDiagnostics((prev) => ({ ...prev, permissionState: permStatus.state }));
        }
      } catch {
        // Permissions query not supported on some browsers; safe to ignore
      }

      // 2. Set Watchdog Timeout (8 seconds)
      timeoutTimerRef.current = setTimeout(() => {
        if (generationRef.current === currentGeneration && isMountedRef.current) {
          const timeoutMsg =
            'Camera startup timed out after 8 seconds. The video stream could not be decoded. Please verify camera permissions or click Retry.';
          console.warn('[SmartCamera] CAMERA_STARTUP_TIMEOUT triggered.');
          stopStream();
          setCameraError(timeoutMsg);
          updateState('error', timeoutMsg);
          onError?.(timeoutMsg);
        }
      }, 8000);

      // 3. Acquire Stream with progressive fallback
      recordPhase('CAMERA_PERMISSION_REQUEST');
      updateState('requesting_permission', 'Requesting camera permission...');

      const constraintTiers: MediaStreamConstraints[] = [
        // Tier 1: Ideal 720p with preferred facing mode
        {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        // Tier 2: Flexible dimensions
        {
          video: {
            facingMode: { ideal: facingMode },
          },
          audio: false,
        },
        // Tier 3: Bare minimum constraint
        {
          video: true,
          audio: false,
        },
      ];

      let stream: MediaStream | null = null;
      let lastConstraintError: any = null;

      for (let i = 0; i < constraintTiers.length; i++) {
        if (generationRef.current !== currentGeneration || !isMountedRef.current) return;
        try {
          console.log(`[SmartCamera] Trying constraint tier ${i + 1}:`, constraintTiers[i]);
          stream = await navigator.mediaDevices.getUserMedia(constraintTiers[i]);
          if (stream) break;
        } catch (err: any) {
          lastConstraintError = err;
          console.warn(`[SmartCamera] Tier ${i + 1} rejected:`, err.name || err.message);
          // If permission explicitly denied, do not continue trying lower tiers
          if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            break;
          }
        }
      }

      // Generation check after async getUserMedia
      if (generationRef.current !== currentGeneration || !isMountedRef.current) {
        console.log('[SmartCamera] Generation changed during getUserMedia, disposing stale stream.');
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
        return;
      }

      if (!stream) {
        let msg = 'Failed to access camera.';
        if (lastConstraintError) {
          const errName = lastConstraintError.name || '';
          if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
            msg = 'Camera permission was denied. Please allow camera permissions in browser settings and click Retry.';
          } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
            msg = 'No video camera device was found on this system.';
          } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
            msg = 'Camera is currently in use by another application or tab. Please close other camera apps and retry.';
          } else if (errName === 'OverconstrainedError') {
            msg = 'Requested camera resolution is not supported by your camera hardware.';
          } else if (lastConstraintError.message) {
            msg = lastConstraintError.message;
          }
        }
        setCameraError(msg);
        updateState('error', msg);
        onError?.(msg);
        return;
      }

      recordPhase('CAMERA_STREAM_RECEIVED');
      streamRef.current = stream;

      const videoTrack = stream.getVideoTracks()[0];
      const trackLabel = videoTrack?.label || 'Camera stream';
      const trackState = videoTrack?.readyState || 'unknown';

      setDiagnostics((prev) => ({
        ...prev,
        streamActive: stream ? stream.active : false,
        trackLabel,
        trackReadyState: trackState,
      }));

      // Listen for track ending externally
      if (videoTrack) {
        videoTrack.onended = () => {
          console.warn('[SmartCamera] Video track ended externally.');
          setCameraError('Camera track ended or device was disconnected.');
          updateState('error', 'Camera disconnected.');
        };
      }

      // 4. Attach Stream to HTML Video Element
      const video = videoRef.current;
      if (!video) {
        setCameraError('Video element reference missing in DOM.');
        updateState('error', 'Video element initialization failed.');
        return;
      }

      recordPhase('VIDEO_SRC_ATTACHED');
      updateState('attaching_video', 'Attaching stream to video preview...');

      video.srcObject = stream;
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.autoplay = true;

      // 5. Playback initiation and metadata listener
      recordPhase('VIDEO_PLAY_REQUESTED');
      updateState('waiting_metadata', 'Starting video playback...');

      let isReadyTriggered = false;

      const markCameraReady = () => {
        if (isReadyTriggered) return;
        if (generationRef.current !== currentGeneration || !isMountedRef.current) return;

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        if (vw <= 0 || vh <= 0) {
          console.log('[SmartCamera] Ready signal received but dimensions not ready yet, retrying...');
          return;
        }

        isReadyTriggered = true;
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }

        recordPhase('CAMERA_READY');
        setResolution({ width: vw, height: vh });
        updateState('live', 'Live Camera Stream Active');

        setDiagnostics((prev) => ({
          ...prev,
          videoWidth: vw,
          videoHeight: vh,
          videoReadyState: video.readyState,
          videoPaused: video.paused,
          timings: { ...timingMapRef.current },
        }));

        onStreamReady?.(video, { width: vw, height: vh });
      };

      // Attempt immediate playback
      try {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              recordPhase('VIDEO_PLAYING');
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                markCameraReady();
              }
            })
            .catch((playErr) => {
              console.warn('[SmartCamera] Autoplay request error:', playErr);
              // Retry on user interaction if needed
            });
        }
      } catch (err) {
        console.warn('[SmartCamera] Immediate play() threw:', err);
      }

      // Attach event listeners for robust resolution of dimensions
      video.onloadedmetadata = () => {
        recordPhase('VIDEO_METADATA_READY');
        video.play().catch(() => {});
        markCameraReady();
      };

      video.oncanplay = () => {
        recordPhase('VIDEO_CAN_PLAY');
        markCameraReady();
      };

      video.onplaying = () => {
        recordPhase('VIDEO_PLAYING_EVENT');
        markCameraReady();
      };

      // Immediate check if metadata was already loaded synchronously
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.videoWidth > 0) {
        markCameraReady();
      }
    }, [facingMode, stopStream, onStreamReady, onError, updateState, recordPhase]);

    // Initial mount & facingMode change
    useEffect(() => {
      isMountedRef.current = true;
      startCamera();

      return () => {
        isMountedRef.current = false;
        stopStream();
      };
    }, [startCamera, stopStream]);

    // Expose imperative handle
    useImperativeHandle(ref, () => ({
      getVideoElement: () => videoRef.current,

      getDiagnostics: () => ({
        ...diagnostics,
        videoWidth: videoRef.current?.videoWidth || 0,
        videoHeight: videoRef.current?.videoHeight || 0,
        videoReadyState: videoRef.current?.readyState || 0,
        videoPaused: videoRef.current?.paused ?? true,
      }),

      restartCamera: () => {
        startCamera();
      },

      captureFrameBlob: async (quality = 0.70, maxWidth = 640): Promise<Blob | null> => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight || video.readyState < 2) {
          return null;
        }

        const vw = video.videoWidth;
        const vh = video.videoHeight;

        let targetW = vw;
        let targetH = vh;
        if (vw > maxWidth) {
          targetW = maxWidth;
          targetH = Math.round((vh / vw) * maxWidth);
        }

        let canvas = canvasRef.current;
        if (!canvas) {
          canvas = document.createElement('canvas');
          canvasRef.current = canvas;
        }

        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
        }

        const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0, targetW, targetH);

        return new Promise<Blob | null>((resolve) => {
          canvas!.toBlob(
            (blob) => resolve(blob),
            'image/jpeg',
            quality
          );
        });
      },

      captureFullResolutionBlob: async (): Promise<Blob | null> => {
        const video = videoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        ctx.drawImage(video, 0, 0);

        return new Promise<Blob | null>((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
        });
      },
    }));

    const isInitializing = lifecycleState !== 'live' && lifecycleState !== 'error';

    return (
      <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden select-none">
        {/* Startup Progress Indicator (Replaces infinite black freeze) */}
        {isInitializing && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm text-white gap-3 p-6 text-center animate-in fade-in duration-150">
            <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin" />
            <h3 className="text-base font-semibold text-slate-100">Smart Camera Initializing</h3>
            <p className="text-xs text-indigo-300 font-mono max-w-sm">{statusMessage}</p>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>Phase: {lifecycleState}</span>
            </div>
          </div>
        )}

        {/* Error Fallback with Clear Diagnostics and Retry */}
        {lifecycleState === 'error' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mb-4">
              <VideoOff className="w-8 h-8 text-rose-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Camera Startup Failed</h3>
            <p className="text-sm text-slate-300 max-w-md mb-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 font-mono text-xs">
              {cameraError || 'Unknown camera startup error'}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={startCamera}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium text-xs text-white transition shadow-lg flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry Camera
              </button>
            </div>
          </div>
        )}

        {/* HTML5 Video Element (plays live independently of AI) */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className="w-full h-full object-contain pointer-events-none transition-transform duration-150"
          style={{
            transform: isMirrored ? 'scaleX(-1)' : 'none',
          }}
        />

        {/* Overlay Slots (Bounding boxes, HUD, etc.) */}
        {children}
      </div>
    );
  }
);
