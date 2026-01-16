import { useState } from 'react';
import { ArrowLeft, FileText, Sparkles, Lock, Upload } from 'lucide-react';

const ResumeInput = ({ onBack, onStart }) => {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 animate-fade-in-up">
      
      {/* GLASS PANEL CONTAINER */}
      <div className="w-full max-w-3xl glass-card rounded-[32px] shadow-2xl overflow-hidden relative">
        
        {/* Background Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--accent-green)]/10 rounded-full blur-[100px] pointer-events-none"></div>

        {/* HEADER */}
        <div className="p-8 border-b border-[var(--border-subtle)] flex items-start justify-between">
           <div className="flex items-center gap-4">
              <button 
                onClick={onBack} 
                className="p-2.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--accent-green)] transition-all hover:scale-105 active:scale-95"
              >
                 <ArrowLeft size={20} />
              </button>
              <div>
                 <h2 className="text-2xl font-semibold text-[var(--text-primary)] flex items-center gap-3">
                    <div className="w-10 h-10 bg-[var(--accent-green-dim)] text-[var(--accent-green)] rounded-xl flex items-center justify-center">
                      <FileText size={22} />
                    </div>
                    Context Injection
                 </h2>
                 <p className="text-[var(--text-secondary)] text-sm mt-2 ml-[52px]">Paste your resume or job description.</p>
              </div>
           </div>
           
           <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--accent-green-dim)] text-[var(--accent-green)] rounded-full text-xs font-medium border border-[var(--accent-green)]/20">
              <Lock size={14} /> Encrypted Input
           </div>
        </div>

        {/* INPUT AREA */}
        <div className={`p-1 transition-all duration-500 ${isFocused ? 'bg-gradient-to-r from-[var(--accent-green)]/10 to-transparent' : 'bg-transparent'}`}>
           <textarea
             className="w-full h-80 bg-[var(--bg-primary)] p-6 text-[var(--text-primary)] text-base md:text-lg leading-relaxed focus:outline-none resize-none custom-scrollbar placeholder:text-[var(--text-muted)] rounded-lg transition-colors"
             placeholder="Paste your resume text here (e.g., 'I am a Software Engineer with 2 years of experience in React...')"
             value={text}
             onChange={(e) => setText(e.target.value)}
             onFocus={() => setIsFocused(true)}
             onBlur={() => setIsFocused(false)}
           />
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 bg-[var(--bg-card)] border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-4">
           
           <div className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
              <div className={`w-2.5 h-2.5 rounded-full transition-colors ${text.length > 50 ? 'bg-[var(--accent-green)] shadow-[0_0_8px_var(--accent-green)]' : 'bg-[var(--text-muted)]/30'}`}></div>
              {text.length > 0 ? `${text.length} characters detected` : "Waiting for input..."}
           </div>

           <button 
             disabled={text.length < 20}
             onClick={() => onStart(text)}
             className={`
               group relative overflow-hidden px-8 py-3.5 rounded-full font-bold transition-all duration-300 flex items-center gap-3
               ${text.length < 20 
                 ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]' 
                 : 'bg-[var(--accent-green)] text-[#0f2910] hover:shadow-[0_0_30px_var(--accent-green-glow)] hover:scale-[1.02] active:scale-[0.98]'
               }
             `}
           >
              <span className="relative z-10 flex items-center gap-2">
                {text.length < 20 ? (
                  <>
                    <Upload size={18} />
                    Paste Resume to Start
                  </>
                ) : (
                  <>
                    Generate Interview
                    <Sparkles size={18} className="animate-pulse" />
                  </>
                )}
              </span>
           </button>
        </div>

      </div>
      
      {/* TIP TEXT */}
      <p className="mt-8 text-[var(--text-muted)] text-sm text-center max-w-md">
         <span className="text-[var(--accent-green)] font-semibold">Pro Tip:</span> You can also paste the Job Description to practice for a specific role.
      </p>

    </div>
  );
};

export default ResumeInput;