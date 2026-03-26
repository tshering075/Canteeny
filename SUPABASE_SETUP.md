# Connect to Supabase

Follow these steps to connect your canteen app to your existing Supabase project.

## 1. Get your Supabase credentials

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Open your project.
3. Go to **Settings** → **API** in the sidebar.
4. Copy:
   - **Project URL** (e.g. `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

## 2. Create `.env` file

In your project root (`canteen-frontend/`), create a file named `.env`:

```
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Replace the values with your Project URL and anon key from step 1.

Or copy from the template:

```bash
copy .env.example .env
```

Then edit `.env` and add your real values.

## 3. Run the database migrations

Run these two SQL files in order in Supabase SQL Editor (New query → paste → Run):

**First:** `supabase/migrations/001_initial_schema.sql`  
Creates `customers`, `meals`, and `sales` tables.

**Second:** `supabase/migrations/002_users_table.sql`  
Creates `app_users` table and seeds the default admin user (admin/1234).

**Third (if you cannot create users):** `supabase/migrations/003_app_users_rls.sql`  
Adds Row Level Security policies so the app can insert/update/delete users via the anon key.

## 4. Restart the app

```bash
npm start
```

The app will use Supabase instead of localStorage. If all tables are empty, sample data will be seeded automatically.

---

### Troubleshooting

- **"Supabase URL or Anon Key missing"** – `.env` is missing or has wrong variable names. Use `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`.
- **Changes not reflected** – Restart the dev server after editing `.env`.
- **CORS / network errors** – Ensure your Supabase project is running and the Project URL is correct.
- **Cannot create users** – You must be logged in as **admin** (password: 1234). If you still see "Failed to create user" or similar, Supabase RLS is likely blocking inserts. Run `supabase/migrations/003_app_users_rls.sql` in the SQL Editor.
