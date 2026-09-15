import { apiClient } from './api';
import { OCRResultRecord } from '../types';

export interface ProcessOcrResponse {
  success: boolean;
  message: string;
  data: {
    ocrResult: OCRResultRecord;
  };
}

export interface GetOcrHistoryResponse {
  success: boolean;
  data: {
    ocrResults: OCRResultRecord[];
  };
}

export interface GetOcrByIdResponse {
  success: boolean;
  data: {
    ocrResult: OCRResultRecord;
  };
}

export const ocrService = {
  async processOcr(imageId: string): Promise<ProcessOcrResponse> {
    const response = await apiClient.post<ProcessOcrResponse>(
      '/ocr',
      { imageId },
      { timeout: 300000 },
    );
    return response.data;
  },

  async getOcrHistory(): Promise<GetOcrHistoryResponse> {
    const response = await apiClient.get<GetOcrHistoryResponse>('/ocr');
    return response.data;
  },

  async getOcrById(id: string): Promise<GetOcrByIdResponse> {
    const response = await apiClient.get<GetOcrByIdResponse>(`/ocr/${id}`);
    return response.data;
  },
};
