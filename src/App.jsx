import { useState, useEffect } from 'react';
import { signInWithGoogle } from './firebase'; 
import { User as UserIcon, MessageSquare, Zap, LogOut, FileText, Sun, Moon, Sparkles, ArrowRight, ChevronRight, Play } from 'lucide-react';
import RapidFire from './RapidFire';
import ChatMode from './ChatMode';
import ResumeInput from './ResumeInput';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState("LOGIN");
  const [sessionId, setSessionId] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [hasVisitedDashboard, setHasVisitedDashboard] = useState(false);

  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Mark dashboard as visited after first render
  useEffect(() => {
    if (view === "DASHBOARD" && !hasVisitedDashboard) {
      const timer = setTimeout(() => setHasVisitedDashboard(true), 800);
      return () => clearTimeout(timer);
    }
  }, [view, hasVisitedDashboard]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    const userData = await signInWithGoogle();
    if (userData) {
      setUser(userData);
      setTimeout(() => setView("DASHBOARD"), 300);
    }
    setIsLoggingIn(false);
  };

const handleStartResumeInterview = async (resumeText) => {
  try {
    const chatRef = collection(db, "chats");
    
    const systemMessage = {
      text: `SYSTEM: The user has provided this resume: "${resumeText}". 
             You are Alex Chen, a senior technical recruiter at a top tech company.
             Analyze the resume carefully, then introduce yourself as Alex and start the interview 
             by asking the first tough technical question based on their projects or skills.
             Do NOT use placeholders like [Name] - always use your name Alex Chen.`,
      sender: "system",
      time: new Date().toLocaleTimeString()
    };

    const docRef = await addDoc(chatRef, {
      userId: user?.uid || "anonymous",
      title: "Resume: " + resumeText.substring(0, 20) + "...",
      messages: [systemMessage],
      createdAt: new Date()
    });

    setSessionId(docRef.id);
    setView("CHAT"); 
    
  } catch (error) {
    console.error("Error starting resume interview:", error);
  }
};

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-purple-500/30 transition-theme">
      
      {view !== "LOGIN" && (
        <nav className="fixed top-0 w-full z-50 glass-panel px-4 md:px-8 py-4 animate-fade-in-up">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => setView("DASHBOARD")}
            >
              <div className="relative">
                <div className="absolute inset-0 bg-[var(--accent-purple)] blur-xl opacity-40 group-hover:opacity-60 transition-opacity"></div>
                <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain relative z-10 transition-transform group-hover:scale-110 group-hover:rotate-6" />
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-xl tracking-tight text-[var(--text-primary)] group-hover:text-[var(--accent-purple)] transition-colors">Mock</span>
                <span className="font-bold text-xl text-gradient-static">Mate</span>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] rounded-full border border-[var(--border-subtle)]">
              {view === "DASHBOARD" && <Sparkles size={16} className="text-[var(--accent-purple)]" />}
              {view === "CHAT" && <MessageSquare size={16} className="text-[var(--accent-purple)]" />}
              {view === "RAPID_FIRE" && <Zap size={16} className="text-[var(--accent-red)]" />}
              {view === "RESUME_INPUT" && <FileText size={16} className="text-[var(--accent-green)]" />}
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {view === "DASHBOARD" && "Dashboard"}
                {view === "CHAT" && "Deep Dive Chat"}
                {view === "RAPID_FIRE" && "Rapid Fire"}
                {view === "RESUME_INPUT" && "Resume Interview"}
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <button 
                onClick={toggleTheme}
                className="p-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-purple)] transition-all hover:scale-105 active:scale-95"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              >
                {theme === 'dark' ? (
                  <Sun size={18} className="text-[var(--accent-purple)]" />
                ) : (
                  <Moon size={18} className="text-[var(--accent-purple)]" />
                )}
              </button>

              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[var(--bg-card)] rounded-full border border-[var(--border-subtle)] hover:border-[var(--accent-purple)]/50 transition-all cursor-pointer group">
                <img src={user?.photoURL} alt="User" className="w-7 h-7 rounded-full border-2 border-[var(--accent-purple)]/50 group-hover:border-[var(--accent-purple)] transition-colors" />
                <span className="text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{user?.displayName?.split(' ')[0]}</span>
              </div>

              <button 
                onClick={() => window.location.reload()} 
                className="p-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--accent-red)] hover:bg-[var(--accent-red-dim)] text-[var(--text-muted)] hover:text-[var(--accent-red)] transition-all hover:scale-105 active:scale-95"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </nav>
      )}

      <div className={view !== "LOGIN" ? "pt-28 pb-12" : ""}>

        {view === "LOGIN" && (
          <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden bg-[var(--bg-primary)]">
            
            <div className="absolute inset-0 mesh-gradient"></div>
            
            <div className="absolute top-[10%] left-[5%] w-[400px] h-[400px] bg-purple-600/30 rounded-full blur-[120px] animate-glow"></div>
            <div className="absolute bottom-[10%] right-[5%] w-[350px] h-[350px] bg-blue-600/25 rounded-full blur-[100px] animate-glow" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-[40%] right-[20%] w-[250px] h-[250px] bg-pink-600/20 rounded-full blur-[80px] animate-glow" style={{animationDelay: '2s'}}></div>
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-[var(--accent-purple)]/10 rounded-full animate-spin-slow"></div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-[var(--accent-purple)]/5 rounded-full animate-spin-slow" style={{animationDirection: 'reverse', animationDuration: '30s'}}></div>

            <div className="z-10 relative flex flex-col items-center max-w-xl w-full mx-4 animate-fade-in-up">
              
              <div className="relative mb-10 animate-float">
                <div className="absolute inset-0 bg-[var(--accent-purple)] blur-3xl opacity-40 scale-150"></div>
                <div className="relative glass-panel p-6 rounded-[32px] border border-[var(--accent-purple)]/30">
                  <img src="/logo.png" alt="Mock Mate" className="w-24 h-24 object-contain drop-shadow-2xl" />
                </div>
              </div>

              <h1 className="text-6xl md:text-7xl font-bold mb-6 tracking-tight text-center">
                <span className="text-[var(--text-primary)]">Mock</span>
                <span className="text-gradient"> Mate</span>
              </h1>
              
              <p className="text-[var(--text-secondary)] text-center text-xl md:text-2xl mb-12 leading-relaxed font-light max-w-md">
                Elevate your preparation with tailored guidance that builds confidence and showcases your expertise. 
              </p>

              <div className="flex flex-wrap justify-center gap-3 mb-12">
                {['AI Interviewer', 'Real-time Feedback', 'Resume Analysis',].map((feature, i) => (
                  <div 
                    key={feature}
                    className="px-4 py-2 glass-panel rounded-full text-sm text-[var(--text-secondary)] border border-[var(--border-subtle)] animate-fade-in-up"
                    style={{animationDelay: `${0.1 * (i + 1)}s`}}
                  >
                    <span className="text-[var(--accent-purple)] mr-2">✦</span>
                    {feature}
                  </div>
                ))}
              </div>

              <button 
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="group relative w-full max-w-sm btn-primary py-5 rounded-2xl text-lg flex items-center justify-center gap-4 overflow-hidden disabled:opacity-70"
              >
                <span className="relative z-10 flex items-center gap-3">
                  {isLoggingIn ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google"/>
                      <span>Continue with Google</span>
                      <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>

              <div className="mt-10 flex items-center gap-3 text-[var(--text-muted)] text-sm">
                <Sparkles size={16} className="text-[var(--accent-purple)]" />
                <span>Powered by Gemini AI</span>
              </div>

              <button 
                onClick={toggleTheme}
                className="absolute top-8 right-8 p-3 rounded-full glass-panel border border-[var(--border-subtle)] hover:border-[var(--accent-purple)] transition-all hover:scale-110 active:scale-95"
              >
                {theme === 'dark' ? <Sun size={20} className="text-[var(--accent-purple)]" /> : <Moon size={20} className="text-[var(--accent-purple)]" />}
              </button>
            </div>
          </div>
        )}

        {view === "DASHBOARD" && (
          <div className="max-w-6xl mx-auto px-4 md:px-6 relative z-10">
            
            <div className={`mb-12 mt-4 ${!hasVisitedDashboard ? 'animate-fade-in-up' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
              </div>
              <h2 className="text-4xl md:text-5xl font-light mb-3 text-[var(--text-primary)] tracking-tight">
                Hello, <span className="text-gradient font-semibold">{user?.displayName?.split(' ')[0]}</span>
              </h2>
              <p className="text-[var(--text-secondary)] text-lg md:text-xl font-light">Let's get you ready for that offer letter.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              
              <div 
                onClick={() => setView("CHAT")}
                className={`group relative glass-card p-8 rounded-[28px] cursor-pointer card-hover-purple overflow-hidden ${!hasVisitedDashboard ? 'animate-fade-in-up stagger-1' : ''}`}
              >
                <div className="absolute right-[-30px] top-[-30px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 transform">
                  <MessageSquare size={220} />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-purple)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[28px]"></div>
                
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <MessageSquare size={32} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-[var(--text-primary)] group-hover:text-[var(--accent-purple)] transition-colors">Deep Dive Chat</h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                    Detailed technical discussions. Practice specific topics or debug code with an AI mentor.
                  </p>
                  <div className="flex items-center gap-2 text-[var(--accent-purple)] font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <span>Start Session</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setView("RAPID_FIRE")}
                className={`group relative glass-card p-8 rounded-[28px] cursor-pointer card-hover-red overflow-hidden ${!hasVisitedDashboard ? 'animate-fade-in-up stagger-2' : ''}`}
              >
                <div className="absolute right-[-30px] top-[-30px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500 group-hover:scale-110 transform">
                  <Zap size={220} />
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--accent-red)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-[28px]"></div>

                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[var(--accent-red-dim)] text-[var(--accent-red)] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg">
                    <Zap size={32} />
                  </div>
                  <h3 className="text-2xl font-semibold mb-3 text-[var(--text-primary)] group-hover:text-[var(--accent-red)] transition-colors">Rapid Fire</h3>
                  <p className="text-[var(--text-secondary)] leading-relaxed mb-6">
                    High pressure, 5 questions. Test your gut instincts and communication speed.
                  </p>
                  <div className="flex items-center gap-2 text-[var(--accent-red)] font-medium opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all">
                    <span>Start Challenge</span>
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>

            <div 
              onClick={() => setView("RESUME_INPUT")}
              className={`group relative glass-card p-1 rounded-[32px] cursor-pointer card-hover-green overflow-hidden ${!hasVisitedDashboard ? 'animate-fade-in-up stagger-3' : ''}`}
            >
              <div className="bg-[var(--bg-card)] group-hover:bg-[var(--bg-card-hover)] rounded-[28px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden transition-colors">
                
                <div className="absolute right-0 top-0 w-80 h-80 bg-[var(--accent-green)]/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-[var(--accent-green)]/10 transition-colors"></div>

                <div className="w-20 h-20 bg-[var(--accent-green-dim)] text-[var(--accent-green)] rounded-3xl flex items-center justify-center shrink-0 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-lg relative z-10">
                  <FileText size={40} />
                </div>
                
                <div className="z-10 text-center md:text-left flex-1">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3 text-[var(--text-primary)] group-hover:text-[var(--accent-green)] transition-colors">Resume-Based Interview</h3>
                  <p className="text-[var(--text-secondary)] text-base md:text-lg max-w-2xl">
                    Upload your experience. The AI will act as a recruiter and grill you on your specific projects and skills.
                  </p>
                </div>
                
                <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent-green-dim)] text-[var(--accent-green)] opacity-0 group-hover:opacity-100 transform translate-x-10 group-hover:translate-x-0 transition-all duration-500 shrink-0">
                  <Play size={24} className="ml-1" />
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "CHAT" && (
          <ChatMode 
            onBack={() => setView("DASHBOARD")} 
            externalSessionId={sessionId}
            user={user}
          />
        )}


        {view === "ADMIN" && <AdminDashboard onBack={() => setView("DASHBOARD")} />}
        
        
        {view === "RAPID_FIRE" && (
          <RapidFire onBack={() => setView("DASHBOARD")} />
        )}

        {view === "RESUME_INPUT" && (
           <ResumeInput 
             onBack={() => setView("DASHBOARD")}
             onStart={handleStartResumeInterview}
           />
        )}
      </div>
    </div>
  );
}

export default App;