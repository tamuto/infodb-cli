terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

locals {
  lambda_name      = "my_test_function"
  lambda_handler   = "test_lambda.handler"
  api_name         = "infodb-cli-sample-http-api"
  api_route_path   = "/sample"
  lambda_zip_path  = trimspace(var.lambda_zip_path) != "" ? var.lambda_zip_path : "${path.module}/../test_lambda.zip"
}

data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "lambda_execution" {
  name               = "${local.lambda_name}-exec"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json
}

resource "aws_lambda_function" "test_lambda" {
  function_name = local.lambda_name
  filename      = local.lambda_zip_path
  source_code_hash = filebase64sha256(local.lambda_zip_path)
  handler       = local.lambda_handler
  runtime       = "python3.12"
  role          = aws_iam_role.lambda_execution.arn
  timeout       = 10

  environment {
    variables = {
      ENV = "development"
    }
  }
}

resource "aws_apigatewayv2_api" "http_api" {
  name          = local.api_name
  protocol_type = "HTTP"
}

resource "aws_apigatewayv2_integration" "lambda_proxy" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.test_lambda.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "test_lambda" {
  api_id    = aws_apigatewayv2_api.http_api.id
  route_key = "GET ${local.api_route_path}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_proxy.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true
  depends_on  = [aws_apigatewayv2_route.test_lambda]
}

resource "aws_lambda_permission" "allow_apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.test_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}

output "invoke_url" {
  value       = "${aws_apigatewayv2_api.http_api.api_endpoint}${local.api_route_path}"
  description = "URL for invoking the HTTP API route that triggers test_lambda."
}

output "route_key" {
  value       = aws_apigatewayv2_route.test_lambda.route_key
  description = "The HTTP API route key captured by terraform show -json."
}
