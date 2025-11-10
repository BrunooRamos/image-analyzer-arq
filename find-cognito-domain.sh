#!/bin/bash
# Script para encontrar el COGNITO_DOMAIN_PREFIX actual

echo "Buscando User Pool de img-analyzer..."
USER_POOL_ID=$(aws cognito-idp list-user-pools --max-results 20 --query "UserPools[?contains(Name, 'img-analyzer') && contains(Name, 'upool')].Id" --output text | head -n 1)

if [ -z "$USER_POOL_ID" ]; then
  echo "No se encontró el User Pool. Verifica que esté desplegado."
  exit 1
fi

echo "User Pool ID encontrado: $USER_POOL_ID"
echo ""
echo "Buscando dominio configurado..."

DOMAIN=$(aws cognito-idp describe-user-pool-domain --domain-name "$USER_POOL_ID" 2>/dev/null || \
  aws cognito-idp list-user-pool-domains --user-pool-id "$USER_POOL_ID" 2>/dev/null | grep -oP '"Domain":\s*"\K[^"]+' || \
  echo "")

if [ -z "$DOMAIN" ]; then
  # Intentar obtener desde describe-user-pool
  DOMAIN=$(aws cognito-idp describe-user-pool --user-pool-id "$USER_POOL_ID" --query "UserPool.Domain" --output text 2>/dev/null || echo "")
fi

if [ -n "$DOMAIN" ]; then
  echo "✅ COGNITO_DOMAIN_PREFIX encontrado: $DOMAIN"
  echo ""
  echo "Puedes usar:"
  echo "export COGNITO_DOMAIN_PREFIX=$DOMAIN"
else
  echo "⚠️  No se pudo obtener automáticamente."
  echo ""
  echo "Por favor, busca manualmente en AWS Console:"
  echo "1. Cognito → User Pools → img-analyzer-dev-upool"
  echo "2. App integration → Domain"
  echo "3. El valor mostrado ahí es tu COGNITO_DOMAIN_PREFIX"
fi

