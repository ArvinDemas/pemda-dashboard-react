#!/bin/bash
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE DATABASE keycloak;
    CREATE DATABASE pemda_dashboard;
    GRANT ALL PRIVILEGES ON DATABASE keycloak TO postgres;
    GRANT ALL PRIVILEGES ON DATABASE pemda_dashboard TO postgres;
EOSQL
