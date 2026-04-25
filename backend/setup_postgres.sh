#!/usr/bin/env bash
# Simple local Postgres setup for development

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Install Docker to run local Postgres."
    exit 1
fi

# Start Postgres container
docker run -d \
    --name twinops-postgres \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=postgres \
    -e POSTGRES_DB=twinops_template \
    -p 5432:5432 \
    postgres:16-alpine

echo "Postgres container started."
echo "DATABASE_URL: postgresql://postgres:postgres@localhost:5432/twinops_template"
echo "To stop: docker stop twinops-postgres"
echo "To remove: docker rm twinops-postgres"
