-- Seed script for initial roles
INSERT INTO roles (name) VALUES 
  ('ROLE_USER'),
  ('ROLE_MODERATOR'),
  ('ROLE_ADMIN')
ON CONFLICT (name) DO NOTHING;