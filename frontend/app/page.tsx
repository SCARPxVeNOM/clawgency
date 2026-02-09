import Link from "next/link";

export default function Home() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold text-ink">Clawgency Professional Console</h2>
      <p className="mt-3 text-sm text-steel">
        This workspace separates brand, influencer, and admin workflows while keeping transaction
        execution human-approved.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="rounded-lg bg-ink px-4 py-2 text-sm font-medium text-white" href="/login">
          Go to Login
        </Link>
        <Link
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-steel"
          href="/brand/dashboard"
        >
          Open Brand Dashboard
        </Link>
      </div>
    </section>
  );
}
