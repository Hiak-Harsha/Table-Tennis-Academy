# Rollback & Disaster Recovery Runbook

This runbook describes standard operating procedures for rolling back application deployments, reversing PostgreSQL schema migrations, and executing point-in-time database restoration for Table Tennis Academy.

---

## 1. Fast Application Rollback (Deployment Level)

If a deployment exhibits critical regressions, 5xx error spikes on `/api/health`, or broken authentication flows:

### Step 1: Revert Container / Deployment
- **Vercel / Netlify / Cloudflare**:
  - Open deployment history in dashboard.
  - Locate the previous stable build and click **Instant Rollback / Promote to Production**.
- **Docker / Kubernetes / Systemd**:
  ```bash
  # Check recent commits
  git log -n 5 --oneline

  # Checkout previous stable release tag or commit
  git checkout <STABLE_COMMIT_HASH>

  # Rebuild and restart service
  npm ci --omit=dev
  npm run build
  systemctl restart tta-portal
  ```

### Step 2: Verify Service Health
```bash
# Execute healthcheck query
curl -i https://portal.tta-academy.com/api/health
```
Ensure HTTP `200 OK` and `"database": { "status": "connected" }`.

---

## 2. Database Migration Rollback Procedures

Prisma uses forward migrations via `prisma migrate deploy`. If a migration must be reverted:

### Non-Destructive Migrations (New Columns / Indexes)
- Retain the schema in production; new nullable columns or indexes do not break older application versions.
- Create a reverse migration:
  ```bash
  npx prisma migrate diff \
    --from-schema-datamodel prisma/schema.prisma \
    --to-schema-datasource prisma/schema.prisma \
    --script > down.sql
  ```

### Destructive Migrations (Schema Restructure)
1. Place application in temporary maintenance mode.
2. Apply previous down script or restore from pre-deployment snapshot:
   ```bash
   gunzip -c backups/tta_db_PRE_DEPLOY.sql.gz | psql "${DATABASE_URL}"
   ```
3. Restart application.

---

## 3. Full Database Disaster Recovery (Restoring from Backup)

In the event of database corruption, accidental drop, or server hardware loss:

### Step 1: Locate Most Recent Verified Backup
```bash
ls -la backups/
# Or fetch from offsite S3 bucket:
# aws s3 cp s3://my-backup-bucket/db-backups/tta_db_LATEST.sql.gz ./
```

### Step 2: Test Backup Integrity
```bash
gzip -t backups/tta_db_YYYYMMDD_HHMMSS.sql.gz
```

### Step 3: Restore to Target PostgreSQL Database
```bash
# Decompress and stream to psql:
gunzip -c backups/tta_db_YYYYMMDD_HHMMSS.sql.gz | psql "${DATABASE_URL}"
```

### Step 4: Validate Data Integrity
```bash
# Validate core tables exist and row counts are non-zero
psql "${DATABASE_URL}" -c "SELECT count(*) FROM \"User\";"
psql "${DATABASE_URL}" -c "SELECT count(*) FROM \"Student\";"
psql "${DATABASE_URL}" -c "SELECT count(*) FROM \"AcademyFee\";"
psql "${DATABASE_URL}" -c "SELECT count(*) FROM \"Tournament\";"
```

### Step 5: Regenerate Prisma Client & Start Application
```bash
npx prisma generate
npm run start
```

---

## 4. Emergency Contacts & Escalation Matrix

- **Lead Full-Stack Engineer**: dev-lead@tta-academy.com
- **Database Administrator**: dba@tta-academy.com
- **Payment Gateway Incident Line**: Razorpay Emergency Ops Portal
- **Head Coach / Operations**: admin@tta-academy.com
