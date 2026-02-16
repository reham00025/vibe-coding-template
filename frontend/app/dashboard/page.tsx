'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import { generateText } from '@/services/llm';
import { getCurrentUser, signOut } from '@/services/supabase';

type StrategyDay = {
  day: string;
  platform: string;
  content_angle: string;
  asset_prompt: string;
  posting_time: string;
};

type CampaignStrategy = {
  campaign_goal: string;
  days: StrategyDay[];
};

type Asset = {
  id: number;
  prompt: string;
  url: string;
  createdAt: string;
};

type ScheduleItem = {
  id: number;
  platform: string;
  postingTime: string;
  content: string;
  mediaUrl: string;
  status: 'Scheduled';
};

const STORAGE_KEYS = {
  strategy: 'marketing-agent:strategy',
  assets: 'marketing-agent:assets',
  queue: 'marketing-agent:queue',
};

function parseStrategy(rawText: string, campaignGoal: string): CampaignStrategy {
  const fallback: CampaignStrategy = {
    campaign_goal: campaignGoal,
    days: [
      {
        day: 'Day 1',
        platform: 'LinkedIn',
        content_angle: rawText,
        asset_prompt: `Professional hero image for ${campaignGoal}`,
        posting_time: '09:00',
      },
    ],
  };

  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return fallback;
    }

    const parsed = JSON.parse(jsonMatch[0]) as Partial<CampaignStrategy>;
    if (!parsed.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      return fallback;
    }

    const normalizedDays = parsed.days
      .map((day, index) => ({
        day: day.day || `Day ${index + 1}`,
        platform: day.platform || 'LinkedIn',
        content_angle: day.content_angle || 'Thought leadership post',
        asset_prompt: day.asset_prompt || `Social media visual for ${campaignGoal}`,
        posting_time: day.posting_time || '09:00',
      }))
      .slice(0, 3);

    return {
      campaign_goal: parsed.campaign_goal || campaignGoal,
      days: normalizedDays,
    };
  } catch {
    return fallback;
  }
}

