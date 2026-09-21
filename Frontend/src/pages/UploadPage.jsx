import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2,
  Sparkles, BookOpen, ChevronRight, Trash2, RefreshCw,
  Sliders, Palette, GraduationCap, Video, Layers, Brain
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { uploadAPI } from '../api/upload.js';
import { coursesAPI } from '../api/courses.js';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:    { label: 'Pending',    color: 'text-slate-400',  bg: 'bg-slate-400/10',  icon: Loader2 },
  processing: { label: 'Processing', color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: Loader2 },
  ready:      { label: 'Ready',      color: 'text-green-400',  bg: 'bg-green-400/10',  icon: CheckCircle2 },
  failed:     { label: 'Failed',     color: 'text-red-400',    bg: 'bg-red-400/10',    icon: XCircle },
};

const LEARNING_LEVELS = [
  { id: 'beginner', label: 'Beginner', desc: 'Simple words & everyday analogies', icon: '🌱' },
  { id: 'school', label: 'School', desc: 'Core fundamentals & intuitive diagrams', icon: '🎒' },
  { id: 'college', label: 'College', desc: 'Systematic theory & formal definitions', icon: '🏛️' },
  { id: 'intermediate', label: 'Intermediate', desc: 'Practical workflows & architecture', icon: '⚡' },
  { id: 'advanced', label: 'Advanced', desc: 'Deep mechanisms & algorithmic nuances', icon: '🚀' },
];

const VIDEO_STYLES = [
  { id: 'technical', label: 'Technical Diagram', desc: 'Neural nets, data pipelines & flowcharts', icon: '🧠' },
  { id: 'infographic', label: 'Modern Infographic', desc: 'Neon glass cards, metrics & bold flows', icon: '✨' },
  { id: 'whiteboard', label: 'Animated Whiteboard', desc: 'Blackboard sketch & progressive reveals', icon: '✏️' },
  { id: 'classroom', label: 'Animated Classroom', desc: 'Board slide notes & spotlight callouts', icon: '🎓' },
  { id: 'storytelling', label: 'Storytelling', desc: 'Relatable scenario & breakthrough journey', icon: '📖' },
];

