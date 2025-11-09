# AI Image Detector - Frontend

Frontend para un sistema de detección de imágenes generadas por IA, desarrollado con React, TypeScript y AWS Amplify.

## Características

- ✅ Registro de usuarios con AWS Cognito User Pool
- ✅ Login de usuarios con AWS Cognito User Pool
- ✅ Subida de imágenes para análisis
- ✅ Visualización de resultados de detección (IA vs Real)
- ✅ Polling automático para obtener resultados

## Requisitos Previos

- Node.js 18+ y npm
- Cuenta de AWS con:
  - Cognito User Pool configurado
  - API Gateway con endpoints `/upload` y `/results`

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar variables de entorno:
```bash
cp .env.example .env
```

Editar `.env` con tus valores de AWS:
```env
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_GATEWAY_URL=https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
```

**Nota**: El archivo `.env` está en `.gitignore` y no se subirá al repositorio. Solo se incluye `.env.example` como plantilla.

## Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## Build para Producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`.

## Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── Login.tsx       # Componente de login
│   ├── Register.tsx    # Componente de registro
│   ├── VerifyCode.tsx  # Componente de verificación de código
│   ├── ImageUpload.tsx # Componente de subida de imágenes
│   ├── Results.tsx     # Componente de visualización de resultados
│   ├── Layout.tsx      # Layout principal con navegación
│   └── ProtectedRoute.tsx # Componente para proteger rutas
├── context/            # Context API
│   └── AuthContext.tsx # Context de autenticación
├── services/           # Servicios
│   ├── authService.ts  # Servicio de autenticación con Cognito
│   └── apiService.ts  # Servicio de llamadas a API Gateway
├── config/             # Configuración
│   ├── aws-config.ts  # Configuración de AWS Amplify
│   └── api-config.ts  # Configuración de API Gateway
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada
```

## API Endpoints Esperados

El frontend espera que el API Gateway tenga los siguientes endpoints:

### POST /upload
Sube una imagen para análisis.

**Request:**
- Content-Type: `application/json`
- Body: 
```json
{
  "file_b64": "string (base64)",
  "key": "string (opcional)"
}
```
- Headers: `Authorization: Bearer <token>`

**Response:**
```json
{
  "analysis_id": "string"
}
```

### GET /results
Obtiene los resultados del análisis.

**Request:**
- Query params: `analysis_id` (string)
- Headers: `Authorization: Bearer <token>`

**Response:**
```json
{
  "requestId": "string",
  "status": "pending" | "processing" | "completed" | "failed",
  "isAIGenerated": boolean | null,
  "confidence": number (opcional),
  "message": "string (opcional)"
}
```

## Autenticación

La autenticación se maneja directamente con AWS Cognito usando AWS Amplify. El token de acceso se incluye automáticamente en todas las llamadas al API Gateway.

## Tecnologías Utilizadas

- React 18
- TypeScript
- Vite
- AWS Amplify (Cognito)
- React Router
- Axios
- Tailwind CSS

## Rutas de la Aplicación

- `/login` - Página de inicio de sesión
- `/register` - Página de registro de nuevos usuarios
- `/verify` - Página de verificación de código (después del registro)
- `/upload` - Página principal para subir y analizar imágenes (requiere autenticación)
- `/` - Redirige a `/upload`

## Flujo de Trabajo

1. **Registro**: El usuario se registra con email, username y password
2. **Verificación**: El usuario recibe un código de verificación por email y lo ingresa
3. **Login**: El usuario inicia sesión con sus credenciales
4. **Subida de Imagen**: El usuario sube una imagen (máximo 10MB)
5. **Análisis**: El sistema analiza la imagen usando IA
6. **Resultados**: Se muestran los resultados indicando si la imagen es generada por IA o es real

## Notas

- El polling se realiza cada 2 segundos hasta que el estado sea `completed` o `failed`
- El timeout máximo de polling es de 60 segundos
- El tamaño máximo de imagen permitido es 10MB
- Solo se aceptan archivos de tipo imagen (PNG, JPG, GIF, etc.)
- Las variables de entorno se cargan desde el archivo `.env` (no incluido en el repositorio)

## Troubleshooting

### Error: "Cannot find namespace 'NodeJS'"
Este error puede ocurrir si falta la configuración de tipos de Node.js. Asegúrate de que el proyecto use tipos del navegador (`number` para `setInterval`/`setTimeout`).

### Error: "Invalid token" o problemas de autenticación
- Verifica que las variables de entorno `VITE_COGNITO_USER_POOL_ID` y `VITE_COGNITO_CLIENT_ID` estén correctamente configuradas
- Asegúrate de que el User Pool de Cognito esté configurado correctamente

### Error: "Failed to fetch" en las llamadas a la API
- Verifica que `VITE_API_GATEWAY_URL` esté correctamente configurada
- Asegúrate de que el API Gateway tenga CORS habilitado
- Verifica que el token de autenticación sea válido

## Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto es privado y está destinado para uso académico.




