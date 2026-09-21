import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Clock, CheckCircle2, XCircle, ChevronLeft,
  Loader2, Sparkles, ChevronRight, Target, RotateCcw,
  Brain,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { quizAPI } from '../api/quiz.js';
import toast from 'react-hot-toast';

const STAGE = { LOADING: 'loading', READY: 'ready', TAKING: 'taking', RESULTS: 'results' };

export default function QuizPage() {
  const { courseId, chapterId } = useParams();
  const [stage, setStage] = useState(STAGE.LOADING);
  const [quiz, setQuiz] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({});
  const [startTime] = useState(Date.now());
  const [results, setResults] = useState(null);

  const { mutate: generateQuiz, isPending: generating } = useMutation({
    mutationFn: () => quizAPI.generate(courseId, chapterId),
    onSuccess: (res) => {
      setQuiz(res.data.data.quiz);
      setStage(STAGE.READY);
      toast.success('Quiz generated!');
    },
    onError: () => {
      toast.error('Failed to generate quiz');
      setStage(STAGE.READY);
    },
  });

  // Try to get existing quiz first
  const { data: quizData, isLoading: fetchLoading } = useQuery({
    queryKey: ['quiz', chapterId],
    queryFn: () => quizAPI.getByChapter(chapterId).then(r => r.data.data),
    retry: false,
    enabled: !!chapterId,
  });

  useEffect(() => {
    if (fetchLoading) return;
    if (quizData?.quiz) {
      setQuiz(quizData.quiz);
      setStage(STAGE.READY);
    } else if (stage === STAGE.LOADING) {
      generateQuiz();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLoading, quizData]);



  const { mutate: submitQuiz, isPending: submitting } = useMutation({
    mutationFn: () => {
      const timeTaken = Math.floor((Date.now() - startTime) / 1000);
      // Build answers array matching questions order
      const formattedAnswers = questions.map((q, qi) => {
        const val = answers[qi];
        if (val === undefined || val === null || val === '') return '';
        if (typeof val === 'number' && q.options && q.options[val] !== undefined) {
          return q.options[val];
        }
        return String(val);
      });
      return quizAPI.submit(quiz._id, formattedAnswers, timeTaken);
    },
    onSuccess: (res) => {
      setResults(res.data.data);
      setStage(STAGE.RESULTS);
    },
    onError: () => toast.error('Failed to submit quiz'),
  });

  const handleAnswer = (qi, ai) => {
    setAnswers(prev => ({ ...prev, [qi]: ai }));
  };

  const handleNext = () => {
    if (currentQ < quiz.questions.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      submitQuiz();
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setCurrentQ(0);
    setResults(null);
    setStage(STAGE.TAKING);
  };

  const questions = quiz?.questions || [];
  const totalQ = questions.length;
  const answered = Object.keys(answers).filter(k => answers[k] !== undefined && answers[k] !== '').length;
  // Results: backend returns { percentage, score, passed, attempt, correctAnswers }
  const scorePercent = results?.percentage || 0;
  const scoreColor = scorePercent >= 80 ? 'text-green-400' : scorePercent >= 60 ? 'text-yellow-400' : 'text-red-400';
  const correctCount = results?.attempt?.answers?.filter(a => a.isCorrect)?.length ?? 0;

  if (fetchLoading || stage === STAGE.LOADING) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 size={36} className="text-brand-400 animate-spin" />
          <p className="text-slate-400">Loading quiz…</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-container max-w-3xl">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
          <Link to={`/courses/${courseId}`} className="hover:text-brand-400 transition-colors flex items-center gap-1">
            <ChevronLeft size={14} /> Back to Course
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── READY State ─── */}
          {stage === STAGE.READY && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              className="text-center"
            >
              <div className="glass-card p-10">
                <div className="w-20 h-20 rounded-3xl bg-gradient-brand flex items-center justify-center mx-auto mb-6 shadow-brand">
                  <Brain size={36} className="text-white" />
                </div>
                <h1 className="text-3xl font-display font-bold text-white mb-2">
                  {generating ? 'Generating Quiz…' : 'Chapter Quiz'}
                </h1>
                {!generating && quiz && (
                  <>
                    <p className="text-slate-400 mb-6">
                      Test your knowledge with <span className="text-white font-semibold">{totalQ} questions</span> about this chapter.
                    </p>
                    <div className="grid grid-cols-3 gap-4 mb-8">
                      {[
                        { label: 'Questions', value: totalQ, icon: Target },
                        { label: 'Pass Score', value: '60%', icon: Trophy },
                        { label: 'Timed', value: 'No', icon: Clock },
                      ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="bg-dark-200 rounded-xl p-4 text-center">
                          <Icon size={20} className="text-brand-400 mx-auto mb-2" />
                          <p className="text-white font-bold text-lg">{value}</p>
                          <p className="text-slate-500 text-xs">{label}</p>
                        </div>
                      ))}
                    </div>
                    <button
                      id="start-quiz-btn"
                      onClick={() => setStage(STAGE.TAKING)}
                      className="btn-primary text-lg px-10 py-4 flex items-center gap-2 mx-auto"
                    >
                      <Sparkles size={20} /> Start Quiz
                    </button>
                  </>
                )}
                {generating && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <Loader2 size={28} className="text-brand-400 animate-spin" />
                    <p className="text-slate-400">AI is generating questions from chapter content…</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ─── TAKING State ─── */}
          {stage === STAGE.TAKING && questions.length > 0 && (
            <motion.div
              key="taking"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              {/* Progress */}
              <div className="flex items-center justify-between mb-6 gap-3">
                <p className="text-slate-400 text-sm whitespace-nowrap">
                  Question <span className="text-white font-semibold">{currentQ + 1}</span> of {totalQ}
                </p>
                <div className="flex items-center gap-1.5 flex-1 max-w-xs mx-2">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        i < currentQ ? 'bg-brand-500' : i === currentQ ? 'bg-brand-400 ring-2 ring-brand-400/40' : 'bg-dark-border'
                      }`}
                    />
                  ))}
                </div>
                <p className="text-slate-500 text-xs whitespace-nowrap">{answered} answered</p>
              </div>

              {/* Question Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQ}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="glass-card p-8"
                >
                  <h2 className="text-xl font-display font-semibold text-white mb-6 leading-relaxed">
                    {questions[currentQ].question}
                  </h2>

                  {/* Options or Fallback Input */}
                  <div className="space-y-3 mb-8">
                    {questions[currentQ].options && questions[currentQ].options.length > 0 ? (
                      questions[currentQ].options.map((opt, oi) => {
                        const selected = answers[currentQ] === oi || answers[currentQ] === opt;
                        return (
                          <motion.button
                            key={oi}
                            id={`quiz-option-${oi}`}
                            onClick={() => handleAnswer(currentQ, oi)}
                            whileTap={{ scale: 0.99 }}
                            className={`w-full text-left p-4 rounded-xl border transition-all duration-150 text-sm
                              ${selected
                                ? 'border-brand-500 bg-brand-500/15 text-white shadow-brand-sm'
                                : 'border-dark-border bg-dark-200 text-slate-300 hover:border-brand-500/40 hover:bg-brand-500/5'
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 text-xs font-bold
                                ${selected ? 'border-brand-500 bg-brand-500 text-white' : 'border-dark-border text-slate-500'}`}>
                                {String.fromCharCode(65 + oi)}
                              </div>
                              {opt}
                            </div>
                          </motion.button>
                        );
                      })
                    ) : (
                      <input
                        type="text"
                        value={answers[currentQ] || ''}
                        onChange={(e) => handleAnswer(currentQ, e.target.value)}
                        placeholder="Type your answer..."
                        className="w-full p-4 rounded-xl border border-dark-border bg-dark-200 text-white focus:outline-none focus:border-brand-500"
                      />
                    )}
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setCurrentQ(q => Math.max(0, q - 1))}
                      disabled={currentQ === 0}
                      className="btn-ghost flex items-center gap-2 disabled:opacity-40"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                    <button
                      id="quiz-next-btn"
                      onClick={handleNext}
                      disabled={(answers[currentQ] === undefined || answers[currentQ] === '') || submitting}
                      className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                      {currentQ === totalQ - 1 ? 'Submit Quiz' : 'Next'}
                      {currentQ < totalQ - 1 && <ChevronRight size={16} />}
                    </button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}

          {/* ─── RESULTS State ─── */}
          {stage === STAGE.RESULTS && results && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-8"
            >
              {/* Score */}
              <div className="text-center mb-8">
                <div className="w-28 h-28 rounded-full bg-dark-200 border-4 border-brand-500/30 flex items-center justify-center mx-auto mb-4">
                  <div>
                    <p className={`text-3xl font-display font-bold ${scoreColor}`}>{scorePercent}%</p>
                    <p className="text-slate-500 text-xs">Score</p>
                  </div>
                </div>
                <h2 className="text-2xl font-display font-bold text-white mb-1">
                  {scorePercent >= 80 ? '🎉 Excellent!' : scorePercent >= 60 ? '👍 Good job!' : '💪 Keep Practicing'}
                </h2>
                <p className="text-slate-400">
                  {correctCount} out of {totalQ} correct
                  {results?.passed && <span className="ml-2 text-green-400 text-sm font-semibold">✓ Passed!</span>}
                  {results?.passed === false && <span className="ml-2 text-red-400 text-sm">Try again to pass</span>}
                </p>
              </div>

              {/* Answer Review */}
              <div className="space-y-4 mb-8 max-h-96 overflow-y-auto pr-2">
                {questions.map((q, qi) => {
                  const attemptAnswer = results?.attempt?.answers?.[qi];
                  const isCorrect = attemptAnswer?.isCorrect ?? false;
                  const userAnswerText = attemptAnswer?.userAnswer ?? 'No answer';
                  const correctAnswerText = results?.correctAnswers?.[qi]?.correctAnswer ?? q.correctAnswer;
                  return (
                    <div key={qi} className={`p-4 rounded-xl border ${isCorrect ? 'border-green-500/20 bg-green-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                      <div className="flex items-start gap-2 mb-2">
                        {isCorrect
                          ? <CheckCircle2 size={16} className="text-green-400 shrink-0 mt-0.5" />
                          : <XCircle size={16} className="text-red-400 shrink-0 mt-0.5" />}
                        <p className="text-white text-sm font-medium">{q.question}</p>
                      </div>
                      {!isCorrect && (
                        <div className="ml-6 space-y-1">
                          <p className="text-red-400 text-xs">Your answer: <span className="text-red-300">{userAnswerText}</span></p>
                          <p className="text-green-400 text-xs">Correct: <span className="text-green-300">{correctAnswerText}</span></p>
                          {results?.correctAnswers?.[qi]?.explanation && (
                            <p className="text-slate-500 text-xs mt-1 italic">{results.correctAnswers[qi].explanation}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={handleRetake} className="btn-outline flex items-center gap-2 flex-1 justify-center">
                  <RotateCcw size={16} /> Retake Quiz
                </button>
                <Link to={`/courses/${courseId}`} className="btn-primary flex items-center gap-2 flex-1 justify-center">
                  <ChevronLeft size={16} /> Back to Course
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
