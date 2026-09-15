import { apiClient } from './api';
import { ImageRecord } from '../types';

export interface UploadImageResponse {
  success: boolean;
  message: string;
  data: {
    image: ImageRecord;
  };
}

export interface GetImagesResponse {
  success: boolean;
  data: {
    images: ImageRecord[];
  };
}

export interface GetImageByIdResponse {
  success: boolean;
  data: {
    image: ImageRecord;
  };
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
}

export const imageService = {
  async uploadImage(
    file: File,
    source?: 'upload' | 'camera',
    capturedAt?: string,
  ): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append('image', file);
    if (source) {
      formData.append('source', source);
    }
    if (capturedAt) {
      formData.append('capturedAt', capturedAt);
    }

    const response = await apiClient.post<UploadImageResponse>('/images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getImages(): Promise<GetImagesResponse> {
    const response = await apiClient.get<GetImagesResponse>('/images');
    return response.data;
  },

  async getImageById(id: string): Promise<GetImageByIdResponse> {
    const response = await apiClient.get<GetImageByIdResponse>(`/images/${id}`);
    return response.data;
  },

  async deleteImage(id: string): Promise<DeleteImageResponse> {
    const response = await apiClient.delete<DeleteImageResponse>(`/images/${id}`);
    return response.data;
  },
};
