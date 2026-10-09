import { apiClient } from './api';
import {
  SmartCameraAnalysisResponse,
  SmartCameraStatusResponse,
  CameraDetectionMode,
} from '../types/smartCamera';

export interface FrameAnalysisOptions {
  frameId?: number;
  mode?: CameraDetectionMode;
  confidenceThreshold?: number;
  enableOcr?: boolean;
  targetLang?: string;
  originalWidth?: number;
  originalHeight?: number;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export const smartCameraService = {
  async analyzeFrame(
    frameBlob: Blob,
    options: FrameAnalysisOptions = {},
  ): Promise<SmartCameraAnalysisResponse> {
    const formData = new FormData();
    formData.append('file', frameBlob, 'frame.jpg');
    if (options.frameId !== undefined) {
      formData.append('frameId', String(options.frameId));
    }
    if (options.mode) {
      formData.append('mode', options.mode);
    }
    if (options.confidenceThreshold !== undefined) {
      formData.append('confidenceThreshold', String(options.confidenceThreshold));
    }
    if (options.enableOcr !== undefined) {
      formData.append('enableOcr', String(options.enableOcr));
    }
    if (options.targetLang) {
      formData.append('targetLang', options.targetLang);
    }
    if (options.originalWidth !== undefined) {
      formData.append('originalWidth', String(options.originalWidth));
    }
    if (options.originalHeight !== undefined) {
      formData.append('originalHeight', String(options.originalHeight));
    }

    const response = await apiClient.post<{
      success: boolean;
      data: SmartCameraAnalysisResponse;
    }>('/smart-camera/analyze-frame', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: options.timeoutMs ?? 2500,
      signal: options.signal,
    });

    return response.data.data;
  },

  async resetTracker(): Promise<void> {
    try {
      await apiClient.post('/smart-camera/reset-tracker');
    } catch {
      // ignore reset tracker error
    }
  },

  async getStatus(): Promise<SmartCameraStatusResponse> {
    const response = await apiClient.get<{
      success: boolean;
      data: SmartCameraStatusResponse;
    }>('/smart-camera/status');
    return response.data.data;
  },
};
