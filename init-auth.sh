#!/bin/bash
set -e

# This script runs as the postgres user during database initialization

# Modify pg_hba.conf to use md5 authentication instead of scram-sha-256
echo "Configuring PostgreSQL authentication..."

# Wait for initialization to complete
if [ -f /var/lib/postgresql/data/pg_hba.conf ]; then
    # Replace scram-sha-256 with md5 for host connections
    sed -i 's/host all all all scram-sha-256/host all all all md5/' /var/lib/postgresql/data/pg_hba.conf
    echo "pg_hba.conf configured for md5 authentication"
    cat /var/lib/postgresql/data/pg_hba.conf
fi
