import { Job } from '../types';

// Normalize a job from any source into our standard format
function normalizeJob(raw: any, source: string): Job {
  const tags = raw.tags
    ? (Array.isArray(raw.tags) ? raw.tags : raw.tags.split(',').map((t: string) => t.trim()))
    : [];

  return {
    id: `${source}-${raw.id || raw.slug || Math.random().toString(36).slice(2)}`,
    title: raw.title || raw.job_title || '',
    company: raw.company_name || raw.company || '',
    location: raw.candidate_required_location?.[0] || raw.location || raw.job_location || 'Remote',
    remote: raw.job_type?.toLowerCase().includes('full') ||
            raw.candidate_required_location?.includes('worldwide') ||
            raw.location?.toLowerCase().includes('remote') ||
            raw.region === 'worldwide' ||
            true, // Most API jobs are remote-friendly
    url: raw.url || '',
    description: (raw.description || '').replace(/<[^>]*>/g, '').slice(0, 500),
    tags: tags.map((t: string) => t.toLowerCase().trim()).filter(Boolean),
    salary: raw.salary || '',
    publishedAt: raw.publication_date || raw.created_at || raw.post_date || new Date().toISOString(),
    source,
    matchScore: 0,
    matchedSkills: [],
    missingSkills: [],
  };
}

// Fetch from Remotive API
async function fetchRemotive(): Promise<Job[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=100');
    if (!res.ok) throw new Error(`Remotive: ${res.status}`);
    const data = await res.json();
    const jobs = (data.jobs || []).map((j: any) => normalizeJob(j, 'Remotive'));
    return jobs;
  } catch (e) {
    console.error('Remotive fetch failed:', e);
    return [];
  }
}

// Fetch from Arbeitnow API
async function fetchArbeitnow(): Promise<Job[]> {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api');
    if (!res.ok) throw new Error(`Arbeitnow: ${res.status}`);
    const data = await res.json();
    const jobs = (data.data || []).map((j: any) =>
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
    return jobs;
  } catch (e) {
    console.error('Arbeitnow fetch failed:', e);
    return [];
  }
}

// Fetch from RemoteOK (via their public endpoint)
async function fetchRemoteOK(): Promise<Job[]> {
  try {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`RemoteOK: ${res.status}`);
    const data = await res.json();
    // RemoteOK returns array where first item is a header
    const jobs = data
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
    return jobs;
  } catch (e) {
    console.error('RemoteOK fetch failed:', e);
    return [];
  }
}

export type SourceStatus = { name: string; count: number; status: string };

export async function fetchAllJobs(
  onSourceComplete?: (status: SourceStatus) => void
): Promise<Job[]> {
  const sources = [
    { name: 'Remotive', fn: fetchRemotive },
    { name: 'Arbeitnow', fn: fetchArbeitnow },
    { name: 'RemoteOK', fn: fetchRemoteOK },
  ];

  const results = await Promise.allSettled(sources.map(s => s.fn()));
  const allJobs: Job[] = [];

  sources.forEach((source, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      allJobs.push(...result.value);
      onSourceComplete?.({ name: source.name, count: result.value.length, status: 'success' });
    } else {
      onSourceComplete?.({ name: source.name, count: 0, status: 'failed' });
    }
  });

  // Deduplicate by title + company
  const seen = new Set<string>();
  const unique = allJobs.filter(job => {
    const key = `${job.title.toLowerCase()}|${job.company.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}
