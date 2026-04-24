## AWS deployment (scaffold)

This folder is a scaffold for deploying Wheatfill Precision Health to AWS in a HIPAA-capable posture (requires a signed AWS BAA and correct account configuration).

### Target architecture (high level)
- **Frontend**: S3 (static) + CloudFront (TLS)
- **Backend**: ECS Fargate service behind an ALB (TLS)
- **Database**: RDS Postgres (encrypted, automated backups, PITR)
- **Secrets**: Secrets Manager (JWT secret, Clover keys, DB URL)
- **Logs/metrics**: CloudWatch

### Next steps to make it real
- Create Terraform or CDK here (recommended: Terraform).
- Register a domain in Route53 (or delegate).
- Issue ACM certs for `app.<domain>` and `api.<domain>`.
- Set `FRONTEND_ORIGIN` on backend to your CloudFront domain(s).

