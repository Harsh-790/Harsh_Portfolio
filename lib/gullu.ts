/**
 * Gullu — the portfolio assistant.
 *
 * Everything Gullu says is composed here, on the server, from the public
 * portfolio content: published projects, published experience and skills,
 * visible social links, the profile row and the site settings. It never reads
 * the message inbox, users, environment variables or anything else private —
 * what a visitor can see on the site is exactly what Gullu can answer from.
 *
 * The optional AI provider (see `app/api/gullu/route.ts`) only ever receives
 * this same public digest, so the privacy rule holds either way.
 */

import { getExperience, getGallery, getProfile, getProjects, getSkills, getSocialLinks } from './content';
import { getSettings } from './settings';
import { splitPair, type Experience, type GalleryItem, type Profile, type Project, type Settings, type Skill, type SocialLink } from './types';

export type GulluLang = 'en' | 'hi' | 'hinglish';

export type GulluTopic =
  | 'greeting'
  | 'self'
  | 'about'
  | 'projects'
  | 'project'
  | 'skills'
  | 'skill'
  | 'experience'
  | 'education'
  | 'contact'
  | 'social'
  | 'resume'
  | 'gallery'
  | 'location'
  | 'status'
  | 'results'
  | 'site'
  | 'blocked'
  | 'unknown';

export type GulluReply = {
  answer: string;
  lang: GulluLang;
  topic: GulluTopic;
  source: 'portfolio' | 'fallback' | 'ai';
};

export type Knowledge = {
  profile: Profile;
  projects: Project[];
  experience: Experience[];
  skills: { category: string; items: Skill[] }[];
  socials: SocialLink[];
  gallery: GalleryItem[];
  settings: Settings;
};

export async function loadKnowledge(): Promise<Knowledge> {
  const [profile, projects, experience, skills, socials, gallery, settings] = await Promise.all([
    getProfile(),
    getProjects(),
    getExperience(),
    getSkills(),
    getSocialLinks(),
    getGallery(),
    getSettings(),
  ]);
  return { profile, projects, experience, skills, socials, gallery, settings };
}

/* ── language ──────────────────────────────────────────────── */

const DEVANAGARI = /[\u0900-\u097F]/;

/** Roman-script Hindi words. Two or more of them marks a Hinglish question. */
const HINDI_MARKERS = new Set([
  'kya', 'kaun', 'kaunsa', 'kaunse', 'kaunsi', 'konsa', 'konsi', 'kahan', 'kaise', 'kaisa', 'kaisi',
  'kitna', 'kitne', 'kitni', 'hai', 'hain', 'hoga', 'batao', 'bata', 'bataye', 'batana', 'mujhe',
  'tum', 'tumhara', 'tumhari', 'aap', 'aapka', 'aapki', 'unka', 'unki', 'uska', 'uski', 'sabse',
  'banaya', 'banaye', 'banai', 'jaanta', 'jaante', 'aata', 'aati', 'aate', 'nahi', 'nahin', 'karo',
  'karta', 'karti', 'karte', 'padhai', 'kuch', 'kaam', 'naukri', 'anubhav', 'baare', 'liye',
]);

function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, ' ') // \p{M} keeps Devanagari matras intact
    .split(/\s+/)
    .filter(Boolean);
}

export function detectLang(question: string): GulluLang {
  if (DEVANAGARI.test(question)) return 'hi';
  const list = tokens(question);
  let markers = 0;
  for (const token of list) if (HINDI_MARKERS.has(token)) markers += 1;
  return markers >= 2 ? 'hinglish' : 'en';
}

/** Pick the right variant for the question's language. */
function T<V>(lang: GulluLang, en: V, hi: V, hinglish: V): V {
  return lang === 'hi' ? hi : lang === 'hinglish' ? hinglish : en;
}

function joinList(items: string[], lang: GulluLang, max = 6): string {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  const and = lang === 'hi' ? ' और ' : lang === 'hinglish' ? ' aur ' : ' and ';
  const base = shown.length <= 1 ? shown.join('') : `${shown.slice(0, -1).join(', ')}${and}${shown[shown.length - 1]}`;
  if (rest <= 0) return base;
  return lang === 'hi' ? `${base} + ${rest} और` : `${base} + ${rest} more`;
}

function firstSentence(text: string): string {
  const clean = (text || '').trim();
  if (!clean) return '';
  const match = clean.match(/^[^.!?]+[.!?]?/);
  return match ? match[0].trim() : clean;
}

/* ── routing ───────────────────────────────────────────────── */

type Intent = { id: GulluTopic; words?: string[]; phrases?: string[] };

