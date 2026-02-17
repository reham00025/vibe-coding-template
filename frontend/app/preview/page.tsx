'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

type Theme = 'dark' | 'light';

function buildPreviewHtml(headline: string, subheading: string, cta: string, brand: string, theme: Theme): string {
  const isDark = theme === 'dark';
  const bg = isDark ? '#020617' : '#f8fafc';
  const card = isDark ? '#0f172a' : '#ffffff';
  const text = isDark ? '#e2e8f0' : '#0f172a';
  const sub = isDark ? '#94a3b8' : '#475569';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${brand} Campaign Preview</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Inter, Arial, sans-serif;
      background: ${bg};
      color: ${text};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      width: min(420px, 100%);
      background: ${card};
      border-radius: 20px;
      border: 1px solid ${isDark ? '#1e293b' : '#cbd5e1'};
      padding: 24px;
      box-shadow: 0 10px 30px rgba(15,23,42,0.2);
    }
    .brand { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #818cf8; margin-bottom: 12px; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.2; }
    p { margin: 0 0 20px; color: ${sub}; }
    .cta {
      display: inline-block;
      text-decoration: none;
      background: #4f46e5;
      color: white;
      font-weight: 600;
      padding: 12px 16px;
      border-radius: 12px;
    }
  </style>
</head>
<body>
  <section class="card">
    <p class="brand">${brand}</p>
    <h1>${headline}</h1>
    <p>${subheading}</p>
    <a class="cta" href="#">${cta}</a>
  </section>
</body>
</html>`;
}

export default function PreviewPage() {
  const [brand, setBrand] = useState('Marketing Agent Pro');
  const [headline, setHeadline] = useState('Launch your next campaign with confidence');
  const [subheading, setSubheading] = useState('Generate strategy, creative assets, and scheduling plans in one mobile-first flow.');
  const [cta, setCta] = useState('Start Free Trial');
  const [theme, setTheme] = useState<Theme>('dark');

  const html = useMemo(() => buildPreviewHtml(headline, subheading, cta, brand, theme), [headline, subheading, cta, brand, theme]);

  const downloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'campaign-preview.html';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <main className="mx-auto max-w-6xl grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold">Interactive HTML Preview Builder</h1>
            <Link href="/dashboard" className="text-xs text-indigo-300 underline">Back</Link>
          </div>

          <label className="block text-sm">
            Brand
            <input value={brand} onChange={(e) => setBrand(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" />
          </label>

          <label className="block text-sm">
            Headline
            <input value={headline} onChange={(e) => setHeadline(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" />
          </label>

          <label className="block text-sm">
            Subheading
            <textarea value={subheading} onChange={(e) => setSubheading(e.target.value)} rows={3} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" />
          </label>

          <label className="block text-sm">
            CTA Label
            <input value={cta} onChange={(e) => setCta(e.target.value)} className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2" />
          </label>

          <div className="flex gap-2">
            <button onClick={() => setTheme('dark')} className={`rounded px-3 py-2 text-sm ${theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-800'}`}>Dark</button>
            <button onClick={() => setTheme('light')} className={`rounded px-3 py-2 text-sm ${theme === 'light' ? 'bg-indigo-600' : 'bg-slate-800'}`}>Light</button>
            <button onClick={downloadHtml} className="ml-auto rounded bg-emerald-600 px-3 py-2 text-sm font-semibold">Download HTML</button>
          </div>

          <details>
            <summary className="cursor-pointer text-sm text-slate-300">View Generated HTML</summary>
            <pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-300">{html}</pre>
          </details>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <h2 className="text-sm text-slate-300 mb-2">Live Visual Preview</h2>
          <iframe title="HTML Preview" srcDoc={html} className="h-[75vh] w-full rounded-xl border border-slate-800 bg-white" />
        </section>
      </main>
    </div>
  );
}
