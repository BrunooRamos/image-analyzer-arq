import axios, { AxiosInstance } from 'axios';
import { getAccessToken } from './authService';
import { API_GATEWAY_URL } from '../config/api-config';

// Crear instancia de axios con configuración base
const apiClient: AxiosInstance = axios.create({
  baseURL: API_GATEWAY_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token de autenticación
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface UploadImageResponse {
  analysis_id: string;
}

export interface PollResultsResponse {
  requestId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  isAIGenerated: boolean | null;
  confidence?: number;
  message?: string;
}

/**
 * Convertir archivo a base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remover el prefijo data:image/...;base64,
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Subir imagen para análisis
 */
export async function uploadImage(imageFile: File): Promise<UploadImageResponse> {
  try {
    // Convertir imagen a base64
    const imageBase64 = await fileToBase64(imageFile);
    
    // Crear el body JSON según lo que espera el Lambda
    // El Lambda espera: file_b64 (o data_url), opcionalmente key y analysis_id
    const requestBody: {
      file_b64: string;
      key?: string;
      analysis_id?: string;
    } = {
      file_b64: imageBase64,
      // Generar key basado en el nombre del archivo y timestamp
      key: `uploads/${Date.now()}-${imageFile.name}`,
    };

    const token = await getAccessToken();
    const response = await axios.post(`${API_GATEWAY_URL}/upload`, JSON.stringify(requestBody), {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Error subiendo imagen:', error);
    throw new Error(error.response?.data?.error || error.response?.data?.message || 'Error al subir la imagen');
  }
}

/**
 * Polling para obtener resultados del análisis
 */
export async function pollResults(analysisId: string): Promise<PollResultsResponse> {
  try {
    const response = await apiClient.get(`/results`, {
      params: { analysis_id: analysisId },
    });

    // Normalizar status (el backend puede devolver en MAYÚSCULAS)
    const data = response.data;
    if (data && typeof data.status === 'string') {
      data.status = data.status.toLowerCase();
    }
    return data;
  } catch (error: any) {
    console.error('Error obteniendo resultados:', error);
    throw new Error(error.response?.data?.error || error.response?.data?.message || 'Error al obtener resultados');
  }
}

