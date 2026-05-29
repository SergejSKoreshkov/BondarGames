-- Default non-admin test user.
-- Credentials (change/remove before production):
--   email:    test@bondargames.com
--   password: Test1234!
-- Idempotent: re-running won't error or duplicate.
INSERT INTO "User" (
  "id",
  "email",
  "name",
  "passwordHash",
  "role",
  "emailVerified",
  "createdAt"
) VALUES (
  'seed-test-user',
  'test@bondargames.com',
  'Test User',
  '$2b$12$8zMgv7UjiZa99uFyV7AZ7uvq3Q2VM2IKcWzdNa/MaAWDV/1zVws5S',
  'USER'::"Role",
  NOW(),
  NOW()
) ON CONFLICT ("email") DO NOTHING;
