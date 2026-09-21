import { motion } from 'framer-motion';
import { User, Sparkles, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function ChatBubble({ message, isUser }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10, x: 20 }}
        animate={{ opacity: 1, y: 0, x: 0 }}
        className="flex items-end gap-2 justify-end"
      >
        <div className="max-w-[75%] bg-gradient-brand text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm shadow-brand-sm">
          <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
          <p className="text-white/50 text-[10px] mt-1.5 text-right">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center shrink-0">
          <User size={13} className="text-white" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: -20 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      className="flex items-end gap-2"
    >
      <div className="w-7 h-7 rounded-full bg-dark-card border border-brand-500/30 flex items-center justify-center shrink-0">
        <Sparkles size={12} className="text-brand-400" />
      </div>
      <div className="max-w-[80%] glass-card px-4 py-3 group">
        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-slate-600 text-[10px]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
          <button
            onClick={copyToClipboard}
            className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-slate-200 transition-all"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-end gap-2"
    >
      <div className="w-7 h-7 rounded-full bg-dark-card border border-brand-500/30 flex items-center justify-center">
        <Sparkles size={12} className="text-brand-400" />
      </div>
      <div className="glass-card px-4 py-3">
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-brand-400"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
