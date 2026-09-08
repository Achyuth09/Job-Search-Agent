export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  url: string;
  description: string;
  tags: string[];
  salary?: string;
  publishedAt: string;
  source: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
}

export interface Preferences {
  jobTitles: string[];
  technologies: string[];
  locations: string[];
  experienceLevel: string;
  minMatchScore: number;
  /** Keep jobs posted in this many days. 0 = any time. */
  postedWithinDays: number;
}

export interface SlackConfig {
  channel: string;
  configured: boolean;
}

export interface SearchState {
  status: 'idle' | 'searching' | 'done' | 'error';
  totalFetched: number;
  totalMatched: number;
  sources: { name: string; count: number; status: string }[];
  error?: string;
}
