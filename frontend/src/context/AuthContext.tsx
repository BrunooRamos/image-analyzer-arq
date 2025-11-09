import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthUser, getCurrentAuthUser, loginUser, logoutUser, signUpUser, SignInParams, SignUpParams } from '../services/authService';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (params: SignUpParams) => Promise<{ requiresVerification: boolean }>;
  signIn: (params: SignInParams) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const currentUser = await getCurrentAuthUser();
      setUser(currentUser);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function signUp(params: SignUpParams) {
    const result = await signUpUser(params);
    // Si no requiere verificación, verificar sesión
    if (!result.requiresVerification) {
      await checkAuth();
    }
    return result;
  }

  async function signIn(params: SignInParams) {
    const authUser = await loginUser(params);
    setUser(authUser);
  }

  async function signOut() {
    await logoutUser();
    setUser(null);
  }

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}

