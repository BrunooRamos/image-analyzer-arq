output "amplify_app_id" {
  description = "ID de la aplicación Amplify"
  value       = aws_amplify_app.this.id
}

output "amplify_app_arn" {
  description = "ARN de la aplicación Amplify"
  value       = aws_amplify_app.this.arn
}

output "amplify_app_url" {
  description = "URL de la aplicación Amplify"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.this.default_domain}"
}

output "amplify_branch_name" {
  description = "Nombre del branch desplegado"
  value       = aws_amplify_branch.main.branch_name
}

output "amplify_default_domain" {
  description = "Dominio por defecto de Amplify"
  value       = aws_amplify_app.this.default_domain
}

output "amplify_console_url" {
  description = "URL de la consola de Amplify"
  value       = "https://${var.region}.console.aws.amazon.com/amplify/home?region=${var.region}#/${aws_amplify_app.this.id}"
}

