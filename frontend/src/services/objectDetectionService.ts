import { apiClient } from './api';
import { ObjectDetectionRecord } from '../types';

export interface AnalyzeObjectsResponse {
  success: boolean;
  message: string;
  data: {
    objectDetection: ObjectDetectionRecord;
  };
}

export interface GetObjectDetectionHistoryResponse {
  success: boolean;
  data: {
    objectDetections: ObjectDetectionRecord[];
  };
}

export interface GetObjectDetectionByIdResponse {
  success: boolean;
  data: {
    objectDetection: ObjectDetectionRecord;
  };
}

export const objectDetectionService = {
  async analyzeObjects(imageId: string): Promise<AnalyzeObjectsResponse> {
    const response = await apiClient.post<AnalyzeObjectsResponse>(
      '/object-detection',
      { imageId },
      { timeout: 60000 },
    );
    return response.data;
  },

  async getHistory(): Promise<GetObjectDetectionHistoryResponse> {
    const response = await apiClient.get<GetObjectDetectionHistoryResponse>(
      '/object-detection',
    );
    return response.data;
  },

  async getById(id: string): Promise<GetObjectDetectionByIdResponse> {
    const response = await apiClient.get<GetObjectDetectionByIdResponse>(
      `/object-detection/${id}`,
    );
    return response.data;
  },
};