/** Order matters: the first intent wins ties. */
const INTENTS: Intent[] = [
  {
    id: 'self',
    phrases: ['who are you', 'what can you do', 'what are you', 'who is gullu', 'gullu kaun', 'tum kaun', 'aap kaun'],
    words: ['gullu'],
  },
  {
    id: 'social',
    words: [
      'github', 'linkedin', 'instagram', 'twitter', 'youtube', 'leetcode', 'hackerrank', 'kaggle',
      'social', 'socials', 'handle', 'profiles', 'profile', 'links', 'link',
    ],
    phrases: ['social media', 'find him', 'find his', 'profile links'],
  },
  {
    id: 'resume',
    words: ['resume', 'cv', 'curriculum', 'download'],
    phrases: ['download cv', 'his cv'],
  },
  {
    id: 'education',
    words: ['education', 'study', 'studied', 'degree', 'college', 'university', 'school', 'qualification', 'graduation', 'btech', 'b.tech', 'padhai', 'shiksha', 'padha', 'courses', 'specialisation'],
    phrases: ['where did he study', 'kahan se padha'],
  },
  {
    id: 'experience',
    words: ['experience', 'job', 'jobs', 'role', 'roles', 'company', 'companies', 'career', 'work', 'works', 'worked', 'working', 'employer', 'internship', 'intern', 'anubhav', 'naukri'],
    phrases: ['work experience', 'worked at', 'kaam kiya', 'kaam karta'],
  },
  {
    id: 'skills',
    words: ['skill', 'skills', 'technology', 'technologies', 'tech', 'technologies', 'stack', 'tools', 'tool', 'know', 'knows', 'languages', 'framework', 'frameworks', 'libraries', 'sikh', 'aata', 'aati', 'aate', 'jaanta', 'jaante'],
    phrases: ['what does he know', 'does he know', 'technologies does he'],
  },
  {
    id: 'projects',
    words: ['project', 'projects', 'built', 'build', 'building', 'made', 'shipped', 'portfolio', 'kaam', 'karya', 'banaye', 'banaya', 'banai'],
    phrases: ['built what', 'projects has', 'projects did', 'projects does', 'sabse important', 'sabse accha', 'best project', 'top project', 'main project'],
  },
  {
    id: 'results',
    words: ['results', 'result', 'metric', 'metrics', 'accuracy', 'performance', 'impact', 'achievement', 'achievements', 'numbers', 'score', 'scores', 'benchmark'],
    phrases: ['how accurate', 'how well'],
  },
  {
    id: 'gallery',
    words: ['gallery', 'photo', 'photos', 'picture', 'pictures', 'image', 'images', 'video', 'videos', 'talks', 'talk', 'event', 'events', 'certificate', 'certificates', 'workshop', 'workshops'],
    phrases: ['show me photos'],
  },
  {
    id: 'contact',
    words: ['contact', 'email', 'mail', 'reach', 'hire', 'hiring', 'message', 'connect', 'phone', 'mobile', 'sampark', 'milna', 'reply', 'freelance', 'opportunity', 'opportunities'],
    phrases: ['get in touch', 'contact him', 'email id', 'baat karni'],
  },
  {
    id: 'status',
    words: ['available', 'availability', 'status', 'open', 'looking'],
    phrases: ['open to', 'currently doing', 'what is he doing', 'kya kar raha'],
  },
  {
    id: 'location',
    words: ['where', 'based', 'location', 'city', 'live', 'lives', 'living', 'stay', 'stays', 'located', 'rehta', 'rehti', 'rehte', 'kahan'],
    phrases: ['where is he', 'where does he live', 'which city'],
  },
  {
    id: 'about',
    words: ['who', 'harsh', 'about', 'bio', 'biography', 'background', 'intro', 'introduction', 'summary', 'overview', 'kon', 'kaun'],
    phrases: ['tell me about him', 'tell me about harsh', 'anything about'],
  },
  {
    id: 'site',
    words: ['site', 'website'],
    phrases: ['this site', 'this portfolio', 'this website', 'what is this'],
  },
  {
    id: 'greeting',
    phrases: ['good morning', 'good evening', 'good afternoon'],
    words: ['hi', 'hello', 'hey', 'hlo', 'namaste', 'namaskar', 'hii'],
  },
];

/** Devanagari keywords for the same intents (compared after the same normalisation). */
const HINDI_INTENT_WORDS: Partial<Record<GulluTopic, string[]>> = {
  greeting: ['नमस्ते', 'नमस्कार', 'हैलो', 'हाय'],
  self: ['गुल्लू', 'तुम', 'आप'],
  social: ['लिंक', 'लिंक्स', 'प्रोफाइल'],
  resume: ['रिज़्यूमे', 'रिज्यूमे', 'बायोडाटा', 'सीवी'],
  education: ['शिक्षा', 'पढ़ाई', 'पढ़ा', 'डिग्री', 'कॉलेज', 'यूनिवर्सिटी', 'स्कूल'],
  experience: ['अनुभव', 'काम', 'नौकरी', 'नौकरियां', 'कंपनी', 'इंटर्नशिप'],
  skills: ['स्किल', 'स्किल्स', 'कौशल', 'टेक्नोलॉजी', 'तकनीक', 'जानते', 'आता', 'आती', 'आते'],
  projects: ['प्रोजेक्ट', 'प्रोजेक्ट्स', 'परियोजना', 'बनाए', 'बनाया', 'बनाई'],
  results: ['परिणाम', 'रिजल्ट', 'सटीकता', 'मेट्रिक्स'],
  gallery: ['गैलरी', 'फोटो', 'तस्वीर', 'तस्वीरें', 'वीडियो', 'सर्टिफिकेट'],
  contact: ['संपर्क', 'ईमेल', 'मेल', 'बात', 'हायर'],
  status: ['उपलब्ध', 'उपलब्धता', 'स्थिति'],
  location: ['कहाँ', 'कहां', 'रहते', 'रहता', 'शहर', 'स्थान', 'लोकेशन'],
  about: ['कौन', 'क्या', 'बारे', 'परिचय'],
  site: ['वेबसाइट', 'साइट', 'पोर्टफोलियो'],
};

/** Keyword sets, pre-normalised so question tokens and keywords compare apples to apples. */
const INTENT_WORDS: Record<string, Set<string>> = (() => {
  const map: Record<string, Set<string>> = {};
  for (const intent of INTENTS) {
    const set = new Set<string>();
    for (const word of [...(intent.words ?? []), ...(HINDI_INTENT_WORDS[intent.id] ?? [])]) {
      for (const token of tokens(word)) set.add(token);
    }
    map[intent.id] = set;
  }
  return map;
})();

const INTENT_PHRASES: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {};
  for (const intent of INTENTS) {
    map[intent.id] = (intent.phrases ?? []).map((phrase) => ` ${tokens(phrase).join(' ')} `);
  }
  return map;
})();

/** Never answer these from portfolio data — refuse instead. */
const PRIVATE = /(password|passcode|secret|api[-\s]?key|auth|token|credential|\.env|environment variable|\badmin(?:istrator)?\b|database|prisma|private message|contact message|inbox|salary|ctc)/i;

/** Words that mean "is this a question about a specific project or a general one". */
const CATEGORY_HINTS: { words: string[]; categories: string[]; label: string }[] = [
  { words: ['ai', 'artificial', 'llm', 'llms', 'rag', 'generative'], categories: ['AI'], label: 'AI' },
  { words: ['machine', 'ml', 'xgboost', 'lightgbm'], categories: ['Machine Learning'], label: 'machine-learning' },
  { words: ['deep', 'neural'], categories: ['Deep Learning'], label: 'deep-learning' },
  { words: ['vision', 'cv', 'image'], categories: ['Computer Vision'], label: 'computer-vision' },
  { words: ['nlp', 'text', 'language'], categories: ['NLP'], label: 'NLP' },
  { words: ['analytics', 'dashboard', 'insight'], categories: ['Data Analytics'], label: 'analytics' },
  { words: ['forecast', 'forecasting', 'time', 'series'], categories: ['Data Science'], label: 'data-science' },
];

/** Camel-case aware key tokens for matching a project inside a question. */
function projectKeys(project: Project): string[] {
  const compact = project.title.toLowerCase().replace(/[^a-z0-9]/g, '');
  const words = project.title
    .split(/[^A-Za-z0-9]+|(?=[A-Z])/)
    .map((part) => part.toLowerCase())
    .filter((part) => part.length >= 5);
  const slug = project.slug.replace(/-/g, ' ');
  return [...new Set([compact, slug, ...words])];
}

