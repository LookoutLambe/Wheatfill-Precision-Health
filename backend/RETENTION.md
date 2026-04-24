## Wheatfill Precision Health — Retention & Exports

This document describes how we keep data on file for **5+ years**, how to back it up, and how to export records on request.

### What we retain (minimum)
- **Patients**: profile + contact + address fields (no payment card data is stored).
- **Appointments**: requests, scheduled visits, timestamps, and status transitions.
- **Orders**: requests, pharmacy orders, items, and statuses.
- **Payments**: Clover checkout identifiers + payment status (no PAN/CVV).
- **Audit log**: immutable event trail for key actions (who/what/when/IP).

### Default retention period
- **5 years minimum** for all clinical and billing records stored in the primary database.
- The app should **not hard-delete** records needed for retention; use soft-delete patterns (`deletedAt`) where applicable.

### Backups (production expectation)
- **RDS PostgreSQL**:
  - Enable **automated backups** with retention >= **35 days**.
  - Enable **PITR (Point-in-Time Restore)**.
  - Add **scheduled logical exports** to S3 (daily/weekly) for long-term retention.
- **S3**:
  - Enable **versioning** + **object lock** (if required by policy).
  - Lifecycle rules for long-term archival (e.g. Glacier) after N days.

### Exports
We support exporting data for records requests and internal review:
- **Audit events** are queryable via `GET /v1/provider/audit`.
- For full exports (patients, appointments, orders, payments), prefer DB-level export jobs to S3 in production so exports are:
  - encrypted at rest
  - access-controlled
  - tracked (who generated, when, what filters)

### Audit logging behavior
Audit events are written automatically for:
- patient appointment request creation
- patient direct booking creation
- patient general order creation
- provider scheduling + status changes
- provider order status changes
- provider blackout add/remove
- Clover webhook payment approval/decline, and order status changes caused by payment

Each audit row includes:
- **actor** (`actorId`)
- **entity** (`entityType`, `entityId`)
- **action** (string)
- optional **before/after** snapshots (`beforeJson`, `afterJson`)
- **IP** (best-effort)
- **createdAt**

### Notes for HIPAA-grade deployment
HIPAA compliance is an operational + legal posture:
- Use AWS services covered under a signed **BAA**.
- Store secrets in **AWS Secrets Manager**.
- Encrypt in transit (TLS) and at rest (RDS + S3 encryption).
- Restrict access (least privilege IAM, private subnets where possible).

