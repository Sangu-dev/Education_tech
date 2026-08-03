import { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Send, ChevronLeft, Sparkles, Loader2, Bot, User,
  Trash2, BookOpen, MessageSquare,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout.jsx';
import { chatAPI } from '../api/chat.js';
import { coursesAPI } from '../api/courses.js';
import toast from 'react-hot-toast';

export default function ChatPage() {
  const { courseId } = useParams();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [localMessages, setLocalMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => coursesAPI.getById(courseId).then(r => r.data.data.course),
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['chat-history', courseId],
    queryFn: () => chatAPI.getHistory(courseId).then(r => {
      // Backend returns { chats: [...] } where each chat has a messages array
      const chats = r.data.data.chats || [];
      // Get the most recent chat's messages
      return chats.length > 0 ? chats[0].messages || [] : [];
    }),
  });

  // Store chatId for clear operation
  const [activeChatId, setActiveChatId] = useState(null);
  const { data: chatsData } = useQuery({
    queryKey: ['chat-sessions', courseId],
    queryFn: () => chatAPI.getHistory(courseId).then(r => r.data.data.chats || []),
  });


  // Keep localMessages in sync with fetched history
  useEffect(() => {
    if (historyData) setLocalMessages(historyData);
  }, [historyData]);

  const { mutate: sendMessage, isPending: sending } = useMutation({
    mutationFn: (msg) => chatAPI.sendMessage(courseId, msg),
    onMutate: (msg) => {
      const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
      setLocalMessages(prev => [...prev, userMsg]);
      setMessage('');
    },
    onSuccess: (res) => {
      const messageContent = res.data.data.message; // string from backend
      const aiMsg = {
        role: 'assistant',
        content: messageContent,
        timestamp: new Date().toISOString(),
      };
      // Store chatId for clear operations
      if (res.data.data.chatId) setActiveChatId(res.data.data.chatId);
      setLocalMessages(prev => {
        const withoutTyping = prev.filter(m => m._typing !== true);
        return [...withoutTyping, aiMsg];
      });
    },
    onError: () => {
      toast.error('Failed to send message');
      setLocalMessages(prev => prev.filter(m => m._typing !== true));
    },
  });

  const { mutate: clearChat } = useMutation({
    mutationFn: () => {
      // Use the active chat ID from sends, or get from history
      const chatId = activeChatId || (chatsData?.[0]?._id);
      if (!chatId) return Promise.resolve();
      return chatAPI.clearChat(chatId);
    },
    onSuccess: () => {
      setLocalMessages([]);
      setActiveChatId(null);
      queryClient.invalidateQueries({ queryKey: ['chat-history', courseId] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions', courseId] });
      toast.success('Chat cleared');
    },
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    sendMessage(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, sending]);

  const suggestedQuestions = [
    'Summarize this course for me',
    'What are the key concepts I should know?',
    'Give me a study plan for this material',
    'What are common mistakes to avoid?',
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-dark-border bg-dark-200/80 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Link to={`/courses/${courseId}`} className="text-slate-400 hover:text-brand-400 transition-colors">
              <ChevronLeft size={20} />
            </Link>
            <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-brand-sm">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">AI Tutor</p>
              <p className="text-xs text-slate-500 truncate max-w-[200px]">{course?.title || 'Loading…'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to={`/courses/${courseId}`} className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-brand-400 transition-colors">
              <BookOpen size={13} /> Course
            </Link>
            {localMessages.length > 0 && (
              <button
                onClick={() => clearChat()}
                className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Clear chat"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="text-brand-400 animate-spin" />
            </div>
          ) : localMessages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-3xl bg-gradient-brand flex items-center justify-center mx-auto mb-5 shadow-brand">
                <MessageSquare size={32} className="text-white" />
              </div>
              <h3 className="text-white font-display font-bold text-xl mb-2">Ask Your AI Tutor</h3>
              <p className="text-slate-400 max-w-md mb-8">
                I'm trained on your course content. Ask me anything — from clarifications to deep dives.
              </p>
              {/* Suggested questions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                {suggestedQuestions.map(q => (
                  <button
                    key={q}
                    onClick={() => { setMessage(q); inputRef.current?.focus(); }}
                    className="text-left p-3 glass-card text-sm text-slate-300 hover:text-white hover:border-brand-500/30 transition-all rounded-xl"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <AnimatePresence initial={false}>
              {localMessages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1
                      ${isUser ? 'bg-brand-500/20 border border-brand-500/30' : 'bg-gradient-brand shadow-brand-sm'}`}
                    >
                      {isUser
                        ? <User size={14} className="text-brand-400" />
                        : <Bot size={14} className="text-white" />
                      }
                    </div>

                    {/* Bubble */}
                    <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
                        ${isUser
                          ? 'bg-brand-500/20 border border-brand-500/30 text-white rounded-tr-sm'
                          : 'bg-dark-card border border-dark-border text-slate-200 rounded-tl-sm'
                        }`}
                      >
                        {isUser ? (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div className="prose prose-invert prose-sm max-w-none
                            prose-p:text-slate-200 prose-p:my-1 prose-p:leading-relaxed
                            prose-strong:text-white prose-headings:text-white
                            prose-code:text-brand-300 prose-code:bg-dark-300 prose-code:px-1 prose-code:rounded
                            prose-pre:bg-dark-300 prose-pre:border prose-pre:border-dark-border
                            prose-ul:my-1 prose-li:my-0.5
                          ">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {msg.timestamp && (
                        <p className="text-[10px] text-slate-600 mt-1 px-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Typing indicator */}
          {sending && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="bg-dark-card border border-dark-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-brand-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-dark-border bg-dark-200/80 backdrop-blur px-4 sm:px-6 py-4">
          <div className="flex items-end gap-3 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                id="chat-input"
                ref={inputRef}
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about this course…"
                rows={1}
                style={{ resize: 'none', minHeight: 44, maxHeight: 120 }}
                className="input-field pr-4 py-3 leading-relaxed"
                onInput={e => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
              />
            </div>
            <motion.button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!message.trim() || sending}
              whileTap={{ scale: 0.95 }}
              className="btn-primary p-3 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? <Loader2 size={18} className="animate-spin" />
                : <Send size={18} />}
            </motion.button>
          </div>
          <p className="text-xs text-slate-600 text-center mt-2">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
