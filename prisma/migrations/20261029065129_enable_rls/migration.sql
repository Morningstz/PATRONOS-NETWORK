-- Defense in depth: enable Row Level Security on every application table.
--
-- The app reaches the database through Prisma using the table-owner role, which
-- bypasses RLS. Authorization for those queries lives in src/lib/authz.ts.
-- With RLS enabled and NO policies, Supabase's anon/authenticated roles (the
-- auto-generated Data API) can read and write nothing. Add narrowly scoped
-- policies here only if a feature deliberately uses the Supabase client directly.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
