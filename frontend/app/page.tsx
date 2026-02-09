import Link from 'next/link';

const highlights = [
  {
    title: 'Interactive Vibe Coding',
    description: 'Guide users from idea to deployment with real-time AI collaboration.',
    icon: '🧠',
  },
  {
    title: 'Multi-LLM Orchestration',
    description: 'Blend OpenAI and Anthropic models with flexible routing and fallbacks.',
    icon: '🧩',
  },
  {
    title: 'Cloudflare-Ready',
    description: 'Scale globally with low-latency delivery and reliable infrastructure.',
    icon: '☁️',
  },
  {
    title: 'Realtime Preview',
    description: 'Iterate quickly with containerized live previews and feedback loops.',
    icon: '⚡',
  },
  {
    title: 'Secure by Design',
    description: 'Supabase authentication, database access, and storage baked in.',
    icon: '🔐',
  },
  {
    title: 'Responsive Dark UI',
    description: 'A sleek, accessible interface optimized for every device.',
    icon: '🌙',
  },
];

const experienceFlow = [
  'User describes the app experience',
  'AI agent analyzes the request',
  'Blueprint & plan generation',
  'Phase-wise code generation',
  'Live preview in container',
  'User feedback & iteration',
  'Deploy to Workers for Platforms',
];

const apiKeys = [
  { key: 'SUPABASE_URL', description: 'Required for auth and data access.' },
  { key: 'SUPABASE_SERVICE_KEY', description: 'Server-side Supabase operations.' },
  { key: 'OPENAI_API_KEY', description: 'OpenAI LLM features (optional if using Anthropic).' },
  { key: 'ANTHROPIC_API_KEY', description: 'Claude LLM features (optional if using OpenAI).' },
  { key: 'QDRANT_URL', description: 'Vector search endpoint (optional).' },
  { key: 'QDRANT_API_KEY', description: 'Qdrant auth token when enabled.' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_45%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center px-6 pb-20 pt-20 text-center sm:pt-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">
            Reham AI
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            A next-generation Vibe Coding platform built for immersive AI collaboration.
          </h1>
          <p className="mt-6 max-w-3xl text-base text-slate-300 sm:text-lg">
            Deliver fully interactive experiences with a modern dark UI, real-time previews, and a multi-LLM
            architecture that scales across Cloudflare infrastructure.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href="/dashboard" className="btn btn-primary">
              Launch Dashboard
            </Link>
            <a href="#setup" className="btn btn-secondary">
              View Setup Checklist
            </a>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {highlights.map((item) => (
            <FeatureCard key={item.title} title={item.title} description={item.description} icon={item.icon} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
            <h2 className="text-2xl font-semibold text-white">Experience Flow</h2>
            <p className="mt-3 text-sm text-slate-400">
              Reham AI keeps teams in a tight loop from concept to deployment, with each step tracked and
              visible.
            </p>
            <ol className="mt-6 space-y-4 text-sm text-slate-200">
              {experienceFlow.map((step, index) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-200">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
          <div
            id="setup"
            className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/60 to-slate-950 p-8"
          >
            <h2 className="text-2xl font-semibold text-white">Setup Checklist</h2>
            <p className="mt-3 text-sm text-slate-400">
              Keep your environment ready with every required key and endpoint.
            </p>
            <ul className="mt-6 space-y-4 text-sm">
              {apiKeys.map((item) => (
                <li key={item.key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <p className="font-semibold text-slate-100">{item.key}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ title, description, icon }: { title: string; description: string; icon: string }) {
  return (
    <div className="group flex h-full flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900/80">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-2xl">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}
