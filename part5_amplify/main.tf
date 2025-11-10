terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.50" }
  }
}

provider "aws" { region = var.region }

########################################
# AWS Amplify App
########################################

resource "aws_amplify_app" "this" {
  name       = "${var.project_name}-${var.environment}-amplify"
  repository = var.github_repository_url

  # Configuración del repositorio GitHub
  access_token = var.github_access_token

  # Configuración de build
  # Amplify detectará automáticamente el amplify.yml en la raíz del repo
  # Si no está presente, usar este build_spec inline como respaldo:
  build_spec = <<-BUILDSPEC
version: 1
applications:
  - appRoot: ${var.app_root}
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
BUILDSPEC

  # Configuración de redirecciones para SPA (React Router)
  custom_rule {
    source = "/<*>"
    target = "/index.html"
    status = "200"
  }

  # Variables de entorno a nivel de app (compartidas)
  environment_variables = {
    AMPLIFY_DIFF_DEPLOY     = "false"
    AMPLIFY_MONOREPO_APP_ROOT = var.app_root
  }

  tags = {
    Project     = var.project_name
    Environment = var.environment
  }
}

########################################
# AWS Amplify Branch (main)
########################################

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.this.id
  branch_name = var.branch_name

  # Despliegue automático en cada push
  enable_auto_build = true

  # Pull request previews
  enable_pull_request_preview = true

  # Variables de entorno específicas del branch
  environment_variables = {
    VITE_API_GATEWAY_URL     = var.api_endpoint
    VITE_COGNITO_CLIENT_ID   = var.cognito_client_id
    VITE_COGNITO_USER_POOL_ID = var.cognito_user_pool_id
  }

  # Framework y build settings
  framework = "React"
  
  tags = {
    Project     = var.project_name
    Environment = var.environment
    Branch      = var.branch_name
  }
}

########################################
# AWS Amplify Domain (opcional - puede configurarse después)
########################################

# Nota: El dominio personalizado se puede agregar después desde la consola
# o mediante aws_amplify_domain_association si se necesita

