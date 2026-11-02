export interface InterestCategoryConfig {
  id: string;
  label: string;
  description: string;
  subcategories: string[];
}

export const INTEREST_CATEGORIES: InterestCategoryConfig[] = [
  {
    id: 'Sports',
    label: 'Sports',
    description: 'Athletics, team sports, tournaments, and fitness competitions',
    subcategories: [
      'cricket',
      'football',
      'volleyball',
      'basketball',
      'badminton',
      'athletics',
      'kabaddi',
      'table tennis',
      'other',
    ],
  },
  {
    id: 'Coding and technology',
    label: 'Coding and technology',
    description: 'Hackathons, open-source, software development, AI, and robotics',
    subcategories: [
      'web development',
      'AI and machine learning',
      'app development',
      'cybersecurity',
      'robotics',
      'competitive programming',
      'hackathons',
      'other',
    ],
  },
  {
    id: 'Cultural and arts activities',
    label: 'Cultural and arts activities',
    description: 'Music, dance, theatre, visual arts, literature, and stage performance',
    subcategories: [
      'dance',
      'music',
      'drama',
      'photography',
      'drawing and painting',
      'debate and public speaking',
      'literature',
      'quiz',
      'other',
    ],
  },
  {
    id: 'Academic competitions and workshops',
    label: 'Academic competitions and workshops',
    description: 'Research seminars, paper presentations, expos, and tech symposia',
    subcategories: [
      'project exhibitions',
      'paper presentations',
      'technical workshops',
      'quizzes',
      'other',
    ],
  },
  {
    id: 'Entrepreneurship and social impact',
    label: 'Entrepreneurship and social impact',
    description: 'Startup pitch days, community volunteering, and sustainability projects',
    subcategories: [
      'entrepreneurship',
      'volunteering',
      'social-impact events',
      'other',
    ],
  },
  {
    id: 'Other',
    label: 'Other Interests',
    description: 'Any specialized fields, personal passions, or interdisciplinary pursuits',
    subcategories: ['other'],
  },
];

export const POPULAR_CITIES = [
  'Bengaluru',
  'Mysuru',
  'Mangaluru',
  'Hubballi-Dharwad',
  'Belagavi',
  'Kalaburagi',
  'Online / Virtual',
];
