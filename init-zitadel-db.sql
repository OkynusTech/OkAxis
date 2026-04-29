-- Create zitadel user with password
CREATE ROLE zitadel WITH LOGIN PASSWORD 'zitadel' CREATEDB INHERIT CREATEROLE;

-- Create zitadel database owned by zitadel role
CREATE DATABASE zitadel OWNER zitadel TEMPLATE template0;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE zitadel TO zitadel;
GRANT CREATE ON SCHEMA public TO zitadel;
