import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2, Minimize2,
  Download, RefreshCw, Film, Sparkles, Globe, Loader2, ChevronRight,
  ChevronLeft, List, CheckCircle2, AlertCircle, FastForward, Rewind,
  Sliders, Video, BookOpen, Layers, SkipForward
} from 'lucide-react';
import DiagramRenderer from './DiagramRenderer.jsx';
import { videoAPI } from '../../api/video.js';
import toast from 'react-hot-toast';

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English', flag: '🇺🇸', speechLang: 'en-US' },
  { code: 'hi', label: 'हि', name: 'Hindi', flag: '🇮🇳', speechLang: 'hi-IN' },
  { code: 'kn', label: 'ಕ', name: 'Kannada', flag: '🇮🇳', speechLang: 'kn-IN' },
  { code: 'te', label: 'తె', name: 'Telugu', flag: '🇮🇳', speechLang: 'te-IN' },
  { code: 'ta', label: 'த', name: 'Tamil', flag: '🇮🇳', speechLang: 'ta-IN' },
  { code: 'ml', label: 'മ', name: 'Malayalam', flag: '🇮🇳', speechLang: 'ml-IN' },
];

export default function VideoLessonPlayer({ lesson, onLessonUpdate }) {
  const [activeTab, setActiveTab] = useState('mp4'); // 'mp4' | 'interactive'
  const [currentSceneIdx, setCurrentSceneIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [showSceneList, setShowSceneList] = useState(false);
  const [regeneratingSceneId, setRegeneratingSceneId] = useState(null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Video status from backend
  const [videoStatus, setVideoStatus] = useState(lesson?.videoStatus || 'none');
  const [videoProgress, setVideoProgress] = useState(lesson?.videoProgress || 0);
  const [videoProgressStep, setVideoProgressStep] = useState(lesson?.videoProgressStep || '');
  const [videoUrl, setVideoUrl] = useState(lesson?.videoUrl || null);
  const [scenes, setScenes] = useState(lesson?.scenes || []);

  // HTML5 video element refs
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef(null);

  // Interactive audio & speech synthesis refs
  const interactiveAudioRef = useRef(null);
  const [interactiveTime, setInteractiveTime] = useState(0);
  const [interactiveDuration, setInteractiveDuration] = useState(0);
  const [isUsingWebSpeech, setIsUsingWebSpeech] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [activeInteractiveStep, setActiveInteractiveStep] = useState(0);

  // Poll for video generation progress
  useEffect(() => {
    let timer;
    if (videoStatus === 'processing' || isGeneratingVideo) {
      timer = setInterval(async () => {
        try {
          const res = await videoAPI.getStatus(lesson._id);
          const data = res.data?.data;
          if (data) {
            setVideoStatus(data.videoStatus);
            setVideoProgress(data.videoProgress || 0);
            setVideoProgressStep(data.videoProgressStep || '');
            if (data.videoUrl) {
              setVideoUrl(data.videoUrl);
              setVideoError(false);
            }
            if (data.scenes?.length) setScenes(data.scenes);

            if (data.videoStatus === 'ready' && data.videoUrl) {
              setIsGeneratingVideo(false);
              toast.success('🎬 Animated video is ready!');
              clearInterval(timer);
              if (onLessonUpdate) onLessonUpdate();
            } else if (data.videoStatus === 'failed') {
              setIsGeneratingVideo(false);
              toast.error(data.videoProgressStep || 'Video generation failed');
              clearInterval(timer);
            }
          }
        } catch {
          // ignore poll error
        }
      }, 2000);
    }
    return () => clearInterval(timer);
  }, [videoStatus, isGeneratingVideo, lesson?._id, onLessonUpdate]);

  // Sync props when lesson updates
  useEffect(() => {
    if (lesson) {
      setVideoStatus(lesson.videoStatus || 'none');
      setVideoUrl(lesson.videoUrl || null);
      setScenes(lesson.scenes || []);
      setVideoError(false);
    }
  }, [lesson]);

  // Clean up audio on unmount or tab switch
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (interactiveAudioRef.current) interactiveAudioRef.current.pause();
    };
  }, []);

  const currentScene = scenes[currentSceneIdx] || scenes[0] || {
    title: lesson?.title || 'Lesson Overview',
    narration: lesson?.summary || lesson?.content || 'Welcome to this lesson. We will explore key concepts step by step.',
    diagram_type: 'concept_map',
    animation_steps: ['Understanding the foundational concept', 'Analyzing mechanisms', 'Connecting real-world outcomes'],
    on_screen_text: lesson?.keyTakeaways || ['Core Intuition', 'Mechanism', 'Application'],
    important_keywords: lesson?.tags || ['Overview'],
    duration: 10,
  };

  // Synchronize active animation step to audio progress
  useEffect(() => {
    const totalSteps = Math.max(currentScene.animation_steps?.length || 3, 3);
    if (interactiveDuration > 0) {
      const step = Math.min(totalSteps - 1, Math.floor((interactiveTime / interactiveDuration) * totalSteps));
      setActiveInteractiveStep(step);
    } else {
      setActiveInteractiveStep(0);
    }
  }, [interactiveTime, interactiveDuration, currentScene]);

  // Reset interactive audio on scene change
  useEffect(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (interactiveAudioRef.current) {
      interactiveAudioRef.current.pause();
      interactiveAudioRef.current.currentTime = 0;
    }
    setInteractiveTime(0);
    setIsPlaying(false);
    setIsUsingWebSpeech(false);
  }, [currentSceneIdx]);

  // Handle triggering video generation
  const handleGenerateVideo = async (forceNew = false) => {
    try {
      setIsGeneratingVideo(true);
      setVideoStatus('processing');
      setVideoProgress(8);
      setVideoProgressStep('Starting AI teacher video engine...');
      setVideoError(false);

      await videoAPI.generate(lesson._id, {
        learningLevel: lesson.learningLevel || 'beginner',
        videoStyle: lesson.videoStyle || 'technical',
        lang: selectedLanguage,
        forceRegenerateScenes: forceNew,
      });
      toast.success('AI Teacher is rendering your animated video...');
    } catch (err) {
      setIsGeneratingVideo(false);
      setVideoStatus('failed');
      toast.error(err.response?.data?.message || 'Failed to start video generation');
    }
  };

  // Handle regenerating a specific scene
  const handleRegenerateScene = async (sceneId) => {
    try {
      setRegeneratingSceneId(sceneId);
      toast.loading(`Regenerating Scene #${sceneId}...`, { id: `regen-${sceneId}` });
      const res = await videoAPI.regenerateScene(lesson._id, sceneId, {
        lang: selectedLanguage,
        learningLevel: lesson.learningLevel || 'beginner',
        videoStyle: lesson.videoStyle || 'technical',
      });
      const updatedData = res.data?.data;
      if (updatedData?.scenes) {
        setScenes(updatedData.scenes);
      }
      if (updatedData?.videoUrl) {
        setVideoUrl(updatedData.videoUrl);
        setVideoError(false);
      }
      toast.success(`Scene #${sceneId} regenerated!`, { id: `regen-${sceneId}` });
      if (onLessonUpdate) onLessonUpdate();
    } catch (err) {
      toast.error('Failed to regenerate scene', { id: `regen-${sceneId}` });
    } finally {
      setRegeneratingSceneId(null);
    }
  };

  // Web Speech API fallback for instant voice
  const speakWithWebSpeech = (text, onEnd) => {
    if (!window.speechSynthesis) return false;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const langObj = LANGUAGES.find((l) => l.code === selectedLanguage);
    utterance.lang = langObj?.speechLang || 'en-US';
    utterance.rate = playbackSpeed;
    utterance.volume = volume;

    utterance.onend = () => {
      setIsPlaying(false);
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      setIsPlaying(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsUsingWebSpeech(true);
    setIsPlaying(true);
    return true;
  };

  // Toggle Interactive Narration Playback
  const toggleInteractivePlay = () => {
    if (isPlaying) {
      if (isUsingWebSpeech && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      } else if (interactiveAudioRef.current) {
        interactiveAudioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      // Check if scene has backend audio file
      if (currentScene.audioUrl && interactiveAudioRef.current) {
        interactiveAudioRef.current.playbackRate = playbackSpeed;
        interactiveAudioRef.current.volume = volume;
        interactiveAudioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setIsUsingWebSpeech(false);
          })
          .catch(() => {
            // Audio tag error, fallback to browser speech synthesis
            speakWithWebSpeech(currentScene.narration, handleInteractiveAudioEnded);
          });
      } else {
        // Fallback to Web Speech API
        speakWithWebSpeech(currentScene.narration, handleInteractiveAudioEnded);
      }
    }
  };

  // Interactive Audio Ended handler
  const handleInteractiveAudioEnded = () => {
    setIsPlaying(false);
    if (autoAdvance && currentSceneIdx < scenes.length - 1) {
      setTimeout(() => {
        setCurrentSceneIdx((idx) => idx + 1);
      }, 700);
    }
  };

  // Video MP4 Playback Handlers
  const togglePlay = () => {
    if (activeTab === 'mp4' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    } else if (activeTab === 'interactive') {
      toggleInteractivePlay();
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleSeek = (e) => {
    const target = parseFloat(e.target.value);
    setCurrentTime(target);
    if (videoRef.current) {
      videoRef.current.currentTime = target;
    }
  };

  const handleSpeedChange = (spd) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) videoRef.current.playbackRate = spd;
    if (interactiveAudioRef.current) interactiveAudioRef.current.playbackRate = spd;
  };

  const skipTime = (seconds) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + seconds));
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
    if (interactiveAudioRef.current) {
      interactiveAudioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
    if (interactiveAudioRef.current) {
      interactiveAudioRef.current.volume = val;
      interactiveAudioRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Jump MP4 video to exact scene start timestamp
  const jumpToSceneInVideo = (idx) => {
    if (videoRef.current && scenes.length > 0) {
      const targetTime = scenes.slice(0, idx).reduce((acc, s) => acc + (s.duration || 8), 0);
      videoRef.current.currentTime = Math.min(targetTime, duration);
      if (!isPlaying) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    }
    setCurrentSceneIdx(idx);
  };

  const handleMouseMove = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  };

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl transition-all group"
    >
      {/* ── Hidden HTML5 Audio Element for Interactive Teacher ── */}
      <audio
        ref={interactiveAudioRef}
        src={currentScene.audioUrl || ''}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => {
          if (interactiveAudioRef.current) {
            setInteractiveTime(interactiveAudioRef.current.currentTime);
            setInteractiveDuration(interactiveAudioRef.current.duration || currentScene.duration || 10);
          }
        }}
        onLoadedMetadata={() => {
          if (interactiveAudioRef.current) {
            setInteractiveDuration(interactiveAudioRef.current.duration || currentScene.duration || 10);
          }
        }}
        onEnded={handleInteractiveAudioEnded}
      />

      {/* ── Top Bar with Tab Toggle, Language, and Actions ── */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/95 backdrop-blur border-b border-slate-800 gap-2.5 z-20 relative">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
          <button
            onClick={() => {
              if (isPlaying) togglePlay();
              setActiveTab('mp4');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'mp4'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video size={14} />
            Rendered MP4
          </button>
          <button
            onClick={() => {
              if (isPlaying && activeTab === 'mp4') togglePlay();
              setActiveTab('interactive');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              activeTab === 'interactive'
                ? 'bg-brand-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers size={14} />
            Interactive Teacher
          </button>
        </div>

        {/* Right: Language Selector & Scene Drawer Toggle & Actions */}
        <div className="flex items-center gap-2">
          {/* Indian Language Selector */}
          <div className="hidden sm:flex items-center bg-black/40 border border-white/10 rounded-lg p-0.5 gap-0.5">
            <Globe size={12} className="text-slate-400 ml-1.5 mr-0.5" />
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setSelectedLanguage(lang.code)}
                title={lang.name}
                className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                  selectedLanguage === lang.code
                    ? 'bg-brand-500 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Scene Drawer Toggle */}
          {scenes.length > 0 && (
            <button
              onClick={() => setShowSceneList(!showSceneList)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                showSceneList
                  ? 'bg-brand-500/20 border-brand-500 text-brand-400'
                  : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <List size={14} />
              <span>Scenes ({scenes.length})</span>
            </button>
          )}

          {/* Re-render Video Button if video already exists */}
          {videoUrl && videoStatus === 'ready' && (
            <button
              onClick={() => handleGenerateVideo(true)}
              disabled={isGeneratingVideo}
              title="Regenerate video with selected language or refreshed animations"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all"
            >
              <RotateCcw size={13} />
              <span>Re-render</span>
            </button>
          )}

          {/* Direct MP4 Download Button */}
          {videoUrl && (
            <a
              href={videoAPI.getDownloadUrl(lesson._id)}
              download={`${lesson.title?.replace(/\s+/g, '_') || 'Lesson'}.mp4`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 text-xs font-semibold transition-all shadow-sm"
            >
              <Download size={13} />
              <span className="hidden sm:inline">Download MP4</span>
            </a>
          )}
        </div>
      </div>

      {/* ── Main View Area ── */}
      <div className="relative min-h-[380px] md:min-h-[460px] bg-black flex items-center justify-center overflow-hidden">
        {/* TAB 1: RENDERED MP4 VIDEO */}
        {activeTab === 'mp4' && (
          <>
            {/* STATE A: VIDEO IS CURRENTLY PROCESSING */}
            {videoStatus === 'processing' && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto z-10">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: 'linear' }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600/30 to-cyan-500/30 border border-brand-500/40 flex items-center justify-center mb-5 text-brand-400 shadow-lg shadow-brand-500/20"
                >
                  <Sparkles size={30} />
                </motion.div>
                <h3 className="text-xl font-bold text-white mb-2">Rendering AI Animated Lesson</h3>
                <p className="text-xs text-slate-400 mb-5 max-w-xs">{videoProgressStep || 'Synchronizing visual diagrams and narration...'}</p>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden mb-2 shadow-inner">
                  <motion.div
                    className="bg-gradient-to-r from-cyan-500 via-brand-500 to-indigo-500 h-full rounded-full"
                    animate={{ width: `${Math.max(8, videoProgress)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <div className="flex items-center justify-between w-full text-xs text-slate-400 px-1 font-mono">
                  <span>Progress</span>
                  <span className="text-cyan-400 font-bold">{videoProgress}%</span>
                </div>
                <p className="text-[12px] text-slate-400 mt-5 bg-slate-900/80 px-4 py-2 rounded-xl border border-slate-800">
                  💡 You can switch to the{' '}
                  <button onClick={() => setActiveTab('interactive')} className="text-brand-400 font-semibold underline hover:text-brand-300">
                    Interactive Teacher
                  </button>{' '}
                  tab to listen and explore while it renders!
                </p>
              </div>
            )}

            {/* STATE B: NO VIDEO GENERATED YET, OR PREVIOUS GENERATION FAILED */}
            {!videoUrl && videoStatus !== 'processing' && (
              <div className="flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto z-10">
                {videoStatus === 'failed' ? (
                  <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-4 text-rose-400 shadow-lg">
                    <AlertCircle size={32} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-brand-500/30 mb-4">
                    <Film size={32} className="text-white" />
                  </div>
                )}

                <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                  {videoStatus === 'failed' ? 'Video Generation Incomplete' : 'AI Teacher Animated Video'}
                </h3>

                <p className="text-sm text-slate-400 mb-6 leading-relaxed max-w-md">
                  {videoStatus === 'failed'
                    ? videoProgressStep || 'The previous video rendering could not finish. Click retry to generate the animated lesson.'
                    : scenes?.length > 0
                    ? `✨ ${scenes.length} pedagogical scenes planned with full narration. Ready to render your 720p HD synchronized video!`
                    : 'Transform this lesson into a high-definition video with animated diagrams, conversational teacher voice narration, and visual examples.'}
                </p>

                {/* Language selection pills */}
                <div className="flex items-center justify-center gap-1.5 mb-6 bg-slate-900/90 border border-slate-800 p-1 rounded-xl">
                  <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
                    <Globe size={12} /> Voice Language:
                  </span>
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setSelectedLanguage(lang.code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        selectedLanguage === lang.code
                          ? 'bg-brand-500 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => handleGenerateVideo(false)}
                  disabled={isGeneratingVideo}
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-brand-500 to-indigo-600 hover:from-brand-600 hover:to-indigo-700 text-white font-bold text-sm flex items-center gap-2.5 shadow-xl shadow-brand-500/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingVideo ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Starting Video Engine...</span>
                    </>
                  ) : videoStatus === 'failed' ? (
                    <>
                      <RefreshCw size={16} />
                      <span>Retry Video Generation</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>{scenes?.length > 0 ? 'Render 720p Animated Video' : 'Generate Animated Video'}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STATE C: VIDEO READY AND PLAYING */}
            {videoUrl && videoStatus !== 'processing' && (
              <div className="relative w-full h-full flex flex-col justify-center bg-black">
                {videoError ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
                    <AlertCircle size={36} className="text-amber-400 mb-3" />
                    <h4 className="text-white font-bold text-base mb-1">Could not load video playback</h4>
                    <p className="text-xs text-slate-400 mb-4">The video file is rendering or being updated.</p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setVideoError(false);
                          if (videoRef.current) videoRef.current.load();
                        }}
                        className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold"
                      >
                        Reload Video
                      </button>
                      <button
                        onClick={() => handleGenerateVideo(true)}
                        className="btn-primary py-2 px-4 text-xs font-semibold"
                      >
                        Re-render Video
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      preload="metadata"
                      playsInline
                      onError={() => setVideoError(true)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={handleTimeUpdate}
                      onEnded={() => setIsPlaying(false)}
                      className="w-full max-h-[500px] object-contain cursor-pointer"
                      onClick={togglePlay}
                    />

                    {/* Big Center Play Button Overlay */}
                    {!isPlaying && (
                      <div
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[1px] cursor-pointer transition-all z-10"
                      >
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center shadow-2xl shadow-brand-500/50 border-2 border-white/30"
                        >
                          <Play size={32} className="fill-white translate-x-0.5" />
                        </motion.button>
                      </div>
                    )}

                    {/* Overlay Custom Video Controls */}
                    <div
                      className={`absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-2.5 transition-opacity duration-300 z-15 ${
                        controlsVisible || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                    >
                      {/* Scrub Bar */}
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1.5 bg-white/20 hover:bg-white/30 rounded-lg appearance-none cursor-pointer accent-brand-500 transition-all"
                      />

                      <div className="flex items-center justify-between text-white text-xs">
                        {/* Left Controls: Play, Skips, Time */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={togglePlay}
                            className="p-2 hover:bg-white/15 rounded-full transition-colors"
                            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                          >
                            {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
                          </button>

                          <button
                            onClick={() => skipTime(-10)}
                            className="text-slate-300 hover:text-cyan-400 transition-colors p-1"
                            title="Rewind 10s"
                          >
                            <Rewind size={16} />
                          </button>

                          <button
                            onClick={() => skipTime(10)}
                            className="text-slate-300 hover:text-cyan-400 transition-colors p-1"
                            title="Fast Forward 10s"
                          >
                            <FastForward size={16} />
                          </button>

                          {/* Time display */}
                          <span className="font-mono text-slate-300 text-xs">
                            {formatTime(currentTime)} / {formatTime(duration)}
                          </span>

                          {/* Volume control */}
                          <div className="hidden sm:flex items-center gap-1.5 ml-2 group/vol">
                            <button onClick={toggleMute} className="text-slate-300 hover:text-white p-1">
                              {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                            </button>
                            <input
                              type="range"
                              min={0}
                              max={1}
                              step={0.05}
                              value={isMuted ? 0 : volume}
                              onChange={handleVolumeChange}
                              className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-brand-500"
                            />
                          </div>
                        </div>

                        {/* Right Controls: Speed & Fullscreen */}
                        <div className="flex items-center gap-2.5">
                          {/* Speed selector */}
                          <div className="flex items-center gap-0.5 bg-black/50 px-1.5 py-0.5 rounded-lg border border-white/10">
                            {[1, 1.25, 1.5, 2].map((spd) => (
                              <button
                                key={spd}
                                onClick={() => handleSpeedChange(spd)}
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold transition-all ${
                                  playbackSpeed === spd
                                    ? 'bg-brand-500 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                {spd}x
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={toggleFullscreen}
                            className="hover:text-cyan-400 text-slate-300 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                          >
                            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* TAB 2: INTERACTIVE TEACHER VIEW WITH VOICE & STEP ANIMATION */}
        {activeTab === 'interactive' && (
          <div className="w-full p-4 md:p-6 flex flex-col gap-4">
            {videoStatus === 'processing' && (
              <div className="px-3.5 py-2 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-between text-xs text-brand-300 shadow-sm">
                <span className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin text-brand-400" />
                  <span>
                    MP4 Video rendering in background: <strong className="text-white">{videoProgressStep || 'Processing...'}</strong>
                  </span>
                </span>
                <span className="font-mono font-bold text-brand-400">{videoProgress}%</span>
              </div>
            )}

            {/* Dynamic Diagram Canvas */}
            <DiagramRenderer
              diagramType={currentScene.diagram_type}
              diagramData={currentScene.diagram_data}
              title={currentScene.title}
              keywords={currentScene.important_keywords}
              onScreenText={currentScene.on_screen_text}
              videoStyle={lesson?.videoStyle || 'technical'}
              activeStep={activeInteractiveStep}
            />

            {/* Teacher Narration & Voice Controls Box */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 text-slate-200 shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-brand-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Sparkles size={14} className="text-cyan-400" />
                  AI Teacher Voice Narration
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Scene {currentSceneIdx + 1} of {Math.max(1, scenes.length)}
                </span>
              </div>

              {/* Spoken Text */}
              <p className="text-sm md:text-base leading-relaxed text-slate-100 font-medium mb-4 italic">
                "{currentScene.narration}"
              </p>

              {/* Narration Player Controls */}
              <div className="flex flex-wrap items-center justify-between pt-3 border-t border-slate-800 gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={toggleInteractivePlay}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                      isPlaying
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                        : 'bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 text-white shadow-brand-500/30'
                    }`}
                  >
                    {isPlaying ? <Pause size={14} className="fill-current" /> : <Play size={14} className="fill-current" />}
                    <span>{isPlaying ? 'Pause Narration' : 'Listen to Explanation'}</span>
                  </button>

                  <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                    <span>{formatTime(interactiveTime)}</span>
                    <span>/</span>
                    <span>{formatTime(interactiveDuration || currentScene.duration || 10)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Auto-advance toggle */}
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoAdvance}
                      onChange={(e) => setAutoAdvance(e.target.checked)}
                      className="accent-brand-500 rounded"
                    />
                    <span>Auto-advance scenes</span>
                  </label>

                  {/* Scene Navigation */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={currentSceneIdx === 0}
                      onClick={() => setCurrentSceneIdx((i) => Math.max(0, i - 1))}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Previous Scene"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={currentSceneIdx >= scenes.length - 1}
                      onClick={() => setCurrentSceneIdx((i) => Math.min(scenes.length - 1, i + 1))}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      title="Next Scene"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Scene Navigator Drawer ── */}
      <AnimatePresence>
        {showSceneList && scenes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-800 bg-slate-900/95 backdrop-blur p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <List size={13} />
                Educational Lesson Scenes
              </h4>
              <span className="text-xs text-slate-500">Click a scene to jump or regenerate</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {scenes.map((sc, idx) => {
                const isActive = idx === currentSceneIdx;
                const isRegenerating = regeneratingSceneId === sc.scene_id;
                return (
                  <div
                    key={sc.scene_id || idx}
                    onClick={() => {
                      if (activeTab === 'mp4' && videoUrl) {
                        jumpToSceneInVideo(idx);
                      } else {
                        setCurrentSceneIdx(idx);
                      }
                    }}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                      isActive
                        ? 'bg-brand-500/15 border-brand-500 text-brand-300 shadow-md ring-1 ring-brand-500/30'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase">
                        Scene {sc.scene_id || idx + 1}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 font-mono">
                        {sc.diagram_type || 'concept'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold line-clamp-1 mb-2 text-white">{sc.title}</p>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 font-mono">~{Math.round(sc.duration || 10)}s</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegenerateScene(sc.scene_id);
                        }}
                        disabled={isRegenerating}
                        title="Regenerate this specific scene"
                        className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                      >
                        {isRegenerating ? (
                          <Loader2 size={12} className="animate-spin text-amber-400" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
