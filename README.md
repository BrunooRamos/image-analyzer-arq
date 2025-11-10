# Proyecto: Análisis de Imágenes en AWS (Terraform)

Este repositorio contiene una solución serverless en cuatro partes usando AWS y Terraform:
- Parte 1 (storage): S3 para imágenes, DynamoDB para estados/resultados y Secrets Manager para credencial de OpenAI.
- Parte 2 (async): SQS con DLQ, Lambda `process-image` consumiendo la cola.
- Parte 3 (api): API Gateway HTTP API v2 con dos Lambdas (`upload-handler`, `get-results`) y autenticación Cognito (JWT Authorizer).
- Parte 4 (monitoring): Alarmas de CloudWatch (Lambda, SQS, API, DynamoDB), SNS opcional por email y Dashboard.

## Prerrequisitos
- AWS CLI configurado (`aws configure`) con permisos para crear los recursos usados.
- Terraform >= 1.5.7
- Rol IAM existente para Lambda (por ejemplo `LabRole` en AWS Academy) con las políticas necesarias para S3, DynamoDB, SQS, Lambda, CloudWatch y Secrets Manager.
- Un secreto existente en AWS Secrets Manager con el nombre por defecto `/img-analyzer/openai/api-key` que contenga la API key de OpenAI (o ajusta la variable `OPENAI_SECRET_NAME`).

## Variables de entorno (usadas por scripts)
Los scripts `deploy.sh` y `destroy.sh` admiten variables para personalizar el despliegue:
- `PROJECT_NAME` (default: `img-analyzer`)
- `ENV` (default: `dev`)
- `REGION` (default: `us-east-1`)
- `ROLE_NAME` (default: `LabRole`) — rol IAM ya existente
- `OPENAI_SECRET_NAME` (default: `/img-analyzer/openai/api-key`)
- `COGNITO_DOMAIN_PREFIX` (default: `img-analyzer-dev-tualias`) — debe ser único por región
- `ALARM_EMAIL` (opcional) — email que recibirá notificaciones SNS; requiere confirmación

Ejemplo rápido (zsh/bash):
```bash
export PROJECT_NAME=img-analyzer
export ENV=dev
export REGION=us-east-1
export ROLE_NAME=LabRole
export OPENAI_SECRET_NAME=/img-analyzer/openai/api-key
export COGNITO_DOMAIN_PREFIX=img-analyzer-dev-tualias
export ALARM_EMAIL="bramos2@correo.um.edu.uy" # opcional
```

## Despliegue
El orden ya está automatizado por `deploy.sh`.
```bash
./deploy.sh
```
El script ejecuta:
1) `part2_async`: crea SQS, Lambda `process-image` y mapea SQS->Lambda.
2) `part3_api`: crea API HTTP con rutas protegidas por JWT y dos Lambdas.
3) `part4_monitoring`: crea SNS (y suscripción si `ALARM_EMAIL` no está vacío), alarmas y dashboard.

Al finalizar, verás:
- `API endpoint`: URL base del API (por ejemplo `https://abc123.execute-api.us-east-1.amazonaws.com`)
- `API ID`: identificador de la HTTP API
- Dashboard: `CloudWatch → Dashboards → <PROJECT_NAME>-<ENV>-dashboard`

Notas:
- El bucket de imágenes y la tabla DynamoDB se nombran de forma derivada: `${PROJECT_NAME}-${ENV}-images-<ACCOUNT_ID>-<REGION>` y `${PROJECT_NAME}-${ENV}-image-analyses`.
- Asegúrate de que el secreto en Secrets Manager exista antes del despliegue.
- `COGNITO_DOMAIN_PREFIX` debe ser único en la región.

## Consumo del API (autenticación Cognito)
Outputs útiles en `part3_api`:
- `api_endpoint`
- `user_pool_id`
- `user_pool_client_id`
- `hosted_ui_authorize_url_code` y `hosted_ui_authorize_url_token`

Flujo simple:
1) Abre la URL de Hosted UI de authorize (output) para iniciar sesión/registro y obtener un `id_token`.
2) Envía requests con header `Authorization: Bearer <id_token>`.

Rutas:
- `POST /upload` — Body JSON: `{ "key": "uploads/archivo.jpg", "analysis_id": "opcional" }`. Encola trabajo en SQS y crea item PENDING en DynamoDB.
- `GET /results?analysis_id=...` — Devuelve el item desde DynamoDB.

## Destrucción
El orden ya está automatizado por `destroy.sh`.
```bash
./destroy.sh
```
Secuencia:
1) `part4_monitoring` (requiere `api_id`).
2) `part3_api`.
3) `part2_async`.

Si algo queda retenido (por ejemplo Log Groups), puedes limpiarlo manualmente en CloudWatch. El bucket S3 y la tabla DDB creados en la parte 1 no se destruyen por estos scripts; si tienes un módulo de storage separado, destrúyelo manualmente según corresponda.

## Estructura
- `part1_storage/`: S3, DynamoDB, Secrets Manager y CORS para S3.
- `part2_async/`: SQS + DLQ, Lambda `process-image`, ESM SQS->Lambda.
- `part3_api/`: API Gateway HTTP API, Lambdas `upload-handler` y `get-results`, Cognito (User Pool, App Client, Domain), Authorizer JWT y rutas.
- `part4_monitoring/`: SNS (alarmas), CloudWatch Alarms y Dashboard.
- `deploy.sh` / `destroy.sh`: orquestación de init/apply/destroy con variables derivadas.

## Configuración por defecto (ejemplos)
En `part2_async/terraform.tfvars` hay ejemplos de valores reales (ARNs/IDs) que puedes usar como referencia para formar los nombres y ARNs esperados por los módulos.

## Buenas prácticas y seguridad
- No confirmes `.tfstate` ni `.tfvars` con secretos; ya están ignorados en `.gitignore`.
- Confirma el email de `ALARM_EMAIL` si lo usas; de lo contrario no recibirás notificaciones.
- Considera restringir `allowed_cors_origin` en `part1_storage` y `part3_api` para tu dominio real.
- Revisa políticas del rol `LabRole` y complétalas si falta permiso para algún servicio involucrado.

## Solución de problemas
- Rol inexistente: ajusta `ROLE_NAME` o crea/usa uno con permisos adecuados.
- Secreto no encontrado: crea `/img-analyzer/openai/api-key` o ajusta `OPENAI_SECRET_NAME`.
- `COGNITO_DOMAIN_PREFIX` en conflicto: usa un valor único (ej. agrega tu alias).
- Alarma SNS sin correos: confirma el email de suscripción recibido por AWS.
