import { apiClient } from './api';
import { HealthResponse } from '../types';

export const getBackendHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  } catch (error) {
    return {
      status: 'error',
      service: 'backend',
      database: 'disconnected',
      ai_service: 'disconnected',
    };
  }
};
