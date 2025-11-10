#!/usr/bin/env bash
set -euo pipefail

# ========================
# CONFIGURACIÓN EDITABLE
# ========================
PROJECT_NAME="${PROJECT_NAME:-img-analyzer}"
ENV="${ENV:-dev}"
REGION="${REGION:-us-east-1}"
ROLE_NAME="${ROLE_NAME:-LabRole}"

COGNITO_DOMAIN_PREFIX="${COGNITO_DOMAIN_PREFIX:-img-analyzer-dev-tualias}"
ALARM_EMAIL="${ALARM_EMAIL:-}"   # opcional

OPENAI_SECRET_NAME="${OPENAI_SECRET_NAME:-/img-analyzer/openai/api-key}"

# Amplify (Paso 5) - para destroy
GITHUB_REPOSITORY_URL="${GITHUB_REPOSITORY_URL:-}"
GITHUB_ACCESS_TOKEN="${GITHUB_ACCESS_TOKEN:-}"
AMPLIFY_BRANCH="${AMPLIFY_BRANCH:-main}"

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
  echo "Aviso: no pude obtener ROLE_ARN de '$ROLE_NAME'. Si TF lo necesita en destroy, ajustá ROLE_NAME." 
fi

IMAGES_BUCKET_NAME="${PROJECT_NAME}-${ENV}-images-${ACCOUNT_ID}-${REGION}"
ANALYSIS_TABLE_NAME="${PROJECT_NAME}-${ENV}-image-analyses"

SECRET_ARN="$(aws secretsmanager describe-secret --secret-id "$OPENAI_SECRET_NAME" --query 'ARN' --output text 2>/dev/null || true)"

# === Obtener API_ID de forma robusta ===
get_api_id() {
  local id=""
  # A) Intentar desde el output de part3_api
  local ep
  ep=$(terraform -chdir="${BASE_DIR}/part3_api" output -raw api_endpoint 2>/dev/null || true)
  if [[ -n "${ep}" && "${ep}" != "null" ]]; then
    # Extraer subdominio antes de .execute-api...
    id="$(printf "%s" "$ep" | sed -E 's#https://([^.]+)\..*#\1#')"
  fi
  # B) Si falló (o quedó como \1), buscar por nombre del API
  if [[ -z "${id}" || "${id}" == "\1" ]]; then
    local name="${PROJECT_NAME}-${ENV}-api"
    id="$(aws apigatewayv2 get-apis --query "Items[?Name=='${name}'].ApiId" --output text 2>/dev/null || true)"
  fi
  printf "%s" "$id"
}

API_ID="$(get_api_id)"

echo "==> Destroy - Config:"
echo "Account:        ${ACCOUNT_ID}"
echo "Region:         ${REGION}"
echo "Role ARN:       ${ROLE_ARN:-N/A}"
echo "Bucket images:  ${IMAGES_BUCKET_NAME}"
echo "DDB table:      ${ANALYSIS_TABLE_NAME}"
echo "Secret ARN:     ${SECRET_ARN:-N/A}"
echo "API ID:         ${API_ID:-N/A}"
if [[ -n "${GITHUB_REPOSITORY_URL:-}" ]]; then
  echo "GitHub Repo:    ${GITHUB_REPOSITORY_URL}"
fi
echo

