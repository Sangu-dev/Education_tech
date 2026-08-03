import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Volume2, VolumeX,
  Maximize2, Minimize2, RotateCcw, Mic, List, X, Settings,
  Globe, Loader2,
} from 'lucide-react';

// ─── Indian Language Config ───────────────────────────────────────────────────
const LANGUAGES = [
  { code: 'en',  label: 'EN',  name: 'English',    ttsLang: 'en',  flag: '🇺🇸' },
  { code: 'hi',  label: 'हि',  name: 'Hindi',       ttsLang: 'hi',  flag: '🇮🇳' },
  { code: 'kn',  label: 'ಕ',   name: 'Kannada',     ttsLang: 'kn',  flag: '🇮🇳' },
  { code: 'te',  label: 'తె',  name: 'Telugu',      ttsLang: 'te',  flag: '🇮🇳' },
  { code: 'ta',  label: 'த',   name: 'Tamil',       ttsLang: 'ta',  flag: '🇮🇳' },
  { code: 'ml',  label: 'മ',   name: 'Malayalam',   ttsLang: 'ml',  flag: '🇮🇳' },
];

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ─── Helper: fetch Google TTS audio via backend proxy ────────────────────────
async function fetchTTSAudio(text, lang) {
  const token = localStorage.getItem('accessToken');
  const chunk = text.slice(0, 190); // Google TTS limit
  const url = `${API_BASE}/translate/tts?text=${encodeURIComponent(chunk)}&lang=${lang}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('TTS proxy error');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─── Helper: split text into ~180-char sentence chunks ───────────────────────
function splitIntoChunks(text, maxLen = 180) {
  if (!text) return [];
  const sentences = text.match(/[^।.!?]+[।.!?]*/g) || [text];
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + s).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(c => c.length > 0);
}

// ─── Parse lesson content into slides ────────────────────────────────────────
function parseContentIntoSlides(lesson) {
  if (!lesson) return [];
  const slides = [];

  slides.push({
    type: 'title',
    heading: lesson.title,
    body: lesson.summary || '',
    icon: '🎓',
  });

  const content = lesson.content || '';
  const sections = content.split(/\n#{1,3} /);

  sections.forEach((section, idx) => {
    if (!section.trim()) return;
    const lines = section.trim().split('\n');
    const heading = lines[0].replace(/^#+\s*/, '').trim();
    const body = lines.slice(1).join('\n').trim();
    if (body.length > 20 || heading.length > 5) {
      slides.push({ type: 'content', heading: heading || `Section ${idx}`, body, icon: getIcon(idx) });
    }
  });

  if (slides.length <= 1 && content.trim()) {
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 30);
    paragraphs.forEach((p, idx) => {
      slides.push({ type: 'content', heading: `Part ${idx + 1}`, body: p.trim(), icon: getIcon(idx) });
    });
  }

  if (lesson.keyTakeaways?.length) {
    slides.push({ type: 'takeaways', heading: 'Key Takeaways', bullets: lesson.keyTakeaways, icon: '💡' });
  }

  if (lesson.examples?.length) {
    slides.push({ type: 'examples', heading: 'Real-World Examples', examples: lesson.examples, icon: '🔬' });
  }

  slides.push({ type: 'end', heading: 'Lesson Complete!', body: `You have finished: ${lesson.title}`, icon: '🏆' });

  return slides;
}

const ICONS = ['📖', '🧠', '⚡', '🔍', '💎', '🌐', '🔧', '📊', '🎯', '✨'];
function getIcon(idx) { return ICONS[idx % ICONS.length]; }

function cleanForSpeech(text) {
  return (text || '')
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\n+/g, '. ')
    .replace(/\.{2,}/g, '.')
    .trim();
}

function buildSlideText(slide) {
  if (slide.type === 'title') return `${slide.heading}. ${cleanForSpeech(slide.body)}`;
  if (slide.type === 'takeaways') return `Key Takeaways. ${(slide.bullets || []).map(b => cleanForSpeech(b)).join('. ')}`;
  if (slide.type === 'examples') return `Real World Examples. ${(slide.examples || []).map(e => `${e.title}. ${cleanForSpeech(e.description)}`).join('. ')}`;
  if (slide.type === 'end') return `Lesson Complete. ${cleanForSpeech(slide.body)}`;
  return `${cleanForSpeech(slide.heading)}. ${cleanForSpeech(slide.body)}`;
}

const BG_GRADIENTS = [
  'from-purple-900 via-blue-900 to-indigo-900',
  'from-blue-900 via-cyan-900 to-teal-900',
  'from-indigo-900 via-purple-900 to-pink-900',
  'from-teal-900 via-blue-900 to-indigo-900',
  'from-violet-900 via-indigo-900 to-blue-900',
  'from-slate-900 via-purple-900 to-blue-900',
];

// ─── Slide Content Renderer ───────────────────────────────────────────────────
function SlideContent({ slide, index }) {
  const gradient = BG_GRADIENTS[index % BG_GRADIENTS.length];
  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, scale: 0.97, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.03, y: -16 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className={`absolute inset-0 flex flex-col items-center justify-center p-8 bg-gradient-to-br ${gradient}`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div animate={{ x: [0, 25, 0], y: [0, -18, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-8 left-8 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, -18, 0], y: [0, 25, 0] }} transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2 }} className="absolute bottom-8 right-8 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
        <motion.div animate={{ x: [0, 12, 0], y: [0, 12, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }} className="absolute top-1/2 right-1/4 w-36 h-36 bg-brand-500/10 rounded-full blur-2xl" />
      </div>

      {slide.type === 'title' && (
        <div className="relative z-10 text-center max-w-2xl mx-auto">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 200 }} className="text-7xl mb-6 select-none">{slide.icon}</motion.div>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{slide.heading}</motion.h1>
          {slide.body && (<motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="text-slate-300 text-base md:text-lg leading-relaxed">{cleanForSpeech(slide.body).slice(0, 220)}</motion.p>)}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-slate-200 text-sm backdrop-blur-sm">
            <Mic size={13} className="animate-pulse text-brand-400" /> AI Narrated Lesson
          </motion.div>
        </div>
      )}

      {slide.type === 'content' && (
        <div className="relative z-10 w-full max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-3 mb-5">
            <span className="text-4xl select-none">{slide.icon}</span>
            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{slide.heading}</h2>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-slate-200 text-sm md:text-base leading-relaxed bg-black/25 backdrop-blur-sm rounded-2xl p-5 border border-white/10 max-h-52 overflow-y-auto">
            {cleanForSpeech(slide.body).slice(0, 700)}{slide.body.length > 700 ? '…' : ''}
          </motion.div>
        </div>
      )}

      {slide.type === 'takeaways' && (
        <div className="relative z-10 w-full max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-5">
            <span className="text-4xl select-none">💡</span><h2 className="text-2xl font-bold text-white">Key Takeaways</h2>
          </motion.div>
          <div className="space-y-3">
            {(slide.bullets || []).map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.12 }} className="flex items-start gap-3 bg-black/25 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <span className="text-brand-400 font-bold shrink-0 mt-0.5">→</span>
                <p className="text-slate-200 text-sm leading-relaxed">{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {slide.type === 'examples' && (
        <div className="relative z-10 w-full max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-5">
            <span className="text-4xl select-none">🔬</span><h2 className="text-2xl font-bold text-white">Real-World Examples</h2>
          </motion.div>
          <div className="space-y-3">
            {(slide.examples || []).slice(0, 2).map((ex, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.2 }} className="bg-black/25 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="text-brand-300 font-semibold text-sm mb-1">{ex.title}</p>
                <p className="text-slate-300 text-sm">{(ex.description || '').slice(0, 200)}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {slide.type === 'end' && (
        <div className="relative z-10 text-center">
          <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="text-8xl mb-6 select-none">🏆</motion.div>
          <motion.h2 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="text-3xl font-bold text-white mb-3">Lesson Complete!</motion.h2>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-slate-300 text-lg">Great job finishing this lesson 🎉</motion.p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Language Selector Bar ────────────────────────────────────────────────────
function LanguageSelector({ selectedLanguage, onSelect, isTranslating }) {
  return (
    <div className="flex items-center gap-1.5">
      <Globe size={13} className="text-slate-400 shrink-0" />
      <div className="flex items-center bg-white/5 border border-white/10 rounded-lg p-0.5 gap-0.5">
        {LANGUAGES.map(lang => (
          <button
            key={lang.code}
            id={`lang-${lang.code}`}
            onClick={() => onSelect(lang.code)}
            title={lang.name}
            className={`relative px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200 min-w-[28px]
              ${selectedLanguage === lang.code
                ? 'bg-brand-500 text-white shadow-sm shadow-brand-500/40'
                : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
          >
            {isTranslating && selectedLanguage === lang.code && lang.code !== 'en'
              ? <Loader2 size={10} className="animate-spin mx-auto" />
              : lang.label
            }
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main VideoLessonPlayer ───────────────────────────────────────────────────
export default function VideoLessonPlayer({ lesson }) {
  const slides = parseContentIntoSlides(lesson);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showSlideList, setShowSlideList] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);

  // English Web Speech API
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [ttsSupported] = useState(() => 'speechSynthesis' in window);

  // Indian language state
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  // translationCache[langCode][slideIdx] = translatedText string
  const [translationCache, setTranslationCache] = useState({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState(null);

  const playerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const progressStartRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const currentSlideRef = useRef(0);
  // For Indian TTS — Audio element refs
  const audioRef = useRef(null);
  const audioBlobsRef = useRef([]); // list of blob URLs for current slide chunks
  const audioChunkIndexRef = useRef(0);
  const currentLangRef = useRef('en');

  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);
  useEffect(() => { currentLangRef.current = selectedLanguage; }, [selectedLanguage]);

  // ── Load English voices ──
  useEffect(() => {
    const load = () => {
      const all = window.speechSynthesis.getVoices();
      setVoices(all);
      const en = all.filter(v => v.lang.startsWith('en'));
      const pref = en.find(v => v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')) || en[0] || null;
      setSelectedVoice(pref);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // ── Revoke old blob URLs to avoid memory leaks ──
  const revokeBlobs = useCallback(() => {
    audioBlobsRef.current.forEach(u => URL.revokeObjectURL(u));
    audioBlobsRef.current = [];
    audioChunkIndexRef.current = 0;
  }, []);

  // ── Stop everything ──
  const stopSpeech = useCallback(() => {
    isSpeakingRef.current = false;

    // Stop Web Speech API (English)
    window.speechSynthesis.cancel();

    // Stop HTML audio (Indian)
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current = null;
    }
    revokeBlobs();

    clearInterval(progressIntervalRef.current);
    setIsPlaying(false);
    setSlideProgress(0);
  }, [revokeBlobs]);

  // ── Get translated text (with cache) ──
  const getTranslatedText = useCallback(async (slideIdx, langCode) => {
    if (langCode === 'en') return buildSlideText(slides[slideIdx]);

    if (translationCache[langCode]?.[slideIdx] !== undefined) {
      return translationCache[langCode][slideIdx];
    }

    const rawText = buildSlideText(slides[slideIdx]);
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${API_BASE}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: rawText.slice(0, 1500), targetLanguage: langCode }),
      });
      const data = await res.json();
      const translated = data.data?.translatedText || rawText;
      setTranslationCache(prev => ({
        ...prev,
        [langCode]: { ...(prev[langCode] || {}), [slideIdx]: translated },
      }));
      return translated;
    } catch {
      setTranslationError('Translation failed. Playing in English.');
      setTimeout(() => setTranslationError(null), 4000);
      return rawText;
    }
  }, [slides, translationCache]);

  // ── Play next audio chunk sequentially ──
  const playNextChunk = useCallback((chunkIndex, chunks, blobUrls, onFinished) => {
    if (!isSpeakingRef.current || chunkIndex >= blobUrls.length) {
      onFinished();
      return;
    }
    const audio = new Audio(blobUrls[chunkIndex]);
    audio.playbackRate = speed;
    audio.volume = isMuted ? 0 : 1;
    audioRef.current = audio;

    audio.onended = () => {
      if (!isSpeakingRef.current) return;
      playNextChunk(chunkIndex + 1, chunks, blobUrls, onFinished);
    };
    audio.onerror = () => { if (isSpeakingRef.current) onFinished(); };
    audio.play().catch(() => { if (isSpeakingRef.current) onFinished(); });
  }, [speed, isMuted]);

  // ── Speak an Indian language slide ──
  const speakIndianSlide = useCallback(async (slideIdx, langCode, onFinished) => {
    setIsTranslating(true);
    const translated = await getTranslatedText(slideIdx, langCode);
    setIsTranslating(false);

    if (!isSpeakingRef.current) return;

    const chunks = splitIntoChunks(translated);
    if (!chunks.length) { onFinished(); return; }

    // Fetch all chunks as blob URLs
    const token = localStorage.getItem('accessToken');
    const blobUrls = [];
    try {
      for (const chunk of chunks) {
        if (!isSpeakingRef.current) return;
        const url = `${API_BASE}/translate/tts?text=${encodeURIComponent(chunk)}&lang=${langCode}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('TTS error');
        const blob = await res.blob();
        blobUrls.push(URL.createObjectURL(blob));
      }
      audioBlobsRef.current = blobUrls;
    } catch {
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      setTranslationError('Audio generation failed. Try again.');
      setTimeout(() => setTranslationError(null), 4000);
      onFinished();
      return;
    }

    if (!isSpeakingRef.current) {
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      return;
    }

    // Estimate progress
    const wordCount = translated.split(' ').length;
    const estimatedMs = Math.max(2000, (wordCount / (130 * speed)) * 60000);
    progressStartRef.current = Date.now();
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current) return;
      const elapsed = Date.now() - progressStartRef.current;
      setSlideProgress(Math.min((elapsed / estimatedMs) * 100, 97));
    }, 80);

    playNextChunk(0, chunks, blobUrls, () => {
      clearInterval(progressIntervalRef.current);
      blobUrls.forEach(u => URL.revokeObjectURL(u));
      setSlideProgress(100);
      onFinished();
    });
  }, [getTranslatedText, speed, playNextChunk]);

  // ── Speak English slide with Web Speech API ──
  const speakEnglishSlide = useCallback((slideIdx, voiceOverride, speedOverride, onFinished) => {
    if (!ttsSupported) { onFinished(); return; }
    const slide = slides[slideIdx];
    if (!slide) { onFinished(); return; }

    const text = buildSlideText(slide);
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speedOverride ?? speed;
    utter.pitch = 1.0;
    utter.volume = isMuted ? 0 : 1.0;
    if (voiceOverride ?? selectedVoice) utter.voice = voiceOverride ?? selectedVoice;

    const wordCount = text.split(' ').length;
    const estimatedMs = Math.max(2000, (wordCount / (130 * utter.rate)) * 60000);
    progressStartRef.current = Date.now();
    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (!isSpeakingRef.current) return;
      const elapsed = Date.now() - progressStartRef.current;
      setSlideProgress(Math.min((elapsed / estimatedMs) * 100, 97));
    }, 80);

    utter.onend = () => {
      clearInterval(progressIntervalRef.current);
      setSlideProgress(100);
      onFinished();
    };
    utter.onerror = () => {
      clearInterval(progressIntervalRef.current);
      onFinished();
    };
    window.speechSynthesis.speak(utter);
  }, [slides, speed, isMuted, selectedVoice, ttsSupported]);

  // ── Main recursive slide speaker ──
  const speakSlideAt = useCallback((slideIdx, langCode) => {
    if (!isSpeakingRef.current) return;
    if (slideIdx >= slides.length) {
      isSpeakingRef.current = false;
      setIsPlaying(false);
      setSlideProgress(0);
      return;
    }

    setCurrentSlide(slideIdx);
    setSlideProgress(0);

    const onFinished = () => {
      if (!isSpeakingRef.current) return;
      setSlideProgress(100);
      setTimeout(() => {
        if (!isSpeakingRef.current) return;
        speakSlideAt(slideIdx + 1, currentLangRef.current);
      }, 700);
    };

    if (langCode === 'en') {
      speakEnglishSlide(slideIdx, null, null, onFinished);
    } else {
      speakIndianSlide(slideIdx, langCode, onFinished);
    }
  }, [slides.length, speakEnglishSlide, speakIndianSlide]);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopSpeech();
    } else {
      isSpeakingRef.current = true;
      setIsPlaying(true);
      speakSlideAt(currentSlideRef.current, currentLangRef.current);
    }
  }, [isPlaying, speakSlideAt, stopSpeech]);

  const handleLanguageChange = useCallback((langCode) => {
    if (langCode === selectedLanguage) return;
    const wasPlaying = isPlaying;
    stopSpeech();
    setSelectedLanguage(langCode);
    setTranslationError(null);

    if (wasPlaying) {
      setTimeout(() => {
        isSpeakingRef.current = true;
        setIsPlaying(true);
        speakSlideAt(currentSlideRef.current, langCode);
      }, 200);
    }
  }, [selectedLanguage, isPlaying, stopSpeech, speakSlideAt]);

  const goToSlide = useCallback((idx) => {
    stopSpeech();
    setSlideProgress(0);
    setCurrentSlide(idx);
    setShowSlideList(false);
  }, [stopSpeech]);

  const prevSlide = () => goToSlide(Math.max(0, currentSlide - 1));
  const nextSlide = () => goToSlide(Math.min(slides.length - 1, currentSlide + 1));
  const restart = () => goToSlide(0);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (next) {
      if (isPlaying) window.speechSynthesis.cancel();
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      if (audioRef.current) audioRef.current.volume = 1;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      playerRef.current?.requestFullscreen?.();
      setFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setFullscreen(false);
    }
  };

  useEffect(() => () => stopSpeech(), [stopSpeech]);

  useEffect(() => {
    stopSpeech();
    setCurrentSlide(0);
    setSelectedLanguage('en');
    setTranslationCache({});
    setTranslationError(null);
  }, [lesson?._id]);

  if (!slides.length) return null;

  const overallPct = slides.length > 1 ? (currentSlide / (slides.length - 1)) * 100 : 0;
  const currentLangInfo = LANGUAGES.find(l => l.code === selectedLanguage) || LANGUAGES[0];

  return (
    <div
      ref={playerRef}
      className="relative w-full bg-gray-950 rounded-2xl overflow-hidden shadow-2xl border border-white/5"
      style={{ aspectRatio: '16/9', minHeight: 280 }}
    >
      {/* ── Slide Display ── */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <SlideContent key={currentSlide} slide={slides[currentSlide]} index={currentSlide} />
        </AnimatePresence>
      </div>

      {/* ── Language Badge ── */}
      <AnimatePresence>
        {selectedLanguage !== 'en' && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/20 border border-brand-500/30 backdrop-blur-sm pointer-events-none"
          >
            <span className="text-sm">{currentLangInfo.flag}</span>
            <span className="text-brand-300 text-xs font-semibold">{currentLangInfo.name}</span>
            {isTranslating && <Loader2 size={11} className="text-brand-400 animate-spin" />}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Top Badges ── */}
      <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2">
          {isPlaying && (
            <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500 text-white text-xs font-semibold shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </motion.span>
          )}
        </div>
        <span className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-xs font-medium border border-white/10">
          {currentSlide + 1} / {slides.length}
        </span>
      </div>

      {/* ── Dot Navigation ── */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5 pointer-events-auto">
        {slides.map((_, i) => (
          <button key={i} onClick={() => goToSlide(i)}
            className={`rounded-full transition-all duration-300 ${i === currentSlide ? 'w-5 h-2 bg-brand-400' : i < currentSlide ? 'w-2 h-2 bg-brand-700' : 'w-2 h-2 bg-white/20'}`}
          />
        ))}
      </div>

      {/* ── Slide List ── */}
      <AnimatePresence>
        {showSlideList && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="absolute inset-y-0 left-0 z-30 w-52 bg-black/85 backdrop-blur-md border-r border-white/10 overflow-y-auto flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/10 shrink-0">
              <span className="text-white text-sm font-semibold">Slides</span>
              <button onClick={() => setShowSlideList(false)} className="text-slate-400 hover:text-white p-1"><X size={14} /></button>
            </div>
            {slides.map((s, i) => (
              <button key={i} onClick={() => goToSlide(i)} className={`w-full text-left px-3 py-2.5 flex items-center gap-2 text-sm border-b border-white/5 transition-colors ${i === currentSlide ? 'bg-brand-500/25 text-brand-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <span className="text-lg shrink-0">{s.icon || '📄'}</span>
                <span className="truncate text-xs">{s.heading}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Panel ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} className="absolute bottom-16 right-3 z-30 w-64 bg-black/90 backdrop-blur-md border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Playback Settings</span>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white"><X size={14} /></button>
            </div>

            <div>
              <p className="text-slate-400 text-xs mb-2">Speed</p>
              <div className="flex gap-1.5 flex-wrap">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map(s => (
                  <button key={s} onClick={() => setSpeed(s)}
                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${speed === s ? 'bg-brand-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {selectedLanguage === 'en' && voices.filter(v => v.lang.startsWith('en')).length > 0 && (
              <div>
                <p className="text-slate-400 text-xs mb-2">Narrator Voice</p>
                <select
                  value={selectedVoice?.name || ''}
                  onChange={e => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
                  className="w-full bg-white/10 text-white text-xs rounded-lg px-2 py-1.5 border border-white/10 outline-none"
                >
                  {voices.filter(v => v.lang.startsWith('en')).map(v => (
                    <option key={v.name} value={v.name} style={{ background: '#1e1e2e' }}>{v.name}</option>
                  ))}
                </select>
              </div>
            )}

            {selectedLanguage !== 'en' && (
              <div className="p-2.5 bg-brand-500/10 border border-brand-500/20 rounded-lg">
                <p className="text-brand-300 text-xs font-medium mb-1">{currentLangInfo.flag} {currentLangInfo.name} Mode</p>
                <p className="text-slate-400 text-xs">AI translates and generates real {currentLangInfo.name} audio via Google TTS.</p>
              </div>
            )}

            {!ttsSupported && <p className="text-yellow-400 text-xs">⚠ English TTS not supported. Use Chrome or Edge.</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Error Toast ── */}
      <AnimatePresence>
        {translationError && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="absolute top-14 left-1/2 -translate-x-1/2 z-30 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm pointer-events-none">
            <p className="text-red-300 text-xs text-center">{translationError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom Controls ── */}
      <div className="absolute bottom-0 inset-x-0 z-20">
        <div className="h-1 bg-white/10">
          <motion.div className="h-full bg-gradient-to-r from-brand-500 to-purple-500" animate={{ width: `${overallPct}%` }} transition={{ duration: 0.3 }} />
        </div>
        {isPlaying && (
          <div className="h-0.5 bg-white/5">
            <div className="h-full bg-brand-400/50 transition-all" style={{ width: `${slideProgress}%` }} />
          </div>
        )}

        <div className="flex items-center gap-1 px-3 py-2.5 bg-black/70 backdrop-blur-md">
          <button id="slide-list-toggle" onClick={() => setShowSlideList(o => !o)} title="Slide List" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><List size={15} /></button>
          <button onClick={restart} title="Restart" className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"><RotateCcw size={15} /></button>
          <button id="prev-slide" onClick={prevSlide} disabled={currentSlide === 0} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"><SkipBack size={17} /></button>

          {/* Play/Pause */}
          <button id="play-pause" onClick={handlePlayPause}
            className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-400 flex items-center justify-center transition-all active:scale-95 shadow-lg shadow-brand-500/30">
            {isTranslating
              ? <Loader2 size={16} className="text-white animate-spin" />
              : isPlaying
                ? <Pause size={16} className="text-white" />
                : <Play size={16} className="text-white ml-0.5" />
            }
          </button>

          <button id="next-slide" onClick={nextSlide} disabled={currentSlide === slides.length - 1} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"><SkipForward size={17} /></button>
          <button onClick={toggleMute} title={isMuted ? 'Unmute' : 'Mute'} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <span className="text-slate-600 text-xs">{speed}x</span>

          <div className="flex-1" />

          {/* ── Language Selector ── */}
          <LanguageSelector
            selectedLanguage={selectedLanguage}
            onSelect={handleLanguageChange}
            isTranslating={isTranslating}
          />

          <button onClick={() => setShowSettings(o => !o)} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"><Settings size={15} /></button>
          <button onClick={toggleFullscreen} className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>
    </div>
  );
}
