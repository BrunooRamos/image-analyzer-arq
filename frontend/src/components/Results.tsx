import { PollResultsResponse } from '../services/apiService';

interface ResultsProps {
  results: PollResultsResponse;
  imagePreview?: string | null;
  onManualRetry?: () => void;
  manualRetryLoading?: boolean;
  showManualRetry?: boolean; // mostrar botón manual tras agotar intentos
}

export default function Results({ results, imagePreview, onManualRetry, manualRetryLoading, showManualRetry }: ResultsProps) {
  // Normalizar status (el backend puede devolver en MAYÚSCULAS)
  const normalizedStatus = (results.status as unknown as string)?.toString().toLowerCase() as
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed';
  // Debug: verificar valores
  console.log('Results component:', {
    status: normalizedStatus,
    hasOnManualRetry: !!onManualRetry,
    imagePreview: !!imagePreview,
    showManualRetry: !!showManualRetry
  });

  const getStatusColor = () => {
    switch (normalizedStatus) {
      case 'completed':
        return results.isAIGenerated ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700';
      case 'failed':
        return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      case 'processing':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  };

  const getStatusText = () => {
    switch (normalizedStatus) {
      case 'completed':
        return results.isAIGenerated ? 'Generada por IA' : 'Imagen Real';
      case 'failed':
        return 'Error en el análisis';
      case 'processing':
        return 'Procesando...';
      default:
        return 'Pendiente';
    }
  };

  const getConfidenceText = () => {
    if (results.confidence !== undefined) {
      return `${(results.confidence * 100).toFixed(1)}%`;
    }
    return 'N/A';
  };

  return (
    <div className="mt-8">
      <div className={`border-2 rounded-lg p-6 ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Resultados del Análisis</h2>
          <span className="px-3 py-1 bg-white rounded-full text-sm font-medium">
            {getStatusText()}
          </span>
        </div>

        {/* Mostrar imagen */}
        {imagePreview && (
          <div className="mb-6 flex justify-center">
            <img
              src={imagePreview}
              alt="Imagen analizada"
              className="max-h-64 max-w-full rounded-lg shadow-md"
            />
          </div>
        )}

        {/* Botón manual solo después de agotar intentos */}
        {(normalizedStatus === 'pending' || normalizedStatus === 'processing') && onManualRetry && showManualRetry && (
          <div className="mb-6">
            <button
              onClick={onManualRetry}
              disabled={manualRetryLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {manualRetryLoading ? 'Obteniendo...' : 'Pedir Resultados'}
            </button>
          </div>
        )}

        {results.status === 'completed' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-lg font-semibold mb-2">
                  Resultado: {results.isAIGenerated ? '🤖 Generada por IA' : '✅ Imagen Real'}
                </p>
                {results.confidence !== undefined && (
                  <p className="text-sm">
                    Confianza: <span className="font-bold">{getConfidenceText()}</span>
                  </p>
                )}
              </div>
              <div className={`text-4xl ${results.isAIGenerated ? 'text-red-600' : 'text-green-600'}`}>
                {results.isAIGenerated ? '🤖' : '✅'}
              </div>
            </div>
          </div>
        )}

        {/* Spinner solo mientras se realizan los intentos automáticos */}
        {(normalizedStatus === 'processing' || normalizedStatus === 'pending') && !showManualRetry && (
          <div className="text-center py-4">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current mb-2"></div>
            <p>Analizando imagen...</p>
          </div>
        )}

        {normalizedStatus === 'failed' && (
          <div>
            <p className="text-lg font-semibold mb-2">Error en el análisis</p>
            {results.message && <p className="text-sm">{results.message}</p>}
          </div>
        )}

        {results.message && normalizedStatus !== 'failed' && normalizedStatus !== 'pending' && normalizedStatus !== 'processing' && (
          <p className="mt-4 text-sm opacity-75">{results.message}</p>
        )}
      </div>
    </div>
  );
}

