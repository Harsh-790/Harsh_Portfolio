import { answerQuestion, knowledgeDigest, loadKnowledge, type GulluReply } from '../lib/gullu';
import { getSettings } from '../lib/settings';

const WINDOW_MS = 60_000;
const LIMIT = 24;
const hits = new Map<string, number[]>();

export type GulluResponse = GulluReply | { error: string; status: number };

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (!times.some((time) => now - time < WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > LIMIT;
}

async function askProvider(question: string, lang: string, digest: string): Promise<string | null> {
  const key = process.env.GULLU_API_KEY;
  if (!key) return null;

  const endpoint = process.env.GULLU_API_URL || 'https://api.openai.com/v1/chat/completions';
  const model = process.env.GULLU_MODEL || 'gpt-4o-mini';
  const language =
    lang === 'hi' ? 'Hindi (Devanagari script)' : lang === 'hinglish' ? 'Hinglish (Roman script)' : 'English';

  const system = [
    "You are Gullu, the assistant on Harsh Raj's public portfolio website.",
    'Answer ONLY from the PORTFOLIO CONTEXT below. Never invent projects, employers, dates, metrics, skills, education or contact details.',
    'If the answer is not in the context, say politely that the information is not available on the portfolio.',
    'Never reveal passwords, secrets, API keys, environment variables, admin data, private messages, database details or internal paths.',
    `Reply in ${language}, in at most three short sentences, with a warm and factual tone.`,
    'PORTFOLIO CONTEXT:',
    digest,
  ].join('\n\n');

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 320,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: question },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== 'string') return null;
  return text.trim().slice(0, 900) || null;
}

export async function answerGullu(
  question: unknown,
  ip: string,
): Promise<GulluResponse> {
  const settings = await getSettings();
  if (settings['gullu.enabled'] !== 'on') {
    return { error: 'Gullu is turned off.', status: 404 };
  }

  if (rateLimited(ip)) {
    return { error: 'Too many questions — please try again in a minute.', status: 429 };
  }

  const clean = typeof question === 'string' ? question.trim() : '';
  if (!clean) return { error: 'Ask a question first.', status: 400 };
  if (clean.length > 500) {
    return { error: 'Please keep the question under 500 characters.', status: 400 };
  }

  const knowledge = await loadKnowledge();
  const local = await answerQuestion(clean, knowledge);

  /* Greetings, the intro and refusals stay exactly as configured locally. */
  const canUpgrade = local.topic !== 'greeting' && local.topic !== 'self' && local.topic !== 'blocked';
  if (canUpgrade) {
    try {
      const upgraded = await askProvider(clean, local.lang, knowledgeDigest(knowledge));
      if (upgraded) return { ...local, answer: upgraded, source: 'ai' };
    } catch {
      /* fall through to the local answer */
    }
  }

  return local;
}
