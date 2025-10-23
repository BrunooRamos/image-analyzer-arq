#!/usr/bin/env bash
set -euo pipefail

# ========================
# CONFIGURACIÓN EDITABLE
# ========================
PROJECT_NAME="${PROJECT_NAME:-img-analyzer}"
ENV="${ENV:-dev}"
REGION="${REGION:-us-east-1}"
ROLE_NAME="${ROLE_NAME:-LabRole}"                 # Rol existente (no se crea en Academy)
OPENAI_SECRET_NAME="${OPENAI_SECRET_NAME:-/img-analyzer/openai/api-key}"

# Cognito (Paso 4)
COGNITO_DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:-img-analyzer-dev-tualias}"  # Único en la región
ALARM_EMAIL="${ALARM_EMAIL:-}"  # opcional (puede quedar vacío)

# ========================
# UTILIDADES / DERIVADOS
# ========================
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
export AWS_DEFAULT_REGION="${REGION}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "Falta comando: $1"; exit 1; }; }
need aws; need terraform; need sed

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_ARN="$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text 2>/dev/null || true)"
if [[ -z "${ROLE_ARN}" || "${ROLE_ARN}" == "None" ]]; then
  echo "No encontré el rol IAM '$ROLE_NAME'. Verificalo en IAM → Roles." ; exit 1
fi

IMAGES_BUCKET_NAME="${PROJECT_NAME}-${ENV}-images-${ACCOUNT_ID}-${REGION}"
ANALYSIS_TABLE_NAME="${PROJECT_NAME}-${ENV}-image-analyses"

SECRET_ARN="$(aws secretsmanager describe-secret --secret-id "$OPENAI_SECRET_NAME" --query 'ARN' --output text 2>/dev/null || true)"
if [[ -z "${SECRET_ARN}" || "${SECRET_ARN}" == "None" ]]; then
  echo "No encontré el secreto '${OPENAI_SECRET_NAME}'. Crealo o ajusta OPENAI_SECRET_NAME." ; exit 1
fi

echo "==> Deploy - Config:"
echo "Account:        ${ACCOUNT_ID}"
echo "Region:         ${REGION}"
echo "Role ARN:       ${ROLE_ARN}"
echo "Bucket images:  ${IMAGES_BUCKET_NAME}"
echo "DDB table:      ${ANALYSIS_TABLE_NAME}"
echo "Secret ARN:     ${SECRET_ARN}"
echo "Domain prefix:  ${COGNITO_DOMAIN_PREFIX}"
echo

# ========================
# PASO A: part2_async
# ========================
echo "==> Applying part2_async ..."
terraform -chdir="${BASE_DIR}/part2_async" init -upgrade -input=false
terraform -chdir="${BASE_DIR}/part2_async" apply -auto-approve \
  -var existing_lambda_role_arn="${ROLE_ARN}" \
  -var images_bucket_name="${IMAGES_BUCKET_NAME}" \
  -var analysis_table_name="${ANALYSIS_TABLE_NAME}" \
  -var openai_secret_arn="${SECRET_ARN}"

# Obtener URL de la cola (output de TF o lookup por nombre)
SQS_URL="$(terraform -chdir="${BASE_DIR}/part2_async" output -raw analysis_queue_url 2>/dev/null || true)"
if [[ -z "${SQS_URL}" || "${SQS_URL}" == "null" ]]; then
  QUEUE_NAME="${PROJECT_NAME}-${ENV}-analysis-queue"
  SQS_URL="$(aws sqs get-queue-url --queue-name "${QUEUE_NAME}" --query 'QueueUrl' --output text)"
fi
echo "SQS URL: ${SQS_URL}"
echo

# ========================
# PASO B: part3_api
# ========================
echo "==> Applying part3_api ..."
terraform -chdir="${BASE_DIR}/part3_api" init -upgrade -input=false
terraform -chdir="${BASE_DIR}/part3_api" apply -auto-approve \
  -var existing_lambda_role_arn="${ROLE_ARN}" \
  -var analysis_table_name="${ANALYSIS_TABLE_NAME}" \
  -var sqs_queue_url="${SQS_URL}" \
  -var images_bucket_name="${IMAGES_BUCKET_NAME}" \
  -var cognito_domain_prefix="${COGNITO_DOMAIN_PREFIX}"

API_ENDPOINT="$(terraform -chdir="${BASE_DIR}/part3_api" output -raw api_endpoint)"
# Derivar API_ID desde el endpoint (subdominio antes del primer punto)
API_ID="$(echo "${API_ENDPOINT}" | sed -E 's#https://([^.]+)\..*#\1#')"
echo "API endpoint: ${API_ENDPOINT}"
echo "API ID:       ${API_ID}"
echo

# ========================
# PASO C: part4_monitoring
# ========================
echo "==> Applying part4_monitoring ..."
terraform -chdir="${BASE_DIR}/part4_monitoring" init -upgrade -input=false
terraform -chdir="${BASE_DIR}/part4_monitoring" apply -auto-approve \
  -var api_id="${API_ID}" \
  -var alarm_email="${ALARM_EMAIL}"

echo
echo "=============================="
echo "✅ Deploy completo"
echo "API endpoint: ${API_ENDPOINT}"
echo "API ID:       ${API_ID}"
echo "Dashboard:    CloudWatch → Dashboards → ${PROJECT_NAME}-${ENV}-dashboard"
echo "Si suscribiste email a SNS, recordá confirmar el mail."

