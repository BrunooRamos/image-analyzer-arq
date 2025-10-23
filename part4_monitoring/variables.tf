variable "api_id" {
  description = "ID de la HTTP API v2 (ApiId)"
  type        = string
}

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

# Email opcional para recibir alertas (deberás confirmar el email)
variable "alarm_email" {
  type    = string
  default = ""
}

# Umbrales
variable "max_message_age_seconds" {
  type    = number
  default = 300
}

variable "max_visible_messages" {
  type    = number
  default = 10
}

variable "api_p90_latency_ms" {
  type    = number
  default = 2000
}

