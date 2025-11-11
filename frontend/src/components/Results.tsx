import { PollResultsResponse } from '../services/apiService';

interface ResultsProps {
  results: PollResultsResponse;
  imagePreview?: string | null;
  onManualRetry?: () => void;
  manualRetryLoading?: boolean;
  showManualRetry?: boolean;
}

export default function Results({ results, imagePreview, onManualRetry, manualRetryLoading, showManualRetry }: ResultsProps) {
  // Normalizar status
  const normalizedStatus = (results.status as unknown as string)?.toString().toLowerCase() as
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed';
  
  // Determinar si es AI o Real
  const isAI = results.isAIGenerated ?? (results.result === 'AI' || results.result?.toLowerCase() === 'ai');
  
  // Obtener confidence como número
  const confidenceValue = typeof results.confidence === 'string' 
    ? parseFloat(results.confidence) 
    : (results.confidence ?? 0);
  
  // Formatear fecha
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  // Emojis y colores según el resultado
  const getResultEmoji = () => {
    if (normalizedStatus === 'completed') {
      return isAI ? '🤖' : '✨';
    }
    return '⏳';
  };

  const getResultColor = () => {
    if (normalizedStatus === 'completed') {
      return isAI 
        ? '#dc2626' 
        : '#16a34a';
    }
    return '#154d82';
  };

  const getResultText = () => {
    if (normalizedStatus === 'completed') {
      return isAI ? 'Generada por IA' : 'Imagen Real';
    }
    if (normalizedStatus === 'processing') return 'Procesando...';
    if (normalizedStatus === 'failed') return 'Error';
    return 'Pendiente';
  };

  const getConfidenceColor = () => {
    if (confidenceValue >= 0.8) return 'text-red-600';
    if (confidenceValue >= 0.6) return 'text-orange-600';
    return 'text-yellow-600';
  };

  return (
    <div className="mt-4">
      {/* Layout de 2 columnas: Imagen a la izquierda, Resultados a la derecha */}
      <div className={`grid gap-6 ${imagePreview ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {/* Columna izquierda: Imagen */}
        {imagePreview && (
          <div className="flex items-center justify-center">
            <div className="w-full bg-white rounded-xl shadow-lg p-4" style={{ maxHeight: '600px' }}>
              <img
                src={imagePreview}
                alt="Imagen analizada"
                className="w-full h-full object-contain rounded-lg"
                style={{ maxHeight: '592px' }}
              />
            </div>
          </div>
        )}

        {/* Columna derecha: Resultados */}
        <div className="flex flex-col">
          {/* Header con estado */}
          <div 
            className="rounded-t-xl p-4 mb-4"
            style={{ backgroundColor: getResultColor() }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-4xl">{getResultEmoji()}</div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {getResultText()}
                  </h2>
                  {normalizedStatus === 'completed' && (
                    <p className="text-white/90 text-xs mt-1">
                      Análisis completado
                    </p>
                  )}
                </div>
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1">
                <span className="text-white font-semibold text-xs">
                  {normalizedStatus === 'completed' ? '✓ Listo' : '⏳ En proceso'}
                </span>
              </div>
            </div>
          </div>

          {/* Contenido de resultados */}
          <div className="bg-white rounded-b-xl shadow-lg p-6" style={{ maxHeight: '520px', overflowY: 'auto' }}>

            {/* Botón manual retry */}
            {(normalizedStatus === 'pending' || normalizedStatus === 'processing') && onManualRetry && showManualRetry && (
              <div className="mb-4">
                <button
                  onClick={onManualRetry}
                  disabled={manualRetryLoading}
                  className="w-full px-4 py-2 text-white rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                  style={{ 
                    backgroundColor: manualRetryLoading ? '#154d82' : '#071d32',
                  }}
                  onMouseEnter={(e) => !manualRetryLoading && (e.currentTarget.style.backgroundColor = '#154d82')}
                  onMouseLeave={(e) => !manualRetryLoading && (e.currentTarget.style.backgroundColor = '#071d32')}
                >
                  {manualRetryLoading ? '⏳ Obteniendo...' : '🔄 Pedir Resultados'}
                </button>
              </div>
            )}

            {/* Resultados completos */}
            {normalizedStatus === 'completed' && (
              <div className="space-y-4">
                {/* Card de resultado principal */}
                <div 
                  className="rounded-lg p-4 border-2"
                  style={{ 
                    backgroundColor: isAI ? '#fef2f2' : '#f0fdf4',
                    borderColor: isAI ? '#fecaca' : '#bbf7d0'
                  }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{isAI ? '🤖' : '✨'}</span>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">
                        {isAI ? 'Imagen Generada por IA' : 'Imagen Real'}
                      </h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {isAI ? 'Esta imagen fue creada artificialmente' : 'Esta es una imagen auténtica'}
                      </p>
                    </div>
                  </div>

                  {/* Barra de confianza */}
                  {confidenceValue > 0 && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-gray-700">Nivel de Confianza</span>
                        <span className={`text-base font-bold ${getConfidenceColor()}`}>
                          {(confidenceValue * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                        <div
                          style={{ 
                            width: `${confidenceValue * 100}%`,
                            backgroundColor: isAI ? '#dc2626' : '#16a34a'
                          }}
                          className="h-full rounded-full transition-all duration-1000"
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Explicación */}
                {results.explanation && (
                  <div 
                    className="rounded-lg p-4 border-2"
                    style={{ 
                      backgroundColor: '#f0f9ff',
                      borderColor: '#154d82'
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-2xl">💡</span>
                      <div className="flex-1">
                        <h4 className="text-base font-bold text-gray-800 mb-1">Explicación del Análisis</h4>
                        <p className="text-gray-700 text-sm leading-relaxed italic">
                          "{results.explanation}"
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Información adicional */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Provider */}
                  {results.provider && (
                    <div 
                      className="rounded-lg p-3 border"
                      style={{ 
                        backgroundColor: '#f0f9ff',
                        borderColor: '#154d82'
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xl">🔬</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Proveedor</span>
                      </div>
                      <p className="text-gray-800 font-medium text-xs">{results.provider}</p>
                    </div>
                  )}

                  {/* Analysis ID */}
                  {results.analysis_id && (
                    <div 
                      className="rounded-lg p-3 border"
                      style={{ 
                        backgroundColor: '#f8fafc',
                        borderColor: '#cbd5e1'
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xl">🆔</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">ID</span>
                      </div>
                      <p className="text-gray-800 font-mono text-xs break-all">{results.analysis_id}</p>
                    </div>
                  )}

                  {/* Fecha de creación */}
                  {results.created_at && (
                    <div 
                      className="rounded-lg p-3 border"
                      style={{ 
                        backgroundColor: '#fffbeb',
                        borderColor: '#fde68a'
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xl">📅</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Creado</span>
                      </div>
                      <p className="text-gray-800 text-xs">{formatDate(results.created_at)}</p>
                    </div>
                  )}

                  {/* Fecha de actualización */}
                  {results.updated_at && (
                    <div 
                      className="rounded-lg p-3 border"
                      style={{ 
                        backgroundColor: '#f0fdfa',
                        borderColor: '#99f6e4'
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-xl">🕒</span>
                        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Actualizado</span>
                      </div>
                      <p className="text-gray-800 text-xs">{formatDate(results.updated_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Spinner mientras procesa */}
            {(normalizedStatus === 'processing' || normalizedStatus === 'pending') && !showManualRetry && (
              <div className="text-center py-6">
                <div className="inline-block relative">
                  <div 
                    className="animate-spin rounded-full h-12 w-12 border-4 mb-3"
                    style={{ 
                      borderColor: '#154d8220',
                      borderTopColor: '#154d82'
                    }}
                  ></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl">🔍</span>
                  </div>
                </div>
                <p className="text-gray-700 font-medium">Analizando imagen...</p>
                <p className="text-gray-500 text-xs mt-1">Esto puede tomar unos momentos</p>
              </div>
            )}

            {/* Error */}
            {normalizedStatus === 'failed' && (
              <div 
                className="rounded-lg p-4 border-2"
                style={{ 
                  backgroundColor: '#fef2f2',
                  borderColor: '#fecaca'
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h3 className="text-lg font-bold text-red-800 mb-1">Error en el Análisis</h3>
                    {results.message && (
                      <p className="text-red-700 text-sm">{results.message}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Mensaje adicional */}
            {results.message && normalizedStatus !== 'failed' && normalizedStatus !== 'pending' && normalizedStatus !== 'processing' && (
              <div 
                className="mt-4 rounded-lg p-3 border"
                style={{ 
                  backgroundColor: '#f0f9ff',
                  borderColor: '#154d82'
                }}
              >
                <p className="text-sm flex items-center gap-2" style={{ color: '#154d82' }}>
                  <span>ℹ️</span>
                  {results.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
