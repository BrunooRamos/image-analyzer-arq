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

# Rol YA EXISTENTE (ej. LabRole)
variable "existing_lambda_role_arn" {
  type = string
}

# De pasos previos
variable "analysis_table_name" {
  type = string
}
variable "sqs_queue_url" {
  type = string
}
variable "images_bucket_name" {
  type = string
}

variable "lambda_runtime" {
  type    = string
  default = "python3.11"
}

variable "lambda_architecture" {
  type    = string
  default = "arm64"
}

variable "allowed_cors_origin" {
  type    = string
  default = "*"
}

# Cognito
variable "cognito_domain_prefix" {
  description = "Prefijo único para Hosted UI (ej: img-analyzer-dev-<tu-alias>)"
  type        = string
}

variable "cognito_callback_urls" {
  type        = list(string)
  # Para probar rápido, localhost y un placeholder https
  default     = ["http://localhost:3000/callback", "https://example.com/callback"]
}

variable "cognito_logout_urls" {
  type        = list(string)
  default     = ["http://localhost:3000/logout", "https://example.com/logout"]
}

variable "allowed_oauth_scopes" {
  type        = list(string)
  default     = ["openid", "email", "profile"]
}

