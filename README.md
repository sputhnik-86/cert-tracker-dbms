# CertTrack — Quick Demo and Supabase Deployment

## See the application immediately (no PostgreSQL required)

1. Install Node.js if needed: https://nodejs.org/
2. Open this folder in VS Code and open Terminal → New Terminal.
3. Run `npm install` and then `npm start`.
4. Visit http://localhost:3000/dashboard.html.

If `DATABASE_URL` is not set, the app automatically runs in **demo mode** with sample records. Adding/deleting records works for the preview, but data is kept in memory and resets when the server restarts.

## Use Supabase for persistent shared data

1. Create a Supabase project and run `query.sql` once in its SQL Editor (only on a new/empty database because the script drops tables).
2. Set `DATABASE_URL` to the Supabase PostgreSQL connection URI in your environment or hosting provider.
3. Restart/redeploy the app. When `DATABASE_URL` is set, it uses PostgreSQL rather than demo data.

Certification tracking dashboard built with HTML/CSS/JavaScript, Node.js/Express and PostgreSQL. It is prepared to connect to a shared Supabase PostgreSQL database and deploy on Render. End users do not install PostgreSQL; the hosted Express server connects to Supabase using `DATABASE_URL`.

## Files
- `server.js` — Express API and PostgreSQL connection
- `query.sql` — schema, relations, compliance trigger and demo records
- `dashboard.html` — dashboard UI (IDs matched to `app.js`)
- `employee-forms.html` — add certification form
- `app.js`, `styles.css` — frontend logic and styling

## Supabase setup
1. Create a Supabase project.
2. In Supabase SQL Editor, execute `query.sql` once on the new/empty project database. **The script drops existing tables before creating them; do not rerun it on data you want to keep.**
3. In Supabase, choose Connect and copy a PostgreSQL connection URI. Use the Session pooler URI if your hosting environment cannot connect directly.
4. Configure the URI as `DATABASE_URL` in Render's Environment settings. Do not commit `.env` or credentials.

## Deploy on Render
1. Push this folder to a GitHub repository.
2. Create a Render Web Service from that repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables `DATABASE_URL` (Supabase connection URI) and `NODE_ENV=production`.
6. Deploy. Test `/health`, `/api/records`, and `/dashboard.html` on your Render URL.

## Optional local run
Requires Node.js and a reachable PostgreSQL database. Run `npm install` and `npm start`. Without `DATABASE_URL`, `server.js` falls back to `localhost:5432` for local development.

## Important security note
This is a college demo starter, not production-secure authentication. The existing login UI is client-side and record APIs do not enforce user authentication/authorization. Use dummy data until server-side authentication and authorization are implemented. Never expose the Supabase service-role key in frontend code; this project only needs a server-side PostgreSQL connection URI.
