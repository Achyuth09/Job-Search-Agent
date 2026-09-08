import { Job, Preferences } from '../types';
import { SourceStatus } from './sources';

export type { SourceStatus } from './sources';
export { AGGREGATED_SOURCES, JOB_SOURCE_NAMES, PUBLIC_SOURCES } from './sources';

function jsearchEnabled(): boolean {
  return Boolean(typeof process !== 'undefined' && process.env.RAPIDAPI_KEY);
}

function stripHtml(html: string): string {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function toIso(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'number') {
    const ms = value < 1e12 ? value * 1000 : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function jsearchDatePosted(days?: number): string | undefined {
  if (!days) return undefined;
  if (days <= 1) return 'today';
  if (days <= 3) return '3days';
  if (days <= 7) return 'week';
  return 'month';
}

function formatSalary(min?: number | string | null, max?: number | string | null, currency = 'USD'): string {
  if (!min && !max) return '';
  const fmt = (n: number | string) => `${currency} ${Number(n).toLocaleString()}`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  return fmt((min || max) as number | string);
}

function makeJob(partial: Omit<Job, 'matchScore' | 'matchedSkills' | 'missingSkills' | 'remote'> & { remote?: boolean }): Job {
  return {
    remote: partial.remote ?? true,
    matchScore: 0,
    matchedSkills: [],
    missingSkills: [],
    ...partial,
  };
}

async function fetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function normalizeJob(raw: any, source: string): Job {
  const tags = raw.tags
    ? (Array.isArray(raw.tags) ? raw.tags : raw.tags.split(',').map((t: string) => t.trim()))
    : [];

  return makeJob({
    id: `${source}-${raw.id || raw.slug || Math.random().toString(36).slice(2)}`,
    title: raw.title || raw.job_title || '',
    company: raw.company_name || raw.company || '',
    location: raw.candidate_required_location?.[0] || raw.location || raw.job_location || 'Remote',
    url: raw.url || '',
    description: stripHtml(raw.description || ''),
    tags: tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
    salary: raw.salary || '',
    publishedAt: toIso(raw.publication_date || raw.created_at || raw.post_date),
    source,
  });
}

async function fetchRemotive(): Promise<Job[]> {
  const data = await fetchJson('https://remotive.com/api/remote-jobs?limit=100');
  return (data.jobs || []).map((j: any) => normalizeJob(j, 'Remotive'));
}

async function fetchArbeitnow(): Promise<Job[]> {
  const data = await fetchJson('https://www.arbeitnow.com/api/job-board-api');
  return (data.data || []).map((j: any) =>
    normalizeJob(
      {
        ...j,
        tags: j.tags || [],
        company_name: j.company_name || '',
        job_title: j.title || '',
        candidate_required_location: [j.location || ''],
      },
      'Arbeitnow'
    )
  );
}

async function fetchRemoteOK(): Promise<Job[]> {
  const data = await fetchJson('https://remoteok.com/api', {
    headers: { Accept: 'application/json' },
  });
  return (data || [])
    .filter((j: any) => j.id || j.position)
    .map((j: any) =>
      normalizeJob(
        {
          ...j,
          title: j.position || j.title || '',
          company_name: j.company || '',
          tags: j.tags || [],
          candidate_required_location: j.location ? [j.location] : ['worldwide'],
          description: j.description || '',
          salary: j.salary_min ? `$${j.salary_min} - $${j.salary_max}` : '',
          publication_date: j.date || '',
        },
        'RemoteOK'
      )
    );
}

async function fetchHimalayas(prefs?: Preferences): Promise<Job[]> {
  const jobs: Job[] = [];
  let cursor = '';

  for (let page = 0; page < 3; page++) {
    const qs = new URLSearchParams({ limit: '20' });
    if (cursor) qs.set('cursor', cursor);
    const url = `https://himalayas.app/jobs/api?${qs}`;
    const data = await fetchJson(url);
    jobs.push(...mapHimalayasJobs(data.jobs || []));
    if (!data.nextCursor) break;
    cursor = data.nextCursor;
  }

  const query = prefs?.jobTitles?.[0];
  if (query) {
    const qs = new URLSearchParams({ q: query, page: '1', sort: 'recent' });
    const url = `https://himalayas.app/jobs/api/search?${qs}`;
    const data = await fetchJson(url);
    jobs.push(...mapHimalayasJobs(data.jobs || []));
  }

  return dedupeJobs(jobs);
}

function mapHimalayasJobs(rawJobs: any[]): Job[] {
  return rawJobs.map((j: any) => {
    const locations = (j.locationRestrictions || []).map((l: any) => l.name).filter(Boolean);
    return makeJob({
      id: `Himalayas-${j.guid || j.applicationLink}`,
      title: j.title || '',
      company: j.companyName || '',
      location: locations.length ? locations.join(', ') : 'Worldwide',
      url: j.applicationLink || '',
      description: stripHtml(j.excerpt || j.description || ''),
      tags: [...(j.categories || []), ...(j.parentCategories || []), ...(j.seniority || [])].map((t: string) => t.toLowerCase()),
      salary: formatSalary(j.minSalary, j.maxSalary, j.currency || 'USD'),
      publishedAt: toIso(j.pubDate),
      source: 'Himalayas',
    });
  });
}

async function fetchJobicy(prefs?: Preferences): Promise<Job[]> {
  const requests = [
    fetchJson('https://jobicy.com/api/v2/remote-jobs?count=100&industry=engineering'),
  ];

  const tag = prefs?.jobTitles?.[0];
  if (tag && tag.length >= 3) {
    requests.push(fetchJson(`https://jobicy.com/api/v2/remote-jobs?count=50&tag=${encodeURIComponent(tag)}`));
  }

  const results = await Promise.allSettled(requests);
  const jobs: Job[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const j of result.value.jobs || []) {
      jobs.push(makeJob({
        id: `Jobicy-${j.id || j.jobSlug}`,
        title: j.jobTitle || '',
        company: j.companyName || '',
        location: j.jobGeo || 'Remote',
        url: j.url || '',
        description: stripHtml(j.jobExcerpt || j.jobDescription || ''),
        tags: [...(j.jobIndustry || []), ...(j.jobType || []), j.jobLevel].filter(Boolean).map((t: string) => t.toLowerCase()),
        salary: formatSalary(j.salaryMin, j.salaryMax, j.salaryCurrency || 'USD'),
        publishedAt: toIso(j.pubDate),
        source: 'Jobicy',
      }));
    }
  }
  return dedupeJobs(jobs);
}

async function fetchTheMuse(): Promise<Job[]> {
  const pages = await Promise.all([0, 1].map((page) =>
    fetchJson(`https://www.themuse.com/api/public/jobs?page=${page}&descending=true&category=${encodeURIComponent('Software Engineering')}`)
  ));

  return pages.flatMap((data) =>
    (data.results || []).map((j: any) => makeJob({
      id: `The Muse-${j.id}`,
      title: j.name || '',
      company: j.company?.name || '',
      location: j.locations?.[0]?.name || 'Remote',
      remote: (j.locations || []).some((l: any) => String(l.name || '').toLowerCase().includes('flexible') || String(l.name || '').toLowerCase().includes('remote')),
      url: j.refs?.landing_page || '',
      description: stripHtml(j.contents || ''),
      tags: [
        ...(j.categories || []).map((c: any) => c.name),
        ...(j.levels || []).map((l: any) => l.name),
      ].filter(Boolean).map((t: string) => t.toLowerCase()),
      publishedAt: toIso(j.publication_date),
      source: 'The Muse',
    }))
  );
}

async function fetchWeWorkRemotely(): Promise<Job[]> {
  const feeds = [
    '/categories/remote-programming-jobs.rss',
    '/categories/remote-full-stack-programming-jobs.rss',
  ];

  const xmls = await Promise.allSettled(
    feeds.map((path) =>
      fetchText(`https://weworkremotely.com${path}`)
    )
  );

  const jobs: Job[] = [];
  for (const result of xmls) {
    if (result.status !== 'fulfilled') continue;
    jobs.push(...parseWwrRss(result.value));
  }
  if (!jobs.length) throw new Error('We Work Remotely returned no jobs');
  return dedupeJobs(jobs);
}

function xmlTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return (match?.[1] || '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim();
}

function parseWwrRss(xml: string): Job[] {
  return xml.split(/<item>/i).slice(1).map((block, index) => {
    const rawTitle = xmlTag(block, 'title');
    const colon = rawTitle.indexOf(':');
    const company = colon > 0 ? rawTitle.slice(0, colon).trim() : 'We Work Remotely';
    const title = colon > 0 ? rawTitle.slice(colon + 1).trim() : rawTitle;
    const url = xmlTag(block, 'link');
    return makeJob({
      id: `We Work Remotely-${url || index}`,
      title,
      company,
      location: xmlTag(block, 'region') || 'Remote',
      url,
      description: stripHtml(xmlTag(block, 'description')),
      tags: ['remote'],
      publishedAt: toIso(xmlTag(block, 'pubDate')),
      source: 'We Work Remotely',
    });
  });
}

function mapPublisher(publisher: string): string {
  const value = (publisher || '').toLowerCase();
  if (value.includes('linkedin')) return 'LinkedIn';
  if (value.includes('indeed')) return 'Indeed';
  if (value.includes('glassdoor')) return 'Glassdoor';
  if (value.includes('ziprecruiter')) return 'ZipRecruiter';
  return publisher || 'Google Jobs';
}

async function fetchJSearchAll(prefs?: Preferences): Promise<Job[]> {
  if (!jsearchEnabled()) {
    const err = new Error('RAPIDAPI_KEY not configured');
    err.name = 'SourceSkippedError';
    throw err;
  }

  const title = prefs?.jobTitles?.[0] || 'software engineer';
  const location = prefs?.locations?.find((l) => l.toLowerCase() !== 'remote') || 'India';
  const queries = [
    `${title} remote via linkedin`,
    `${title} jobs in ${location} via linkedin`,
    `${title} remote via indeed`,
    `${title} remote`,
  ];

  const results = await Promise.allSettled(
    queries.map((query) => {
      const qs = new URLSearchParams({ query, page: '1', num_pages: '1', country: 'in' });
      const datePosted = jsearchDatePosted(prefs?.postedWithinDays);
      if (datePosted) qs.set('date_posted', datePosted);
      return fetchJson(`https://jsearch.p.rapidapi.com/search?${qs}`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY || '',
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com',
        },
      });
    })
  );

  const jobs: Job[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const j of result.value.data || []) {
      const source = mapPublisher(j.job_publisher || '');
      jobs.push(makeJob({
        id: `${source}-${j.job_id || j.job_apply_link}`,
        title: j.job_title || '',
        company: j.employer_name || '',
        location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(', ') || (j.job_is_remote ? 'Remote' : 'Unknown'),
        remote: Boolean(j.job_is_remote),
        url: j.job_apply_link || j.job_google_link || '',
        description: stripHtml(j.job_description || ''),
        tags: (j.job_employment_types || j.job_required_skills || []).map((t: string) => String(t).toLowerCase()),
        salary: formatSalary(j.job_min_salary, j.job_max_salary, j.job_salary_currency || 'USD'),
        publishedAt: toIso(j.job_posted_at_datetime_utc),
        source,
      }));
    }
  }

  if (!jobs.length) throw new Error('JSearch returned no jobs');
  return dedupeJobs(jobs);
}