function findProject(question: string, knowledge: Knowledge): Project | null {
  const padded = ` ${tokens(question).join(' ')} `;
  for (const project of knowledge.projects) {
    for (const key of projectKeys(project)) {
      if (padded.includes(` ${key} `)) return project;
    }
  }
  return null;
}

/** Abbreviations and Devanagari spellings that map onto a listed skill. */
const SKILL_ALIASES: Record<string, string> = {
  sklearn: 'scikit learn',
  scikit: 'scikit learn',
  xgboost: 'gradient boosting',
  xgb: 'gradient boosting',
  lightgbm: 'gradient boosting',
  catboost: 'gradient boosting',
  'पाइथन': 'python',
  'एसक्यूएल': 'sql',
  'पांडास': 'pandas',
};

function findSkill(question: string, knowledge: Knowledge) {
  const list = tokens(question);
  const padded = ` ${list.join(' ')} `;
  const names = new Map<string, { skill: Skill; category: string }>();
  for (const group of knowledge.skills) {
    for (const skill of group.items) {
      names.set(skill.name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(), { skill, category: group.category });
    }
  }
  const needles = list.map((token) => SKILL_ALIASES[token] ?? token);
  for (const needle of new Set(needles)) {
    const hit = names.get(needle);
    if (hit) return hit;
  }
  for (const [name, hit] of names) {
    if (name.includes(' ') && padded.includes(` ${name} `)) return hit;
  }
  return null;
}

/** A technology mentioned in the question that appears in at least one project stack. */
function findTechnology(question: string, knowledge: Knowledge) {
  const list = tokens(question);
  for (const token of list) {
    if (token.length < 2) continue;
    const hits: Project[] = [];
    let display = token;
    for (const project of knowledge.projects) {
      for (const tech of project.technologies) {
        const flat = tech.toLowerCase().replace(/[^a-z0-9.+ ]/g, '');
        if (flat === token || flat.replace(/[^a-z0-9+]/g, '') === token) {
          display = tech;
          hits.push(project);
        }
      }
    }
    if (hits.length) return { name: display, projects: [...new Set(hits)] };
  }
  return null;
}

function socialFor(question: string, knowledge: Knowledge) {
  const list = tokens(question);
  const keys: [string, string][] = [
    ['github', 'github'],
    ['linkedin', 'linkedin'],
    ['instagram', 'instagram'],
    ['twitter', 'x'],
    ['x', 'x'],
    ['youtube', 'youtube'],
    ['leetcode', 'leetcode'],
    ['hackerrank', 'hackerrank'],
    ['kaggle', 'kaggle'],
  ];
  for (const [needle, platform] of keys) {
    if (!list.includes(needle)) continue;
    const link =
      knowledge.socials.find(
        (item) => item.platform.toLowerCase() === platform || item.label.toLowerCase().startsWith(platform),
      ) ?? null;
    const display: Record<string, string> = {
      github: 'GitHub',
      linkedin: 'LinkedIn',
      instagram: 'Instagram',
      x: 'X / Twitter',
      youtube: 'YouTube',
      leetcode: 'LeetCode',
      hackerrank: 'HackerRank',
      kaggle: 'Kaggle',
    };
    return { platform: display[platform] ?? platform, link };
  }
  return null;
}

/* ── answers ───────────────────────────────────────────────── */

function projectLine(project: Project): string {
  return `${project.title} (${project.category}, ${project.date})`;
}

function projectDetail(project: Project, lang: GulluLang): string {
  const parts: string[] = [];
  const head = T(
    lang,
    `${project.title} — ${project.category} project, ${project.date}, status ${project.status}.`,
    `${project.title} — ${project.category} प्रोजेक्ट है (${project.date}, स्टेटस ${project.status})।`,
    `${project.title} — ${project.category} project hai (${project.date}, status ${project.status}).`,
  );
  parts.push(head);

  const summary = firstSentence(project.summary || project.overview);
  if (summary) parts.push(summary);

  if (project.technologies.length) {
    parts.push(
      T(
        lang,
        `Tech: ${project.technologies.slice(0, 8).join(', ')}.`,
        `टेक: ${project.technologies.slice(0, 8).join(', ')}।`,
        `Tech: ${project.technologies.slice(0, 8).join(', ')}.`,
      ),
    );
  }

  const metrics = project.metrics
    .slice(0, 3)
    .map((metric) => `${metric.label} ${metric.value}`)
    .join('; ');
  if (metrics) {
    parts.push(T(lang, `Results: ${metrics}.`, `परिणाम: ${metrics}।`, `Results: ${metrics}.`));
  }

  parts.push(
    T(
      lang,
      `Details: /projects/${project.slug}`,
      `पूरा विवरण: /projects/${project.slug}`,
      `Poori detail: /projects/${project.slug}`,
    ),
  );
  return parts.join(' ');
}

function aboutText(knowledge: Knowledge, lang: GulluLang): string {
  const { profile, projects } = knowledge;
  const featured = projects.filter((project) => project.featured).length;
  const intro = firstSentence(profile.intro) || profile.tagline;
  const role = profile.headline ? profile.headline.replace(/\s*\/\s*/g, ' / ') : profile.role;

  const head = T(
    lang,
    `${profile.name} is a ${role} based in ${profile.location || 'India'}. ${intro}`,
    `${profile.name} ${profile.location || 'India'} में ${role} हैं। ${intro}`,
    `${profile.name} ${profile.location || 'India'} ke ${role} hain. ${intro}`,
  );

  const current = profile.currentRole
    ? T(
        lang,
        `Currently: ${profile.currentRole}${profile.company ? ` at ${profile.company}` : ''}.`,
        `अभी: ${profile.currentRole}${profile.company ? ` — ${profile.company}` : ''}।`,
        `Abhi: ${profile.currentRole}${profile.company ? ` — ${profile.company}` : ''}.`,
      )
    : '';
  const status = profile.status ? T(lang, `Status: ${profile.status}.`, `स्टेटस: ${profile.status}।`, `Status: ${profile.status}.`) : '';

  const numbers = T(
    lang,
    `${projects.length} projects on the portfolio (${featured} featured), ${knowledge.experience.length} roles and ${knowledge.skills.reduce((total, group) => total + group.items.length, 0)} listed skills.`,
    `पोर्टफोलियो पर ${projects.length} प्रोजेक्ट (${featured} फीचर्ड), ${knowledge.experience.length} भूमिकाएँ और ${knowledge.skills.reduce((total, group) => total + group.items.length, 0)} स्किल्स दर्ज हैं।`,
    `Portfolio par ${projects.length} projects (${featured} featured), ${knowledge.experience.length} roles aur ${knowledge.skills.reduce((total, group) => total + group.items.length, 0)} skills listed hain.`,
  );

  return [head, [current, status].filter(Boolean).join(' '), numbers, T(lang, 'Full story: /about', 'पूरी जानकारी: /about', 'Poori story: /about')]
    .filter(Boolean)
    .join(' ');
}

