import { Preferences } from '../types';

export const defaultPreferences: Preferences = {
  jobTitles: [
    'ReactJS',
    'Node.js',
    'Full Stack',
    'Software Engineer',
    'Backend Developer',
    'Frontend Developer',
  ],
  technologies: [
    'ReactJS', 'Node.js', 'TypeScript', 'MongoDB', 'Azure', 'Docker', 'Express.js',
  ],
  locations: ['Remote', 'Bangalore', 'Pune', 'Hyderabad', 'India'],
  experienceLevel: '3-5 years',
  minMatchScore: 40,
  postedWithinDays: 7,
};

export const POSTED_WITHIN_OPTIONS = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 30, label: '1 month' },
  { days: 0, label: 'Any time' },
] as const;
