import { useState } from 'react';
import { signInWithGoogle } from './firebase'; 
import { User as UserIcon, MessageSquare, Zap, LogOut, FileText } from 'lucide-react';
import RapidFire from './RapidFire';
import ChatMode from './ChatMode';
import ResumeInput from './ResumeInput';
import { db } from './firebase';
import { collection, addDoc } from 'firebase/firestore';

function App() {
  const [user, setUser] = useState(null); 
  const [view, setView] = useState("LOGIN");
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false); 

  const handleLogin = async () => {
    const userData = await signInWithGoogle();
    if (userData) {
      setUser(userData);
      setView("DASHBOARD");
    }
  };

const handleStartResumeInterview = async (resumeText) => {
  setLoading(true);
  try {
    const chatRef = collection(db, "chats");
    
    // 1. Create the system prompt based on the resume
    const systemMessage = {
      text: `SYSTEM: The user has provided this resume: "${resumeText}". 
             Act as an expert recruiter. Analyze the resume and start the interview 
             by introducing yourself and asking the first tough technical question 
             based on their projects or skills.`,
      sender: "system",
      time: new Date().toLocaleTimeString()
    };

    // 2. Save to Firebase
    const docRef = await addDoc(chatRef, {
      userId: user?.uid || "anonymous",
      title: "Resume: " + resumeText.substring(0, 20) + "...",
      messages: [systemMessage],
      createdAt: new Date()
    });

    // 3. IMPORTANT: Set the active session and switch view
    setSessionId(docRef.id);
    setView("CHAT"); 
    
  } catch (error) {
    console.error("Error starting resume interview:", error);
  }
  setLoading(false);
};

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#e6e1e5] font-sans selection:bg-indigo-500/30">
      
      {/* --- HEADER (M3 Top App Bar) --- */}
      {view !== "LOGIN" && (
        <nav className="fixed top-0 w-full z-50 glass-m3 px-6 py-4 flex justify-between items-center shadow-lg shadow-black/20">
          <div 
            className="flex items-center gap-3 cursor-pointer group" 
            onClick={() => setView("DASHBOARD")}
          >
            <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain transition-transform group-hover:rotate-12" />
            <span className="font-medium text-lg tracking-wide text-[#d0bcff]">Mock Mate</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-[#2b2930] rounded-full border border-white/5">
              <img src={user?.photoURL} alt="User" className="w-6 h-6 rounded-full border border-indigo-400" />
              <span className="text-sm font-medium text-gray-300">{user?.displayName}</span>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="p-2 rounded-full hover:bg-[#36343b] text-gray-400 hover:text-[#ffb4ab] transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      )}

      {/* --- PADDING FOR FIXED HEADER --- */}
      <div className={view !== "LOGIN" ? "pt-24 pb-12" : ""}>

        {/* --- VIEW 1: LOGIN SCREEN (Dark Gradient) --- */}
        {/* --- VIEW 1: LOGIN SCREEN (Redesigned) --- */}
{view === "LOGIN" && (
  <div className="relative flex flex-col items-center justify-center h-screen overflow-hidden bg-[#0f0f0f]">
    
    {/* 1. AMBIENT BACKGROUND GLOWS (The "Mesh" Effect) */}
    <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-900/40 rounded-full blur-[120px] animate-glow"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-900/40 rounded-full blur-[120px] animate-glow delay-1000"></div>
    <div className="absolute top-[20%] right-[20%] w-[300px] h-[300px] bg-blue-900/20 rounded-full blur-[100px]"></div>

    {/* 2. MAIN GLASS CARD */}
    <div className="z-10 relative glass-panel p-10 md:p-14 rounded-[40px] shadow-2xl flex flex-col items-center max-w-lg w-full mx-4 border border-white/10">
      
      {/* Animated Logo */}
      <div className="mb-8 p-4 bg-white/5 rounded-[24px] border border-white/10 animate-float shadow-lg shadow-purple-500/10">
        <img src="/logo.png" alt="Mock Mate" className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(208,188,255,0.4)]" />
      </div>

      <h1 className="text-5xl font-bold mb-4 tracking-tight text-center text-white">
        Mock <span className="text-gradient">Mate</span>
      </h1>
      
      <p className="text-[#cac4d0] text-center text-lg mb-10 leading-relaxed font-light">
      Elevate your preparation with tailored guidance that builds confidence and showcases your expertise.
      </p>

      <button 
        onClick={handleLogin}
        className="group relative w-full bg-[#d0bcff] hover:bg-[#e8def8] text-[#381e72] py-4 rounded-full font-semibold text-lg transition-all transform hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(208,188,255,0.4)] flex items-center justify-center gap-3 overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 relative z-10" alt="Google"/>
        <span className="relative z-10">Sign in with Google</span>
      </button>

      <div className="mt-8 text-xs text-[#938f99] uppercase tracking-widest opacity-60">
        Powered by Gemini AI
      </div>
    </div>
  </div>
)}

        {/* --- VIEW 2: DASHBOARD (Redesigned) --- */}
{view === "DASHBOARD" && (
  <div className="max-w-6xl mx-auto px-6 relative z-10 animate-fade-in-up">
    
    {/* Welcome Header */}
    <div className="mb-12 mt-4">
      <h2 className="text-5xl font-light mb-2 text-white tracking-tight">
        Hello, <span className="text-[#d0bcff] font-medium">{user?.displayName?.split(' ')[0]}</span>
      </h2>
      <p className="text-[#cac4d0] text-xl font-light">Let's get you ready for that offer letter.</p>
    </div>
    
    {/* Grid System */}
    <div className="grid md:grid-cols-2 gap-6 mb-6">
      
      {/* 1. CHAT MODE CARD */}
      <div 
        onClick={() => setView("CHAT")}
        className="group relative bg-[#1d1b20] hover:bg-[#25232a] p-8 rounded-[32px] cursor-pointer border border-white/5 hover:border-[#d0bcff]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(79,55,139,0.2)] overflow-hidden"
      >
        <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500">
          <MessageSquare size={200} />
        </div>
        
        <div className="w-16 h-16 bg-[#4f378b] text-[#eaddff] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-900/50 group-hover:scale-110 transition-transform">
          <MessageSquare size={32} />
        </div>
        <h3 className="text-2xl font-semibold mb-2 text-white group-hover:text-[#d0bcff] transition-colors">Deep Dive Chat</h3>
        <p className="text-[#938f99] leading-relaxed">
          Detailed technical discussions. Practice specific topics or debug code with an AI mentor.
        </p>
      </div>

      {/* 2. RAPID FIRE CARD */}
      <div 
        onClick={() => setView("RAPID_FIRE")}
        className="group relative bg-[#1d1b20] hover:bg-[#25232a] p-8 rounded-[32px] cursor-pointer border border-white/5 hover:border-[#f2b8b5]/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(140,29,24,0.2)] overflow-hidden"
      >
        <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-10 transition-opacity duration-500">
          <Zap size={200} />
        </div>

        <div className="w-16 h-16 bg-[#8c1d18] text-[#ffdad6] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-900/50 group-hover:scale-110 transition-transform">
          <Zap size={32} />
        </div>
        <h3 className="text-2xl font-semibold mb-2 text-white group-hover:text-[#f2b8b5] transition-colors">Rapid Fire</h3>
        <p className="text-[#938f99] leading-relaxed">
          High pressure, 5 questions. Test your gut instincts and communication speed.
        </p>
      </div>
    </div>

    {/* 3. RESUME CARD (Full Width) */}
    <div 
      onClick={() => setView("RESUME_INPUT")}
      className="w-full bg-[#1e1c22] hover:bg-[#25232a] p-1 rounded-[36px] cursor-pointer group border border-white/5 hover:border-[#b6f2af]/50 transition-all duration-300"
    >
      <div className="bg-[#1d1b20] group-hover:bg-[#222026] rounded-[32px] p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
        
        {/* Glow Effect */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-green-900/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-green-900/20 transition-colors"></div>

        <div className="w-20 h-20 bg-[#163a15] text-[#b6f2af] rounded-3xl flex items-center justify-center shrink-0 shadow-lg shadow-green-900/50 group-hover:rotate-6 transition-transform">
          <FileText size={40} />
        </div>
        
        <div className="z-10 text-center md:text-left">
          <h3 className="text-2xl md:text-3xl font-semibold mb-2 text-white group-hover:text-[#b6f2af] transition-colors">Resume-Based Interview</h3>
          <p className="text-[#938f99] text-base md:text-lg max-w-2xl">
            Upload your experience. The AI will act as a recruiter and grill you on your specific projects and skills.
          </p>
        </div>
        
        <div className="hidden md:block ml-auto opacity-0 group-hover:opacity-100 transform translate-x-10 group-hover:translate-x-0 transition-all duration-500">
          <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center text-white">
            ➜
          </div>
        </div>
      </div>
    </div>
  </div>
)}

        {/* --- VIEW 3: CHAT MODE --- */}
        {view === "CHAT" && (
          <ChatMode 
            onBack={() => setView("DASHBOARD")} 
            externalSessionId={sessionId} 
          />
        )}


        {view === "ADMIN" && <AdminDashboard onBack={() => setView("DASHBOARD")} />}
        
        
        {/* --- VIEW 4: RAPID FIRE --- */}
        {view === "RAPID_FIRE" && (
          <RapidFire onBack={() => setView("DASHBOARD")} />
        )}

        {/* --- VIEW 5: RESUME INPUT --- */}
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