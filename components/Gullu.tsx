'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, Mic, MicOff, Send, Square, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/types';

type Lang = 'en' | 'hi' | 'hinglish';
type Message = { id: number; role: 'user' | 'gullu'; text: string; lang?: Lang; topic?: string };
type MicState = 'idle' | 'listening' | 'processing' | 'error';

type RecognitionResultItem = ArrayLike<{ transcript?: string }> & { isFinal?: boolean };
type RecognitionResult = { results?: ArrayLike<RecognitionResultItem>; resultIndex?: number };
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onaudiostart: (() => void) | null;
  onresult: ((event: RecognitionResult) => void) | null;
  onerror: ((event: { error?: string; message?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionCtor = new () => Recognition;

/** Prefer a female Indian voice when the device offers one — never assume it exists. */
const INDIAN_FEMALE = /(female|woman|heera|veena|neerja|aditi|kalpana|swara|priya|ananya|shreya)/i;
const INDIAN_EN = /(india|indian|rishi|veena|neerja|heera|aditi|kalpana|ravi|aarav|swara)/i;

function pickVoice(target: 'en-IN' | 'hi-IN', voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const exact = voices.filter((voice) => voice.lang?.toLowerCase() === target.toLowerCase());
  const female = exact.find((voice) => INDIAN_FEMALE.test(voice.name));
  if (female) return female;
  if (exact.length) return exact[0];
  if (target === 'hi-IN') {
    return voices.find((voice) => voice.lang?.toLowerCase().startsWith('hi')) ?? null;
  }
  return (
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('en') && INDIAN_EN.test(voice.name)) ??
    voices.find((voice) => voice.lang?.toLowerCase().startsWith('en')) ??
    null
  );
}

/** Voices load asynchronously on some browsers; wait briefly, then use what exists. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve([]);
  const synth = window.speechSynthesis;
  const current = synth.getVoices();
  if (current.length) return Promise.resolve(current);
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      synth.removeEventListener('voiceschanged', finish);
      resolve(synth.getVoices());
    };
    synth.addEventListener('voiceschanged', finish);
    window.setTimeout(finish, 1500);
  });
}

/** Compact page navigation inside the chat, using the site's existing routes. */
const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/projects', label: 'Projects' },
  { href: '/experience', label: 'Experience' },
  { href: '/skills', label: 'Skills' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];

/** A relevant next step shown under answers that point at a page. */
const TOPIC_ROUTES: Record<string, { href: string; label: string }> = {
  about: { href: '/about', label: 'View About' },
  projects: { href: '/projects', label: 'View Projects' },
  project: { href: '/projects', label: 'View Projects' },
  experience: { href: '/experience', label: 'View Experience' },
  skills: { href: '/skills', label: 'View Skills' },
  education: { href: '/about', label: 'View About' },
  gallery: { href: '/gallery', label: 'View Gallery' },
  contact: { href: '/contact', label: 'View Contact' },
};

/** Full character: monochrome Gullu on light/dark, full-colour Gullu on the colour theme. */
function GulluAvatar({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn('gullu-avatar relative inline-block shrink-0', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gullu/gullu-mono.png" alt="" className="gullu-avatar-mono" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gullu/gullu-color.png" alt="" className="gullu-avatar-color" />
    </span>
  );
}

/** Browsers say "Gallu"; spell the name phonetically for speech only (the UI keeps "Gullu"). */
function speechText(text: string, lang?: Lang): string {
  return text.replace(/\bGullu\b/gi, lang === 'hi' ? 'गुल्लू' : 'Gul-loo');
}

export default function Gullu({
  greeting,
  description,
  voice: voiceEnabled,
}: {
  greeting: string;
  description: string;
  voice: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: 'gullu', text: greeting }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [voiceNote, setVoiceNote] = useState('');
  const [muted, setMuted] = useState(false);
  const [speakingId, setSpeakingId] = useState<number | null>(null);
  const [micState, setMicState] = useState<MicState>('idle');
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const voiceLangRef = useRef<'en-IN' | 'hi-IN'>('en-IN');
  const restartRef = useRef<'hi-IN' | null>(null);
  const retriedRef = useRef(false);
  const mutedRef = useRef(false);
  const busyRef = useRef(false);
  const activeRef = useRef(false);
  const openRef = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    const speech = typeof window !== 'undefined' && 'speechSynthesis' in window;
    const recognition =
      typeof window !== 'undefined' &&
      Boolean(
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ??
          (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition,
      );
    setSpeechSupported(speech);
    setRecognitionSupported(recognition);
    voiceLangRef.current = navigator.language?.toLowerCase().startsWith('hi') ? 'hi-IN' : 'en-IN';
    if (speech) void loadVoices();
    if (voiceEnabled && !recognition) {
      setVoiceNote('Voice input is not supported in this browser. Please use Chrome or Edge.');
    }
  }, [voiceEnabled]);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages, busy, open]);

  useEffect(() => {
    return () => {
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  function stopSpeaking() {
    const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
    const current = utteranceRef.current;
    utteranceRef.current = null;
    if (current) {
      /* Detach handlers so a cancelled utterance cannot re-enter the speaking state. */
      current.onstart = null;
      current.onend = null;
      current.onerror = null;
    }
    if (synth) {
      synth.cancel();
      if (synth.paused) synth.resume();
    }
    setSpeakingId(null);
  }

  function stopListening() {
    restartRef.current = null;
    retriedRef.current = false;
    activeRef.current = false;
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.abort();
      } catch {
        /* ignore */
      }
    }
    setMicState('idle');
  }

  function closePanel() {
    openRef.current = false;
    stopSpeaking();
    stopListening();
    setOpen(false);
  }

  function goTo(href: string) {
    closePanel();
    router.push(href);
  }

  async function speak(message: Message) {
    if (!speechSupported || mutedRef.current) return;
    const hindi = message.lang === 'hi';
    const target = hindi ? 'hi-IN' : 'en-IN';
    const voices = await loadVoices();
    if (mutedRef.current) return;
    const voice = pickVoice(target, voices);

    if (hindi && !voice) {
      setVoiceNote('No Hindi voice is available on this device — the answer is written above.');
      return;
    }

    stopSpeaking();
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(speechText(message.text, message.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || target;
    utterance.rate = 1.02; /* slightly quicker, still conversational */
    utterance.pitch = 1.18; /* friendly, slightly child-like warmth — not squeaky */
    utterance.volume = 1;
    utteranceRef.current = utterance;
    utterance.onstart = () => {
      if (utteranceRef.current !== utterance) return;
      setVoiceNote('');
      setSpeakingId(message.id);
    };
    utterance.onend = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      if (utteranceRef.current !== utterance) return;
      utteranceRef.current = null;
      setSpeakingId(null);
    };
    synth.speak(utterance);
  }

  function toggleMute() {
    setMuted((current) => {
      if (!current) stopSpeaking();
      return !current;
    });
  }

  async function send(text: string, fromVoice = false) {
    const question = text.trim();
    if (!question || busyRef.current) return;

    busyRef.current = true;
    setMessages((current) => [...current, { id: nextId.current++, role: 'user', text: question }]);
    setInput('');
    setBusy(true);
    setError('');
    if (!fromVoice) {
      setVoiceNote('');
      stopListening();
    }

    try {
      const response = await fetch('/api/gullu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = (await response.json().catch(() => null)) as {
        answer?: unknown;
        lang?: Lang;
        topic?: unknown;
        error?: unknown;
      } | null;
      if (!response.ok || typeof data?.answer !== 'string') {
        throw new Error(typeof data?.error === 'string' ? data.error : 'Gullu could not answer that just now.');
      }

      const message: Message = {
        id: nextId.current++,
        role: 'gullu',
        text: data.answer,
        lang: data.lang ?? 'en',
        topic: typeof data.topic === 'string' ? data.topic : undefined,
      };
      setMessages((current) => [...current, message]);
      /* Adapt the next microphone language to the language the visitor is using. */
      voiceLangRef.current = data.lang === 'hi' ? 'hi-IN' : 'en-IN';
      if (fromVoice && voiceEnabled && !mutedRef.current && openRef.current) void speak(message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gullu could not answer that just now.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function micError(message: string) {
    activeRef.current = false;
    setVoiceNote(message);
    setMicState('error');
  }

  function beginRecognition(lang: 'en-IN' | 'hi-IN') {
    const recognition = recognitionRef.current;
    if (!recognition || !activeRef.current) return;
    recognition.lang = lang;
    voiceLangRef.current = lang;

    recognition.onstart = () => setMicState('listening');

    recognition.onresult = (event) => {
      const results = event.results;
      if (!results?.length) return;
      let transcript = '';
      let isFinal = false;
      for (let index = event.resultIndex ?? 0; index < results.length; index += 1) {
        const result = results[index];
        transcript += result?.[0]?.transcript ?? '';
        if (result?.isFinal) isFinal = true;
      }
      transcript = transcript.replace(/\s+/g, ' ').trim();
      if (transcript) setInput(transcript);
      if (!isFinal || !transcript) return;

      retriedRef.current = false;
      activeRef.current = false;
      setMicState('processing');
      try {
        recognition.stop();
      } catch {
        /* ignore */
      }
      void send(transcript, true).finally(() => {
        setMicState((current) => (current === 'processing' ? 'idle' : current));
      });
    };

    recognition.onerror = (event) => {
      const error = event?.error ?? '';
      if (error === 'aborted') return;

      if (error === 'no-speech' && lang === 'en-IN' && !retriedRef.current) {
        /* One silent retry with the Hindi model so nobody has to pick a language. */
        retriedRef.current = true;
        restartRef.current = 'hi-IN';
        return;
      }

      const message =
        error === 'not-allowed' || error === 'service-not-allowed'
          ? 'Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.'
          : error === 'audio-capture'
            ? 'No microphone was found on this device.'
            : error === 'network'
              ? 'Voice input needs a network connection. Check your connection and try again.'
              : error === 'no-speech'
                ? 'I didn’t catch that. Tap the microphone and try again.'
                : error === 'language-not-supported'
                  ? 'Voice input for that language is not supported on this device.'
                  : 'Voice input is not available right now.';
      micError(message);
    };

    recognition.onend = () => {
      if (restartRef.current) {
        const nextLang = restartRef.current;
        restartRef.current = null;
        voiceLangRef.current = nextLang;
        window.setTimeout(() => beginRecognition(nextLang), 100);
        return;
      }
      setMicState((current) => (current === 'listening' ? 'idle' : current));
    };

    try {
      recognition.start();
      setMicState('listening');
    } catch {
      micError('Voice input could not start. Please try again.');
    }
  }

  async function startListening() {
    if (micState === 'listening') {
      stopListening();
      return;
    }
    if (micState === 'processing') return;

    if (!recognitionSupported) {
      micError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }
    if (speakingId !== null) stopSpeaking();

    setVoiceNote('');
    retriedRef.current = false;
    restartRef.current = null;

    /* Ask for the real device first so permission errors are clear and specific. */
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (cause) {
        const name = cause instanceof DOMException ? cause.name : '';
        if (name === 'NotAllowedError' || name === 'SecurityError') {
          micError('Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          micError('No microphone was found on this device.');
        } else {
          micError('Could not access the microphone. Check your browser and system settings.');
        }
        return;
      }
    }

    const source = window as unknown as {
      SpeechRecognition?: RecognitionCtor;
      webkitSpeechRecognition?: RecognitionCtor;
    };
    const Ctor = source.SpeechRecognition ?? source.webkitSpeechRecognition;
    if (!Ctor) {
      micError('Voice input is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Ctor();
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;
    }

    activeRef.current = true;
    beginRecognition(voiceLangRef.current);
  }

  return (
    <>
      {/* floating full-character launcher */}
      <button
        type="button"
        onClick={() => {
          if (open) {
            closePanel();
          } else {
            openRef.current = true;
            setOpen(true);
          }
        }}
        aria-label={open ? 'Close Gullu' : 'Ask Gullu — portfolio assistant'}
        aria-expanded={open}
        aria-controls="gullu-panel"
        className="fixed right-3 bottom-3 z-[55] inline-flex h-[72px] w-[72px] items-center justify-center border-0 bg-transparent p-0 text-fg transition-transform duration-200 hover:scale-[1.04] md:right-5 md:bottom-5"
      >
        <GulluAvatar className="h-full w-full" />
        {open && (
          <span
            aria-hidden
            className="absolute top-0.5 right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full border border-line bg-bg text-fg shadow-sm"
          >
            <X className="h-2.5 w-2.5" />
          </span>
        )}
      </button>

      {open && (
        <section
          id="gullu-panel"
          role="dialog"
          aria-label="Gullu — portfolio assistant"
          className="page-in fixed inset-x-3 bottom-[96px] z-[55] flex max-h-[min(72vh,560px)] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_28px_70px_-30px_rgba(0,0,0,0.45)] sm:inset-x-auto sm:right-6 sm:bottom-[104px] sm:w-[384px]"
        >
          {/* header */}
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-3.5 py-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <GulluAvatar className="h-10 w-10" />
              <div className="min-w-0">
                <p className="label label-fg">Gullu</p>
                <p className="max-w-[150px] truncate text-[10.5px] text-muted">{description}</p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              {voiceEnabled && speechSupported && (
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute Gullu' : 'Mute Gullu'}
                  aria-pressed={muted}
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-full border border-line transition-colors hover:border-line2',
                    muted ? 'text-muted' : 'text-fg',
                  )}
                >
                  {muted ? <VolumeX className="h-3.5 w-3.5" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
                </button>
              )}

              <button
                type="button"
                onClick={closePanel}
                aria-label="Close chat"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-line2 hover:text-fg"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          </header>

          {(micState === 'listening' || micState === 'processing' || voiceNote) && (
            <p
              role="status"
              aria-live="polite"
              className="shrink-0 border-b border-line px-3.5 py-2 text-[11px] leading-snug text-muted"
            >
              {micState === 'listening'
                ? 'Listening… speak now.'
                : micState === 'processing'
                  ? 'Getting your answer…'
                  : voiceNote}
            </p>
          )}

          {/* messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex', message.role === 'user' ? 'justify-end' : 'items-start gap-2')}
              >
                {message.role === 'gullu' && <GulluAvatar className="mt-0.5 h-7 w-7" />}
                <div
                  className={cn(
                    'max-w-[88%] px-3.5 py-2.5 text-[13px] leading-relaxed',
                    message.role === 'user'
                      ? 'rounded-2xl rounded-br-md bg-ink text-inkfg'
                      : 'rounded-2xl rounded-bl-md border border-line bg-bg text-fg',
                  )}
                >
                  {message.role === 'gullu' && <p className="label mb-1 text-inksoft">Gullu</p>}
                  <p className="whitespace-pre-line">{message.text}</p>

                  {message.role === 'gullu' && voiceEnabled && speechSupported && (
                    <div className="mt-2">
                      {speakingId === message.id ? (
                        <button
                          type="button"
                          onClick={stopSpeaking}
                          className="label inline-flex items-center gap-1.5 text-fg"
                        >
                          <Square className="h-2.5 w-2.5" aria-hidden />
                          Stop
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void speak(message)}
                          disabled={muted}
                          title={muted ? 'Unmute Gullu to hear answers' : 'Read this answer aloud'}
                          className="label inline-flex items-center gap-1.5 transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Volume2 className="h-3 w-3" aria-hidden />
                          Speak
                        </button>
                      )}
                    </div>
                  )}

                  {message.role === 'gullu' && TOPIC_ROUTES[message.topic ?? ''] && (
                    <button
                      type="button"
                      onClick={() => goTo(TOPIC_ROUTES[message.topic ?? ''].href)}
                      className="label mt-2 inline-flex items-center gap-1 text-fg transition-opacity hover:opacity-70"
                    >
                      <ArrowUpRight className="h-3 w-3" aria-hidden />
                      {TOPIC_ROUTES[message.topic ?? ''].label}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <p className="label flex items-center gap-2 text-muted">
                <LoaderCircle className="h-3 w-3 animate-spin" aria-hidden />
                Checking the portfolio…
              </p>
            )}

            {error && (
              <p role="status" className="rounded-xl border border-line bg-bg px-3 py-2 text-[11.5px] leading-snug text-muted">
                {error}
              </p>
            )}
          </div>

          {/* stop speaking */}
          {voiceEnabled && speechSupported && speakingId !== null && (
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-line bg-bg2/60 px-3.5 py-2">
              <span className="label flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                Speaking
              </span>
              <button
                type="button"
                onClick={stopSpeaking}
                className="label inline-flex items-center gap-1.5 text-fg transition-opacity hover:opacity-70"
              >
                <Square className="h-2.5 w-2.5" aria-hidden />
                Stop speaking
              </button>
            </div>
          )}

          {/* page navigation */}
          <nav aria-label="Portfolio pages" className="flex shrink-0 flex-wrap gap-1 border-t border-line px-3 py-2">
            {NAV_LINKS.map((item) => (
              <button
                key={item.href}
                type="button"
                onClick={() => goTo(item.href)}
                className="rounded-full border border-line px-2 py-1 font-mono text-[8.5px] tracking-[0.12em] uppercase text-muted transition-colors hover:border-line2 hover:text-fg"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* composer */}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(input);
            }}
            className="shrink-0 border-t border-line px-3 py-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2 focus-within:border-line2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about Harsh…"
                aria-label="Your question for Gullu"
                maxLength={500}
                className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-muted"
              />

              {voiceEnabled && (
                <button
                  type="button"
                  onClick={() => {
                    if (micState === 'listening') stopListening();
                    else void startListening();
                  }}
                  disabled={micState === 'processing'}
                  aria-label={
                    micState === 'listening'
                      ? 'Stop listening'
                      : micState === 'processing'
                        ? 'Processing your voice question'
                        : 'Ask by voice'
                  }
                  aria-pressed={micState === 'listening'}
                  title={
                    micState === 'listening'
                      ? 'Stop listening'
                      : micState === 'processing'
                        ? 'Processing…'
                        : 'Ask by voice (English, Hindi or Hinglish)'
                  }
                  className={cn(
                    'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors disabled:cursor-wait',
                    micState === 'listening'
                      ? 'border-fg bg-fg text-bg'
                      : micState === 'error'
                        ? 'border-fg text-fg'
                        : 'border-line text-muted hover:border-line2 hover:text-fg',
                  )}
                >
                  {micState === 'listening' ? (
                    <Square className="h-3 w-3" aria-hidden />
                  ) : micState === 'processing' ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : micState === 'error' ? (
                    <MicOff className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Mic className="h-3.5 w-3.5" aria-hidden />
                  )}
                </button>
              )}

              <button
                type="submit"
                disabled={!input.trim() || busy}
                aria-label="Send question"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-fg transition-colors hover:border-line2 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Send className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <p className="label mt-2 px-1">Answers come from this portfolio only.</p>
          </form>
        </section>
      )}
    </>
  );
}
