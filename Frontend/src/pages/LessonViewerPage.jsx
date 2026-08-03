import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  ChevronLeft, ChevronRight, CheckCircle2, Clock,
  BookOpen, Menu, X, Trophy, Loader2, CheckCheck,
  Film, FileText,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import VideoLessonPlayer from '../components/ui/VideoLessonPlayer.jsx';
import { coursesAPI } from '../api/courses.js';
import { progressAPI } from '../api/progress.js';
import toast from 'react-hot-toast';

export default function LessonViewerPage() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState('video'); // 'video' | 'notes'
  const startTimeRef = useRef(Date.now());

  const { data: lesson, isLoading: lessonLoading } = useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: () => coursesAPI.getLesson(lessonId).then(r => r.data.data.lesson),
    enabled: !!lessonId,
  });

  const { data: courseData } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesAPI.getById(courseId).then(r => r.data.data.course),
    enabled: !!courseId,
  });

  const chapters = courseData?.chapters || [];

  const { data: completedData } = useQuery({
    queryKey: ['completed-lessons', courseId],
    queryFn: () => progressAPI.getCompleted(courseId).then(r => r.data.data.completed),
    enabled: !!courseId,
  });

  const completedIds = new Set(completedData?.map(c => c.lessonId?.toString?.() || c.lessonId) || []);
  const isCompleted = completedIds.has(lessonId);

  const { mutate: markComplete, isPending: completing } = useMutation({
    mutationFn: () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      return progressAPI.complete(lessonId, timeSpent);
    },
    onSuccess: () => {
      toast.success('Lesson completed! 🎉');
      queryClient.invalidateQueries({ queryKey: ['completed-lessons', courseId] });
      queryClient.invalidateQueries({ queryKey: ['progress', courseId] });
      queryClient.invalidateQueries({ queryKey: ['user-progress'] });
    },
    onError: () => toast.error('Failed to mark complete'),
  });

  // Build flat lesson list for prev/next navigation
  const allLessons = chapters?.flatMap(ch =>
    ch.topics?.flatMap(t => t.lessons || []) || []
  ) || [];

  const currentIndex = allLessons.findIndex(l => l._id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Reset timer on lesson change
  useEffect(() => {
    startTimeRef.current = Date.now();
    setViewMode('video');
  }, [lessonId]);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-dark-200 border-r border-dark-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-dark-border">
        <h3 className="text-white font-semibold text-sm">Course Content</h3>
        <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {chapters?.map((chapter, ci) => (
          <div key={chapter._id} className="mb-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest px-2 mb-2">
              {ci + 1}. {chapter.title}
            </p>
            {chapter.topics?.map(topic => (
              <div key={topic._id} className="mb-2">
                <p className="text-xs text-slate-600 px-2 mb-1 font-medium">{topic.title}</p>
                {topic.lessons?.map(l => {
                  const done = completedIds.has(l._id);
                  const active = l._id === lessonId;
                  return (
                    <button
                      key={l._id}
                      onClick={() => navigate(`/courses/${courseId}/lessons/${l._id}`)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all text-xs mb-0.5
                        ${active ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20' : 'text-slate-400 hover:bg-dark-border hover:text-slate-200'}`}
                    >
                      {done
                        ? <CheckCircle2 size={12} className="text-green-400 shrink-0" />
                        : <div className={`w-3 h-3 rounded-full border shrink-0 ${active ? 'border-brand-400 bg-brand-400' : 'border-slate-600'}`} />
                      }
                      <span className="truncate">{l.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="flex h-full" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 overflow-hidden">
          {sidebarContent}
        </div>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="w-72 shrink-0">{sidebarContent}</div>
            <div className="flex-1 bg-black/60" onClick={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Lesson Topbar */}
          <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-dark-200/90 backdrop-blur border-b border-dark-border">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-dark-border transition-colors"
              >
                <Menu size={18} />
              </button>
              <Link to={`/courses/${courseId}`} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-brand-400 transition-colors">
                <BookOpen size={15} />
                <span className="hidden sm:inline">Back to Course</span>
              </Link>
            </div>

            <div className="flex items-center gap-2">
              {/* View toggle */}
              <div className="flex items-center bg-dark-card border border-dark-border rounded-lg p-0.5 gap-0.5">
                <button
                  id="video-mode-btn"
                  onClick={() => setViewMode('video')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${viewMode === 'video' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <Film size={13} /> Video
                </button>
                <button
                  id="notes-mode-btn"
                  onClick={() => setViewMode('notes')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${viewMode === 'notes' ? 'bg-brand-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}
                >
                  <FileText size={13} /> Notes
                </button>
              </div>

              {isCompleted ? (
                <span className="flex items-center gap-1.5 text-sm text-green-400 font-medium">
                  <CheckCheck size={16} /> Completed
                </span>
              ) : (
                <button
                  id="mark-complete-btn"
                  onClick={() => markComplete()}
                  disabled={completing}
                  className="btn-primary py-2 px-4 text-sm flex items-center gap-1.5"
                >
                  {completing
                    ? <Loader2 size={14} className="animate-spin" />
                    : <CheckCircle2 size={14} />}
                  Mark Complete
                </button>
              )}
            </div>
          </div>

          {/* Lesson Body */}
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8">
            {lessonLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={32} className="text-brand-400 animate-spin" />
              </div>
            ) : lesson ? (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                {/* Lesson Header */}
                <div className="mb-6">
                  <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">
                    {lesson.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                    {lesson.estimatedTime && (
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> ~{lesson.estimatedTime} min
                      </span>
                    )}
                    {currentIndex >= 0 && (
                      <span className="flex items-center gap-1">
                        <BookOpen size={13} /> Lesson {currentIndex + 1} of {allLessons.length}
                      </span>
                    )}
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs border border-brand-500/20">
                      <Film size={11} /> AI Video Available
                    </span>
                  </div>
                </div>

                {/* ── VIDEO MODE ── */}
                {viewMode === 'video' && (
                  <motion.div
                    key="video"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <VideoLessonPlayer lesson={lesson} />

                    {/* Key Takeaways below video */}
                    {lesson.keyTakeaways?.length > 0 && (
                      <div className="mt-6 p-5 bg-dark-card border border-dark-border rounded-xl">
                        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                          💡 Key Takeaways
                        </h3>
                        <ul className="space-y-2">
                          {lesson.keyTakeaways.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                              <span className="text-brand-400 font-bold shrink-0 mt-0.5">→</span>
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ── NOTES MODE ── */}
                {viewMode === 'notes' && (
                  <motion.div
                    key="notes"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="prose prose-invert prose-sm max-w-none
                      prose-headings:font-display prose-headings:text-white
                      prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                      prose-p:text-slate-300 prose-p:leading-relaxed
                      prose-strong:text-white prose-strong:font-semibold
                      prose-code:text-brand-300 prose-code:bg-dark-card prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                      prose-pre:bg-dark-card prose-pre:border prose-pre:border-dark-border
                      prose-blockquote:border-brand-500 prose-blockquote:text-slate-400
                      prose-ul:text-slate-300 prose-ol:text-slate-300
                      prose-li:marker:text-brand-400
                    ">
                      <ReactMarkdown>{lesson.content || '*No content available*'}</ReactMarkdown>
                    </div>

                    {/* Takeaways & Examples */}
                    {lesson.keyTakeaways?.length > 0 && (
                      <div className="mt-8 p-5 bg-dark-card border border-dark-border rounded-xl">
                        <h3 className="text-white font-semibold mb-3">💡 Key Takeaways</h3>
                        <ul className="space-y-2">
                          {lesson.keyTakeaways.map((t, i) => (
                            <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                              <span className="text-brand-400 font-bold shrink-0">→</span> {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {lesson.examples?.length > 0 && (
                      <div className="mt-4 p-5 bg-dark-card border border-dark-border rounded-xl">
                        <h3 className="text-white font-semibold mb-3">🔬 Examples</h3>
                        <div className="space-y-3">
                          {lesson.examples.map((ex, i) => (
                            <div key={i} className="border-l-2 border-brand-500 pl-3">
                              <p className="text-brand-300 font-medium text-sm">{ex.title}</p>
                              <p className="text-slate-300 text-sm mt-1">{ex.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-12 pt-6 border-t border-dark-border">
                  {prevLesson ? (
                    <button
                      onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson._id}`)}
                      className="flex items-center gap-2 btn-ghost"
                    >
                      <ChevronLeft size={16} />
                      <div className="text-left">
                        <p className="text-xs text-slate-500">Previous</p>
                        <p className="text-sm text-slate-300 max-w-[160px] truncate">{prevLesson.title}</p>
                      </div>
                    </button>
                  ) : <div />}

                  {nextLesson ? (
                    <button
                      id="next-lesson-btn"
                      onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson._id}`)}
                      className="flex items-center gap-2 btn-primary py-2 px-5"
                    >
                      <div className="text-right">
                        <p className="text-xs text-white/60">Next</p>
                        <p className="text-sm max-w-[160px] truncate">{nextLesson.title}</p>
                      </div>
                      <ChevronRight size={16} />
                    </button>
                  ) : (
                    <Link
                      to={`/courses/${courseId}`}
                      className="btn-primary flex items-center gap-2 py-2 px-5"
                    >
                      <Trophy size={16} /> View Course
                    </Link>
                  )}
                </div>
              </motion.div>
            ) : (
              <p className="text-slate-400 text-center py-20">Lesson not found</p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
