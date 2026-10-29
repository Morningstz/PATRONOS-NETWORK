import { db } from "@/lib/db";
import { requirePageAccess } from "@/lib/auth/session";
import { showDemoData } from "@/lib/settings";
import { purgeDemo, setDemoVisibility } from "@/app/actions/admin";
import { ActionForm } from "@/components/admin/ActionForm";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requirePageAccess("settings:manage", "/admin/settings");
  const [show, demoCounts] = await Promise.all([
    showDemoData(),
    Promise.all([db.company.count({ where: { isDemo: true } }), db.artist.count({ where: { isDemo: true } }), db.artwork.count({ where: { isDemo: true } }), db.user.count({ where: { isDemo: true } })]),
  ]);
  return (
    <div className="max-w-3xl">
      <h1 className="display text-[2.5rem]">Settings</h1>
      <section className="panel mt-8 p-6" aria-labelledby="s-demo">
        <h2 id="s-demo" className="text-[18px] font-semibold">Demo data visibility</h2>
        <p className="mt-2 text-[14px] text-muted">Demo records are always labeled. Hide them publicly once real listings exist. Currently <strong className="text-gold-light">{show ? "visible" : "hidden"}</strong>.</p>
        <ActionForm action={setDemoVisibility} fields={{ show: show ? "false" : "true" }} submitLabel={show ? "Hide demo data" : "Show demo data"} className="mt-4" />
      </section>
      <section className="panel mt-6 border-danger/30 p-6" aria-labelledby="s-purge">
        <h2 id="s-purge" className="text-[18px] font-semibold text-danger">Purge demo data</h2>
        <p className="mt-2 text-[14px] text-muted">
          Permanently deletes <span className="nums">{demoCounts[0]}</span> companies, <span className="nums">{demoCounts[1]}</span> artists, <span className="nums">{demoCounts[2]}</span> artworks and <span className="nums">{demoCounts[3]}</span> demo users (your account is kept). Reference data is kept. This cannot be undone; re-run <code>npm run db:seed</code> to restore.
        </p>
        <ActionForm action={purgeDemo} submitLabel="Purge demo data" variant="danger" className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start">
          <label htmlFor="purge-confirm" className="sr-only">Type PURGE DEMO DATA to confirm</label>
          <input id="purge-confirm" name="confirm" placeholder="Type PURGE DEMO DATA" className="field max-w-xs" autoComplete="off" />
        </ActionForm>
      </section>
    </div>
  );
}
