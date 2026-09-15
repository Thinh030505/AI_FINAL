export interface HealthResponse {
  status: string;
  service: string;
  database?: 'connected' | 'disconnected';
  ai_service?: 'connected' | 'disconnected';
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  createdAt?: string;
  updatedAt?: string;
}

export interface ImageRecord {
  id: string;
  imageUrl: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  source?: 'upload' | 'camera';
  capturedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TextLine {
  text: string;
  confidence: number;
  box: number[][];
}

export interface OCRResultRecord {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  fullText: string;
  rawFullText?: string;
  lines: TextLine[];
  processingTimeMs: number;
  avgConfidence?: number;
  minConfidence?: number;
  isUncertain?: boolean;
  debug?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface TranslationRecord {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  processingTimeMs: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DetectionItem {
  label: string;
  classId: number;
  confidence: number;
  box: BoundingBox;
}

export interface ObjectDetectionRecord {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  model: string;
  imageWidth: number;
  imageHeight: number;
  detections: DetectionItem[];
  objectCount: number;
  processingTimeMs: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface SemanticRegion {
  label: string;
  rawLabel?: string;
  pixelCount: number;
  regionPercentage: number;
}

export interface VisionUnderstanding {
  sceneType: string;
  environment: string;
  weather: string;
  mainObjects: string[];
  backgroundElements: string[];
  activities?: string[];
  description: string;
  isFallback?: boolean;
}

export interface FusedSummary {
  sceneType: string;
  environment: string;
  weather: string;
  description: string;
  objectCount: number;
  distinctObjectClasses: string[];
  dominantRegions: string[];
  hasText: boolean;
  textSnippet?: string;
}

export interface ImageAnalysisTimings {
  qualityCheckMs: number;
  routingMs: number;
  objectDetectionMs: number;
  segmentationMs: number;
  ocrMs: number;
  visionMs: number;
  fusionMs: number;
  totalMs: number;
}

export interface PersonDetail {
  personId: number;
  bbox: number[];
  confidence: number;
  clothing: Array<{
    category: string;
    type: string;
    displayName: string;
    color: string;
    secondaryColor: string;
    confidence: number;
    bbox: number[];
  }>;
  head_accessories: any[];
  ear_accessories: any[];
  neck_accessories: any[];
  wrist_accessories: any[];
  hand_accessories: any[];
  carried_objects: any[];
  body_regions?: any[];
}

export interface SpatialRelationship {
  subject: string;
  relation: string;
  object: string;
  confidence: number;
  description: string;
  subjectBox?: number[];
  objectBox?: number[];
}

export interface ImageAnalysisRecord {
  id: string;
  imageId: string;
  imageUrl?: string;
  originalName?: string;
  source?: 'upload' | 'camera';
  capturedAt?: string;
  status: string;
  analysisMode?: 'auto' | 'fast' | 'balanced' | 'accurate' | 'everything';
  routingDecision?: {
    mode: string;
    runYolo: boolean;
    runSegFormer: boolean;
    runOcr: boolean;
    runVision: boolean;
    textLikelihoodScore: number;
    isDocumentOrReceipt: boolean;
    reason: string;
    processingTimeMs: number;
  };
  qualityAssessment?: {
    width: number;
    height: number;
    aspectRatio: number;
    orientation: string;
    blurScore: number;
    isBlurry: boolean;
    brightness: number;
    lightingCondition: string;
    warnings: string[];
    processingTimeMs: number;
  };
  timings?: ImageAnalysisTimings;
  modules: Record<string, string>;
  imageWidth: number;
  imageHeight: number;
  totalProcessingTimeMs: number;
  fusedResult: FusedSummary;
  objectDetection: {
    model: string;
    detections: DetectionItem[];
    objectCount: number;
    processingTimeMs: number;
  };
  segmentation: {
    model: string;
    regions: SemanticRegion[];
    processingTimeMs: number;
  };
  ocr: {
    fullText: string;
    lineCount: number;
    avgConfidence: number;
    processingTimeMs: number;
  };
  vision: VisionUnderstanding;
  people?: PersonDetail[];
  smallObjects?: any[];
  relationships?: SpatialRelationship[];
  colors?: any[];
  deepInventory?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}



