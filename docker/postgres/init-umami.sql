-- Umami service uses DATABASE_URL with database name "umami" (see docker-compose).
-- POSTGRES_DB only creates the primary app database (4gk); this runs once on first volume init.
CREATE DATABASE umami;
