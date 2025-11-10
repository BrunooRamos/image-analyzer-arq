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
        ? 'from-red-500 via-pink-500 to-rose-500' 
        : 'from-green-500 via-emerald-500 to-teal-500';
    }
    return 'from-blue-500 via-cyan-500 to-blue-400';
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
    <div className="mt-8">
      {/* Card principal con gradiente */}
      <div className={`bg-gradient-to-br ${getResultColor()} rounded-2xl shadow-2xl overflow-hidden transform transition-all duration-300 hover:scale-[1.01]`}>
        {/* Header con emoji grande */}
        <div className="bg-white/10 backdrop-blur-sm p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-6xl animate-bounce">{getResultEmoji()}</div>
              <div>
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">
                  {getResultText()}
                </h2>
                {normalizedStatus === 'completed' && (
                  <p className="text-white/90 text-sm mt-1">
                    Análisis completado
                  </p>
                )}
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-full px-4 py-2">
              <span className="text-white font-semibold text-sm">
                {normalizedStatus === 'completed' ? '✓ Listo' : '⏳ En proceso'}
              </span>
            </div>
          </div>
        </div>

        {/* Contenido principal */}
        <div className="bg-white p-8">
          {/* Imagen destacada */}
          {imagePreview && (
            <div className="mb-8 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white rounded-2xl p-4 shadow-xl">
                <img
                  src={imagePreview}
                  alt="Imagen analizada"
                  className="w-full h-auto rounded-xl shadow-lg max-h-96 object-contain mx-auto"
                />
              </div>
            </div>
          )}

          {/* Botón manual retry */}
          {(normalizedStatus === 'pending' || normalizedStatus === 'processing') && onManualRetry && showManualRetry && (
            <div className="mb-6">
              <button
                onClick={onManualRetry}
                disabled={manualRetryLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                {manualRetryLoading ? '⏳ Obteniendo...' : '🔄 Pedir Resultados'}
              </button>
            </div>
          )}

          {/* Resultados completos */}
          {normalizedStatus === 'completed' && (
            <div className="space-y-6">
              {/* Card de resultado principal */}
              <div className={`bg-gradient-to-r ${isAI ? 'from-red-50 to-pink-50' : 'from-green-50 to-emerald-50'} rounded-xl p-6 border-2 ${isAI ? 'border-red-200' : 'border-green-200'}`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{isAI ? '🤖' : '✨'}</span>
                    <div>
                      <h3 className="text-2xl font-bold text-gray-800">
                        {isAI ? 'Imagen Generada por IA' : 'Imagen Real'}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {isAI ? 'Esta imagen fue creada artificialmente' : 'Esta es una imagen auténtica'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barra de confianza */}
                {confidenceValue > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700">Nivel de Confianza</span>
                      <span className={`text-lg font-bold ${getConfidenceColor()}`}>
                        {(confidenceValue * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          isAI ? 'bg-gradient-to-r from-red-500 to-pink-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{ width: `${confidenceValue * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Explicación */}
              {results.explanation && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border-2 border-purple-200">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">💡</span>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-gray-800 mb-2">Explicación del Análisis</h4>
                      <p className="text-gray-700 leading-relaxed italic">
                        "{results.explanation}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Información adicional */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Provider */}
                {results.provider && (
                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🔬</span>
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Proveedor</span>
                    </div>
                    <p className="text-gray-800 font-medium">{results.provider}</p>
                  </div>
                )}

                {/* Analysis ID */}
                {results.analysis_id && (
                  <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🆔</span>
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">ID de Análisis</span>
                    </div>
                    <p className="text-gray-800 font-mono text-xs break-all">{results.analysis_id}</p>
                  </div>
                )}

                {/* Fecha de creación */}
                {results.created_at && (
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">📅</span>
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Creado</span>
                    </div>
                    <p className="text-gray-800 text-sm">{formatDate(results.created_at)}</p>
                  </div>
                )}

                {/* Fecha de actualización */}
                {results.updated_at && (
                  <div className="bg-gradient-to-br from-teal-50 to-green-50 rounded-xl p-4 border border-teal-200">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🕒</span>
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Actualizado</span>
                    </div>
                    <p className="text-gray-800 text-sm">{formatDate(results.updated_at)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spinner mientras procesa */}
          {(normalizedStatus === 'processing' || normalizedStatus === 'pending') && !showManualRetry && (
            <div className="text-center py-8">
              <div className="inline-block relative">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mb-4"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl">🔍</span>
                </div>
              </div>
              <p className="text-gray-700 font-medium text-lg">Analizando imagen...</p>
              <p className="text-gray-500 text-sm mt-2">Esto puede tomar unos momentos</p>
            </div>
          )}

          {/* Error */}
          {normalizedStatus === 'failed' && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <span className="text-4xl">⚠️</span>
                <div>
                  <h3 className="text-xl font-bold text-red-800 mb-2">Error en el Análisis</h3>
                  {results.message && (
                    <p className="text-red-700">{results.message}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Mensaje adicional */}
          {results.message && normalizedStatus !== 'failed' && normalizedStatus !== 'pending' && normalizedStatus !== 'processing' && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-blue-800 text-sm flex items-center gap-2">
                <span>ℹ️</span>
                {results.message}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
