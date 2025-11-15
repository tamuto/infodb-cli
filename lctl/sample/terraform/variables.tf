variable "aws_region" {
  description = "AWS region where the HTTP API and Lambda will be deployed."
  type        = string
  default     = "us-east-1"
}

variable "lambda_zip_path" {
  description = "Path to the test_lambda deployment ZIP (defaults to ../test_lambda.zip)."
  type        = string
  default     = ""
}
