-- Default admin user.
-- Credentials (change immediately after first login):
--   email:    admin@bondargames.com
--   password: ChangeMe123!
-- Idempotent: re-running this migration won't error or create duplicates.
INSERT INTO "User" (
  "id",
  "email",
  "name",
  "passwordHash",
  "role",
  "emailVerified",
  "createdAt"
) VALUES (
  'seed-default-admin',
  'admin@bondargames.com',
  'Admin',
  '$2b$12$kXAO1b7WfVGwgmywOqHFIeGBeXzBTnEJKqOolHMiRDe6wuHrHbjR.',
  'ADMIN'::"Role",
  NOW(),
  NOW()
) ON CONFLICT ("email") DO NOTHING;
