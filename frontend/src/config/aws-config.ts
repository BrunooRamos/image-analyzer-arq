import { Amplify } from 'aws-amplify';

// Configuración de AWS Amplify para Cognito
export const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      signUpVerificationMethod: 'code' as const,
      loginWith: {
        username: true,
      },
    },
  },
};

// Inicializar Amplify
Amplify.configure(awsConfig);

