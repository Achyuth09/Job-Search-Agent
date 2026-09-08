export type SourceStatus = {
  name: string;
  count: number;
  status: 'success' | 'failed' | 'skipped';
  detail?: string;
};

export const AGGREGATED_SOURCES = ['LinkedIn', 'Indeed', 'Glassdoor', 'ZipRecruiter', 'Google Jobs'] as const;
export const PUBLIC_SOURCES = [
  'Himalayas',
  'Jobicy',
  'The Muse',
  'We Work Remotely',
  'Remotive',
  'Arbeitnow',
  'RemoteOK',
] as const;
export const JOB_SOURCE_NAMES = [...AGGREGATED_SOURCES, ...PUBLIC_SOURCES];
