# Infra Overview

This directory holds deployment templates and reference snippets for migrating the Silent Voice platform onto AWS.

## Workloads

- **Compute**: ECS on Fargate (`silent-voice-web`, `silent-voice-api`). See `ecs/*.json` for sample task definitions.
- **Registry**: ECR repositories (`silent-voice-web`, `silent-voice-api`). Build & push from GitHub Actions.
- **Networking**: VPC with public subnets for an Application Load Balancer (or CloudFront for the web tier) and private subnets for ECS tasks + RDS.
- **Database**: Amazon RDS for PostgreSQL (single-AZ to start, encrypted, Multi-AZ upgrade path documented below).
- **Storage**: S3 bucket (`S3_BUCKET`) for uploaded evidence. Pre-signed URLs are issued by the API.
- **Monitoring**: CloudWatch Log groups per service (`/ecs/silent-voice-*`) and optional SNS topic for critical errors.

## Templates

| Path | Description |
|------|-------------|
| `ecs/web-task-def.json` | Baseline Fargate task definition for the Next.js SSR container. |
| `ecs/api-task-def.json` | Baseline Fargate task definition for the NestJS API (Secrets Manager wiring for DATABASE_URL / OPENAI key). |
| `terraform/` (placeholder) | Add modules for VPC, ALB, RDS, and ECS services if Terraform is chosen. |
| `cloudformation/` (placeholder) | Alternative CloudFormation stacks for the above resources. |

Populate the placeholders (account IDs, roles, ARNs) before applying. Recommended parameters:

- **VPC**: two public + two private subnets across AZs (`ap-northeast-1a/b`).
- **ALB**: listener on 443 forwarding to web service target group. API can use separate listener/target group.
- **CloudFront**: optional in front of the web task (origin: ALB, cache static assets from S3).
- **RDS**: parameter group enforcing `sslmode=require`, automated backups (>=7 days), CloudWatch alarms for CPU/storage.
- **Secrets Manager**: store `DATABASE_URL`, `SESSION_SECRET`, `OPENAI_API_KEY`, SMTP/SES credentials.

### Observability & Alerts

1. **CloudWatch Logs** – Already referenced in the task definitions. Prefix streams with the ECS service name.
2. **SNS Topic** – Configure the ARN in `.env` (`SNS_TOPIC_ARN`) and enable with `ENABLE_SNS_ALERTS=true` to receive critical API error notifications.
3. **Metrics/Alarms** – Create alarms on ALB 5xx, RDS connections, ECS task CPU/MEM. Point notifications to the same SNS topic.

### Deployment Flow

1. Build/push images via GitHub Actions (`web.yml`, `api.yml`).
2. Register new task definitions (`aws ecs register-task-definition --cli-input-json file://infra/ecs/api-task-def.json`).
3. Update ECS services (`aws ecs update-service --cluster silent-voice --service silent-voice-api --force-new-deployment`).
4. Apply infrastructure templates (Terraform/CloudFormation) once values are filled in.
