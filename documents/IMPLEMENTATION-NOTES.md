# QR-ATT implementation notes

## Role navigation
- Student: Home, Scan QR, History, Profile.
- Teacher: Home, Events, History, Profile.
- Admin: Dashboard, Events, Users, Attendance, Profile.
- Signup role choices remain student/teacher; admin role must be assigned by a trusted operator.

## Supabase migration
Apply `supabase/migrations/20261026_role_admin_qr.sql` in the Supabase SQL Editor.
Then assign an admin using the commented SQL statement in the migration after replacing the placeholder email.
Do not expose a service-role key in the mobile app.

## Important security note
The mobile UI is not a security boundary. Apply the migration and verify the policies against your actual deployed policies before relying on admin views. The current app uses client-side Supabase queries; admin screens will only show records permitted by RLS. The schema's exact policies and any existing migrations should be reviewed before production deployment.

## Verification checklist
1. Run `npm install`.
2. Run `npx tsc --noEmit`.
3. Run `npx expo-doctor`.
4. Apply the SQL migration in a development Supabase project first.
5. Test a student, teacher, and trusted admin account.
6. Test login/logout and account switching.
7. Create an event, confirm its QR row exists in `event_qr_codes`, restart the app, and confirm the QR appears in teacher History.
8. Try invalid and duplicate scans.
9. Confirm students cannot create events, teachers see only their own events, and admins can read all permitted records.

## Current limitations
- Admin event list shows the creator's user ID rather than resolving the teacher's display name.
- The app has an event QR persistence migration and teacher History QR preview, but QR enlargement/export/share controls are not implemented yet.
- Admin search is client-side after fetching permitted records; date/teacher filters and paginated queries remain to be added for large datasets.
- Admin dashboard counts are fetched from permitted rows, not database aggregate functions; large datasets may require secure RPCs.
- Static TypeScript and Expo diagnostics still need to be run in the local project environment, with the actual Supabase project and RLS configuration.
