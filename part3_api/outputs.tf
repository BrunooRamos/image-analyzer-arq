output "api_endpoint" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "routes" {
  value = {
    upload  = "POST /upload  (JWT required)"
    results = "GET  /results (JWT required)"
  }
}

output "user_pool_id" {
  value = aws_cognito_user_pool.this.id
}

output "user_pool_client_id" {
  value = aws_cognito_user_pool_client.this.id
}

# URLs útiles para Hosted UI
output "hosted_ui_authorize_url_code" {
  value = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${var.region}.amazoncognito.com/oauth2/authorize?client_id=${aws_cognito_user_pool_client.this.id}&response_type=code&scope=${join("+", var.allowed_oauth_scopes)}&redirect_uri=${urlencode(var.cognito_callback_urls[0])}"
}

output "hosted_ui_authorize_url_token" {
  value = "https://${aws_cognito_user_pool_domain.this.domain}.auth.${var.region}.amazoncognito.com/oauth2/authorize?client_id=${aws_cognito_user_pool_client.this.id}&response_type=token&scope=${join("+", var.allowed_oauth_scopes)}&redirect_uri=${urlencode(var.cognito_callback_urls[0])}"
}

