terraform {
  required_version = ">= 1.5.7"
  required_providers {
    aws     = { source = "hashicorp/aws",     version = "~> 5.50" }
    archive = { source = "hashicorp/archive", version = "~> 2.6" }
  }
}

provider "aws" { region = var.region }

########################################
# Lambdas (igual que Paso 3, no cambian)
########################################

# upload-handler
data "archive_file" "upload_zip" {
  type        = "zip"
  output_path = "${path.module}/upload-handler.zip"
  source {
    filename = "index.py"
    content  = <<-PY
      import json, os, uuid, datetime, base64
      import boto3
      ddb = boto3.client("dynamodb")
      sqs = boto3.client("sqs")
      TABLE = os.environ["DDB_TABLE_NAME"]
      QUEUE_URL = os.environ["SQS_QUEUE_URL"]
      BUCKET = os.environ["IMAGES_BUCKET_NAME"]

      def _resp(code, obj):
          return {"statusCode": code, "headers": {"content-type":"application/json"}, "body": json.dumps(obj)}

      def handler(event, context):
          try:
              body = event.get("body")
              if event.get("isBase64Encoded"):
                  body = base64.b64decode(body).decode("utf-8")
              body = json.loads(body or "{}")
              key = body.get("key", "uploads/placeholder.jpg")
              analysis_id = body.get("analysis_id") or str(uuid.uuid4())
              now = datetime.datetime.utcnow().isoformat() + "Z"

              ddb.put_item(
                  TableName=TABLE,
                  Item={
                      "analysis_id": {"S": analysis_id},
                      "status": {"S": "PENDING"},
                      "key": {"S": key},
                      "created_at": {"S": now}
                  }
              )

              msg = {"analysis_id": analysis_id, "key": key, "requested_at": now}
              sqs.send_message(QueueUrl=QUEUE_URL, MessageBody=json.dumps(msg))
              return _resp(202, {"analysis_id": analysis_id})
          except Exception as e:
              return _resp(500, {"error": str(e)})
    PY
  }
}

resource "aws_lambda_function" "upload_handler" {
  function_name = "${var.project_name}-${var.environment}-upload-handler"
  role          = var.existing_lambda_role_arn
  runtime       = var.lambda_runtime
  handler       = "index.handler"
  architectures = [var.lambda_architecture]
  timeout       = 30
  memory_size   = 256
  filename         = data.archive_file.upload_zip.output_path
  source_code_hash = data.archive_file.upload_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME       = var.project_name
      ENV                = var.environment
      DDB_TABLE_NAME     = var.analysis_table_name
      SQS_QUEUE_URL      = var.sqs_queue_url
      IMAGES_BUCKET_NAME = var.images_bucket_name
    }
  }
}

# get-results
data "archive_file" "get_zip" {
  type        = "zip"
  output_path = "${path.module}/get-results.zip"
  source {
    filename = "index.py"
    content  = <<-PY
      import json, os, boto3
      ddb = boto3.client("dynamodb")
      TABLE = os.environ["DDB_TABLE_NAME"]

      def _resp(code, obj):
          return {"statusCode": code, "headers": {"content-type":"application/json"}, "body": json.dumps(obj)}

      def handler(event, context):
          qs = event.get("queryStringParameters") or {}
          analysis_id = (qs.get("analysis_id") if isinstance(qs, dict) else None) or ""
          if not analysis_id:
              return _resp(400, {"error": "analysis_id is required"})
          item = ddb.get_item(TableName=TABLE, Key={"analysis_id":{"S":analysis_id}}).get("Item")
          if not item:
              return _resp(404, {"error": "not found"})
          def de(x): return {k: list(v.values())[0] for k,v in x.items()}
          return _resp(200, de(item))
    PY
  }
}

resource "aws_lambda_function" "get_results" {
  function_name = "${var.project_name}-${var.environment}-get-results"
  role          = var.existing_lambda_role_arn
  runtime       = var.lambda_runtime
  handler       = "index.handler"
  architectures = [var.lambda_architecture]
  timeout       = 15
  memory_size   = 256
  filename         = data.archive_file.get_zip.output_path
  source_code_hash = data.archive_file.get_zip.output_base64sha256

  environment {
    variables = {
      PROJECT_NAME   = var.project_name
      ENV            = var.environment
      DDB_TABLE_NAME = var.analysis_table_name
    }
  }
}

