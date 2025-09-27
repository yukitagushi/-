# CloudFormation Notes

- Split stacks by concern:
  - `networking.yaml` – VPC, subnets, routing, security groups
  - `ecr.yaml` – ECR repositories for web/api images
  - `ecs.yaml` – Task definitions, services, ALB target groups/listeners
  - `database.yaml` – RDS PostgreSQL instance + subnet group
  - `observability.yaml` – CloudWatch log groups, alarms, SNS topic/subscriptions
- Use SSM parameters or Secrets Manager ARNs for sensitive values (DATABASE_URL, OPENAI_API_KEY, SMTP credentials).
- After deploying, update GitHub Action secrets with the cluster/service/ECR ARNs referenced here.
