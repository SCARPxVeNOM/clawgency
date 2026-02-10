import Link from "next/link";

export default function Home() {
  return (
    <section className="section-card reveal-up p-6 md:p-7">
      <p className="hero-kicker">Command Center</p>
      <h2 className="mt-2 text-2xl font-semibold text-ink md:text-3xl">Clawgency Professional Console</h2>
      <p className="mt-3 max-w-2xl text-sm text-steel leading-relaxed">
        This workspace separates brand, influencer, and admin workflows while keeping transaction
        execution human-approved.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="btn-primary px-4 py-2 text-sm" href="/login">
          Go to Login
        </Link>
        <Link
          className="btn-secondary px-4 py-2 text-sm"
          href="/brand/dashboard"
        >
          Open Brand Dashboard
        </Link>
      </div>
    </section>
  );
}
