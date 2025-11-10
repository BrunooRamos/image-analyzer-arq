variable "region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "img-analyzer"
}

variable "environment" {
  type    = string
  default = "dev"
}

# GitHub Repository Configuration
variable "github_repository_url" {
  description = "URL completa del repositorio GitHub (ej: https://github.com/owner/repo)"
  type        = string
}

variable "github_access_token" {
  description = "Token de acceso de GitHub para conectar Amplify con el repositorio. REQUERIDO incluso para repos públicos cuando se usa Terraform. Para repos públicos, puedes crear un token con permisos mínimos (solo lectura pública)."
  type        = string
  sensitive   = true
}

variable "branch_name" {
  description = "Nombre del branch a desplegar (default: main)"
  type        = string
  default     = "main"
}

variable "app_root" {
  description = "Directorio raíz de la aplicación frontend en el monorepo (default: frontend). Este es el directorio donde está el frontend dentro del repositorio."
  type        = string
  default     = "frontend"
}

# Outputs de part3_api
variable "api_endpoint" {
  description = "URL del endpoint de API Gateway (output de part3_api)"
  type        = string
}

variable "cognito_user_pool_id" {
  description = "ID del User Pool de Cognito (output de part3_api)"
  type        = string
}

variable "cognito_client_id" {
  description = "ID del App Client de Cognito (output de part3_api)"
  type        = string
}

