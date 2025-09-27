# Terraform Skeleton

- `main.tf` – define providers (`aws`), remote state backend, and shared variables.
- Modules to add:
  - `vpc` – VPC, subnets, NAT gateways
  - `ecs` – ECR repositories, task definitions, services (web/api)
  - `rds` – PostgreSQL instance and parameter group
  - `iam` – execution/task roles, Secrets Manager policies
  - `monitoring` – CloudWatch log groups, alarms, SNS subscriptions

> Replace placeholder ARNs and account IDs before applying.
