# Sample Terraform for `test_lambda`

This directory demonstrates how to wire the bundled `sample/functions/test_lambda.py`
Lambda to an HTTP API Gateway route. It is meant for local experimentation alongside
the new `gen-routes` / `serve` commands.

## Prerequisites

1. Build the CLI and generate the Lambda ZIP from the sample project:

   ```bash
   cd lctl
   pnpm run build
   cd sample
   node ../dist/index.js makezip test_lambda
   ```

   The command above creates `test_lambda.zip` next to this `terraform/` directory.

2. Configure AWS credentials (any standard Terraform-compatible method).

## Using the Terraform sample

```bash
cd lctl/sample/terraform
terraform init
terraform plan -out plan.tfplan
terraform show -json plan.tfplan > routes.plan.json
```

`routes.plan.json` can be fed into `pnpx @infodb/lctl gen-routes` to
produce `routes.json`, which in turn can be used by `pnpx @infodb/lctl serve`.

### Customisation

- Set `-var='aws_region=us-west-2'` to change the deployment region.
- Override `-var='lambda_zip_path=/absolute/path/to/test_lambda.zip'` if the ZIP lives
  elsewhere.
- Adjust `local.api_route_path` inside `main.tf` to change the HTTP route, or add
  more routes following the same pattern.
