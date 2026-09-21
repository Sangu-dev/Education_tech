import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, ChevronDown, ChevronRight, Play, MessageSquare,
  Trophy, Clock, BarChart3, Loader2, Sparkles,
  CheckCircle2,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import ProgressRing from '../components/ui/ProgressRing.jsx';
import { coursesAPI } from '../api/courses.js';
import { progressAPI } from '../api/progress.js';

export default function CourseDetailsPage() {
  const { courseId } = useParams();
  const [openChapters, setOpenChapters] = useState({});
  const [openTopics, setOpenTopics] = useState({});

  // getCourseById already returns course.chapters with nested topics and lessons
  const { data: courseData, isLoading: courseLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesAPI.getById(courseId).then(r => r.data.data.course),
  });

  const course = courseData;
  const chapters = courseData?.chapters || [];

  const { data: progressData } = useQuery({
    queryKey: ['progress', courseId],
    queryFn: () => progressAPI.getCourse(courseId).then(r => r.data.data.progress),
    enabled: !!course,
  });

  const { data: completedLessons } = useQuery({
    queryKey: ['completed-lessons', courseId],
    queryFn: () => progressAPI.getCompleted(courseId).then(r => r.data.data.completed),
    enabled: !!course,
  });

  const completedIds = new Set(completedLessons?.map(c => c.lessonId?.toString() || c.lessonId) || []);

  const toggleChapter = (id) => setOpenChapters(o => ({ ...o, [id]: !o[id] }));
  const toggleTopic = (id) => setOpenTopics(o => ({ ...o, [id]: !o[id] }));

  const difficultyColors = {
    beginner: 'text-green-400 bg-green-400/10',
    intermediate: 'text-yellow-400 bg-yellow-400/10',
    advanced: 'text-red-400 bg-red-400/10',
  };

  if (courseLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="text-brand-400 animate-spin" />
        </div>

      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="page-container text-center py-20">
          <p className="text-slate-400">Course not found</p>
          <Link to="/dashboard" className="btn-primary mt-4 inline-flex">Back to Dashboard</Link>
        </div>
      </DashboardLayout>
    );
  }

  const pct = progressData?.percentage || 0;

  return (
    <DashboardLayout>
      <div className="page-container">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to="/dashboard" className="hover:text-brand-400 transition-colors">Dashboard</Link>
          <ChevronRight size={14} />
          <span className="text-slate-300 truncate">{course.title}</span>
        </div>

        {/* Course Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 mb-6 bg-gradient-card"
        >
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Left */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {course.difficulty && (
                  <span className={`badge ${difficultyColors[course.difficulty] || 'text-slate-400 bg-slate-400/10'}`}>
                    {course.difficulty}
                  </span>
                )}
                <span className="badge text-brand-400 bg-brand-400/10">
                  <BookOpen size={11} /> {course.totalLessons || 0} lessons
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-3">{course.title}</h1>
              {course.description && (
                <p className="text-slate-400 text-sm leading-relaxed line-clamp-3">{course.description}</p>
              )}

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-5">
                {progressData?.lastLesson ? (
                  <Link
                    to={`/courses/${courseId}/lessons/${progressData.lastLesson._id}`}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Play size={16} /> Continue Learning
                  </Link>
                ) : chapters?.[0]?.topics?.[0]?.lessons?.[0] ? null : (
                  <button className="btn-primary flex items-center gap-2">
                    <Play size={16} /> Start Learning
                  </button>
                )}
                <Link
                  to={`/courses/${courseId}/chat`}
                  className="btn-outline flex items-center gap-2"
                >
                  <MessageSquare size={16} /> Ask AI Tutor
                </Link>
              </div>
            </div>

            {/* Progress Ring */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <ProgressRing value={pct} size={100} strokeWidth={8} />
              <div className="text-center">
                <p className="text-white font-semibold">{progressData?.completedLessons || 0} / {progressData?.totalLessons || course.totalLessons || 0}</p>
                <p className="text-slate-400 text-xs">lessons done</p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chapters Tree */}
          <div className="lg:col-span-2">
            <h2 className="section-title text-xl mb-4">Course Content</h2>

            {!chapters || chapters.length === 0 ? (
              <div className="glass-card p-10 text-center">
                <Loader2 size={24} className="text-brand-400 animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Content is being generated…</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chapters.map((chapter, ci) => (
                  <motion.div
                    key={chapter._id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: ci * 0.05 }}
                    className="glass-card overflow-hidden"
                  >
                    {/* Chapter Header */}
                    <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-brand-500/5 transition-colors"
                      onClick={() => toggleChapter(chapter._id)}
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                        <span className="text-brand-400 text-xs font-bold">{ci + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">{chapter.title}</p>
                        <p className="text-xs text-slate-500">{chapter.topics?.length || 0} topics</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/courses/${courseId}/quiz/${chapter._id}`}
                          onClick={e => e.stopPropagation()}
                          className="hidden sm:flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full hover:bg-yellow-400/20 transition-colors"
                        >
                          <Trophy size={11} /> Quiz
                        </Link>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${openChapters[chapter._id] ? 'rotate-180' : ''}`}
                        />
                      </div>
                    </div>

                    {/* Topics & Lessons */}
                    <AnimatePresence>
                      {openChapters[chapter._id] && chapter.topics?.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="border-t border-dark-border overflow-hidden"
                        >
                          {chapter.topics.map((topic) => (
                            <div key={topic._id} className="border-b border-dark-border last:border-0">
                              <div
                                className="flex items-center gap-3 px-6 py-3 cursor-pointer hover:bg-brand-500/5 transition-colors"
                                onClick={() => toggleTopic(topic._id)}
                              >
                                <ChevronRight
                                  size={14}
                                  className={`text-slate-500 transition-transform ${openTopics[topic._id] ? 'rotate-90' : ''}`}
                                />
                                <span className="text-slate-300 text-sm font-medium">{topic.title}</span>
                                <span className="text-xs text-slate-600 ml-auto">{topic.lessons?.length || 0} lessons</span>
                              </div>

                              <AnimatePresence>
                                {openTopics[topic._id] && topic.lessons?.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                  >
                                    {topic.lessons.map((lesson) => {
                                      const done = completedIds.has(lesson._id);
                                      return (
                                        <Link
                                          key={lesson._id}
                                          to={`/courses/${courseId}/lessons/${lesson._id}`}
                                          className="flex items-center gap-3 px-10 py-2.5 hover:bg-brand-500/5 transition-colors group"
                                        >
                                          {done
                                            ? <CheckCircle2 size={14} className="text-green-400 shrink-0" />
                                            : <Play size={14} className="text-slate-500 group-hover:text-brand-400 shrink-0 transition-colors" />
                                          }
                                          <span className={`text-sm ${done ? 'text-slate-400' : 'text-slate-300 group-hover:text-white'} transition-colors`}>
                                            {lesson.title}
                                          </span>
                                          {lesson.duration && (
                                            <span className="text-xs text-slate-600 ml-auto flex items-center gap-1">
                                              <Clock size={11} /> {lesson.duration}m
                                            </span>
                                          )}
                                        </Link>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            {/* Quick Stats */}
            <div className="glass-card p-5">
              <h3 className="text-white font-semibold mb-4">Course Info</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <BookOpen size={15} /> Lessons
                  </div>
                  <span className="text-white font-medium">{course.totalLessons || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <BarChart3 size={15} /> Chapters
                  </div>
                  <span className="text-white font-medium">{chapters?.length || 0}</span>
                </div>
                {course.difficulty && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <Sparkles size={15} /> Difficulty
                    </div>
                    <span className={`badge ${difficultyColors[course.difficulty] || 'text-slate-400 bg-slate-400/10'}`}>
                      {course.difficulty}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* AI Chat CTA */}
            <Link to={`/courses/${courseId}/chat`} className="block glass-card p-5 bg-gradient-card hover:border-brand-500/40 transition-all group">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
                  <MessageSquare size={18} className="text-brand-400" />
                </div>
                <div>
                  <p className="text-white font-semibold">AI Tutor</p>
                  <p className="text-xs text-slate-500">Ask anything about this course</p>
                </div>
              </div>
              <p className="text-brand-400 text-sm flex items-center gap-1 group-hover:gap-2 transition-all">
                Start chat <ChevronRight size={14} />
              </p>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
