import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isAuthenticated, signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#071d32' }}>
      {isAuthenticated && (
        <nav className="bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link 
                  to="/upload" 
                  className="text-xl font-bold transition-colors"
                  style={{ color: '#071d32' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#154d82'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#071d32'}
                >
                  Image Analyzer claudio nos merecemos 12/12
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm" style={{ color: '#64748b' }}>{user?.username}</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
                  style={{ 
                    color: '#dc2626',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#fee2e2';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}
      <main>{children}</main>
    </div>
  );
}