export default function Dashboard() {
  const [user, setUser] = useState<{ email?: string } | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'strategy' | 'studio' | 'calendar'>('dashboard');
  const [campaignGoal, setCampaignGoal] = useState('');
  const [assetPrompt, setAssetPrompt] = useState('');
  const [agentStatus, setAgentStatus] = useState('Idle');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentStrategy, setCurrentStrategy] = useState<CampaignStrategy | null>(null);
  const [currentAssets, setCurrentAssets] = useState<Asset[]>([]);
  const [scheduleQueue, setScheduleQueue] = useState<ScheduleItem[]>([]);

  const router = useRouter();

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser ? { email: currentUser.email } : null);
      } catch (loadError) {
        console.error('Error loading user:', loadError);
      } finally {
        setIsLoadingUser(false);
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
      setCurrentStrategy(JSON.parse(savedStrategy) as CampaignStrategy);
    }
    if (savedAssets) {
      setCurrentAssets(JSON.parse(savedAssets) as Asset[]);
    }
    if (savedQueue) {
      setScheduleQueue(JSON.parse(savedQueue) as ScheduleItem[]);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.strategy, JSON.stringify(currentStrategy));
    }
  }, [currentStrategy]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.assets, JSON.stringify(currentAssets));
    }
  }, [currentAssets]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(scheduleQueue));
    }
  }, [scheduleQueue]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/');
    } catch (signOutError) {
      console.error('Error signing out:', signOutError);
    }
  };

  const runStrategyAgent = async () => {
    if (!campaignGoal.trim()) {
      setError('Please enter a campaign goal first.');
      return;
    }

    setError(null);
    setLoading(true);
    setAgentStatus('Building campaign strategy...');

    try {
      const response = await generateText({
        prompt: `You are an expert marketing strategist. Return strict JSON only with shape: {"campaign_goal": string, "days": [{"day": string, "platform": string, "content_angle": string, "asset_prompt": string, "posting_time": string}]}. Create exactly 3 day plans for this goal: ${campaignGoal}`,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        max_tokens: 700,
        temperature: 0.5,
      });

      const strategy = parseStrategy(response.text, campaignGoal);
      setCurrentStrategy(strategy);
      setAssetPrompt(strategy.days[0]?.asset_prompt || '');
      setAgentStatus('Strategy ready');
      setActiveTab('strategy');
    } catch (strategyError: unknown) {
      const message = strategyError instanceof Error ? strategyError.message : 'Failed to generate strategy.';
      setError(message);
      setAgentStatus('Strategy generation failed');
    } finally {
      setLoading(false);
    }
  };

  const runCreativeAgent = async () => {
    if (!assetPrompt.trim()) {
      setError('Please enter an asset prompt.');
      return;
    }

    setError(null);
    setLoading(true);
    setAgentStatus('Generating creative asset...');

    try {
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(assetPrompt)}?width=1024&height=1024&nologo=true`;

      const newAsset: Asset = {
        id: Date.now(),
        prompt: assetPrompt,
        url,
        createdAt: new Date().toISOString(),
      };

      setCurrentAssets((prev) => [newAsset, ...prev]);
      setAgentStatus('Asset generated');
      setActiveTab('studio');
    } finally {
      setLoading(false);
    }
  };

  const addToQueue = (asset: Asset, platform: string, postingTime: string, content: string) => {
    const newItem: ScheduleItem = {
      id: Date.now(),
      platform,
      postingTime,
      content,
      mediaUrl: asset.url,
      status: 'Scheduled',
    };

    setScheduleQueue((prev) => [newItem, ...prev]);
    setAgentStatus(`Queued post for ${platform}`);
  };

  const stats = useMemo(
    () => ({
      strategyDays: currentStrategy?.days.length ?? 0,
      assets: currentAssets.length,
      queued: scheduleQueue.length,
    }),
    [currentStrategy, currentAssets.length, scheduleQueue.length],
  );

  if (isLoadingUser) {
    return <div className="p-8 text-center">Loading dashboard...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Sign In to Access Marketing Agent</h1>
        <LoginForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Marketing Agent Pro</h1>
            <p className="text-xs text-slate-400">Autonomous planning with open integrations</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/" className="text-slate-300 hover:text-white">
              Home
            </Link>
            <span className="text-slate-500">{user.email}</span>
            <button onClick={handleSignOut} className="rounded bg-red-600 px-3 py-1.5 hover:bg-red-500">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid md:grid-cols-4 gap-3">
          {['dashboard', 'strategy', 'studio', 'calendar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as 'dashboard' | 'strategy' | 'studio' | 'calendar')}
              className={`rounded-lg px-4 py-2 capitalize border ${activeTab === tab ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-800 hover:bg-slate-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-indigo-300">Status: {agentStatus}</div>

        {error && <div className="rounded border border-red-400 bg-red-950 px-4 py-3 text-red-200">{error}</div>}

        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
              <h2 className="text-2xl font-bold">Campaign Command Center</h2>
              <p className="text-slate-400 text-sm">Describe your goal, generate a 3-day strategy, then create and queue assets.</p>
              <input
                value={campaignGoal}
                onChange={(event) => setCampaignGoal(event.target.value)}
                placeholder="e.g. Increase trial signups for AI assistant in SMB market"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
              <div className="flex gap-3">
                <button onClick={runStrategyAgent} disabled={loading} className="rounded bg-indigo-600 px-4 py-2 font-semibold hover:bg-indigo-500 disabled:opacity-50">
                  {loading ? 'Working...' : 'Run Strategy Agent'}
                </button>
                <button onClick={runCreativeAgent} disabled={loading} className="rounded bg-purple-600 px-4 py-2 font-semibold hover:bg-purple-500 disabled:opacity-50">
                  Generate Asset
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="Strategy Days" value={String(stats.strategyDays)} />
              <StatCard label="Assets" value={String(stats.assets)} />
              <StatCard label="Queued Posts" value={String(stats.queued)} />
            </div>
          </div>
        )}

        {activeTab === 'strategy' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-bold mb-4">Current Strategy</h2>
            {!currentStrategy ? (
              <p className="text-slate-400">No strategy yet. Generate one from the dashboard.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-300">
                  <span className="font-semibold">Goal:</span> {currentStrategy.campaign_goal}
                </p>
                <div className="grid gap-3">
                  {currentStrategy.days.map((day) => (
                    <div key={day.day} className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm space-y-1">
                      <p className="font-semibold text-indigo-300">{day.day} • {day.platform}</p>
                      <p><span className="text-slate-400">Angle:</span> {day.content_angle}</p>
                      <p><span className="text-slate-400">Prompt:</span> {day.asset_prompt}</p>
                      <p><span className="text-slate-400">Post Time:</span> {day.posting_time}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-3">
              <h2 className="text-xl font-bold">Asset Studio</h2>
              <textarea
                value={assetPrompt}
                onChange={(event) => setAssetPrompt(event.target.value)}
                rows={3}
                placeholder="High-end launch visual for AI workflow product"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3"
              />
              <button onClick={runCreativeAgent} disabled={loading} className="rounded bg-purple-600 px-4 py-2 font-semibold hover:bg-purple-500 disabled:opacity-50">
                {loading ? 'Generating...' : 'Generate Free-Tier Image'}
              </button>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentAssets.map((asset) => (
                <div key={asset.id} className="rounded-xl border border-slate-800 bg-slate-900 p-3 space-y-3">
                  <img src={asset.url} alt={asset.prompt} className="w-full aspect-square rounded object-cover" />
                  <p className="text-xs text-slate-300 line-clamp-2">{asset.prompt}</p>
                  <button
                    onClick={() => addToQueue(asset, 'Instagram', 'Tomorrow 10:00', 'Launch teaser')}
                    className="w-full rounded bg-emerald-600 py-2 text-sm font-semibold hover:bg-emerald-500"
                  >
                    Add to Queue
                  </button>
                </div>
              ))}
              {currentAssets.length === 0 && <p className="text-slate-500">No assets generated yet.</p>}
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-slate-300">
                <tr>
                  <th className="text-left px-4 py-3">Platform</th>
                  <th className="text-left px-4 py-3">Time</th>
                  <th className="text-left px-4 py-3">Content</th>
                  <th className="text-left px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {scheduleQueue.map((item) => (
                  <tr key={item.id} className="border-t border-slate-800">
                    <td className="px-4 py-3">{item.platform}</td>
                    <td className="px-4 py-3">{item.postingTime}</td>
                    <td className="px-4 py-3">{item.content}</td>
                    <td className="px-4 py-3 text-emerald-400">{item.status}</td>
                  </tr>
                ))}
                {scheduleQueue.length === 0 && (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={4}>No scheduled posts yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-slate-400">{label}</p>
    </div>
  );
}
