import { apiClient } from './api';
import { VisualIntelligenceRecord } from '../types';

export interface AnalyzeVisualIntelligenceResponse {
  success: boolean;
  message: string;
  data: {
    visualIntelligence: VisualIntelligenceRecord;
  };
}

export interface GetVisualIntelligenceHistoryResponse {
  success: boolean;
  data: {
    visualIntelligences: VisualIntelligenceRecord[];
  };
}

export interface GetVisualIntelligenceByIdResponse {
  success: boolean;
  data: {
    visualIntelligence: VisualIntelligenceRecord;
  };
}

export const visualIntelligenceService = {
  async analyzeImage(
    imageId: string,
    confidenceThreshold?: number,
  ): Promise<AnalyzeVisualIntelligenceResponse> {
    const response = await apiClient.post<AnalyzeVisualIntelligenceResponse>(
      '/visual-intelligence/analyze',
      { imageId, confidenceThreshold },
      { timeout: 95000 },
    );
    return response.data;
  },

  async getHistory(): Promise<GetVisualIntelligenceHistoryResponse> {
    const response = await apiClient.get<GetVisualIntelligenceHistoryResponse>(
      '/visual-intelligence/history',
    );
    return response.data;
  },

  async getById(id: string): Promise<GetVisualIntelligenceByIdResponse> {
    const response = await apiClient.get<GetVisualIntelligenceByIdResponse>(
      `/visual-intelligence/${id}`,
    );
    return response.data;
  },
};
