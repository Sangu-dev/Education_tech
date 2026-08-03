import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle2, XCircle, Loader2,
  Sparkles, BookOpen, ChevronRight, Trash2, RefreshCw,
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

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState(null);

  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => coursesAPI.getAll().then(r => r.data.courses || r.data.data?.courses || []),
    refetchInterval: (query) => {
      // TanStack Query v5: callback receives query object, not data directly
      const data = query.state.data;
      const hasProcessing = Array.isArray(data) && data.some(c => c.status === 'processing' || c.status === 'pending');
      return hasProcessing ? 5000 : false;
    },
  });

  const { mutate: upload, isPending: uploading } = useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('pdf', file);
      return uploadAPI.uploadPDF(formData, (ev) => {
        setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
      });
    },
    onSuccess: (res) => {
      toast.success('PDF uploaded! AI is generating your course…');
      setUploadedFile(null);
      setUploadProgress(0);
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => {
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
      <div className="page-container max-w-4xl">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white">Upload PDF</h1>
          <p className="text-slate-400 mt-1">Upload any PDF and AI will create a structured course with lessons, quizzes, and a tutor</p>
        </motion.div>

        {/* Drop Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          {...getRootProps()}
          className={`relative glass-card p-12 text-center cursor-pointer transition-all duration-200 border-2 border-dashed
            ${isDragActive ? 'border-brand-500 bg-brand-500/10' : 'border-dark-border hover:border-brand-500/50 hover:bg-brand-500/5'}
            ${uploading ? 'pointer-events-none' : ''}
          `}
        >
          <input {...getInputProps()} id="pdf-upload-input" />

          {/* Background glow */}
          {isDragActive && (
            <div className="absolute inset-0 rounded-2xl bg-brand-500/5 animate-pulse" />
          )}

          <div className="relative z-10">
            {uploadedFile ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <FileText size={28} className="text-green-400" />
                </div>
                <p className="text-white font-semibold text-lg">{uploadedFile.name}</p>
                <p className="text-slate-400 text-sm mt-1">{formatSize(uploadedFile.size)}</p>
              </motion.div>
            ) : (
              <>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-all
                  ${isDragActive ? 'bg-brand-500/20 border border-brand-500/40 scale-110' : 'bg-brand-500/10 border border-brand-500/20'}`}
                >
                  <Upload size={28} className="text-brand-400" />
                </div>
                <p className="text-white font-semibold text-lg mb-1">
                  {isDragActive ? 'Drop your PDF here!' : 'Drag & drop your PDF here'}
                </p>
                <p className="text-slate-400 text-sm">
                  or <span className="text-brand-400 font-medium">browse files</span> · PDF only · Max 50MB
                </p>
              </>
            )}
          </div>
        </motion.div>

        {/* Upload Progress + Actions */}
        <AnimatePresence>
          {(uploadedFile || uploading) && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="mt-4 glass-card p-5"
            >
              {uploading ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="text-brand-400 animate-spin" />
                      <span className="text-white text-sm font-medium">Uploading…</span>
                    </div>
                    <span className="text-brand-400 font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="progress-bar-track h-2">
                    <div
                      className="progress-bar-fill h-2"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    id="confirm-upload-btn"
                    onClick={handleUpload}
                    className="btn-primary flex items-center gap-2 flex-1 justify-center"
                  >
                    <Sparkles size={16} /> Generate Course with AI
                  </button>
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="btn-ghost p-3"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Processing Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 glass-card p-5 bg-gradient-card"
        >
          <div className="flex items-start gap-3">
            <Sparkles size={20} className="text-brand-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-white font-semibold mb-1">What happens next?</p>
              <div className="text-slate-400 text-sm space-y-1">
                <p>📄 AI parses your PDF and extracts structured content</p>
                <p>📚 Chapters, topics, and lessons are created automatically</p>
                <p>🧠 AI tutor is trained on your document for instant Q&A</p>
                <p>✅ Quizzes are generated for each chapter to test knowledge</p>
              </div>
              <p className="text-brand-400 text-xs mt-2 font-medium">Processing typically takes 1–3 minutes</p>
            </div>
          </div>
        </motion.div>

        {/* PDF Requirements Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-4 glass-card p-4 border border-yellow-500/20 bg-yellow-500/5"
        >
          <div className="flex items-start gap-3">
            <span className="text-yellow-400 text-lg shrink-0">⚠</span>
            <div>
              <p className="text-yellow-300 font-semibold text-sm mb-1">PDF Requirements</p>
              <div className="text-slate-400 text-xs space-y-1">
                <p>✅ <span className="text-slate-300">Text-based PDFs</span> — documents you can select & copy text from</p>
                <p>❌ <span className="text-slate-300">Scanned / Image PDFs</span> — photos of pages or scanned books won't work</p>
                <p>💡 If your PDF is scanned, use <span className="text-brand-400">Adobe Acrobat</span> or an online OCR tool to convert it first</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Uploaded Courses */}
        {!coursesLoading && courses?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8">
            <h2 className="section-title text-xl mb-4">Your Courses</h2>
            <div className="space-y-3">
              {courses.map(course => {
                const status = STATUS_CONFIG[course.status] || STATUS_CONFIG.pending;
                const StatusIcon = status.icon;
                const isProcessing = course.status === 'processing' || course.status === 'pending';

                return (
                  <motion.div
                    key={course._id}
                    layout
                    className="glass-card p-4 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center shrink-0">
                      <BookOpen size={18} className="text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{course.title}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.color} ${status.bg}`}>
                          <StatusIcon size={11} className={isProcessing ? 'animate-spin' : ''} />
                          {status.label}
                        </span>
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
                          className="btn-primary py-2 px-4 text-sm flex items-center gap-1"
                        >
                          Open <ChevronRight size={14} />
                        </button>
                      )}
                      {isProcessing && (
                        <RefreshCw size={16} className="text-slate-500 animate-spin-slow" />
                      )}
                      <button
                        onClick={() => deleteCourse(course._id)}
                        className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 size={15} />
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
