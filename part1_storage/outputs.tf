output "images_bucket_name" {
  value = aws_s3_bucket.images.bucket
}

output "images_bucket_arn" {
  value = aws_s3_bucket.images.arn
}

output "analysis_table_name" {
  value = aws_dynamodb_table.analysis.name
}

output "analysis_table_arn" {
  value = aws_dynamodb_table.analysis.arn
}

output "openai_secret_arn" {
  value = aws_secretsmanager_secret.openai.arn
}

