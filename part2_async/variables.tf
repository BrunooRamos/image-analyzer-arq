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

# De Parte 1
variable "images_bucket_name" {
  type = string
}

variable "analysis_table_name" {
  type = string
}

variable "openai_secret_arn" {
  type = string
}

# Rol IAM YA EXISTENTE (ej. LabRole en AWS Academy)
variable "existing_lambda_role_arn" {
  type = string
}

variable "lambda_runtime" {
  type    = string
  default = "python3.11"
}

variable "lambda_timeout_sec" {
  type    = number
  default = 120
}

variable "lambda_memory_mb" {
  type    = number
  default = 512
}

variable "lambda_architecture" {
  type    = string
  default = "arm64"
}

variable "sqs_batch_size" {
  type    = number
  default = 10
}

variable "sqs_batch_window_sec" {
  type    = number
  default = 5
}

variable "max_concurrent_batches" {
  type    = number
  default = 5
}