# ========================
# 0) part5_amplify (si existe y está desplegado)
# ========================
if [[ -d "${BASE_DIR}/part5_amplify" ]]; then
  # Verificar si hay un estado de Terraform (si fue desplegado)
  # Verificar si existe terraform.tfstate o si hay recursos en el estado
  HAS_STATE=false
  if [[ -f "${BASE_DIR}/part5_amplify/terraform.tfstate" ]] || \
     terraform -chdir="${BASE_DIR}/part5_amplify" state list >/dev/null 2>&1; then
    HAS_STATE=true
  fi
  
  if [[ "${HAS_STATE}" == "true" ]]; then
    echo "==> Destroy part5_amplify ..."
    terraform -chdir="${BASE_DIR}/part5_amplify" init -upgrade -input=false
    
    # Intentar obtener outputs de part3_api si existen
    API_ENDPOINT="$(terraform -chdir="${BASE_DIR}/part3_api" output -raw api_endpoint 2>/dev/null || echo "")"
    COGNITO_USER_POOL_ID="$(terraform -chdir="${BASE_DIR}/part3_api" output -raw user_pool_id 2>/dev/null || echo "")"
    COGNITO_CLIENT_ID="$(terraform -chdir="${BASE_DIR}/part3_api" output -raw user_pool_client_id 2>/dev/null || echo "")"
    
    # Usar variables de entorno si están disponibles, sino usar outputs, sino placeholders
    if [[ -n "${GITHUB_REPOSITORY_URL:-}" ]]; then
      REPO_URL="${GITHUB_REPOSITORY_URL}"
    else
      REPO_URL="https://github.com/placeholder/repo"
    fi
    
    if [[ -n "${GITHUB_ACCESS_TOKEN:-}" ]]; then
      TOKEN="${GITHUB_ACCESS_TOKEN}"
    else
      TOKEN="placeholder"
    fi
    
    # Si tenemos los outputs de part3_api, usarlos; si no, usar placeholders
    if [[ -n "${API_ENDPOINT:-}" && -n "${COGNITO_USER_POOL_ID:-}" && -n "${COGNITO_CLIENT_ID:-}" ]]; then
      terraform -chdir="${BASE_DIR}/part5_amplify" destroy -auto-approve \
        -var api_endpoint="${API_ENDPOINT}" \
        -var cognito_user_pool_id="${COGNITO_USER_POOL_ID}" \
        -var cognito_client_id="${COGNITO_CLIENT_ID}" \
        -var github_repository_url="${REPO_URL}" \
        -var github_access_token="${TOKEN}" \
        -var branch_name="${AMPLIFY_BRANCH}"
    else
      echo "Advertencia: No se pudieron obtener outputs de part3_api. Usando valores por defecto..."
      terraform -chdir="${BASE_DIR}/part5_amplify" destroy -auto-approve \
        -var api_endpoint="https://placeholder.execute-api.${REGION}.amazonaws.com" \
        -var cognito_user_pool_id="us-east-1_PLACEHOLDER" \
        -var cognito_client_id="PLACEHOLDER" \
        -var github_repository_url="${REPO_URL}" \
        -var github_access_token="${TOKEN}" \
        -var branch_name="${AMPLIFY_BRANCH}"
    fi
    echo
  else
    echo "==> Saltando part5_amplify (no hay recursos desplegados o no hay estado de Terraform)"
    echo
  fi
else
  echo "==> Saltando part5_amplify (directorio no existe)"
  echo
fi

# ========================
# 1) part4_monitoring
# ========================
if [[ -n "${API_ID:-}" && "${API_ID}" != "None" ]]; then
  echo "==> Destroy part4_monitoring ..."
  terraform -chdir="${BASE_DIR}/part4_monitoring" init -upgrade -input=false
  terraform -chdir="${BASE_DIR}/part4_monitoring" destroy -auto-approve \
    -var api_id="${API_ID}" \
    -var alarm_email="${ALARM_EMAIL}"
else
  echo "Saltando part4_monitoring (no se pudo determinar api_id)."
fi
echo

# ========================
# 2) part3_api
# ========================
echo "==> Destroy part3_api ..."
terraform -chdir="${BASE_DIR}/part3_api" init -upgrade -input=false
terraform -chdir="${BASE_DIR}/part3_api" destroy -auto-approve \
  -var existing_lambda_role_arn="${ROLE_ARN:-arn:aws:iam::000000000000:role/placeholder}" \
  -var analysis_table_name="${ANALYSIS_TABLE_NAME}" \
  -var sqs_queue_url="https://sqs.${REGION}.amazonaws.com/${ACCOUNT_ID}/${PROJECT_NAME}-${ENV}-analysis-queue" \
  -var images_bucket_name="${IMAGES_BUCKET_NAME}" \
  -var cognito_domain_prefix="${COGNITO_DOMAIN_PREFIX}"
echo

# ========================
# 3) part2_async
# ========================
echo "==> Destroy part2_async ..."
terraform -chdir="${BASE_DIR}/part2_async" init -upgrade -input=false
terraform -chdir="${BASE_DIR}/part2_async" destroy -auto-approve \
  -var existing_lambda_role_arn="${ROLE_ARN:-arn:aws:iam::000000000000:role/placeholder}" \
  -var images_bucket_name="${IMAGES_BUCKET_NAME}" \
  -var analysis_table_name="${ANALYSIS_TABLE_NAME}" \
  -var openai_secret_arn="${SECRET_ARN:-arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:placeholder}"

echo
echo "=============================="
echo "✅ Destroy completo"
echo "Si queda algo retenido (p.ej., Log Groups huérfanos), podés limpiarlo desde CloudWatch."

