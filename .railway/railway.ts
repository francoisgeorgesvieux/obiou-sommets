// Railway Infrastructure as Code for obiou-sommets. Imported with `railway config pull`
// on 2026-09-13, then made environment-aware.
//
//   railway environment <production|staging>
//   railway config plan      (read-only; must say "already up to date")
//   railway config apply     (only after reviewing the plan)
//
// Every service is pinned to EU West. The workspace default region is sfo, and the
// Hobby plan rejects multi-region configs before building, with no logs.
// Variable values stay in Railway (preserve()): secrets are set by the owner only.
import { bucket, defineRailway, github, image, preserve, project, service, volume } from "railway/iac";

const REPO = "francoisgeorgesvieux/obiou-sommets";
const EU_WEST = { "europe-west4-drams3a": 1 };

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";
  const branch = prod ? "main" : "staging";
  // Staging sleeps when idle to keep the bill down.
  const idle = prod ? {} : { sleepApplication: true };

  const timescaledbVolume = volume("timescaledb-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "europe-west4-drams3a", sizeMB: 5000 });
  const obiouSommetsFiles = bucket("obiou-sommets-files", { region: "ams" });
  const obiouSommetsBackups = bucket("obiou-sommets-backups", { region: "ams" });

  // Postgres 17 + PostGIS. No TCP proxy: reachable only on the private network.
  const TimescaleDB = service("TimescaleDB", {
    source: image("ghcr.io/railwayapp-templates/timescale-postgis-ssl:pg17-ts2.17"),
    replicas: EU_WEST,
    networking: { privateNetworkEndpoint: "timescaledb" },
    volumeMounts: { "/var/lib/postgresql/data": timescaledbVolume },
    env: { DATABASE_PUBLIC_URL: preserve(), DATABASE_URL: preserve(), NO_TS_TUNE: preserve(), PGDATA: preserve(), PGDATABASE: preserve(), PGHOST: preserve(), PGPASSWORD: preserve(), PGPORT: preserve(), PGUSER: preserve(), POSTGRES_DB: preserve(), POSTGRES_PASSWORD: preserve(), POSTGRES_USER: preserve(), RAILWAY_RUN_UID: preserve(), SSL_CERT_DAYS: preserve() },
  });

  const web = service("web", {
    source: github(REPO, { branch, checkSuites: false }),
    build: { buildEnvironment: "V3", builder: "DOCKERFILE", dockerfilePath: "apps/web/Dockerfile", watchPatterns: ["/apps/web/**", "/packages/**", "/pnpm-lock.yaml", "/pnpm-workspace.yaml", "/package.json"] },
    healthcheck: "/api/health",
    healthcheckTimeout: 120,
    replicas: EU_WEST,
    deploy: { restartPolicyMaxRetries: 5, ...idle },
    env: { NUXT_DATABASE_URL: preserve(), NUXT_PUBLIC_SITE_URL: preserve(), PORT: preserve() },
  });

  const cms = service("cms", {
    source: github(REPO, { branch, checkSuites: false, rootDirectory: "/apps/cms" }),
    build: { buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/apps/cms/**"] },
    healthcheck: "/server/ping",
    healthcheckTimeout: 300,
    replicas: EU_WEST,
    deploy: { restartPolicyMaxRetries: 5, ...idle },
    // Secrets set by the owner with infra/scripts/set-cms-secrets.sh. They MUST stay listed:
    // omitting a variable here makes `railway config apply` delete it.
    // No EMAIL_* on purpose: Railway Hobby blocks outbound SMTP.
    env: { SECRET: preserve(), ADMIN_EMAIL: preserve(), LICENSE_KEY: preserve(), DB_CLIENT: preserve(), DB_CONNECTION_STRING: preserve(), IP_TRUST_PROXY: preserve(), PORT: preserve(), PUBLIC_URL: preserve(), RATE_LIMITER_ENABLED: preserve(), STORAGE_LOCATIONS: preserve(), STORAGE_S3_BUCKET: preserve(), STORAGE_S3_DRIVER: preserve(), STORAGE_S3_ENDPOINT: preserve(), STORAGE_S3_KEY: preserve(), STORAGE_S3_REGION: preserve(), STORAGE_S3_ROOT: preserve(), STORAGE_S3_SECRET: preserve(), TELEMETRY: preserve() },
  });

  // Daily dump, restore check, age encryption, upload. Production only.
  // restartPolicyType NEVER: a retrying run stays "active" and Railway skips the next cron.
  const backup = service("backup", {
    source: github(REPO, { branch, checkSuites: false, rootDirectory: "/infra/backup" }),
    build: { buildEnvironment: "V3", builder: "RAILPACK", watchPatterns: ["/infra/backup/**"] },
    replicas: EU_WEST,
    deploy: { cronSchedule: "0 3 * * *", restartPolicyType: "NEVER" },
    env: { AGE_RECIPIENT: preserve(), AWS_ACCESS_KEY_ID: preserve(), AWS_DEFAULT_REGION: preserve(), AWS_SECRET_ACCESS_KEY: preserve(), BUCKET: preserve(), DATABASE_URL: preserve(), ENDPOINT: preserve(), RETENTION_COUNT: preserve() },
  });

  return project("obiou-sommets", {
    resources: [TimescaleDB, web, cms, ...(prod ? [backup] : []), timescaledbVolume, obiouSommetsFiles, obiouSommetsBackups],
  });
});
