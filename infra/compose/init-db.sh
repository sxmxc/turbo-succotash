#!/bin/sh
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=identity_password="$IDENTITY_DB_PASSWORD" --set=api_password="$API_DB_PASSWORD" <<'SQL'
CREATE ROLE identity LOGIN PASSWORD :'identity_password';
CREATE ROLE application LOGIN PASSWORD :'api_password';
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA identity;
CREATE SCHEMA application;
GRANT USAGE ON SCHEMA identity TO identity;
GRANT USAGE ON SCHEMA application TO application;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO identity;
ALTER DEFAULT PRIVILEGES IN SCHEMA application GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO application;
ALTER DEFAULT PRIVILEGES IN SCHEMA identity GRANT USAGE, SELECT ON SEQUENCES TO identity;
ALTER DEFAULT PRIVILEGES IN SCHEMA application GRANT USAGE, SELECT ON SEQUENCES TO application;
ALTER ROLE identity SET search_path TO identity,public;
ALTER ROLE application SET search_path TO application,public;
SQL
