import { signUp, signIn, signOut, getCurrentUser, fetchAuthSession, confirmSignUp } from 'aws-amplify/auth';

export interface SignUpParams {
  username: string;
  password: string;
  email: string;
}

export interface SignInParams {
  username: string;
  password: string;
}

export interface AuthUser {
  userId: string;
  username: string;
}

/**
 * Registro de nuevo usuario en Cognito
 */
export async function signUpUser({ username, password, email }: SignUpParams): Promise<{ requiresVerification: boolean }> {
  try {
    const { isSignUpComplete, nextStep } = await signUp({
      username,
      password,
      options: {
        userAttributes: {
          email,
        },
        autoSignIn: {
          enabled: false, // Deshabilitar autoSignIn para requerir verificación
        },
      },
    });

    if (!isSignUpComplete) {
      // Si requiere verificación, retornar que requiere verificación
      if (nextStep.signUpStep === 'CONFIRM_SIGN_UP') {
        return { requiresVerification: true };
      }
      throw new Error('Error en el proceso de registro');
    }

    return { requiresVerification: false };
  } catch (error: any) {
    console.error('Error en signUp:', error);
    // Si el error indica que requiere verificación, retornar eso
    if (error.name === 'CodeMismatchException' || error.message?.includes('CONFIRM_SIGN_UP')) {
      return { requiresVerification: true };
    }
    throw new Error(error.message || 'Error al registrar usuario');
  }
}

/**
 * Login de usuario en Cognito
 */
export async function loginUser({ username, password }: SignInParams): Promise<AuthUser> {
  try {
    const { isSignedIn, nextStep } = await signIn({
      username,
      password,
    });

    if (!isSignedIn && nextStep.signInStep !== 'DONE') {
      throw new Error('Error al iniciar sesión');
    }

    // Esperar a que la sesión esté completamente establecida
    if (isSignedIn || nextStep.signInStep === 'DONE') {
      const user = await getCurrentUser();
      return {
        userId: user.userId,
        username: user.username,
      };
    }

    throw new Error('Error al iniciar sesión');
  } catch (error: any) {
    console.error('Error en signIn:', error);
    throw new Error(error.message || 'Error al iniciar sesión');
  }
}

/**
 * Cerrar sesión
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut();
  } catch (error) {
    console.error('Error en signOut:', error);
    throw error;
  }
}

/**
 * Obtener usuario actual
 */
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  try {
    const user = await getCurrentUser();
    return {
      userId: user.userId,
      username: user.username,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Confirmar registro con código de verificación
 */
export async function confirmSignUpUser(username: string, confirmationCode: string): Promise<void> {
  try {
    const { isSignUpComplete } = await confirmSignUp({
      username,
      confirmationCode,
    });

    if (!isSignUpComplete) {
      throw new Error('Error al confirmar el registro');
    }
  } catch (error: any) {
    console.error('Error en confirmSignUp:', error);
    throw new Error(error.message || 'Error al confirmar el código de verificación');
  }
}

/**
 * Obtener token de acceso para llamadas a API Gateway
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.accessToken?.toString() || null;
  } catch (error) {
    console.error('Error obteniendo token:', error);
    return null;
  }
}

