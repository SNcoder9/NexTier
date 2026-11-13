# NexTier backend

The API uses the existing `users` table for sign-in. Existing plain-text passwords are migrated to a salted scrypt hash after a successful sign-in. The API returns profile fields only and never returns stored passwords.

Set `JWT_SECRET` in the backend `.env` file to a long, random value so sessions remain valid after the server restarts. If it is unset, a temporary random signing key is generated for the current process. Profile images are stored locally under `uploads/`; back up that directory along with the database.

Profile image uploads accept JPG, PNG, WEBP, and GIF files up to 5 MB. No account registration is exposed; users must already exist in the database.