function projectsText(knowledge: Knowledge, lang: GulluLang, categories?: string[], featuredOnly = false): string {
  const filtered = categories?.length
    ? knowledge.projects.filter((project) => categories.includes(project.category))
    : knowledge.projects;
  const list = featuredOnly ? filtered.filter((project) => project.featured) : filtered;
  const finalList = list.length ? list : filtered;
  if (!list.length) {
    return T(
      lang,
      'No published projects match that yet — the projects are on /projects.',
      'इस श्रेणी में अभी कोई प्रोजेक्ट प्रकाशित नहीं है — सभी प्रोजेक्ट /projects पर हैं।',
      'Is category mein abhi koi project published nahi hai — saare projects /projects par hain.',
    );
  }
  const label = categories?.length ? `${categories.join('/')} ` : '';
  const featured = finalList.filter((project) => project.featured);
  const head = categories?.length
    ? T(
        lang,
        `${label}projects (${finalList.length}): ${joinList(finalList.map(projectLine), lang)}.`,
        `${label}प्रोजेक्ट (${finalList.length}): ${joinList(finalList.map(projectLine), lang)}।`,
        `${label}projects (${finalList.length}): ${joinList(finalList.map(projectLine), lang)}.`,
      )
    : T(
        lang,
        `Harsh has ${finalList.length} projects on this portfolio (${featured.length} featured): ${joinList(finalList.map(projectLine), lang)}.`,
        `इस पोर्टफोलियो पर हर्ष के ${finalList.length} प्रोजेक्ट हैं (${featured.length} फीचर्ड): ${joinList(finalList.map(projectLine), lang)}।`,
        `Harsh ke portfolio par ${finalList.length} projects hain (${featured.length} featured): ${joinList(finalList.map(projectLine), lang)}.`,
      );

  return [
    head,
    T(
      lang,
      'Ask about any one of them for the approach and results, or open /projects for the full list.',
      'किसी एक प्रोजेक्ट के बारे में पूछिए — तरीका और परिणाम मिल जाएगा। पूरी सूची /projects पर है।',
      'Kisi ek project ke baare mein poochho — approach aur results mil jayenge. Poori list /projects par hai.',
    ),
  ].join(' ');
}

function skillsText(knowledge: Knowledge, lang: GulluLang): string {
  const groups = knowledge.skills;
  const total = groups.reduce((sum, group) => sum + group.items.length, 0);
  const highlights = groups.flatMap((group) => group.items.filter((skill) => skill.highlight).map((skill) => skill.name));
  const categories = groups.map((group) => group.category);

  return [
    T(
      lang,
      `Harsh lists ${total} skills across ${categories.length} areas: ${joinList(categories, lang, 8)}.`,
      `हर्ष की ${total} स्किल्स ${categories.length} श्रेणियों में हैं: ${joinList(categories, lang, 8)}।`,
      `Harsh ki ${total} skills ${categories.length} categories mein hain: ${joinList(categories, lang, 8)}.`,
    ),
    highlights.length
      ? T(
          lang,
          `Highlights: ${joinList(highlights, lang, 10)}.`,
          `मुख्य स्किल्स: ${joinList(highlights, lang, 10)}।`,
          `Highlights: ${joinList(highlights, lang, 10)}.`,
        )
      : '',
    T(lang, 'Full breakdown: /skills', 'पूरी सूची: /skills', 'Poori list: /skills'),
  ]
    .filter(Boolean)
    .join(' ');
}

function skillText(
  knowledge: Knowledge,
  lang: GulluLang,
  match: { skill: Skill; category: string } | null,
  asked: string,
): string {
  if (match) {
    const note = match.skill.note ? T(lang, `“${match.skill.note}”`, `“${match.skill.note}”`, `“${match.skill.note}”`) : '';
    return [
      T(
        lang,
        `Yes — ${match.skill.name} is on his skills list under ${match.category}${note ? ` (${note})` : ''}.`,
        `हाँ — ${match.skill.name} उनकी स्किल्स सूची में ${match.category} के अंतर्गत है${note ? ` (${note})` : ''}।`,
        `Haan — ${match.skill.name} unki skills list mein ${match.category} ke under hai${note ? ` (${note})` : ''}.`,
      ),
      T(lang, 'See /skills for everything.', 'सभी स्किल्स /skills पर हैं।', 'Saari skills /skills par hain.'),
    ].join(' ');
  }

  const total = knowledge.skills.reduce((sum, group) => sum + group.items.length, 0);
  return [
    T(
      lang,
      `“${asked}” is not listed in the skills on this portfolio. ${total} skills are listed — ${joinList(knowledge.skills.flatMap((group) => group.items.slice(0, 2).map((skill) => skill.name)), lang, 8)} and more on /skills.`,
      `“${asked}” पोर्टफोलियो की स्किल्स सूची में नहीं है। ${total} स्किल्स दर्ज हैं — ${joinList(knowledge.skills.flatMap((group) => group.items.slice(0, 2).map((skill) => skill.name)), lang, 8)} आदि /skills पर।`,
      `“${asked}” portfolio ki skills list mein nahi hai. ${total} skills listed hain — ${joinList(knowledge.skills.flatMap((group) => group.items.slice(0, 2).map((skill) => skill.name)), lang, 8)} waghairah /skills par.`,
    ),
  ].join(' ');
}

function experienceText(knowledge: Knowledge, lang: GulluLang): string {
  const roles = knowledge.experience.slice(0, 5);
  const lines = roles.map((role) => {
    const period = role.current ? `${role.startDate} — present` : [role.startDate, role.endDate].filter(Boolean).join(' — ');
    return `${role.position} · ${role.company} (${period})`;
  });
  return [
    T(
      lang,
      `Harsh has ${knowledge.experience.length} roles on the record: ${lines.join('; ')}.`,
      `हर्ष के अनुभव में ${knowledge.experience.length} भूमिकाएँ दर्ज हैं: ${lines.join('; ')}।`,
      `Harsh ke paas ${knowledge.experience.length} roles hain: ${lines.join('; ')}.`,
    ),
    T(lang, 'Full timeline: /experience', 'पूरी टाइमलाइन: /experience', 'Poori timeline: /experience'),
  ].join(' ');
}

