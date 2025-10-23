output "analysis_queue_url" {
  value = aws_sqs_queue.analysis.url
}

output "analysis_queue_arn" {
  value = aws_sqs_queue.analysis.arn
}

output "analysis_dlq_url" {
  value = aws_sqs_queue.dlq.url
}

output "process_image_arn" {
  value = aws_lambda_function.process_image.arn
}

