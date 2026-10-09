export type DetectionLevel =
  | 'object'
  | 'fine_grained'
  | 'part'
  | 'open_vocab'
  | 'ocr'
  | 'region';

export type DetectionCategory =
  | 'person'
  | 'human_part'
  | 'accessory'
  | 'general_object'
  | 'natural_object'
  | 'device'
  | 'furniture'
  | 'vehicle'
  | 'ocr_text'
  | 'open_vocab';

export interface SmartBBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface RealtimeDetection {
  id: string;
  trackId?: number;
  label: string;
  confidence: number;
  bbox: SmartBBox;
  level: DetectionLevel;
  category: DetectionCategory;
  source: string;
  parentId?: string | null;
  childrenIds: string[];
  ocrText?: string;
  translatedText?: string;
  attributes?: Record<string, any>;
  rawBbox?: SmartBBox;
  canonicalBbox?: SmartBBox;
}

export interface SmartCameraTiming {
  preprocessMs: number;
  generalDetectionMs: number;
  specialistMs: number;
  openVocabMs: number;
  ocrMs: number;
  fusionMs: number;
  trackingMs: number;
  totalMs: number;
}

export interface DeviceInfo {
  cuda: boolean;
  device: string;
  gpuName?: string | null;
  vramMb?: number | null;
  torchVersion: string;
}

export interface FrameTransformMetadata {
  uploadWidth: number;
  uploadHeight: number;
  originalWidth: number;
  originalHeight: number;
  scaleX: number;
  scaleY: number;
}

export interface SmartCameraAnalysisResponse {
  frameId: number;
  timestamp: number;
  image: {
    width: number;
    height: number;
  };
  mode: 'simple' | 'detailed' | 'everything';
  detections: RealtimeDetection[];
  timings: SmartCameraTiming;
  device: DeviceInfo;
  activeTrackCount: number;
  transform?: FrameTransformMetadata;
  status: 'success' | 'partial_success' | 'empty';
}

export interface SmartCameraStatusResponse {
  status: string;
  device: {
    cuda: boolean;
    device: string;
    gpuName: string | null;
    vramMb: number | null;
  };
  models: {
    generalDetector: string;
    poseSpecialist: string;
    openVocabulary: string;
    ocrEngine: string;
  };
  activeTracks: number;
}

export type CameraDetectionMode = 'simple' | 'detailed' | 'everything';
