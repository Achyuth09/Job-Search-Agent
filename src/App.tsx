import { useState, useEffect, useCallback } from 'react';
import { Job, Preferences, SearchState } from './types';
import { defaultPreferences } from './data/defaults';
import { fetchAllJobs, SourceStatus } from './services/jobApis';
import { filterAndSortJobs } from './services/scorer';
import { sendToSlack, sendBulkToSlack, testWebhook } from './services/slack';
import {
  Search, Settings, Send, CheckCircle2, XCircle, Loader2,
  ExternalLink, Sliders, Zap, Briefcase, Bell, X, ChevronDown, ChevronUp,
} from 'lucide-react';

type Tab = 'search' | 'results' | 'settings';

export default function App() {
  const [tab, setTab] = useState<Tab>('search');
  const [prefs, setPrefs] = useState<Preferences>(() => {
    const saved = localStorage.getItem('ajh_prefs');
    return saved ? JSON.parse(saved) : defaultPreferences;
  });
  const [webhookUrl, setWebhookUrl] = useState(() => 
    localStorage.getItem('ajh_webhook') || import.meta.env.VITE_SLACK_WEBHOOK_URL || ''
  );
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchState, setSearchState] = useState<SearchState>({
    status: 'idle', totalFetched: 0, totalMatched: 0, sources: [],
  });
  const [sourceUpdates, setSourceUpdates] = useState<SourceStatus[]>([]);
  const [sendingToSlack, setSendingToSlack] = useState(false);
  const [slackProgress, setSlackProgress] = useState({ sent: 0, total: 0 });
  const [sentJobs, setSentJobs] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('ajh_sent');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showPrefs, setShowPrefs] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState<'idle' | 'success' | 'fail'>('idle');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  // Save prefs to localStorage
  useEffect(() => {
    localStorage.setItem('ajh_prefs', JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    localStorage.setItem('ajh_webhook', webhookUrl);
  }, [webhookUrl]);

  useEffect(() => {
    localStorage.setItem('ajh_sent', JSON.stringify([...sentJobs]));
  }, [sentJobs]);

  const runSearch = useCallback(async () => {
    setSearchState({ status: 'searching', totalFetched: 0, totalMatched: 0, sources: [] });
    setSourceUpdates([]);

    try {
      const allJobs = await fetchAllJobs((status) => {
        setSourceUpdates(prev => [...prev, status]);
      });

      const matched = filterAndSortJobs(allJobs, prefs);

      setJobs(matched);
      setSearchState({
        status: 'done',
        totalFetched: allJobs.length,
        totalMatched: matched.length,
        sources: sourceUpdates.length > 0 ? sourceUpdates : [
          { name: 'Remotive', count: allJobs.filter(j => j.source === 'Remotive').length, status: 'success' },
          { name: 'Arbeitnow', count: allJobs.filter(j => j.source === 'Arbeitnow').length, status: 'success' },
          { name: 'RemoteOK', count: allJobs.filter(j => j.source === 'RemoteOK').length, status: 'success' },
        ],
      });
      setTab('results');
    } catch (e) {
      setSearchState({
        status: 'error',
        totalFetched: 0,
        totalMatched: 0,
        sources: [],
        error: String(e),
      });
    }
  }, [prefs, sourceUpdates]);

  const handleSendToSlack = async (job: Job) => {
    if (!webhookUrl) {
      setTab('settings');
      return;
    }
    const success = await sendToSlack(webhookUrl, job);
    if (success) {
      setSentJobs(prev => new Set([...prev, job.id]));
    }
  };

  const handleSendAllToSlack = async () => {
    if (!webhookUrl) {
      setTab('settings');
      return;
    }
    const unsent = jobs.filter(j => !sentJobs.has(j.id));
    if (unsent.length === 0) return;

    setSendingToSlack(true);
    setSlackProgress({ sent: 0, total: unsent.length });

    const result = await sendBulkToSlack(webhookUrl, unsent, (sent, total) => {
      setSlackProgress({ sent, total });
    });

    // Update sent jobs
    const newSent = new Set(sentJobs);
    unsent.slice(0, result.sent).forEach(j => newSent.add(j.id));
    setSentJobs(newSent);
    setSendingToSlack(false);
  };

  const handleTestWebhook = async () => {
    setWebhookTestResult('idle');
    const ok = await testWebhook(webhookUrl);
    setWebhookTestResult(ok ? 'success' : 'fail');
  };

  const unsentCount = jobs.filter(j => !sentJobs.has(j.id)).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Job Search Agent</h1>
              <p className="text-xs text-gray-500">Achyuthananda Reddy Mukkara</p>
            </div>
          </div>
          <nav className="flex items-center gap-1">
            <TabButton active={tab === 'search'} onClick={() => setTab('search')} icon={Search} label="Search" />
            <TabButton active={tab === 'results'} onClick={() => setTab('results')} icon={Briefcase} label={`Results${jobs.length > 0 ? ` (${jobs.length})` : ''}`} />
            <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings} label="Settings" />
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Search Tab */}
        {tab === 'search' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Job Search Agent</h2>
              <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">
                Automatically searches job portals, filters matches based on your profile,
                and sends the best opportunities to your Slack channel.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Agent Ready
              </div>

              <button
                onClick={runSearch}
                disabled={searchState.status === 'searching'}
                className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searchState.status === 'searching' ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Searching job sources...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5" />
                    Search for Jobs
                  </>
                )}
              </button>
            </div>

            {/* Search Progress */}
            {searchState.status === 'searching' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Fetching from job sources...</h3>
                <div className="space-y-2">
                  {['Remotive', 'Arbeitnow', 'RemoteOK'].map(source => {
                    const update = sourceUpdates.find(s => s.name === source);
                    return (
                      <div key={source} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                        {update ? (
                          update.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )
                        ) : (
                          <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />
                        )}
                        <span className="text-sm text-gray-700">{source}</span>
                        {update && (
                          <span className="text-xs text-gray-500 ml-auto">
                            {update.count} jobs found
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search Results Summary */}
            {searchState.status === 'done' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Search Complete</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-blue-50">
                    <p className="text-2xl font-bold text-blue-700">{searchState.totalFetched}</p>
                    <p className="text-xs text-blue-600">Jobs Found</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50">
                    <p className="text-2xl font-bold text-green-700">{searchState.totalMatched}</p>
                    <p className="text-xs text-green-600">Matched</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-purple-50">
                    <p className="text-2xl font-bold text-purple-700">{unsentCount}</p>
                    <p className="text-xs text-purple-600">Unsent to Slack</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => setTab('results')}
                    className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                  >
                    View Results →
                  </button>
                  {unsentCount > 0 && webhookUrl && (
                    <button
                      onClick={handleSendAllToSlack}
                      disabled={sendingToSlack}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      <Send className="h-4 w-4 inline mr-1" />
                      Send All to Slack
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Quick Preferences */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <button
                onClick={() => setShowPrefs(!showPrefs)}
                className="flex items-center justify-between w-full"
              >
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Search Preferences</h3>
                </div>
                {showPrefs ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
              </button>

              {showPrefs && (
                <div className="mt-4 space-y-4">
                  <PrefSection
                    label="Job Titles"
                    items={prefs.jobTitles}
                    onRemove={(i) => setPrefs({ ...prefs, jobTitles: prefs.jobTitles.filter((_, idx) => idx !== i) })}
                    onAdd={(v) => setPrefs({ ...prefs, jobTitles: [...prefs.jobTitles, v] })}
                    color="indigo"
                  />
                  <PrefSection
                    label="Technologies"
                    items={prefs.technologies}
                    onRemove={(i) => setPrefs({ ...prefs, technologies: prefs.technologies.filter((_, idx) => idx !== i) })}
                    onAdd={(v) => setPrefs({ ...prefs, technologies: [...prefs.technologies, v] })}
                    color="green"
                  />
                  <PrefSection
                    label="Locations"
                    items={prefs.locations}
                    onRemove={(i) => setPrefs({ ...prefs, locations: prefs.locations.filter((_, idx) => idx !== i) })}
                    onAdd={(v) => setPrefs({ ...prefs, locations: [...prefs.locations, v] })}
                    color="purple"
                  />
                  <div>
                    <label className="text-xs font-medium text-gray-600">Min Match Score: {prefs.minMatchScore}%</label>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={prefs.minMatchScore}
                      onChange={(e) => setPrefs({ ...prefs, minMatchScore: Number(e.target.value) })}
                      className="w-full mt-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Tab */}
        {tab === 'results' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Matched Jobs</h2>
                <p className="text-sm text-gray-500">{jobs.length} jobs found • {unsentCount} not yet sent to Slack</p>
              </div>
              {unsentCount > 0 && webhookUrl && (
                <button
                  onClick={handleSendAllToSlack}
                  disabled={sendingToSlack}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {sendingToSlack ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending {slackProgress.sent}/{slackProgress.total}...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send {unsentCount} to Slack
                    </>
                  )}
                </button>
              )}
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No jobs found yet. Run a search first!</p>
                <button
                  onClick={() => setTab('search')}
                  className="mt-4 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  Search Now
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    sent={sentJobs.has(job.id)}
                    expanded={expandedJob === job.id}
                    onToggle={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
                    onSend={() => handleSendToSlack(job)}
                    hasWebhook={!!webhookUrl}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-900">Slack Integration</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                  Pre-configured
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Your Slack webhook is already configured. You can update it below or create a new one at{' '}
                <a
                  href="https://api.slack.com/messaging/webhooks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 underline"
                >
                  api.slack.com/messaging/webhooks
                </a>
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={handleTestWebhook}
                  disabled={!webhookUrl}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Test
                </button>
              </div>
              {webhookTestResult === 'success' && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Webhook is working!
                </p>
              )}
              {webhookTestResult === 'fail' && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> Webhook test failed. Check the URL.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Job Preferences</h3>
              <div className="space-y-4">
                <PrefSection
                  label="Job Titles"
                  items={prefs.jobTitles}
                  onRemove={(i) => setPrefs({ ...prefs, jobTitles: prefs.jobTitles.filter((_, idx) => idx !== i) })}
                  onAdd={(v) => setPrefs({ ...prefs, jobTitles: [...prefs.jobTitles, v] })}
                  color="indigo"
                />
                <PrefSection
                  label="Technologies"
                  items={prefs.technologies}
                  onRemove={(i) => setPrefs({ ...prefs, technologies: prefs.technologies.filter((_, idx) => idx !== i) })}
                  onAdd={(v) => setPrefs({ ...prefs, technologies: [...prefs.technologies, v] })}
                  color="green"
                />
                <PrefSection
                  label="Locations"
                  items={prefs.locations}
                  onRemove={(i) => setPrefs({ ...prefs, locations: prefs.locations.filter((_, idx) => idx !== i) })}
                  onAdd={(v) => setPrefs({ ...prefs, locations: [...prefs.locations, v] })}
                  color="purple"
                />
                <div>
                  <label className="text-xs font-medium text-gray-600">Min Match Score: {prefs.minMatchScore}%</label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={prefs.minMatchScore}
                    onChange={(e) => setPrefs({ ...prefs, minMatchScore: Number(e.target.value) })}
                    className="w-full mt-1"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Agent Pipeline</h3>
              <div className="space-y-2">
                {[
                  { step: '1. Search', desc: 'Fetches jobs from Remotive, Arbeitnow, RemoteOK', icon: Search },
                  { step: '2. Score', desc: 'Matches jobs against your skills & preferences', icon: Sliders },
                  { step: '3. Filter', desc: 'Removes duplicates and low-quality matches', icon: Sliders },
                  { step: '4. Notify', desc: 'Sends best matches to your Slack channel', icon: Send },
                ].map(item => (
                  <div key={item.step} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                    <item.icon className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.step}</p>
                      <p className="text-xs text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// --- Sub-components ---

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function JobCard({ job, sent, expanded, onToggle, onSend, hasWebhook }: {
  job: Job; sent: boolean; expanded: boolean; onToggle: () => void; onSend: () => void; hasWebhook: boolean;
}) {
  const scoreColor = job.matchScore >= 70 ? 'text-green-700 bg-green-50' :
                     job.matchScore >= 50 ? 'text-yellow-700 bg-yellow-50' :
                     'text-gray-600 bg-gray-100';

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-gray-900">{job.title}</h3>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor}`}>
                {job.matchScore}%
              </span>
              {sent && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                  <CheckCircle2 className="h-3 w-3" /> Sent
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {job.company} • {job.location} {job.remote && '• Remote'} • {job.source}
            </p>
            {job.matchedSkills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {job.matchedSkills.slice(0, 6).map(skill => (
                  <span key={skill} className="inline-flex px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 ml-3">
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3">
          {job.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-4">{job.description}</p>
          )}
          {job.salary && (
            <p className="text-xs text-gray-500 mb-2">💰 {job.salary}</p>
          )}
          <div className="flex items-center gap-2">
            {!sent && hasWebhook && (
              <button
                onClick={(e) => { e.stopPropagation(); onSend(); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
              >
                <Send className="h-3 w-3" /> Send to Slack
              </button>
            )}
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ExternalLink className="h-3 w-3" /> View Job
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function PrefSection({ label, items, onRemove, onAdd, color }: {
  label: string; items: string[]; onRemove: (i: number) => void; onAdd: (v: string) => void; color: string;
}) {
  const [input, setInput] = useState('');

  const colorClasses: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-700',
    green: 'bg-green-50 text-green-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div>
      <label className="text-xs font-medium text-gray-600">{label}</label>
      <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
        {items.map((item, i) => (
          <span key={i} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${colorClasses[color]}`}>
            {item}
            <button onClick={() => onRemove(i)} className="hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim()) {
              onAdd(input.trim());
              setInput('');
            }
          }}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <button
          onClick={() => { if (input.trim()) { onAdd(input.trim()); setInput(''); } }}
          className="px-2 py-1.5 rounded-lg border border-gray-200 text-xs hover:bg-gray-50"
        >
          Add
        </button>
      </div>
    </div>
  );
}
