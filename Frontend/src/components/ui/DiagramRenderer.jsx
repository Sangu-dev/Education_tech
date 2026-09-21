import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, Cpu, Database, ArrowRight,
  CheckCircle2, Sparkles, Terminal, Calculator
} from 'lucide-react';

// Helper to guarantee an array of clean strings for safe iteration (.map, .slice, etc.)
function ensureArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          return item.label || item.title || item.name || item.text || JSON.stringify(item);
        }
        return item != null ? String(item).trim() : '';
      })
      .filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.includes('•')) {
      return trimmed.split('•').map((s) => s.trim()).filter(Boolean);
    }
    if (trimmed.includes('\n')) {
      return trimmed.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    if (trimmed.includes(';')) {
      return trimmed.split(';').map((s) => s.trim()).filter(Boolean);
    }
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [String(val).trim()].filter(Boolean);
}

export default function DiagramRenderer({
  diagramType = 'concept_map',
  diagramData = {},
  title = '',
  keywords = [],
  onScreenText = [],
  videoStyle = 'technical',
  activeStep = 0,
}) {
  const type = (diagramType || 'concept_map').toLowerCase();
  const safeKeywords = ensureArray(keywords);
  const safeOnScreenText = ensureArray(onScreenText);
  const safeDiagramData = typeof diagramData === 'object' && diagramData !== null ? diagramData : {};

  // Pick theme style wrapper
  const getStyleWrapper = () => {
    switch (videoStyle) {
      case 'whiteboard':
        return 'bg-slate-900 border border-slate-700/80 shadow-2xl rounded-2xl';
      case 'classroom':
        return 'bg-[#0f1d18] border border-emerald-900/60 shadow-2xl rounded-2xl';
      case 'infographic':
        return 'bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/30 shadow-2xl rounded-2xl';
      case 'storytelling':
        return 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-rose-950/40 border border-amber-500/20 shadow-2xl rounded-2xl';
      default: // technical
        return 'bg-slate-950 border border-cyan-500/20 shadow-2xl rounded-2xl';
    }
  };

  return (
    <div className={`relative w-full h-[360px] md:h-[400px] overflow-hidden p-6 flex flex-col justify-between select-none ${getStyleWrapper()}`}>
      {/* Background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

      {/* Top Header & Type Badge */}
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center gap-1.5 shadow-sm">
            <Sparkles size={12} className="animate-spin text-brand-300" style={{ animationDuration: '4s' }} />
            {type.replace(/_/g, ' ')}
          </span>
          <span className="text-xs text-slate-400 font-medium hidden sm:inline">
            Style: <span className="capitalize text-slate-300 font-semibold">{videoStyle}</span>
          </span>
        </div>
        <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-lg border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-400 font-semibold text-[11px]">ACTIVE ANIMATION</span>
        </div>
      </div>

      {/* Visual Canvas Body */}
      <div className="relative z-10 flex-1 flex items-center justify-center my-2">
        {type === 'neural_network' && <NeuralNetworkVisual data={safeDiagramData} activeStep={activeStep} />}
        {(type === 'ml_pipeline' || type === 'process' || type === 'pipeline') && (
          <PipelineVisual data={safeDiagramData} fallbackItems={safeOnScreenText} activeStep={activeStep} />
        )}
        {(type === 'sorting' || type === 'algorithm') && <SortingVisual data={safeDiagramData} />}
        {(type === 'flowchart' || type === 'decision') && (
          <FlowchartVisual data={safeDiagramData} fallbackItems={safeOnScreenText} activeStep={activeStep} />
        )}
        {type === 'timeline' && <TimelineVisual data={safeDiagramData} activeStep={activeStep} />}
        {(type === 'comparison' || type === 'table') && <ComparisonVisual data={safeDiagramData} />}
        {(type === 'architecture' || type === 'system') && <ArchitectureVisual data={safeDiagramData} />}
        {(type === 'code_execution' || type === 'code') && <CodeExecutionVisual data={safeDiagramData} onScreenText={safeOnScreenText} />}
        {(type === 'formula' || type === 'math') && <FormulaVisual title={title} onScreenText={safeOnScreenText} />}
        {type !== 'neural_network' &&
          type !== 'ml_pipeline' &&
          type !== 'process' &&
          type !== 'pipeline' &&
          type !== 'sorting' &&
          type !== 'algorithm' &&
          type !== 'flowchart' &&
          type !== 'decision' &&
          type !== 'timeline' &&
          type !== 'comparison' &&
          type !== 'table' &&
          type !== 'architecture' &&
          type !== 'system' &&
          type !== 'code_execution' &&
          type !== 'code' &&
          type !== 'formula' &&
          type !== 'math' && (
            <ConceptMapVisual title={title} keywords={safeKeywords} onScreenText={safeOnScreenText} activeStep={activeStep} />
          )}
      </div>

      {/* Bottom Keywords Ribbon */}
      {safeKeywords.length > 0 && (
        <div className="relative z-10 flex items-center justify-center gap-2 flex-wrap pt-2 border-t border-white/5">
          {safeKeywords.slice(0, 4).map((kw, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
              {kw}
            </motion.span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 1. Neural Network Animation ───────────────────────────────────────────────
function NeuralNetworkVisual({ activeStep = 0 }) {
  const layers = [
    { name: 'Input Layer', count: 3, color: '#38BDF8' },
    { name: 'Hidden Layer', count: 4, color: '#A855F7' },
    { name: 'Output Layer', count: 2, color: '#22C55E' },
  ];

  return (
    <div className="relative flex items-center justify-between w-full max-w-lg px-8">
      {layers.map((layer, li) => {
        const isLayerActive = activeStep % 3 === li;
        return (
          <div key={li} className="flex flex-col items-center gap-3 relative z-10">
            <span className={`text-xs font-bold transition-colors ${isLayerActive ? 'text-white' : 'text-slate-400'}`}>
              {layer.name}
            </span>
            <div className="flex flex-col gap-4">
              {Array.from({ length: layer.count }).map((_, ni) => (
                <motion.div
                  key={ni}
                  initial={{ scale: 0 }}
                  animate={{
                    scale: isLayerActive ? [1, 1.25, 1] : [1, 1.08, 1],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: isLayerActive ? 1.4 : 2.6,
                    delay: li * 0.3 + ni * 0.12,
                    ease: 'easeInOut',
                  }}
                  className="w-10 h-10 rounded-full flex items-center justify-center border-2 shadow-lg cursor-pointer transition-all"
                  style={{
                    backgroundColor: `${layer.color}25`,
                    borderColor: layer.color,
                    boxShadow: isLayerActive ? `0 0 20px ${layer.color}70` : `0 0 10px ${layer.color}30`,
                  }}
                >
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: layer.color }} />
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}

      {/* SVG Connecting Synapses with animated pulses */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {[0, 1, 2].map((i) =>
          [0, 1, 2, 3].map((j) => (
            <g key={`syn-1-${i}-${j}`}>
              <line
                x1="22%"
                y1={`${30 + i * 20}%`}
                x2="50%"
                y2={`${20 + j * 18}%`}
                stroke="#475569"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <motion.circle
                r="3.5"
                fill="#38BDF8"
                animate={{
                  cx: ['22%', '50%'],
                  cy: [`${30 + i * 20}%`, `${20 + j * 18}%`],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.0,
                  delay: (i + j) * 0.2,
                  ease: 'easeInOut',
                }}
              />
            </g>
          ))
        )}

        {[0, 1, 2, 3].map((i) =>
          [0, 1].map((j) => (
            <g key={`syn-2-${i}-${j}`}>
              <line
                x1="50%"
                y1={`${20 + i * 18}%`}
                x2="78%"
                y2={`${35 + j * 25}%`}
                stroke="#475569"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <motion.circle
                r="3.5"
                fill="#A855F7"
                animate={{
                  cx: ['50%', '78%'],
                  cy: [`${20 + i * 18}%`, `${35 + j * 25}%`],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 1.8,
                  delay: 0.8 + (i + j) * 0.2,
                  ease: 'easeInOut',
                }}
              />
            </g>
          ))
        )}
      </svg>
    </div>
  );
}

// ─── 2. Pipeline / Machine Learning Flow Visual ───────────────────────────────
function PipelineVisual({ data = {}, fallbackItems = [], activeStep = 0 }) {
  const rawSteps = Array.isArray(data?.steps) && data.steps.length > 0
    ? ensureArray(data.steps)
    : ensureArray(fallbackItems);
  const steps = rawSteps.length >= 2 ? rawSteps : ['Dataset', 'Training', 'Model', 'Prediction'];
  const pulseIdx = activeStep % Math.max(1, Math.min(steps.length, 4));

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4 w-full max-w-2xl px-2">
      {steps.slice(0, 4).map((step, i) => {
        const isActive = i === pulseIdx;
        return (
          <div key={i} className="flex items-center gap-2 md:gap-4">
            <motion.div
              animate={{
                scale: isActive ? 1.08 : 1,
                borderColor: isActive ? '#38BDF8' : 'rgba(255,255,255,0.15)',
              }}
              transition={{ duration: 0.3 }}
              className={`relative px-4 py-3 md:px-5 md:py-4 rounded-xl border flex flex-col items-center justify-center min-w-[90px] md:min-w-[120px] shadow-lg transition-all ${
                isActive
                  ? 'bg-brand-500/25 shadow-cyan-500/30 border-cyan-400 ring-2 ring-cyan-400/30'
                  : 'bg-dark-card/90 border-dark-border opacity-70'
              }`}
            >
              {isActive && (
                <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-cyan-400 text-slate-950 font-bold text-[10px] uppercase shadow-sm">
                  ACTIVE
                </span>
              )}
              <span className="text-xl md:text-2xl mb-1 select-none">
                {i === 0 ? '📊' : i === 1 ? '⚙️' : i === 2 ? '🧠' : '🎯'}
              </span>
              <span className={`text-xs md:text-sm font-semibold truncate max-w-[100px] text-center ${
                isActive ? 'text-white' : 'text-slate-300'
              }`}>
                {step}
              </span>
            </motion.div>

            {i < Math.min(steps.length, 4) - 1 && (
              <motion.div
                animate={{
                  x: isActive ? [0, 5, 0] : 0,
                  opacity: isActive ? 1 : 0.4,
                }}
                transition={{ duration: 0.8, repeat: isActive ? Infinity : 0 }}
                className="text-cyan-400 shrink-0"
              >
                <ArrowRight size={18} />
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── 3. Sorting & Algorithm Animation ─────────────────────────────────────────
function SortingVisual() {
  const [bars, setBars] = useState([45, 75, 25, 90, 60]);
  const [comparing, setComparing] = useState([1, 2]);

  useEffect(() => {
    const timer = setInterval(() => {
      setBars((prev) => {
        const next = [...prev];
        const idx = Math.floor(Math.random() * (next.length - 1));
        setComparing([idx, idx + 1]);
        if (next[idx] > next[idx + 1]) {
          const temp = next[idx];
          next[idx] = next[idx + 1];
          next[idx + 1] = temp;
        }
        return next;
      });
    }, 1600);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-end justify-center gap-4 h-48 w-full max-w-sm pb-4">
      {bars.map((val, i) => {
        const isComp = comparing.includes(i);
        return (
          <motion.div
            key={i}
            layout
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-slate-400 font-mono font-bold">{val}</span>
            <div
              className={`w-10 rounded-t-lg transition-colors duration-300 shadow-md ${
                isComp ? 'bg-amber-400 shadow-amber-400/50' : 'bg-brand-500 shadow-brand-500/30'
              }`}
              style={{ height: `${val * 1.6}px` }}
            />
            <span className="text-[10px] text-slate-500 font-mono">#{i + 1}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── 4. Flowchart Visual ───────────────────────────────────────────────────────
function FlowchartVisual({ data = {}, fallbackItems = [], activeStep = 0 }) {
  const nodeLabels = Array.isArray(data?.nodes)
    ? data.nodes.map((n) => (typeof n === 'string' ? n : n?.label || n?.title || '')).filter(Boolean)
    : [];
  const rawFallback = ensureArray(fallbackItems);
  const items = nodeLabels.length > 0 ? nodeLabels : (rawFallback.length > 0 ? rawFallback : ['Start', 'Evaluate Condition', 'Execute', 'Output']);
  const activeIdx = activeStep % Math.max(1, Math.min(items.length, 3));

  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-md">
      {items.slice(0, 3).map((item, idx) => {
        const isActive = idx === activeIdx;
        return (
          <div key={idx} className="flex flex-col items-center gap-2 w-full">
            <motion.div
              animate={{
                scale: isActive ? 1.04 : 1,
                borderColor: isActive ? '#38BDF8' : 'rgba(255,255,255,0.15)',
              }}
              className={`w-full py-2.5 px-4 rounded-xl text-center font-semibold text-sm border shadow-md transition-all ${
                isActive
                  ? 'bg-brand-500/25 border-cyan-400 text-white ring-2 ring-cyan-400/20'
                  : 'bg-slate-900/80 border-slate-700 text-slate-300'
              }`}
            >
              {item}
            </motion.div>
            {idx < 2 && <ArrowRight size={16} className={`rotate-90 my-0.5 ${isActive ? 'text-cyan-400' : 'text-slate-600'}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ─── 5. Timeline Visual ───────────────────────────────────────────────────────
function TimelineVisual({ data = {}, activeStep = 0 }) {
  const rawEvents = ensureArray(data?.events);
  const events = rawEvents.length > 0 ? rawEvents : ['Genesis', 'Phase 1: Discovery', 'Phase 2: Scale', 'Phase 3: Impact'];
  const activeIdx = activeStep % Math.max(1, Math.min(events.length, 4));

  return (
    <div className="relative w-full max-w-xl px-4">
      <div className="absolute top-1/2 left-4 right-4 h-1 bg-slate-700 -translate-y-1/2 rounded" />
      <div className="relative flex justify-between">
        {events.slice(0, 4).map((ev, i) => {
          const isActive = i === activeIdx;
          return (
            <motion.div
              key={i}
              animate={{ scale: isActive ? 1.15 : 1 }}
              className="flex flex-col items-center text-center max-w-[100px]"
            >
              <div
                className={`w-7 h-7 rounded-full border-4 border-slate-950 shadow-md mb-2 relative z-10 transition-all ${
                  isActive ? 'bg-cyan-400 ring-4 ring-cyan-400/30' : 'bg-slate-600'
                }`}
              />
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{ev}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 6. Comparison Visual ─────────────────────────────────────────────────────
function ComparisonVisual({ data = {} }) {
  const leftTitle = data.left_title || data.left?.title || 'Approach A';
  const rightTitle = data.right_title || data.right?.title || 'Approach B';
  const rawLeft = ensureArray(data.left?.points || data.left_points || data.left);
  const leftPoints = rawLeft.length > 0 ? rawLeft : ['Simple & Intuitive', 'Fast Execution', 'Low Memory'];
  const rawRight = ensureArray(data.right?.points || data.right_points || data.right);
  const rightPoints = rawRight.length > 0 ? rawRight : ['Scalable & Robust', 'High Accuracy', 'Production-Grade'];

  return (
    <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
      <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 shadow-lg">
        <h4 className="text-sm font-bold text-cyan-400 mb-2">{leftTitle}</h4>
        <ul className="space-y-2 text-xs text-slate-300">
          {leftPoints.map((p, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-cyan-400 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 shadow-lg">
        <h4 className="text-sm font-bold text-purple-400 mb-2">{rightTitle}</h4>
        <ul className="space-y-2 text-xs text-slate-300">
          {rightPoints.map((p, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-purple-400 shrink-0" /> {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── 7. Architecture Visual ───────────────────────────────────────────────────
function ArchitectureVisual() {
  return (
    <div className="flex items-center justify-around w-full max-w-lg">
      <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-md">
        <Terminal size={24} className="text-cyan-400" />
        <span className="text-xs font-bold text-slate-200">Client / UI</span>
      </div>
      <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5 }} className="text-cyan-400 font-bold">
        ⇄
      </motion.div>
      <div className="flex flex-col items-center gap-2 p-3 bg-brand-500/15 border border-brand-500/40 rounded-xl shadow-lg ring-2 ring-brand-500/20">
        <Cpu size={24} className="text-brand-400" />
        <span className="text-xs font-bold text-white">AI Engine</span>
      </div>
      <motion.div animate={{ x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.3 }} className="text-purple-400 font-bold">
        ⇄
      </motion.div>
      <div className="flex flex-col items-center gap-2 p-3 bg-slate-900 border border-slate-700 rounded-xl shadow-md">
        <Database size={24} className="text-purple-400" />
        <span className="text-xs font-bold text-slate-200">Knowledge DB</span>
      </div>
    </div>
  );
}

// ─── 8. Code Execution Visual ─────────────────────────────────────────────────
function CodeExecutionVisual({ data = {}, onScreenText = [] }) {
  const codeLines = Array.isArray(data?.code)
    ? data.code
    : (typeof data?.code === 'string' ? data.code.split('\n') : []);
  const safeText = ensureArray(onScreenText);
  const candidate = codeLines.length > 0 ? codeLines : safeText;
  const lines = candidate.length >= 2 ? candidate : [
    'model = NeuralNetwork(layers=[3, 4, 2])',
    'model.fit(X_train, y_train, epochs=100)',
    'accuracy = model.evaluate(X_test)'
  ];

  return (
    <div className="w-full max-w-md bg-slate-900/95 border border-slate-800 rounded-xl p-4 font-mono text-xs shadow-inner">
      <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-slate-800 text-slate-500">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        <span className="ml-2 text-[10px] text-slate-400">main.py — executing</span>
      </div>
      <div className="space-y-1.5 text-slate-300">
        {lines.map((ln, idx) => (
          <p key={idx} className={idx === 1 ? 'bg-brand-500/20 px-1 py-0.5 rounded text-white border-l-2 border-brand-400' : ''}>
            {ln}
          </p>
        ))}
        <p className="text-emerald-400 font-semibold">&gt;&gt;&gt; Evaluation: 98.4% [SUCCESS]</p>
      </div>
    </div>
  );
}

// ─── 9. Formula Visual ─────────────────────────────────────────────────────────
function FormulaVisual({ title = '', onScreenText = [] }) {
  const items = ensureArray(onScreenText);
  const mainEq = items[0] || (typeof title === 'string' && title.includes('=') ? title : 'f(x) = σ(W · x + b)');
  const desc = items[1] || (items[0] && items[0] !== mainEq ? items[0] : (title || 'Mathematical formulation of the underlying mechanism'));

  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/90 border border-cyan-500/30 max-w-lg shadow-xl text-center">
      <div className="flex items-center gap-2 mb-3 text-cyan-400 font-bold text-xs uppercase tracking-wider">
        <Calculator size={16} />
        Mathematical Formulation
      </div>
      <div className="p-4 rounded-xl bg-black/60 border border-white/10 w-full mb-3 shadow-inner">
        <p className="text-xl md:text-2xl font-mono font-bold text-white tracking-wide">
          {mainEq}
        </p>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
        {desc}
      </p>
    </div>
  );
}

// ─── 10. Concept Map Visual with Dynamic Satellite Beam Pulses ────────────────
function ConceptMapVisual({ title = '', keywords = [], onScreenText = [], activeStep = 0 }) {
  const safeOnScreen = ensureArray(onScreenText);
  const safeKeywords = ensureArray(keywords);
  const combined = Array.from(new Set([...safeOnScreen, ...safeKeywords]));
  const defaultItems = ['Concept Intuition', 'Key Mechanism', 'Real-World Impact', 'Practical Application'];
  const items = combined.length === 0
    ? defaultItems
    : combined.length < 3
    ? [...combined, ...defaultItems.slice(combined.length)]
    : combined;
  const activeIdx = activeStep % Math.max(1, items.length);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-4 max-w-lg mx-auto select-none">
      {/* Top Orbit Satellites */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {items.slice(0, 2).map((item, idx) => {
          const isActive = idx === activeIdx;
          return (
            <motion.div
              key={idx}
              animate={{
                scale: isActive ? 1.08 : 1,
                borderColor: isActive ? '#38BDF8' : 'rgba(255,255,255,0.15)',
              }}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold shadow-md flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-brand-500/30 border-cyan-400 text-white ring-2 ring-cyan-400/30'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500'}`} />
              <span className="max-w-[150px] truncate">{item}</span>
            </motion.div>
          );
        })}
      </div>

      {/* Center Core Node */}
      <motion.div
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
        className="w-48 py-3.5 px-4 rounded-2xl bg-brand-500/20 border-2 border-brand-400 flex flex-col items-center justify-center text-center shadow-xl shadow-brand-500/25 ring-2 ring-brand-500/20"
      >
        <Brain size={26} className="text-brand-300 mb-1" />
        <span className="text-xs font-bold text-white leading-snug line-clamp-2">
          {title || 'Core Concept'}
        </span>
      </motion.div>

      {/* Bottom Orbit Satellites */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        {items.slice(2, 4).map((item, idx) => {
          const realIdx = idx + 2;
          const isActive = realIdx === activeIdx;
          return (
            <motion.div
              key={realIdx}
              animate={{
                scale: isActive ? 1.08 : 1,
                borderColor: isActive ? '#A855F7' : 'rgba(255,255,255,0.15)',
              }}
              className={`px-3.5 py-1.5 rounded-xl border text-xs font-semibold shadow-md flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-purple-500/30 border-purple-400 text-white ring-2 ring-purple-400/30'
                  : 'bg-slate-900/90 border-slate-700 text-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-purple-400 animate-ping' : 'bg-purple-500'}`} />
              <span className="max-w-[150px] truncate">{item}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
