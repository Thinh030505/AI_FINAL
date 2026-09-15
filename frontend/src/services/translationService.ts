import { apiClient } from './api';

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

export interface TranslateResponse {
  success: boolean;
  message: string;
  data: {
    translation: TranslationRecord;
  };
}

export interface GetTranslationHistoryResponse {
  success: boolean;
  data: {
    translations: TranslationRecord[];
  };
}

export const translationService = {
  async translate(
    text: string,
    sourceLanguage: string = 'auto',
    targetLanguage: string = 'en',
  ): Promise<TranslateResponse> {
    const response = await apiClient.post<TranslateResponse>(
      '/translation',
      { text, sourceLanguage, targetLanguage },
      { timeout: 60000 },
    );
    return response.data;
  },

  async getTranslationHistory(): Promise<GetTranslationHistoryResponse> {
    const response = await apiClient.get<GetTranslationHistoryResponse>('/translation');
    return response.data;
  },
};