function educationText(knowledge: Knowledge, lang: GulluLang): string {
  const rows = knowledge.profile.education
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((line) => {
      const { left, right } = splitPair(line);
      return left ? `${right} (${left})` : right;
    });
  if (!rows.length) {
    return T(
      lang,
      'No education details are published on the portfolio yet.',
      'पोर्टफोलियो पर अभी शिक्षा का विवरण प्रकाशित नहीं है।',
      'Portfolio par abhi education details published nahi hain.',
    );
  }
  return [
    T(lang, 'Education & certificates:', 'शिक्षा और सर्टिफिकेट:', 'Education aur certificates:'),
    rows.join('; ') + '.',
    T(lang, 'Also listed on /about.', 'यह /about पर भी है।', 'Yeh /about par bhi hai.'),
  ].join(' ');
}

function contactText(knowledge: Knowledge, lang: GulluLang): string {
  const { profile, settings } = knowledge;
  const parts: string[] = [];
  if (profile.email) {
    parts.push(
      T(
        lang,
        `Email: ${profile.email} — or use the form at /contact.`,
        `ईमेल: ${profile.email} — या /contact पर फ़ॉर्म भरें।`,
        `Email: ${profile.email} — ya /contact wala form use karein.`,
      ),
    );
  } else {
    parts.push(T(lang, 'Use the contact form at /contact.', 'संपर्क फ़ॉर्म /contact पर है।', 'Contact form /contact par hai.'));
  }
  if (settings['contact.formNote']) parts.push(settings['contact.formNote']);
  const availability = settings['contact.availability'] || profile.status;
  if (availability) parts.push(T(lang, `Availability: ${availability}.`, `उपलब्धता: ${availability}।`, `Availability: ${availability}.`));
  if (settings['contact.responseTime']) parts.push(settings['contact.responseTime'] + '.');
  return parts.join(' ');
}

function socialText(knowledge: Knowledge, lang: GulluLang, match: { platform: string; link: SocialLink | null } | null): string {
  if (match) {
    if (match.link && match.link.url.trim()) {
      return T(
        lang,
        `${match.platform}: ${match.link.url.startsWith('mailto:') ? match.link.url.slice(7) : match.link.url}`,
        `${match.platform}: ${match.link.url.startsWith('mailto:') ? match.link.url.slice(7) : match.link.url}`,
        `${match.platform}: ${match.link.url.startsWith('mailto:') ? match.link.url.slice(7) : match.link.url}`,
      );
    }
    return T(
      lang,
      `No ${match.platform} link is set on the portfolio yet. Links that are live: /about and the footer.`,
      `पोर्टफोलियो पर अभी ${match.platform} लिंक सेट नहीं है। लाइव लिंक /about और फुटर पर हैं।`,
      `Portfolio par abhi ${match.platform} link set nahi hai. Live links /about aur footer par hain.`,
    );
  }
  if (!knowledge.socials.length) {
    return T(lang, 'No public links are listed yet.', 'अभी कोई सार्वजनिक लिंक दर्ज नहीं है।', 'Abhi koi public link listed nahi hai.');
  }
  const links = knowledge.socials.map((link) =>
    link.url.startsWith('mailto:') ? `${link.label || link.platform}: ${link.url.slice(7)}` : `${link.label || link.platform}: ${link.url}`,
  );
  return [
    T(lang, 'Public profiles:', 'सार्वजनिक प्रोफ़ाइल:', 'Public profiles:'),
    links.join(' · '),
  ].join(' ');
}

function resultsText(knowledge: Knowledge, lang: GulluLang): string {
  const rows = knowledge.projects
    .map((project) => ({ project, metrics: project.metrics.slice(0, 2) }))
    .filter((row) => row.metrics.length)
    .slice(0, 5)
    .map((row) => `${row.project.title} — ${row.metrics.map((metric) => `${metric.label} ${metric.value}`).join(', ')}`);
  if (!rows.length) {
    return T(
      lang,
      'No measured results are published yet. Project pages: /projects.',
      'अभी मापे गए परिणाम प्रकाशित नहीं हैं। प्रोजेक्ट पेज: /projects।',
      'Abhi measured results published nahi hain. Project pages: /projects.',
    );
  }
  return [
    T(lang, 'Recorded results from the project pages:', 'प्रोजेक्ट पेजों पर दर्ज परिणाम:', 'Project pages par recorded results:'),
    rows.join('; ') + '.',
    T(lang, 'More per project on /projects.', 'हर प्रोजेक्ट की डिटेल /projects पर है।', 'Har project ki detail /projects par hai.'),
  ].join(' ');
}

function galleryText(knowledge: Knowledge, lang: GulluLang): string {
  const count = knowledge.gallery.length;
  const categories = [...new Set(knowledge.gallery.map((item) => item.category))];
  const videos = knowledge.gallery.filter((item) => item.type === 'video').length;
  const recent = knowledge.gallery.slice(0, 3).map((item) => `“${item.title}” (${item.date})`);
  return [
    T(
      lang,
      `The gallery holds ${count} items across ${joinList(categories, lang, 6)}${videos ? `, including ${videos} videos` : ''}.`,
      `गैलरी में ${count} आइटम हैं — ${joinList(categories, lang, 6)}${videos ? `, जिनमें ${videos} वीडियो भी हैं` : ''}।`,
      `Gallery mein ${count} items hain — ${joinList(categories, lang, 6)}${videos ? `, jisme ${videos} videos bhi hain` : ''}.`,
    ),
    recent.length ? T(lang, `Recent: ${recent.join(' · ')}.`, `हाल के: ${recent.join(' · ')}।`, `Recent: ${recent.join(' · ')}.`) : '',
    T(lang, 'Browse it at /gallery.', 'पूरी गैलरी /gallery पर देखें।', 'Poori gallery /gallery par dekhein.'),
  ]
    .filter(Boolean)
    .join(' ');
}

/* ── the router ────────────────────────────────────────────── */

function scoreIntents(question: string): { id: GulluTopic; score: number }[] {
  const list = tokens(question);
  const tokenSet = new Set(list);
  const normalized = ` ${list.join(' ')} `;
  return INTENTS.map((intent) => {
    let score = 0;
    for (const word of INTENT_WORDS[intent.id]) if (tokenSet.has(word)) score += 1;
    for (const phrase of INTENT_PHRASES[intent.id]) if (normalized.includes(phrase)) score += 2;
    return { id: intent.id, score };
  });
}

