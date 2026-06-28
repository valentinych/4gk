-- Dedicated login for the Next.js app (Prisma). Keeps working if postgres NOLOGIN is set.
CREATE USER fourgk_app WITH PASSWORD '4gk_app_local';
GRANT CONNECT ON DATABASE "4gk" TO fourgk_app;
\c 4gk
GRANT USAGE ON SCHEMA public TO fourgk_app;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO fourgk_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO fourgk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO fourgk_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO fourgk_app;
