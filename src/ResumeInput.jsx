import { useState } from 'react';
import { ArrowLeft, FileText, CheckCircle, Sparkles, Lock } from 'lucide-react';

const ResumeInput = ({ onBack, onStart }) => {
  const [text, setText] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex flex-col h-full items-center justify-center p-4 animate-fade-in-up">
      
      {/* GLASS PANEL CONTAINER */}
      <div className="w-full max-w-3xl bg-[#1d1b20] rounded-[32px] border border-white/5 shadow-2xl overflow-hidden relative">
        
        {/* Background Decorative Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#b6f2af]/5 rounded-full blur-[100px] pointer-events-none"></div>

        {/* HEADER */}
        <div className="p-8 border-b border-white/5 flex items-start justify-between">
           <div className="flex items-center gap-4">
              <button onClick={onBack} className="p-2 text-[#938f99] hover:text-white transition">
                 <ArrowLeft />
              </button>
              <div>
                 <h2 className="text-2xl font-normal text-white flex items-center gap-2">
                    <FileText className="text-[#b6f2af]" size={24} /> 
                    Context Injection
                 </h2>
                 <p className="text-[#cac4d0] text-sm mt-1">Paste your resume or job description.</p>
              </div>
           </div>
           
           <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#163a15] text-[#b6f2af] rounded-lg text-xs font-medium border border-[#b6f2af]/10">
              <Lock size={12} /> Encrypted Input
           </div>
        </div>

        {/* INPUT AREA */}
        <div className={`p-1 transition-colors duration-300 ${isFocused ? 'bg-gradient-to-r from-[#b6f2af]/20 to-transparent' : 'bg-transparent'}`}>
           <textarea
             className="w-full h-80 bg-[#141218] p-6 text-[#e6e1e5] text-base md:text-lg leading-relaxed focus:outline-none resize-none custom-scrollbar"
             placeholder="Paste your resume text here (e.g., 'I am a Software Engineer with 2 years of experience in React...')"
             value={text}
             onChange={(e) => setText(e.target.value)}
             onFocus={() => setIsFocused(true)}
             onBlur={() => setIsFocused(false)}
           />
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-6 bg-[#1d1b20] border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
           
           <div className="flex items-center gap-3 text-xs text-[#938f99]">
              <div className={`w-2 h-2 rounded-full ${text.length > 50 ? 'bg-[#b6f2af]' : 'bg-[#49454f]'}`}></div>
              {text.length > 0 ? `${text.length} characters detected` : "Waiting for input..."}
           </div>

           <button 
             disabled={text.length < 20}
             onClick={() => onStart(text)}
             className={`
               group relative overflow-hidden px-8 py-3 rounded-full font-bold transition-all duration-300 flex items-center gap-2
               ${text.length < 20 
                 ? 'bg-[#2b2930] text-[#49454f] cursor-not-allowed' 
                 : 'bg-[#b6f2af] text-[#0f2910] hover:bg-[#cbf7c5] hover:shadow-[0_0_20px_rgba(182,242,175,0.4)]'
               }
             `}
           >
              <span className="relative z-10 flex items-center gap-2">
                {text.length < 20 ? "Paste Resume to Start" : "Generate Interview"}
                {text.length >= 20 && <Sparkles size={18} />}
              </span>
           </button>
        </div>

      </div>
      
      {/* TIP TEXT */}
      <p className="mt-6 text-[#938f99] text-sm text-center max-w-md">
         <span className="text-[#b6f2af] font-bold">Pro Tip:</span> You can also paste the Job Description to practice for a specific role.
      </p>

    </div>
  );
};

export default ResumeInput;