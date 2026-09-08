import { Job, Preferences } from '../types';

export function scoreJob(job: Job, prefs: Preferences): Job {
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  // Combine job text for matching
  const jobText = `${job.title} ${job.description} ${job.tags.join(' ')}`.toLowerCase();

  // 1. Title match (30%)
  let titleScore = 0;
  const titleLower = job.title.toLowerCase();
  for (const t of prefs.jobTitles) {
    const words = t.toLowerCase().split(/\s+/);
    const matchCount = words.filter(w => titleLower.includes(w)).length;
    if (matchCount > 0) {
      titleScore = Math.max(titleScore, matchCount / words.length);
    }
  }

  // 2. Technology/skill match (40%)
  let techScore = 0;
  let techMatched = 0;
  for (const tech of prefs.technologies) {
    const techLower = tech.toLowerCase();
    if (jobText.includes(techLower) || job.tags.includes(techLower)) {
      matchedSkills.push(tech);
      techMatched++;
    }
  }
  techScore = prefs.technologies.length > 0 ? techMatched / Math.min(prefs.technologies.length, 5) : 0;

  // 3. Location match (20%)
  let locationScore = 0;
  const jobLocation = job.location.toLowerCase();
  for (const loc of prefs.locations) {
    if (jobLocation.includes(loc.toLowerCase()) || loc.toLowerCase() === 'remote') {
      locationScore = 1;
      break;
    }
  }
  // Remote jobs get a bonus
  if (job.remote && prefs.locations.some(l => l.toLowerCase() === 'remote')) {
    locationScore = 1;
  }

  // 4. Calculate final weighted score
  const finalScore = Math.round(
    (titleScore * 30) +
    (Math.min(techScore, 1) * 40) +
    (locationScore * 20) +
    10 // Base score for being found
  );

  // Determine missing skills (common requirements not found)
  const commonReqs = ['react', 'node', 'typescript', 'javascript', 'python', 'java', 'aws', 'azure', 'docker', 'kubernetes'];
  for (const req of commonReqs) {
    if (!jobText.includes(req) && prefs.technologies.some(t => t.toLowerCase().includes(req))) {
      // This is a skill the user has but the job doesn't mention - not "missing"
    }
  }

  return {
    ...job,
    matchScore: Math.min(finalScore, 100),
    matchedSkills,
    missingSkills: [],
  };
}

export function filterAndSortJobs(jobs: Job[], prefs: Preferences): Job[] {
  return jobs
    .map(job => scoreJob(job, prefs))
    .filter(job => job.matchScore >= prefs.minMatchScore)
    .sort((a, b) => b.matchScore - a.matchScore);
}
