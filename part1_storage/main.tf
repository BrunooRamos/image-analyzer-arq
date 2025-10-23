terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.50" }
  }
}

provider "aws" {
  region = var.region
}

data "aws_caller_identity" "me" {}
data "aws_region" "me" {}

# ------------------ S3 ------------------
resource "aws_s3_bucket" "images" {
  bucket = "${var.project_name}-${var.environment}-images-${data.aws_caller_identity.me.account_id}-${data.aws_region.me.name}"
  tags = {
    project = var.project_name
    env     = var.environment
  }
}

resource "aws_s3_bucket_versioning" "images" {
  bucket = aws_s3_bucket.images.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "images" {
  bucket                  = aws_s3_bucket.images.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "images" {
  bucket = aws_s3_bucket.images.id
  cors_rule {
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = [var.allowed_cors_origin]
    allowed_headers = ["*"]
    max_age_seconds = 300
  }
}

# Enforce TLS
resource "aws_s3_bucket_policy" "tls_only" {
  bucket = aws_s3_bucket.images.id
  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Sid       = "EnforceTLS",
      Effect    = "Deny",
      Principal = "*",
      Action    = "s3:*",
      Resource = [
        aws_s3_bucket.images.arn,
        "${aws_s3_bucket.images.arn}/*"
      ],
      Condition = {
        Bool = { "aws:SecureTransport" = false }
      }
    }]
  })
}

# ------------------ DynamoDB ------------------
resource "aws_dynamodb_table" "analysis" {
  name         = "${var.project_name}-${var.environment}-image-analyses"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "analysis_id"

  attribute {
    name = "analysis_id"
    type = "S"
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    project = var.project_name
    env     = var.environment
  }
}

# ------------------ Secrets Manager ------------------
resource "aws_secretsmanager_secret" "openai" {
  name        = var.openai_secret_name
  description = "OpenAI API Key para process-image Lambda."
  tags = {
    project = var.project_name
    env     = var.environment
  }
}

# (Opcional) Semilla de valor; puedes comentarlo si no quieres setearlo ahora
resource "aws_secretsmanager_secret_version" "openai" {
  secret_id     = aws_secretsmanager_secret.openai.id
  secret_string = jsonencode({ provider = "openai", api_key = "REEMPLAZA_ESTE_VALOR" })
}

