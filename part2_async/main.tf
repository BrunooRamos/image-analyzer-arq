terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws     = { source = "hashicorp/aws", version = "~> 5.50" }
    archive = { source = "hashicorp/archive", version = "~> 2.5" }
  }
}

provider "aws" {
  region = var.region
}

# ------------------- SQS -------------------
resource "aws_sqs_queue" "dlq" {
  name                      = "${var.project_name}-${var.environment}-analysis-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true
}

resource "aws_sqs_queue" "analysis" {
  name                       = "${var.project_name}-${var.environment}-analysis-queue"
  visibility_timeout_seconds = var.lambda_timeout_sec
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 10
  sqs_managed_sse_enabled    = true

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq.arn
    maxReceiveCount     = 5
  })
}

# ------------------- Código Lambda (stub ZIP generado) -------------------
data "archive_file" "lambda_zip" {
  type        = "zip"
  output_path = "${path.module}/process-image.zip"

  source {
    filename = "index.py"
    content  = <<-PY
      import json, os
      def handler(event, context):
          print("Records:", json.dumps(event)[:2000])
          # Respuesta para Partial Batch Failure (ninguna falla)
          return {"batchItemFailures": []}
    PY
  }
}

# ------------------- Lambda -------------------
resource "aws_lambda_function" "process_image" {
  function_name = "${var.project_name}-${var.environment}-process-image"
  role          = var.existing_lambda_role_arn
  runtime       = var.lambda_runtime
  handler       = "index.handler"
  architectures = [var.lambda_architecture]
  timeout       = var.lambda_timeout_sec
  memory_size   = var.lambda_memory_mb

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME       = var.project_name
      ENV                = var.environment
      IMAGES_BUCKET_NAME = var.images_bucket_name
      DDB_TABLE_NAME     = var.analysis_table_name
      OPENAI_SECRET_ARN  = var.openai_secret_arn
      OPENAI_BASE_URL    = "https://api.openai.com/v1"
    }
  }
}

# (Opcional) Log group con retención controlada
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${aws_lambda_function.process_image.function_name}"
  retention_in_days = 14
}

# ------------------- Event Source Mapping SQS -> Lambda -------------------
resource "aws_lambda_event_source_mapping" "sqs_to_lambda" {
  event_source_arn                   = aws_sqs_queue.analysis.arn
  function_name                      = aws_lambda_function.process_image.arn
  enabled                            = true
  batch_size                         = var.sqs_batch_size
  maximum_batching_window_in_seconds = var.sqs_batch_window_sec
  function_response_types            = ["ReportBatchItemFailures"]

  scaling_config {
    maximum_concurrency = var.max_concurrent_batches
  }
}

