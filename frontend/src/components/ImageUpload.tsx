import { useState, useRef, useEffect } from 'react';
import { uploadImage, pollResults, PollResultsResponse } from '../services/apiService';
import Results from './Results';

export default function ImageUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [results, setResults] = useState<PollResultsResponse | null>(null);
  const [maxAttemptsReached, setMaxAttemptsReached] = useState(false);
  const [manualRetry, setManualRetry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        setError('Por favor, selecciona un archivo de imagen válido');
        return;
      }

      // Validar tamaño (ej: máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('La imagen no debe superar los 10MB');
        return;
      }

      setSelectedFile(file);
      setError('');
      setResults(null);
      setRequestId(null);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Por favor, selecciona una imagen');
      return;
    }

    setUploading(true);
    setError('');
    setResults(null);

    try {
      const response = await uploadImage(selectedFile);
      // El Lambda retorna analysis_id, no requestId
      setRequestId(response.analysis_id);
      
      // Resetear contadores de polling
      setMaxAttemptsReached(false);
      setManualRetry(false);
      
      // Iniciar polling con el analysis_id
      startPolling(response.analysis_id);
    } catch (err: any) {
      setError(err.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const performPoll = async (id: string): Promise<{ success: boolean; completed: boolean }> => {
    try {
      const pollResponse = await pollResults(id);
      setResults(pollResponse);

      // Si el resultado está completo o falló, detener polling
      if (pollResponse.status === 'completed' || pollResponse.status === 'failed') {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setMaxAttemptsReached(false);
        return { success: true, completed: true };
      }
      // Éxito pero aún procesando
      return { success: true, completed: false };
    } catch (err: any) {
      console.error('Error en polling:', err);
      return { success: false, completed: false };
    }
  };

  const startPolling = (id: string) => {
    // Limpiar cualquier polling anterior
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setMaxAttemptsReached(false);
    
    let pendingAttempts = 0; // Contador de intentos con estado pending/processing
    const MAX_ATTEMPTS = 3;
    
    pollIntervalRef.current = setInterval(async () => {
      const result = await performPoll(id);
      
      if (result.completed) {
        // Resultado completo, detener polling (ya se limpia en performPoll)
        return;
      }

      // Si no está completado, incrementar contador (tanto si hay error como si está pending)
      if (!result.completed) {
        pendingAttempts++;

        if (pendingAttempts >= MAX_ATTEMPTS) {
          // Limpiar intervalos después de 3 intentos
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          setMaxAttemptsReached(true);
          if (!result.success) {
            setError('No se pudieron obtener los resultados después de 3 intentos.');
          } else {
            setError('Los resultados aún están procesándose. Puedes intentar obtenerlos manualmente más tarde.');
          }
        }
      }
    }, 2000); // Poll cada 2 segundos

    // Timeout de seguridad (ej: 60 segundos)
    timeoutRef.current = setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setMaxAttemptsReached(true);
      setError('Tiempo de espera agotado. Por favor, intenta obtener los resultados manualmente más tarde.');
    }, 60000);
  };

  const handleManualRetry = async () => {
    if (!requestId) return;
    
    setManualRetry(true);
    setError('');
    
    const result = await performPoll(requestId);
    
    if (result.completed) {
      // Resultado obtenido exitosamente
      setMaxAttemptsReached(false);
      setManualRetry(false);
    } else if (result.success) {
      // Éxito pero aún procesando (pending/processing)
      setError('Los resultados aún están procesándose. Puedes intentar de nuevo haciendo click en el botón.');
      setManualRetry(false);
      // No resetear maxAttemptsReached para que el botón siga visible
    } else {
      // Error al obtener resultados
      setError('Error al obtener resultados. Por favor, intenta de nuevo.');
      setManualRetry(false);
    }
  };

  // Limpiar intervalos al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleReset = () => {
    // Limpiar intervalos
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setSelectedFile(null);
    setPreview(null);
    setRequestId(null);
    setResults(null);
    setError('');
    setUploading(false);
    setMaxAttemptsReached(false);
    setManualRetry(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Detección de Imágenes AI
          </h1>

          {error && (
            <div className={`mb-6 p-4 rounded-lg ${
              error.includes('procesándose') || error.includes('procesando') 
                ? 'bg-blue-100 border border-blue-400 text-blue-700' 
                : 'bg-red-100 border border-red-400 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* PRIMERA PANTALLA: Subida de imagen - Solo se muestra cuando NO hay requestId */}
          {!requestId && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {preview ? (
                    <div className="mb-4">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-64 max-w-full rounded-lg shadow-md"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        stroke="currentColor"
                        fill="none"
                        viewBox="0 0 48 48"
                      >
                        <path
                          d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  )}
                  <span className="text-indigo-600 font-medium">
                    {preview ? 'Cambiar imagen' : 'Selecciona una imagen'}
                  </span>
                  <span className="text-sm text-gray-500 mt-2">
                    PNG, JPG, GIF hasta 10MB
                  </span>
                </label>
              </div>

              {selectedFile && (
                <div className="flex justify-center gap-4">
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {uploading ? 'Subiendo...' : 'Analizar Imagen'}
                  </button>
                  {!uploading && (
                    <button
                      onClick={handleReset}
                      className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* SEGUNDA PANTALLA: Resultados - Se muestra cuando hay requestId (subida exitosa) */}
          {requestId && (
            <>
              {results ? (
                <Results 
                  results={results} 
                  imagePreview={preview}
                  onManualRetry={handleManualRetry}
                  manualRetryLoading={manualRetry}
                  showManualRetry={maxAttemptsReached}
                />
              ) : (
                <Results 
                  results={{ 
                    requestId: requestId,
                    status: 'pending',
                    isAIGenerated: null 
                  } as PollResultsResponse} 
                  imagePreview={preview}
                  onManualRetry={handleManualRetry}
                  manualRetryLoading={manualRetry}
                  showManualRetry={maxAttemptsReached}
                />
              )}
              <div className="mt-4 flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Analizar Otra Imagen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

