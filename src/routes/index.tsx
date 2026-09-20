import { Link, createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context: { auth } }) => {
    if (auth) throw redirect({ to: "/dashboard" });
  },
  component: LandingPage,
});

const KeystoneMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true" role="img">
    <title>Keystone</title>
    <defs>
      <linearGradient id="kx-home" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="oklch(0.752 0.112 77)" />
        <stop offset="1" stopColor="oklch(0.604 0.108 74)" />
      </linearGradient>
    </defs>
    <path d="M5 4 L19 4 L15.5 20 L8.5 20 Z" fill="url(#kx-home)" />
    <path
      d="M9.7 4 L14.3 4 L13.2 20 L10.8 20 Z"
      fill="#17130f"
      opacity="0.16"
    />
  </svg>
);

const FEATURES = [
  {
    title: "Describe it, don't build it",
    body: "Say what you want in plain language. Keystone designs and writes the whole site, then refines it turn by turn.",
  },
  {
    title: "Your design system, as a contract",
    body: "Bring your own tokens and components and Keystone composes only from them, so generated sites are on-brand, not generic.",
  },
  {
    title: "Wired into your ecosystem",
    body: "Drop in a working store, a support button, email capture, or a repo showcase. Real integrations, not dead HTML.",
  },
  {
    title: "Publish anywhere, own everything",
    body: "One click to a live, hosted site with a custom domain. Apache-2.0 and self-hostable, no lock-in.",
  },
];

/**
 * Keystone marketing landing. Full-bleed and branded via the design system
 * (brass primary ramp + Fraunces display from globals.css).
 */
function LandingPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <KeystoneMark className="h-7 w-7" />
          <span className="font-display font-semibold text-xl tracking-tight">
            Keystone
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            to="/pricing"
            className="text-muted-foreground hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            to="/build"
            className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary-700"
          >
            Start building
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-base-200 bg-card px-3 py-1 text-muted-foreground text-xs">
            🗝️ AI web builder · Apache-2.0
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl font-display font-semibold text-5xl leading-[1.05] tracking-tight sm:text-6xl">
            Describe a website. Get one that ships.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Keystone turns a sentence into a real, hosted site, grounded in your
            design system and wired into the tools you already use.
          </p>
          <div className="mt-9 flex items-center justify-center gap-3">
            <Link
              to="/build"
              className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-700"
            >
              Start building
            </Link>
            <a
              href="https://github.com/omnidotdev/keystone-app"
              className="rounded-xl border border-base-200 bg-card px-6 py-3 font-semibold transition-colors hover:border-primary-400"
            >
              View source
            </a>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-base-200 bg-card p-6"
            >
              <h3 className="font-display font-medium text-xl tracking-tight">
                {f.title}
              </h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-base-200 bg-card px-8 py-14 text-center">
          <h2 className="font-display font-semibold text-3xl tracking-tight">
            Build your first site in a minute.
          </h2>
          <div className="mt-7">
            <Link
              to="/build"
              className="rounded-xl bg-primary-600 px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary-700"
            >
              Start building
            </Link>
          </div>
        </section>

        <footer className="flex items-center justify-between py-10 text-muted-foreground text-sm">
          <span className="flex items-center gap-2">
            <KeystoneMark className="h-4 w-4" /> Made with Keystone by Omni
          </span>
          <span>Apache-2.0</span>
        </footer>
      </main>
    </div>
  );
}
