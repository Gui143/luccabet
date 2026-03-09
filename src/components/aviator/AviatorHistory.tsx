import React from 'react';

interface Props {
  history: number[];
}

const AviatorHistory: React.FC<Props> = ({ history }) => {
  if (history.length === 0) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {history.map((h, i) => (
        <span
          key={i}
          className={`text-xs font-bold px-2.5 py-1 rounded shrink-0 ${
            h >= 10
              ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
              : h >= 2
              ? 'bg-green-600/20 text-green-400 border border-green-500/20'
              : 'bg-slate-700/40 text-slate-400 border border-slate-600/20'
          }`}
        >
          {h.toFixed(2)}x
        </span>
      ))}
    </div>
  );
};

export default AviatorHistory;
