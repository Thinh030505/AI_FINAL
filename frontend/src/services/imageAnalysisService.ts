import { apiClient } from './api';
import { ImageAnalysisRecord } from '../types';

export interface AnalyzeImageResponse {
  success: boolean;
  message: string;
  data: {
    analysis: ImageAnalysisRecord;
  };
}

export interface GetAnalysisHistoryResponse {
  success: boolean;
  data: {
    analyses: ImageAnalysisRecord[];
  };
}

export interface GetAnalysisByIdResponse {
  success: boolean;
  message: string;
  data: {
    analysis: ImageAnalysisRecord;
  };
}

export const imageAnalysisService = {
  async analyzeImage(
    imageId: string,
    mode: string = 'balanced',
    forceOcr: boolean = false,
  ): Promise<AnalyzeImageResponse> {
    const response = await apiClient.post<AnalyzeImageResponse>(
      '/image-analysis',
      { imageId, mode, forceOcr },
      { timeout: 180000 },
    );
    return response.data;
  },

  async getHistory(): Promise<GetAnalysisHistoryResponse> {
    const response = await apiClient.get<GetAnalysisHistoryResponse>(
      '/image-analysis',
    );
    return response.data;
  },

  async getById(id: string): Promise<GetAnalysisByIdResponse> {
    const response = await apiClient.get<GetAnalysisByIdResponse>(
      `/image-analysis/${id}`,
    );
    return response.data;
  },
};
