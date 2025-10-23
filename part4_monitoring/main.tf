terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws = { source = "hashicorp/aws", version = "~> 5.50" }
  }
}

provider "aws" { region = var.region }

############################
# Descubrir recursos por nombre
############################
locals {
  api_name          = "${var.project_name}-${var.environment}-api"
  stage_name        = "$default"

  fn_process_name   = "${var.project_name}-${var.environment}-process-image"
  fn_upload_name    = "${var.project_name}-${var.environment}-upload-handler"
  fn_get_name       = "${var.project_name}-${var.environment}-get-results"

  queue_main_name   = "${var.project_name}-${var.environment}-analysis-queue"
  queue_dlq_name    = "${var.project_name}-${var.environment}-analysis-dlq"

  ddb_table_name    = "${var.project_name}-${var.environment}-image-analyses"
}

data "aws_apigatewayv2_api" "http_api" {
  api_id = var.api_id
}

data "aws_lambda_function" "process_image" { function_name = local.fn_process_name }
data "aws_lambda_function" "upload_handler" { function_name = local.fn_upload_name }
data "aws_lambda_function" "get_results"    { function_name = local.fn_get_name }

data "aws_sqs_queue" "main" { name = local.queue_main_name }
data "aws_sqs_queue" "dlq"  { name = local.queue_dlq_name }

data "aws_dynamodb_table" "analysis" { name = local.ddb_table_name }

############################
# SNS para notificaciones
############################
resource "aws_sns_topic" "alarms" {
  name = "${var.project_name}-${var.environment}-alarms"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

############################
# Alarmas - Lambda process-image
############################
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "${local.fn_process_name}-Errors>0"
  alarm_description   = "Lambda errors > 0"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 5
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions          = { FunctionName = local.fn_process_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "lambda_throttles" {
  alarm_name          = "${local.fn_process_name}-Throttles>0"
  alarm_description   = "Lambda throttles > 0"
  namespace           = "AWS/Lambda"
  metric_name         = "Throttles"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions          = { FunctionName = local.fn_process_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

############################
# Alarmas - SQS cola principal
############################
resource "aws_cloudwatch_metric_alarm" "sqs_age" {
  alarm_name          = "${local.queue_main_name}-AgeOfOldest>${var.max_message_age_seconds}s"
  alarm_description   = "Age of oldest message too high"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateAgeOfOldestMessage"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = var.max_message_age_seconds
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { QueueName = local.queue_main_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "sqs_visible" {
  alarm_name          = "${local.queue_main_name}-Visible>${var.max_visible_messages}"
  alarm_description   = "Too many visible messages in queue"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = var.max_visible_messages
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { QueueName = local.queue_main_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

############################
# Alarmas - SQS DLQ
############################
resource "aws_cloudwatch_metric_alarm" "dlq_visible" {
  alarm_name          = "${local.queue_dlq_name}-DLQVisible>0"
  alarm_description   = "Messages present in DLQ"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  treat_missing_data  = "breaching"
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { QueueName = local.queue_dlq_name }
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

############################
# Alarmas - API Gateway HTTP API v2
############################
resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name          = "${local.api_name}-5XX>0"
  alarm_description   = "API returning 5XX errors"
  namespace           = "AWS/ApiGateway"
  metric_name         = "5XXError"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 1
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions          = { ApiId = data.aws_apigatewayv2_api.http_api.id, Stage = local.stage_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_latency_p90" {
  alarm_name          = "${local.api_name}-LatencyP90>${var.api_p90_latency_ms}ms"
  alarm_description   = "API latency p90 too high"
  namespace           = "AWS/ApiGateway"
  metric_name         = "Latency"
  extended_statistic  = "p90"
  period              = 60
  evaluation_periods  = 5
  threshold           = var.api_p90_latency_ms
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { ApiId = data.aws_apigatewayv2_api.http_api.id, Stage = local.stage_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

############################
# Alarmas - DynamoDB
############################
resource "aws_cloudwatch_metric_alarm" "ddb_read_throttle" {
  alarm_name          = "${local.ddb_table_name}-ReadThrottle>0"
  alarm_description   = "DynamoDB read throttles"
  namespace           = "AWS/DynamoDB"
  metric_name         = "ReadThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { TableName = local.ddb_table_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "ddb_write_throttle" {
  alarm_name          = "${local.ddb_table_name}-WriteThrottle>0"
  alarm_description   = "DynamoDB write throttles"
  namespace           = "AWS/DynamoDB"
  metric_name         = "WriteThrottleEvents"
  statistic           = "Sum"
  period              = 60
  evaluation_periods  = 1
  threshold           = 0
  comparison_operator = "GreaterThanThreshold"
  dimensions          = { TableName = local.ddb_table_name }
  treat_missing_data  = "notBreaching"
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

############################
# Dashboard
############################
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-${var.environment}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        "type":"text","x":0,"y":0,"width":24,"height":1,
        "properties":{"markdown":"# ${var.project_name}-${var.environment} — Overview"}
      },
      {
        "type":"metric","x":0,"y":1,"width":12,"height":6,
        "properties":{
          "title":"Lambda Errors/Throttles (process-image)",
          "metrics":[
            ["AWS/Lambda","Errors","FunctionName",local.fn_process_name,{"stat":"Sum"}],
            [".","Throttles",".", ".", {"stat":"Sum"}]
          ],
          "region":var.region,"view":"timeSeries","stacked":false
        }
      },
      {
        "type":"metric","x":12,"y":1,"width":12,"height":6,
        "properties":{
          "title":"SQS Queue Health",
          "metrics":[
            ["AWS/SQS","ApproximateNumberOfMessagesVisible","QueueName",local.queue_main_name,{"stat":"Maximum"}],
            [".","ApproximateAgeOfOldestMessage",".",".",{"stat":"Maximum"}]
          ],
          "region":var.region,"view":"timeSeries","stacked":false
        }
      },
      {
        "type":"metric","x":0,"y":7,"width":12,"height":6,
        "properties":{
          "title":"API 5XX & p90 Latency",
          "metrics":[
            ["AWS/ApiGateway","5XXError","ApiId",data.aws_apigatewayv2_api.http_api.id,"Stage",local.stage_name,{"stat":"Sum"}],
            [".","Latency",".",".",".",".",{"stat":"p90"}]
          ],
          "region":var.region,"view":"timeSeries","stacked":false
        }
      },
      {
        "type":"metric","x":12,"y":7,"width":12,"height":6,
        "properties":{
          "title":"DynamoDB Throttles",
          "metrics":[
            ["AWS/DynamoDB","ReadThrottleEvents","TableName",local.ddb_table_name,{"stat":"Sum"}],
            [".","WriteThrottleEvents",".",".",{"stat":"Sum"}]
          ],
          "region":var.region,"view":"timeSeries","stacked":false
        }
      }
    ]
  })
}

