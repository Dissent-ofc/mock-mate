import React from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs/components/prism-core';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css'; // VS Code Dark Theme
import { X, Play, Code } from 'lucide-react';

const CodeEditor = ({ code, setCode, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in-up p-4">
      <div className="w-full max-w-4xl bg-[#1e1e1e] rounded-[16px] shadow-2xl border border-[#333] flex flex-col overflow-hidden h-[80vh]">
        
        {/* Header (VS Code Style) */}
        <div className="bg-[#252526] px-4 py-3 flex items-center justify-between border-b border-[#333]">
          <div className="flex items-center gap-3">
             <div className="flex gap-2">
               <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
               <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
               <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
             </div>
             <span className="text-[#ccccc7] text-sm font-mono ml-4 flex items-center gap-2">
               <Code size={14} className="text-[#4f9eff]" /> 
               solution.js
             </span>
          </div>
          <button onClick={onClose} className="text-[#ccccc7] hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* Editor Area */}
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

        {/* Footer Actions */}
        <div className="bg-[#252526] p-4 border-t border-[#333] flex justify-between items-center">
          <div className="text-xs text-[#858585] font-mono">
             JavaScript • UTF-8 • Prettier
          </div>
          <button 
            onClick={onSubmit}
            className="flex items-center gap-2 bg-[#27c93f] hover:bg-[#22a536] text-[#1e1e1e] px-6 py-2 rounded-md font-bold text-sm transition-all"
          >
            <Play size={16} /> Submit Code
          </button>
        </div>

      </div>
    </div>
  );
};

export default CodeEditor;