function subjectOf(question: string): string {
  const patterns = [
    /what is ([\p{L}\p{N}\s.'-]{2,40})/iu,
    /who is ([\p{L}\p{N}\s.'-]{2,40})/iu,
    /tell me about ([\p{L}\p{N}\s.'-]{2,40})/iu,
    /kya hai ([\p{L}\p{N}\s.'-]{2,40})/iu,
  ];
  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) return match[1].trim().replace(/[?.!]+$/, '');
  }
  return '';
}

/** "Does he know Rust?" → asks for a yes/no on a specific skill. */
const SKILL_CHECK = /(does he (know|use)|does she (know|use)|can he|is he good|jaanta|jaante|aata|aati|aate|expert|proficient|worked with)/i;

/** "best project", "sabse important" → only look at the featured projects. */
const HIGHLIGHT_HINT = /(most important|best|top|main|featured|highlight|sabse (important|accha|mast|badhiya|best))/i;

/** "what technologies / stack / skills does he have" — asks for the whole list, not one skill. */
const GENERAL_SKILLS = /(technolog|stack|skills?|framework|librar|tool|expertise|proficient in what|what.*know)/i;

/** The reply when nothing in the portfolio matches the question. */
function unknownText(knowledge: Knowledge, lang: GulluLang, question: string): string {
  const subject = subjectOf(question);
  const titles = knowledge.projects.slice(0, 5).map((item) => item.title);
  const base = subject
    ? T(
        lang,
        `“${subject}” isn’t on this portfolio, so I can’t answer that.`,
        `“${subject}” इस पोर्टफोलियो पर नहीं है, इसलिए इसका जवाब उपलब्ध नहीं है।`,
        `“${subject}” is portfolio par nahi hai, isliye iska jawab available nahi hai.`,
      )
    : T(
        lang,
        'I couldn’t find that in the portfolio.',
        'यह जानकारी पोर्टफोलियो में नहीं मिली।',
        'Yeh information portfolio mein nahi mili.',
      );
  return [
    base,
    titles.length
      ? T(
          lang,
          `The projects on the portfolio are: ${joinList(titles, lang)}${knowledge.projects.length > titles.length ? ' …' : ''} — you can also browse /skills, /experience, /gallery and /contact.`,
          `पोर्टफोलियो के प्रोजेक्ट हैं: ${joinList(titles, lang)}${knowledge.projects.length > titles.length ? ' …' : ''} — /skills, /experience, /gallery और /contact भी देख सकते हैं।`,
          `Portfolio ke projects hain: ${joinList(titles, lang)}${knowledge.projects.length > titles.length ? ' …' : ''} — /skills, /experience, /gallery aur /contact bhi dekh sakte hain.`,
        )
      : T(
          lang,
          'Try the projects, skills, experience, education or contact sections.',
          'प्रोजेक्ट, स्किल्स, अनुभव, शिक्षा या संपर्क सेक्शन देखें।',
          'Projects, skills, experience, education ya contact section dekhein.',
        ),
  ].join(' ');
}

function skillSubject(question: string): string {
  const match = question.match(/(?:know|knows|use|uses|jaanta|jaante|aata|aati|aate)\s+([\p{L}\p{N}.+#\s-]{1,30})/iu);
  const subject = match ? match[1].trim() : subjectOf(question) || question.trim();
  return subject.replace(/[?.!]+$/, '').slice(0, 40);
}

export async function answerQuestion(question: string, knowledge: Knowledge): Promise<GulluReply> {
  const clean = (question || '').trim().slice(0, 500);
  const lang = detectLang(clean);
  const settings = knowledge.settings;

  if (!clean) {
    return {
      answer: T(
        lang,
        'Ask me something about Harsh — his projects, skills, experience, education, résumé or how to reach him.',
        'हर्ष के बारे में कुछ पूछिए — प्रोजेक्ट, स्किल्स, अनुभव, शिक्षा, रिज़्यूमे या संपर्क।',
        'Harsh ke baare mein kuch poochhiye — projects, skills, experience, education, resume ya contact.',
      ),
      lang,
      topic: 'greeting',
      source: 'portfolio',
    };
  }

  /* privacy first */
  if (PRIVATE.test(clean)) {
    return {
      answer: T(
        lang,
        'I can’t help with that. I only know Harsh’s public portfolio — projects, skills, experience, education, gallery, résumé and contact details. Passwords, messages, credentials and admin data are never shared.',
        'इसमें मदद नहीं की जा सकती — मुझे केवल हर्ष का सार्वजनिक पोर्टफोलियो पता है: प्रोजेक्ट, स्किल्स, अनुभव, शिक्षा, गैलरी, रिज़्यूमे और संपर्क। पासवर्ड, मैसेज, क्रेडेंशियल और एडमिन डेटा साझा नहीं किए जाते।',
        'Isme help nahi ho sakti — mujhe sirf Harsh ka public portfolio pata hai: projects, skills, experience, education, gallery, resume aur contact. Password, messages, credentials aur admin data share nahi hote.',
      ),
      lang,
      topic: 'blocked',
      source: 'fallback',
    };
  }

  const scores = scoreIntents(clean).sort((a, b) => b.score - a.score);
  const best = scores[0];

  /* no keyword at all — answer honestly instead of guessing a topic */
  if (best.score === 0) {
    const project = findProject(clean, knowledge);
    if (project) return { answer: projectDetail(project, lang), lang, topic: 'project', source: 'portfolio' };
    return { answer: unknownText(knowledge, lang, clean), lang, topic: 'unknown', source: 'fallback' };
  }

  /* greetings only win when they are the whole message */
  if (best.id === 'greeting' && tokens(clean).length > 5) {
    const fallback = scores.find((entry) => entry.id !== 'greeting' && entry.score > 0);
    if (fallback) best.id = fallback.id;
  }

  /* a project named in the question beats the general topics */
  const project = findProject(clean, knowledge);
  if (project && best.id !== 'blocked') {
    return { answer: projectDetail(project, lang), lang, topic: 'project', source: 'portfolio' };
  }

  const platform = socialFor(clean, knowledge);

  /* a skill, technology or direct "does he know X" check beats the general list */
  if (best.id === 'skills') {
    if (GENERAL_SKILLS.test(clean) && !/^(does|do|can|is)\b/i.test(clean)) {
      return { answer: skillsText(knowledge, lang), lang, topic: 'skills', source: 'portfolio' };
    }
    const skill = findSkill(clean, knowledge);
    if (skill) {
      return { answer: skillText(knowledge, lang, skill, skill.skill.name), lang, topic: 'skill', source: 'portfolio' };
    }
    const tech = findTechnology(clean, knowledge);
    if (tech) {
      return {
        answer: T(
          lang,
          `${tech.name} appears in the stack of ${tech.projects.length} project${tech.projects.length === 1 ? '' : 's'}: ${joinList(tech.projects.map((item) => item.title), lang)}.`,
          `${tech.name} ${tech.projects.length} प्रोजेक्ट में इस्तेमाल हुआ है: ${joinList(tech.projects.map((item) => item.title), lang)}।`,
          `${tech.name} ${tech.projects.length} projects mein use hua hai: ${joinList(tech.projects.map((item) => item.title), lang)}.`,
        ),
        lang,
        topic: 'skill',
        source: 'portfolio',
      };
    }
    const area = knowledge.skills.find((group) =>
      ` ${tokens(clean).join(' ')} `.includes(` ${group.category.toLowerCase()} `),
    );
    if (area) {
      return {
        answer: [
          T(
            lang,
            `${area.category} covers ${area.items.length} skills: ${joinList(area.items.map((skill) => skill.name), lang, 10)}.`,
            `${area.category} में ${area.items.length} स्किल्स हैं: ${joinList(area.items.map((skill) => skill.name), lang, 10)}।`,
            `${area.category} mein ${area.items.length} skills hain: ${joinList(area.items.map((skill) => skill.name), lang, 10)}.`,
          ),
          T(lang, 'The rest is on /skills.', 'बाकी सब /skills पर है।', 'Baaki sab /skills par hai.'),
        ].join(' '),
        lang,
        topic: 'skill',
        source: 'portfolio',
      };
    }
    if (SKILL_CHECK.test(clean)) {
      const subject = skillSubject(clean);
      return { answer: skillText(knowledge, lang, null, subject), lang, topic: 'skill', source: 'portfolio' };
    }
  }

  const categoryHints = tokens(clean).length
    ? CATEGORY_HINTS.filter((hint) => hint.words.some((word) => tokens(clean).includes(word)))
    : [];

  switch (best.id) {
    case 'greeting': {
      const greeting = settings['gullu.greeting'];
      if (greeting) {
        /* The greeting is admin-authored; add a localised hint when the visitor wrote in Hindi. */
        let localized = '';
        if (!DEVANAGARI.test(greeting)) {
          if (lang === 'hi') {
            localized = '\n\nहर्ष के प्रोजेक्ट, स्किल्स, अनुभव या संपर्क के बारे में पूछिए — जवाब हिंदी में मिलेगा।';
          } else if (lang === 'hinglish') {
            localized = '\n\nHarsh ke projects, skills, experience ya contact ke baare mein poochhiye — Hinglish mein jawab milega.';
          }
        }
        return { answer: greeting + localized, lang, topic: 'greeting', source: 'portfolio' };
      }
      return {
        answer: T(
          lang,
          'Hello! I’m Gullu, Harsh’s portfolio assistant. Ask me about his projects, skills, experience or how to reach him.',
          'नमस्ते! मैं गुल्लू हूँ, हर्ष का पोर्टफोलियो असिस्टेंट। प्रोजेक्ट, स्किल्स, अनुभव या संपर्क के बारे में पूछिए।',
          'Namaste! Main Gullu hoon — Harsh ka portfolio assistant. Projects, skills, experience ya contact ke baare mein poochhiye.',
        ),
        lang,
        topic: 'greeting',
        source: 'portfolio',
      };
    }
    case 'self':
      return {
        answer: T(
          lang,
          "I'm Gullu, Harsh Raj's portfolio AI assistant. I can help you learn about Harsh's education, skills, projects, experience, technologies, achievements and other information available on this portfolio.",
          "मैं गुल्लू हूँ, हर्ष राज का पोर्टफोलियो AI असिस्टेंट। मैं हर्ष की शिक्षा, स्किल्स, प्रोजेक्ट्स, अनुभव, टेक्नोलॉजीज़ और इस पोर्टफोलियो पर उपलब्ध जानकारी के बारे में बता सकता हूँ।",
          'Main Gullu hoon, Harsh Raj ka portfolio AI assistant. Aap mujhse Harsh ke projects, skills, education, experience aur portfolio ke baare mein pooch sakte ho.',
        ),
        lang,
        topic: 'self',
        source: 'portfolio',
      };
    case 'about':
      return { answer: aboutText(knowledge, lang), lang, topic: 'about', source: 'portfolio' };
    case 'projects':
      return {
        answer: projectsText(
          knowledge,
          lang,
          categoryHints.length ? categoryHints[0].categories : undefined,
          HIGHLIGHT_HINT.test(clean),
        ),
        lang,
        topic: 'projects',
        source: 'portfolio',
      };
    case 'skills':
      return { answer: skillsText(knowledge, lang), lang, topic: 'skills', source: 'portfolio' };
    case 'experience':
      return { answer: experienceText(knowledge, lang), lang, topic: 'experience', source: 'portfolio' };
    case 'education':
      return { answer: educationText(knowledge, lang), lang, topic: 'education', source: 'portfolio' };
    case 'contact':
      return { answer: contactText(knowledge, lang), lang, topic: 'contact', source: 'portfolio' };
    case 'social':
      return { answer: socialText(knowledge, lang, platform), lang, topic: 'social', source: 'portfolio' };
    case 'resume':
      return {
        answer: knowledge.profile.resumeUrl
          ? T(
              lang,
              `There’s a PDF résumé — the “Download CV” button in the hero links to it: ${knowledge.profile.resumeUrl}`,
              `PDF रिज़्यूमे उपलब्ध है — हीरो में “Download CV” बटन उसी से जुड़ा है: ${knowledge.profile.resumeUrl}`,
              `PDF resume available hai — hero ke “Download CV” button se download ho jayega: ${knowledge.profile.resumeUrl}`,
            )
          : T(
              lang,
              'No résumé file is uploaded on the portfolio right now.',
              'फ़िलहाल पोर्टफोलियो पर कोई रिज़्यूमे फ़ाइल अपलोड नहीं है।',
              'Filhaal portfolio par koi resume file upload nahi hai.',
            ),
        lang,
        topic: 'resume',
        source: 'portfolio',
      };
    case 'gallery':
      return { answer: galleryText(knowledge, lang), lang, topic: 'gallery', source: 'portfolio' };
    case 'location':
      return {
        answer: [
          knowledge.profile.location
            ? T(
                lang,
                `Harsh is based in ${knowledge.profile.location}.`,
                `हर्ष ${knowledge.profile.location} में रहते हैं।`,
                `Harsh ${knowledge.profile.location} mein based hain.`,
              )
            : T(lang, 'No location is published.', 'स्थान प्रकाशित नहीं है।', 'Location published nahi hai.'),
          knowledge.profile.status ? knowledge.profile.status + '.' : '',
        ]
          .filter(Boolean)
          .join(' '),
        lang,
        topic: 'location',
        source: 'portfolio',
      };
    case 'status': {
      const parts: string[] = [];
      if (settings['contact.availability']) parts.push(settings['contact.availability']);
      if (knowledge.profile.status) parts.push(knowledge.profile.status);
      if (settings['contact.responseTime']) parts.push(settings['contact.responseTime']);
      if (!parts.length) {
        return {
          answer: T(
            lang,
            'No availability line is published on the portfolio.',
            'पोर्टफोलियो पर उपलब्धता की जानकारी प्रकाशित नहीं है।',
            'Portfolio par availability published nahi hai.',
          ),
          lang,
          topic: 'status',
          source: 'portfolio',
        };
      }
      return { answer: parts.join('. ') + '.', lang, topic: 'status', source: 'portfolio' };
    }
    case 'results':
      return { answer: resultsText(knowledge, lang), lang, topic: 'results', source: 'portfolio' };
    case 'site':
      return {
        answer: [
          T(
            lang,
            `This is ${knowledge.profile.name}’s portfolio — ${firstSentence(settings['site.description'] || '')}`,
            `यह ${knowledge.profile.name} का पोर्टफोलियो है — ${firstSentence(settings['site.description'] || '')}`,
            `Yeh ${knowledge.profile.name} ka portfolio hai — ${firstSentence(settings['site.description'] || '')}`,
          ),
          T(
            lang,
            'Sections: /about, /projects, /experience, /skills, /gallery, /contact.',
            'सेक्शन: /about, /projects, /experience, /skills, /gallery, /contact।',
            'Sections: /about, /projects, /experience, /skills, /gallery, /contact.',
          ),
        ].join(' '),
        lang,
        topic: 'site',
        source: 'portfolio',
      };
    default:
      /* nothing matched — say so, and offer the closest real content */
      return { answer: unknownText(knowledge, lang, clean), lang, topic: 'unknown', source: 'fallback' };
  }
}

/* ── context for the optional AI provider ──────────────────── */

/**
 * A compact public digest of the portfolio. This is the ONLY context the
 * optional AI provider receives — see the system prompt in the API route.
 */
export function knowledgeDigest(knowledge: Knowledge): string {
  const { profile, projects, experience, skills, socials, gallery, settings } = knowledge;
  const lines: string[] = [];

  lines.push(`# Profile`);
  lines.push(
    [
      `Name: ${profile.name}`,
      `Headline: ${profile.headline}`,
      profile.role && `Role: ${profile.role}`,
      profile.tagline && `Tagline: ${profile.tagline}`,
      profile.location && `Location: ${profile.location}`,
      profile.status && `Status: ${profile.status}`,
      profile.currentRole && `Current role: ${profile.currentRole}${profile.company ? ` at ${profile.company}` : ''}`,
      profile.email && `Public email: ${profile.email}`,
      profile.yearsExp && `Experience: ${profile.yearsExp}`,
      profile.intro && `Intro: ${profile.intro}`,
      profile.bio && `Bio: ${profile.bio}`,
      profile.education && `Education: ${profile.education.replace(/\s*\n\s*/g, ' | ')}`,
      profile.interests && `Interests: ${profile.interests}`,
      profile.resumeUrl && `Résumé (PDF): ${profile.resumeUrl}`,
      profile.avatar && `Photo: ${profile.avatar}`,
    ]
      .filter(Boolean)
      .join('\n'),
  );

  lines.push(`# Projects (${projects.length}, published only)`);
  for (const project of projects) {
    lines.push(
      [
        `- ${project.title} [${project.slug}] — ${project.category}, ${project.date}, ${project.status}${project.featured ? ', featured' : ''}`,
        project.summary && `  Summary: ${project.summary}`,
        project.overview && `  Overview: ${project.overview}`,
        project.problem && `  Problem: ${project.problem}`,
        project.approach && `  Approach: ${project.approach}`,
        project.datasetInfo && `  Dataset: ${project.datasetInfo}`,
        project.modelInfo && `  Model: ${project.modelInfo}`,
        project.results && `  Results: ${project.results}`,
        project.technologies.length ? `  Tech: ${project.technologies.join(', ')}` : '',
        project.metrics.length ? `  Metrics: ${project.metrics.map((m) => `${m.label} ${m.value}${m.note ? ` (${m.note})` : ''}`).join('; ')}` : '',
        project.githubUrl && `  GitHub: ${project.githubUrl}`,
        project.liveUrl && `  Live: ${project.liveUrl}`,
        project.datasetUrl && `  Dataset: ${project.datasetUrl}`,
        `  Page: /projects/${project.slug}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  lines.push(`# Experience (${experience.length})`);
  for (const role of experience) {
    lines.push(
      `- ${role.position} at ${role.company}${role.location ? `, ${role.location}` : ''} (${role.startDate} — ${role.current ? 'present' : role.endDate})${
        role.technologies.length ? ` · ${role.technologies.join(', ')}` : ''
      }${role.description ? ` · ${role.description}` : ''}${role.achievements.length ? ` · ${role.achievements.join(' · ')}` : ''}`,
    );
  }

  lines.push(`# Skills (${skills.reduce((sum, group) => sum + group.items.length, 0)})`);
  for (const group of skills) {
    lines.push(`- ${group.category}: ${group.items.map((skill) => `${skill.name}${skill.note ? ` (${skill.note})` : ''}`).join(', ')}`);
  }

  lines.push(`# Public links`);
  for (const link of socials) lines.push(`- ${link.label || link.platform}: ${link.url}`);

  lines.push(`# Gallery (${gallery.length} items)`);
  for (const item of gallery.slice(0, 20)) {
    lines.push(`- ${item.title} — ${item.category}, ${item.date}${item.description ? ` · ${item.description}` : ''}`);
  }

  lines.push(`# Site copy`);
  for (const [key, value] of Object.entries(settings)) {
    if (key.startsWith('gullu.') || !value || key.includes('stats')) continue;
    lines.push(`- ${key}: ${value.replace(/\s*\n\s*/g, ' ')}`);
  }

  return lines.join('\n');
}
