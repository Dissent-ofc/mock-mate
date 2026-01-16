import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';
import { X, Play, Code } from 'lucide-react';

const CodeEditor = ({ code, setCode, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in-up p-4">
      <div className="w-full max-w-4xl bg-[#1e1e1e] rounded-2xl shadow-2xl border border-[var(--border-medium)] flex flex-col overflow-hidden h-[80vh] animate-fade-in-scale">
        
        <div className="bg-[#252526] px-4 py-4 flex items-center justify-between border-b border-[#333]">
          <div className="flex items-center gap-4">
             <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-[#ff5f56] hover:opacity-80 transition cursor-pointer"></div>
               <div className="w-3 h-3 rounded-full bg-[#ffbd2e] hover:opacity-80 transition cursor-pointer"></div>
               <div className="w-3 h-3 rounded-full bg-[#27c93f] hover:opacity-80 transition cursor-pointer"></div>
             </div>
             <span className="text-[#ccccc7] text-sm font-mono ml-2 flex items-center gap-2">
               <Code size={14} className="text-[var(--accent-blue)]" /> 
               solution.js
             </span>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-[#858585] hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#1e1e1e] p-2 relative">
           <Editor
            value={code}
            onValueChange={code => setCode(code)}
            highlight={code => highlight(code, languages.js)}
            padding={20}
            style={{
              fontFamily: '"Fira Code", "Fira Mono", monospace',
              fontSize: 14,
              color: '#d4d4d4',
              minHeight: '100%'
            }}
            className="min-h-full"
          />
        </div>

        <div className="bg-[#252526] p-4 border-t border-[#333] flex justify-between items-center">
          <div className="text-xs text-[#858585] font-mono">
             JavaScript • UTF-8 • Prettier
          </div>
          <button 
            onClick={onSubmit}
            className="flex items-center gap-2 bg-[var(--accent-green)] hover:shadow-[0_0_20px_var(--accent-green-glow)] text-[#0f2910] px-6 py-2.5 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
          >
            <Play size={16} /> Submit Code
          </button>
        </div>

      </div>
    </div>
  );
};

export default CodeEditor;