########################################
# API Gateway HTTP API v2 (igual + cambios)
########################################

resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-${var.environment}-api"
  protocol_type = "HTTP"
  cors_configuration {
    allow_headers = ["*"]
    allow_methods = ["GET","POST","OPTIONS"]
    allow_origins = [var.allowed_cors_origin]
  }
}

resource "aws_apigatewayv2_integration" "upload_integ" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.upload_handler.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "get_integ" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.get_results.invoke_arn
  payload_format_version = "2.0"
}

########################################
# COGNITO USER POOL + APP CLIENT + DOMAIN
########################################

resource "aws_cognito_user_pool" "this" {
  name = "${var.project_name}-${var.environment}-upool"

  alias_attributes          = ["email"]
  auto_verified_attributes  = ["email"]
  mfa_configuration         = "OFF"

  password_policy {
    minimum_length    = 8
    require_lowercase = true
    require_numbers   = true
    require_symbols   = false
    require_uppercase = true
  }
}

resource "aws_cognito_user_pool_client" "this" {
  name                                 = "${var.project_name}-${var.environment}-appclient"
  user_pool_id                         = aws_cognito_user_pool.this.id
  generate_secret                      = false    # público (PKCE)
  prevent_user_existence_errors        = "ENABLED"
  enable_token_revocation              = true
  supported_identity_providers         = ["COGNITO"]

  allowed_oauth_flows_user_pool_client = true
  # Permitimos code (PKCE) y también implicit para prueba rápida del id_token
  allowed_oauth_flows                  = ["code", "implicit"]
  allowed_oauth_scopes                 = var.allowed_oauth_scopes

  callback_urls                        = var.cognito_callback_urls
  logout_urls                          = var.cognito_logout_urls

  explicit_auth_flows = [
    "ALLOW_REFRESH_TOKEN_AUTH",
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_USER_PASSWORD_AUTH"
  ]
}

resource "aws_cognito_user_pool_domain" "this" {
  domain       = var.cognito_domain_prefix
  user_pool_id = aws_cognito_user_pool.this.id
}

########################################
# JWT Authorizer (HTTP API) con Cognito
########################################

# Issuer: https://cognito-idp.<region>.amazonaws.com/<userPoolId>
locals {
  cognito_issuer = "https://cognito-idp.${var.region}.amazonaws.com/${aws_cognito_user_pool.this.id}"
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.http_api.id
  authorizer_type  = "JWT"
  name             = "${var.project_name}-${var.environment}-cognito-authorizer"
  identity_sources = ["$request.header.Authorization"]

  jwt_configuration {
    audience = [aws_cognito_user_pool_client.this.id]
    issuer   = local.cognito_issuer
  }
}

########################################
# Rutas protegidas con JWT
########################################

resource "aws_apigatewayv2_route" "upload" {
  api_id               = aws_apigatewayv2_api.http_api.id
  route_key            = "POST /upload"
  target               = "integrations/${aws_apigatewayv2_integration.upload_integ.id}"
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.jwt.id
  authorization_scopes = ["openid"] # el token debe tener este scope
}

resource "aws_apigatewayv2_route" "results" {
  api_id               = aws_apigatewayv2_api.http_api.id
  route_key            = "GET /results"
  target               = "integrations/${aws_apigatewayv2_integration.get_integ.id}"
  authorization_type   = "JWT"
  authorizer_id        = aws_apigatewayv2_authorizer.jwt.id
  authorization_scopes = ["openid"]
}

# Stage por defecto (auto-deploy)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
}

# Permiso para que API Gateway invoque Lambdas
resource "aws_lambda_permission" "apigw_upload" {
  statement_id  = "AllowAPIGwInvokeUpload"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.upload_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_get" {
  statement_id  = "AllowAPIGwInvokeGet"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.get_results.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

