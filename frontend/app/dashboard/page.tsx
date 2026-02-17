'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { generateText } from '@/services/llm';
import { getCurrentUser, signOut } from '@/services/supabase';

type ActiveTab = 'home' | 'strategy' | 'studio' | 'queue';

type StrategyDay = {
  day: string;
  platform: string;
  contentAngle: string;
  assetPrompt: string;
  postingTime: string;
};

type CampaignStrategy = {
  campaignGoal: string;
  days: StrategyDay[];
};

type Asset = {
  id: number;
  prompt: string;
  imageUrl: string;
};

type QueueItem = {
  id: number;
  platform: string;
  postingTime: string;
  caption: string;
  status: 'Scheduled';
};

const STORAGE_KEYS = {
  strategy: 'mobile-agent:strategy',
  assets: 'mobile-agent:assets',
  queue: 'mobile-agent:queue',
};

function parseStrategy(raw: string, campaignGoal: string): CampaignStrategy {
  const fallback: CampaignStrategy = {
    campaignGoal,
    days: [
      {
        day: 'Day 1',
        platform: 'Instagram',
        contentAngle: raw,
        assetPrompt: `Mobile-first ad creative for ${campaignGoal}`,
        postingTime: '10:00',
      },
    ],
  };

  try {
    const jsonBlock = raw.match(/\{[\s\S]*\}/);
    if (!jsonBlock) {
      return fallback;
    }

    const parsed = JSON.parse(jsonBlock[0]) as {
      campaign_goal?: string;
      days?: Array<{
        day?: string;
        platform?: string;
        content_angle?: string;
        asset_prompt?: string;
        posting_time?: string;
      }>;
    };

    if (!parsed.days?.length) {
      return fallback;
    }

    const days: StrategyDay[] = parsed.days.slice(0, 3).map((item, index) => ({
      day: item.day || `Day ${index + 1}`,
      platform: item.platform || 'Instagram',
      contentAngle: item.content_angle || 'Feature highlight',
      assetPrompt: item.asset_prompt || `Mobile social creative for ${campaignGoal}`,
      postingTime: item.posting_time || '10:00',
    }));

    return {
      campaignGoal: parsed.campaign_goal || campaignGoal,
      days,
    };
  } catch {
    return fallback;
  }
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');

  const [campaignGoal, setCampaignGoal] = useState('');
  const [assetPrompt, setAssetPrompt] = useState('');
  const [agentStatus, setAgentStatus] = useState('Ready');
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [strategy, setStrategy] = useState<CampaignStrategy | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser ? { email: currentUser.email } : null);
      } catch (loadError) {
        console.error('Failed to load user:', loadError);
      } finally {
        setLoadingUser(false);
      }
    }

    loadUser();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const savedStrategy = localStorage.getItem(STORAGE_KEYS.strategy);
    const savedAssets = localStorage.getItem(STORAGE_KEYS.assets);
    const savedQueue = localStorage.getItem(STORAGE_KEYS.queue);

    if (savedStrategy) {
      setStrategy(JSON.parse(savedStrategy) as CampaignStrategy);
    }
    if (savedAssets) {
      setAssets(JSON.parse(savedAssets) as Asset[]);
    }
    if (savedQueue) {
      setQueue(JSON.parse(savedQueue) as QueueItem[]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.strategy, JSON.stringify(strategy));
      localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(assets));
      localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
    }
  }, [strategy, assets, queue]);

  const runStrategyAgent = async () => {
    if (!campaignGoal.trim()) {
      setError('Add your campaign goal first.');
      return;
    }

    setError(null);
    setIsWorking(true);
    setAgentStatus('Planning campaign');

    try {
      const result = await generateText({
        prompt: `Return strict JSON only with keys campaign_goal and days. days must include 3 items and each item must include day, platform, content_angle, asset_prompt, posting_time. Goal: ${campaignGoal}`,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.4,
        max_tokens: 700,
      });

      const parsed = parseStrategy(result.text, campaignGoal);
      setStrategy(parsed);
      setAssetPrompt(parsed.days[0]?.assetPrompt || '');
      setAgentStatus('Strategy ready');
      setActiveTab('strategy');
    } catch (strategyError: unknown) {
      const message = strategyError instanceof Error ? strategyError.message : 'Failed to generate strategy.';
      setError(message);
      setAgentStatus('Strategy failed');
    } finally {
      setIsWorking(false);
    }
  };

  const runCreativeAgent = async () => {
    if (!assetPrompt.trim()) {
      setError('Add an image prompt first.');
      return;
    }

    setError(null);
    setIsWorking(true);
    setAgentStatus('Generating image');

    try {
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(assetPrompt)}?width=1080&height=1350&nologo=true`;
      const newAsset: Asset = { id: Date.now(), prompt: assetPrompt, imageUrl };
      setAssets((prev) => [newAsset, ...prev]);
      setAgentStatus('Image ready');
      setActiveTab('studio');
    } finally {
      setIsWorking(false);
    }
  };

  const addToQueue = (asset: Asset) => {
    const newItem: QueueItem = {
      id: Date.now(),
      platform: 'Instagram',
      postingTime: 'Tomorrow 10:00',
      caption: `Launch post: ${asset.prompt}`,
      status: 'Scheduled',
    };

    setQueue((prev) => [newItem, ...prev]);
    setAgentStatus('Post queued');
    setActiveTab('queue');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/');
    } catch (signOutError) {
      console.error('Failed to sign out:', signOutError);
    }
  };

  const stats = useMemo(
    () => ({
      plans: strategy?.days.length ?? 0,
      assets: assets.length,
      queued: queue.length,
    }),
    [strategy, assets.length, queue.length],
  );

  if (loadingUser) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold text-center mb-5">Sign in to use Mobile Agent</h1>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20">
      <main className="mx-auto w-full max-w-md px-4 pt-5 space-y-4">
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-indigo-300">Vercel-ready mobile UI</p>
              <h1 className="text-xl font-bold">Marketing Agent</h1>
            </div>
            <button onClick={handleSignOut} className="rounded-md bg-red-600 px-2.5 py-1.5 text-xs">
              Sign Out
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400 truncate">{user.email}</p>
          <p className="mt-3 text-sm text-indigo-300">Status: {isWorking ? 'Working...' : agentStatus}</p>
          {error && <p className="mt-2 rounded-md bg-red-950 px-3 py-2 text-xs text-red-200">{error}</p>}
        </section>

        {activeTab === 'home' && (
          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <h2 className="font-semibold">1) Campaign Goal</h2>
              <textarea
                rows={3}
                value={campaignGoal}
                onChange={(event) => setCampaignGoal(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Increase free trial signups from mobile social channels"
              />
              <button onClick={runStrategyAgent} disabled={isWorking} className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold disabled:opacity-50">
                Generate 3-Day Strategy
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Plans" value={String(stats.plans)} />
              <MiniStat label="Assets" value={String(stats.assets)} />
              <MiniStat label="Queued" value={String(stats.queued)} />
            </div>
          </section>
        )}

        {activeTab === 'strategy' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h2 className="font-semibold">2) Strategy</h2>
            {!strategy ? (
              <p className="text-sm text-slate-400">No strategy yet.</p>
            ) : (
              <>
                <p className="text-xs text-slate-300">Goal: {strategy.campaignGoal}</p>
                {strategy.days.map((item) => (
                  <article key={`${item.day}-${item.platform}`} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                    <p className="font-semibold text-indigo-300">{item.day} · {item.platform}</p>
                    <p><span className="text-slate-400">Angle:</span> {item.contentAngle}</p>
                    <p><span className="text-slate-400">Prompt:</span> {item.assetPrompt}</p>
                    <p><span className="text-slate-400">Time:</span> {item.postingTime}</p>
                  </article>
                ))}
                <button onClick={() => setActiveTab('studio')} className="w-full rounded-xl bg-purple-600 py-2 text-sm font-semibold">
                  Continue to Asset Studio
                </button>
              </>
            )}
          </section>
        )}

        {activeTab === 'studio' && (
          <section className="space-y-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
              <h2 className="font-semibold">3) Asset Studio</h2>
              <textarea
                rows={3}
                value={assetPrompt}
                onChange={(event) => setAssetPrompt(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
                placeholder="Cinematic social ad for AI assistant launch"
              />
              <button onClick={runCreativeAgent} disabled={isWorking} className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold disabled:opacity-50">
                Generate Free Image
              </button>
            </div>

            {assets.map((asset) => (
              <article key={asset.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-3 space-y-3">
                <img src={asset.imageUrl} alt={asset.prompt} className="w-full rounded-xl aspect-[4/5] object-cover" />
                <p className="text-xs text-slate-300">{asset.prompt}</p>
                <button onClick={() => addToQueue(asset)} className="w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold">
                  Queue Post
                </button>
              </article>
            ))}
            {assets.length === 0 && <p className="text-center text-sm text-slate-500">No assets yet.</p>}
          </section>
        )}

        {activeTab === 'queue' && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
            <h2 className="font-semibold mb-3">4) Publishing Queue</h2>
            <div className="space-y-2">
              {queue.map((item) => (
                <article key={item.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs space-y-1">
                  <p className="font-semibold text-indigo-300">{item.platform} · {item.status}</p>
                  <p><span className="text-slate-400">Time:</span> {item.postingTime}</p>
                  <p><span className="text-slate-400">Caption:</span> {item.caption}</p>
                </article>
              ))}
            </div>
            {queue.length === 0 && <p className="text-sm text-slate-500">No scheduled posts yet.</p>}
          </section>
        )}

        <div className="pt-1 text-center space-y-1">
          <div>
            <Link href="/preview" className="text-xs text-indigo-300 underline">
              Open interactive HTML preview
            </Link>
          </div>
          <div>
            <Link href="/" className="text-xs text-slate-500 underline">
              Back to home
            </Link>
          </div>
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1 p-2">
          <TabButton label="Home" tab="home" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton label="Plan" tab="strategy" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton label="Studio" tab="studio" activeTab={activeTab} onClick={setActiveTab} />
          <TabButton label="Queue" tab="queue" activeTab={activeTab} onClick={setActiveTab} />
        </div>
      </nav>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  );
}

function TabButton({
  label,
  tab,
  activeTab,
  onClick,
}: {
  label: string;
  tab: ActiveTab;
  activeTab: ActiveTab;
  onClick: (tab: ActiveTab) => void;
}) {
  return (
    <button
      onClick={() => onClick(tab)}
      className={`rounded-lg py-2 text-xs font-semibold ${activeTab === tab ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-300'}`}
    >
      {label}
    </button>
  );
}