const PIPELINE_STEPS = [
  { step: 1, label: 'Uploading PDF', icon: '📤' },
  { step: 2, label: 'Analyzing document', icon: '📑' },
  { step: 3, label: 'Understanding concepts', icon: '🧠' },
  { step: 4, label: 'Creating lesson plan', icon: '📝' },
  { step: 5, label: 'Designing animations', icon: '🎨' },
  { step: 6, label: 'Generating narration', icon: '🎙️' },
  { step: 7, label: 'Rendering scenes', icon: '🎬' },
  { step: 8, label: 'Finalizing video', icon: '⚡' },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [learningLevel, setLearningLevel] = useState('beginner');
  const [videoStyle, setVideoStyle] = useState('technical');
  const [showProgressModal, setShowProgressModal] = useState(false);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll().then((r) => r.data.courses || r.data.data?.courses || []),
    refetchInterval: (query) => {
      const data = query.state.data;
      const hasProcessing = Array.isArray(data) && data.some((c) => c.status === 'processing' || c.status === 'pending');
      return hasProcessing ? 4000 : false;
    },
  });

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: async (file) => {
      setShowProgressModal(true);
      const formData = new FormData();
      formData.append('pdf', file);
      formData.append('learningLevel', learningLevel);
      formData.append('videoStyle', videoStyle);

      return uploadAPI.uploadPDF(formData, (ev) => {
        setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
      });
    },
    onSuccess: () => {
      toast.success('PDF uploaded! AI Teacher is building your animated course…');
      setUploadedFile(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => {
      setShowProgressModal(false);
      toast.error(err?.response?.data?.message || 'Upload failed');
      setUploadProgress(0);
    },
  });

  const { mutate: deleteCourse } = useMutation({
    mutationFn: (id) => coursesAPI.delete(id),
    onSuccess: () => {
      toast.success('Course deleted');
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) {
      toast.error('Only PDF files under 50MB are accepted');
      return;
    }
    if (accepted[0]) {
      setUploadedFile(accepted[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: 50 * 1024 * 1024,
    multiple: false,
    disabled: uploading,
  });

  const handleUpload = () => {
    if (!uploadedFile) return;
    upload(uploadedFile);
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <DashboardLayout>
      <div className="page-container max-w-4xl pb-16">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-400 text-xs font-semibold uppercase tracking-wider">
              AI Teacher Animated Video
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">Upload PDF to Animated Video</h1>
          <p className="text-slate-400 mt-1.5 text-sm md:text-base">
            Upload your document. The AI teacher analyzes key concepts, crafts analogies, structures visual scenes, and renders an animated lesson video.
          </p>
        </motion.div>

        {/* ── 1. Learning Level Selector ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6 p-5 glass-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap size={18} className="text-brand-400" />
            <h3 className="text-white font-semibold text-sm">Select Learning Level</h3>
            <span className="text-xs text-slate-500">(Adapts explanation complexity &amp; vocabulary)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {LEARNING_LEVELS.map((lvl) => {
              const selected = learningLevel === lvl.id;
              return (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setLearningLevel(lvl.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selected
                      ? 'bg-brand-500/20 border-brand-500 shadow-md shadow-brand-500/20'
                      : 'bg-dark-card border-dark-border hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{lvl.icon}</span>
                    {selected && <CheckCircle2 size={14} className="text-brand-400" />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-200'}`}>
                      {lvl.label}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                      {lvl.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── 2. Video Style Selector ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 p-5 glass-card"
        >
          <div className="flex items-center gap-2 mb-3">
            <Palette size={18} className="text-cyan-400" />
            <h3 className="text-white font-semibold text-sm">Select Video Animation Style</h3>
            <span className="text-xs text-slate-500">(Customizes visuals, diagrams &amp; transitions)</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {VIDEO_STYLES.map((sty) => {
              const selected = videoStyle === sty.id;
              return (
                <button
                  key={sty.id}
                  type="button"
                  onClick={() => setVideoStyle(sty.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selected
                      ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/20'
                      : 'bg-dark-card border-dark-border hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-lg">{sty.icon}</span>
                    {selected && <CheckCircle2 size={14} className="text-cyan-400" />}
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${selected ? 'text-white' : 'text-slate-200'}`}>
                      {sty.label}
                    </p>
                    <p className="text-[10px] text-slate-400 leading-tight mt-0.5 line-clamp-2">
                      {sty.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── 3. Drop Zone ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          {...getRootProps()}
          className={`relative glass-card p-10 text-center cursor-pointer transition-all duration-200 border-2 border-dashed ${
            isDragActive
              ? 'border-brand-500 bg-brand-500/10'
              : 'border-dark-border hover:border-brand-500/50 hover:bg-brand-500/5'
          } ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <input {...getInputProps()} id="pdf-upload-input" />

          <div className="relative z-10">
            {uploadedFile ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                  <FileText size={28} className="text-emerald-400" />
                </div>
                <p className="text-white font-semibold text-base">{uploadedFile.name}</p>
                <p className="text-slate-400 text-xs mt-1">{formatSize(uploadedFile.size)}</p>
              </motion.div>
            ) : (
              <>
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all ${
                    isDragActive
                      ? 'bg-brand-500/20 border border-brand-500/40 scale-110'
                      : 'bg-brand-500/10 border border-brand-500/20'
                  }`}
                >
                  <Upload size={28} className="text-brand-400" />
                </div>
                <p className="text-white font-semibold text-base mb-1">
                  {isDragActive ? 'Drop your PDF here!' : 'Drag & drop your PDF here'}
                </p>
                <p className="text-slate-400 text-xs">
                  or <span className="text-brand-400 font-medium">browse files</span> · PDF only · Max 50MB
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* ── 4. Upload & Generate Button ── */}
        <AnimatePresence>
          {uploadedFile && !uploading && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-4 glass-card p-4 flex items-center gap-3"
            >
              <button
                id="confirm-upload-btn"
                onClick={handleUpload}
                className="btn-primary flex items-center justify-center gap-2 flex-1 py-3 font-bold text-sm shadow-lg shadow-brand-500/30"
              >
                <Sparkles size={16} />
                Generate AI Teacher Animated Video ({learningLevel} • {videoStyle})
              </button>
              <button
                onClick={() => setUploadedFile(null)}
                className="btn-ghost p-3 rounded-xl"
                title="Remove file"
              >
                <XCircle size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 5. Progress Stepper Modal ── */}
        <AnimatePresence>
          {showProgressModal && uploading && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="mt-6 glass-card p-6 border border-brand-500/30 bg-slate-900/90"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Loader2 size={18} className="text-brand-400 animate-spin" />
                  <h4 className="text-white font-bold text-sm">AI Video Pipeline in Progress</h4>
                </div>
                <span className="text-xs font-mono font-bold text-brand-400">{uploadProgress}%</span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-6">
                <div
                  className="bg-gradient-to-r from-cyan-400 to-brand-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(10, uploadProgress)}%` }}
                />
              </div>

              {/* 8-step pipeline indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PIPELINE_STEPS.map((ps) => {
                  const isDone = uploadProgress > ps.step * 12;
                  return (
                    <div
                      key={ps.step}
                      className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                          : 'bg-slate-950/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <span className="text-sm">{ps.icon}</span>
                      <span className="truncate text-[11px] font-medium">{ps.label}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 6. Uploaded Courses List ── */}
        {!coursesLoading && courses?.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-10"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="section-title text-xl">Your AI Courses &amp; Lessons</h2>
              <span className="text-xs text-slate-400">{courses.length} courses</span>
            </div>

            <div className="space-y-3">
              {courses.map((course) => {
                const status = STATUS_CONFIG[course.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isProcessing = course.status === 'processing' || course.status === 'pending';

                return (
                  <motion.div key={course._id} layout className="glass-card p-4 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <BookOpen size={22} className="text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate text-base">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                          <StatusIcon size={11} className={isProcessing ? 'animate-spin' : ''} />
                          {status.label}
                        </span>
                        {course.difficulty && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 capitalize">
                            {course.difficulty}
                          </span>
                        )}
                        {course.videoStyle && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 capitalize">
                            🎬 {course.videoStyle}
                          </span>
                        )}
                        {course.totalLessons > 0 && (
                          <span className="text-xs text-slate-500">{course.totalLessons} lessons</span>
                        )}
                      </div>
                      {course.status === 'failed' && course.processingError && (
                        <p className="text-xs text-red-400 mt-1.5 leading-relaxed">
                          ⚠ {course.processingError}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {course.status === 'ready' && (
                        <button
                          onClick={() => navigate(`/courses/${course._id}`)}
                          className="btn-primary py-2 px-4 text-sm flex items-center gap-1 font-semibold"
                        >
                          Open Course <ChevronRight size={14} />
                        </button>
                      )}
                      {isProcessing && (
                        <RefreshCw size={16} className="text-slate-500 animate-spin-slow" />
                      )}
                      <button
                        onClick={() => deleteCourse(course._id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete course"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
