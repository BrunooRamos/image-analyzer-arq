import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { confirmSignUpUser } from '../services/authService';

export default function VerifyCode() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Obtener el username de la navegación o del estado
  const username = location.state?.username || '';

  // Redirigir si no hay username al cargar la página
  useEffect(() => {
    if (!username) {
      navigate('/register', { replace: true });
    }
  }, [username, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!code || code.length !== 6) {
      setError('Por favor, ingresa el código de 6 dígitos');
      setLoading(false);
      return;
    }

    if (!username) {
      setError('Error: No se encontró el nombre de usuario. Por favor, regístrate nuevamente.');
      setLoading(false);
      setTimeout(() => {
        navigate('/register');
      }, 2000);
      return;
    }

    try {
      await confirmSignUpUser(username, code);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Error al verificar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setCode(value);
    setError('');
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Verificación Exitosa!</h2>
            <p className="text-gray-600 mb-4">
              Tu cuenta ha sido verificada correctamente. Redirigiendo al login...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verificar Email</h1>
          <p className="text-gray-600">
            Ingresa el código de verificación que enviamos a tu correo electrónico
          </p>
          {username && (
            <p className="text-sm text-gray-500 mt-2">Usuario: {username}</p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
              Código de Verificación
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={handleCodeChange}
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary focus:border-transparent text-center text-2xl font-mono tracking-widest"
              placeholder="000000"
              autoComplete="off"
            />
            <p className="mt-2 text-sm text-gray-500">
              Ingresa el código de 6 dígitos
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || code.length !== 6}
            className="w-full bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            ¿No recibiste el código?{' '}
            <button
              onClick={() => navigate('/register')}
              className="text-secondary hover:text-primary font-medium"
            >
              Volver al registro
            </button>
          </p>
          <p className="mt-4 text-sm text-gray-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="text-secondary hover:text-primary font-medium">
              Inicia sesión aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

