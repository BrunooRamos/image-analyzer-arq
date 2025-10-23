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

variable "allowed_cors_origin" {
  type    = string
  default = "*"
}

variable "openai_secret_name" {
  type    = string
  default = "/img-analyzer/openai/api-key"
}

