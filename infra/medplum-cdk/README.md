## Medplum self-host (AWS CDK)

This folder scaffolds **self-hosting Medplum on AWS** using Medplum's official AWS CDK workflow (ECS Fargate + Aurora Postgres + ALB + S3 + CloudFront, etc).

Medplum's reference guide: [Install on AWS](https://www.medplum.com/docs/self-hosting/install-on-aws)

### What you need first
- AWS account credentials with permissions for VPC, ECS, RDS(Aurora Postgres), ALB, S3, CloudFront, IAM, Secrets Manager, SSM, Route53, ACM, CloudWatch (and optionally SES).
- **A domain**. Medplum strongly prefers Route53 name servers to automate certs/records.

### One-time local setup
From this directory:

```bash
npm install
```

Then run:

```bash
npm run init:aws
```

That will generate a config file like:
- `medplum.dev.config.json` (or `medplum.prod.config.json`)

An example shape is provided at `medplum.dev.config.example.json` (do not deploy with the example values).

### Deploy
After config is generated:

```bash
npm run cdk:bootstrap
npm run cdk:synth
npm run cdk:deploy
```

You can also set:
- `MEDPLUM_CDK_CONFIG_FILE` (e.g. `medplum.prod.config.json`)
- `MEDPLUM_ENV_NAME` (e.g. `prod`)

If deploying outside `us-east-1`, update bucket policies:

```bash
npm run aws:update-bucket-policies
```

Deploy the Medplum web app:

```bash
npm run aws:deploy-app
```

### Where domains land
Typical:
- `api.<basedomain>` -> ALB -> ECS Medplum server
- `app.<basedomain>` -> CloudFront -> Medplum web app