function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.source}|${job.title.toLowerCase()}|${job.company.toLowerCase()}|${job.url}`;
    if (seen.has(key) || !job.title) return false;
    seen.add(key);
    return true;
  });
}

export async function fetchAllJobs(
  onSourceComplete?: (status: SourceStatus) => void,
  prefs?: Preferences
): Promise<Job[]> {
  let jsearchPromise: Promise<Job[]> | null = null;
  const getJSearch = () => {
    if (!jsearchPromise) jsearchPromise = fetchJSearchAll(prefs);
    return jsearchPromise;
  };

  const sources: { name: string; fn: () => Promise<Job[]> }[] = [
    { name: 'LinkedIn', fn: async () => (await getJSearch()).filter((j) => j.source === 'LinkedIn') },
    { name: 'Indeed', fn: async () => (await getJSearch()).filter((j) => j.source === 'Indeed') },
    { name: 'Glassdoor', fn: async () => (await getJSearch()).filter((j) => j.source === 'Glassdoor') },
    { name: 'ZipRecruiter', fn: async () => (await getJSearch()).filter((j) => j.source === 'ZipRecruiter') },
    { name: 'Google Jobs', fn: async () => (await getJSearch()).filter((j) => !['LinkedIn', 'Indeed', 'Glassdoor', 'ZipRecruiter'].includes(j.source)) },
    { name: 'Himalayas', fn: () => fetchHimalayas(prefs) },
    { name: 'Jobicy', fn: () => fetchJobicy(prefs) },
    { name: 'The Muse', fn: fetchTheMuse },
    { name: 'We Work Remotely', fn: fetchWeWorkRemotely },
    { name: 'Remotive', fn: fetchRemotive },
    { name: 'Arbeitnow', fn: fetchArbeitnow },
    { name: 'RemoteOK', fn: fetchRemoteOK },
  ];

  const results = await Promise.allSettled(sources.map((s) => s.fn()));
  const allJobs: Job[] = [];

  sources.forEach((source, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
      onSourceComplete?.({ name: source.name, count: result.value.length, status: 'success' });
      return;
    }

    const skipped = result.reason?.name === 'SourceSkippedError';
    onSourceComplete?.({
      name: source.name,
      count: 0,
      status: skipped ? 'skipped' : 'failed',
      detail: skipped
        ? 'Add RAPIDAPI_KEY in .env to enable LinkedIn, Indeed, Glassdoor, and ZipRecruiter'
        : String(result.reason?.message || result.reason || 'failed'),
    });
  });

  const seen = new Set<string>();
  return allJobs.filter((job) => {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
