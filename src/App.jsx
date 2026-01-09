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

  const handleLogin = async () => {
    const userData = await signInWithGoogle();
    if (userData) {
      setUser(userData);
      setView("DASHBOARD");
    }
  };

  const handleResumeStart = async (resumeText) => {
    try {
      const startMsg = `Here is my resume context: \n${resumeText}\n\n Please act as an interviewer and ask me questions based on my specific experience listed above.`;
      const newChatRef = await addDoc(collection(db, "chats"), {
        title: "Resume Interview",
        createdAt: new Date(),
        messages: [{ text: startMsg, sender: "user", time: "Now" }] 
      });
      setSessionId(newChatRef.id); 
      setView("CHAT");
    } catch (error) {
      console.error("Firestore Error:", error);
    }
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
        {view === "LOGIN" && (
          <div className="flex flex-col items-center justify-center h-screen bg-[#0f0f0f] relative overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900/20 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-900/20 rounded-full blur-[128px]"></div>

            <div className="z-10 text-center animate-fade-in-up">
              <div className="mb-8 p-6 bg-[#2b2930] rounded-[32px] inline-block shadow-2xl shadow-black/50 border border-white/5">
                <img src="/logo.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-[0_0_15px_rgba(208,188,255,0.3)]" />
              </div>
              <h1 className="text-5xl md:text-6xl font-normal mb-6 tracking-tight text-white">
                Master Your <span className="text-[#d0bcff]">Interview</span>
              </h1>
              <p className="text-gray-400 text-lg mb-10 max-w-lg mx-auto font-light leading-relaxed">
                AI-powered mock interviews. Practice via chat or rapid-fire voice sessions in a professional dark environment.
              </p>
              <button 
                onClick={handleLogin}
                className="group relative bg-[#d0bcff] text-[#381e72] px-8 py-4 rounded-full font-medium text-lg transition-all hover:bg-[#e8def8] hover:shadow-[0_0_20px_rgba(208,188,255,0.4)] flex items-center gap-3 mx-auto overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6 relative z-10"/>
                <span className="relative z-10">Sign in with Google</span>
              </button>
            </div>
          </div>
        )}

        {/* --- VIEW 2: DASHBOARD (M3 Cards) --- */}
        {view === "DASHBOARD" && (
          <div className="max-w-6xl mx-auto px-6 animate-fade-in-up">
            <div className="mb-12">
              <h2 className="text-4xl font-normal mb-2 text-white">Hello, {user?.displayName?.split(' ')[0]}</h2>
              <p className="text-[#cac4d0]">Ready to practice? Choose your mode below.</p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Card 1: Chat Mode */}
              <div 
                onClick={() => setView("CHAT")}
                className="group bg-[#1d1b20] hover:bg-[#2b2930] p-8 rounded-[28px] transition-all cursor-pointer border border-white/5 hover:border-[#d0bcff]/30 relative overflow-hidden"
              >
                <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <MessageSquare size={120} />
                </div>
                <div className="w-14 h-14 bg-[#4f378b] text-[#eaddff] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg shadow-indigo-900/50">
                  <MessageSquare size={28} />
                </div>
                <h3 className="text-2xl font-normal mb-3 text-[#e6e1e5]">Deep Dive Chat</h3>
                <p className="text-[#938f99] leading-relaxed max-w-sm">
                  Interactive conversation. Great for explaining concepts and receiving detailed feedback.
                </p>
              </div>

              {/* Card 2: Rapid Fire */}
              <div 
                onClick={() => setView("RAPID_FIRE")}
                className="group bg-[#1d1b20] hover:bg-[#2b2930] p-8 rounded-[28px] transition-all cursor-pointer border border-white/5 hover:border-[#ffb4ab]/30 relative overflow-hidden"
              >
                 <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Zap size={120} />
                </div>
                <div className="w-14 h-14 bg-[#8c1d18] text-[#ffdad6] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition shadow-lg shadow-red-900/50">
                  <Zap size={28} />
                </div>
                <h3 className="text-2xl font-normal mb-3 text-[#e6e1e5]">Rapid Fire Mode</h3>
                <p className="text-[#938f99] leading-relaxed max-w-sm">
                   High pressure! 5 questions, back-to-back. Test your speed and gut instinct.
                </p>
              </div>
            </div>

            {/* --- BOTTOM CARD: RESUME MODE --- */}
            <div className="flex justify-center">
               <div 
                onClick={() => setView("RESUME_INPUT")}
                className="w-full md:w-2/3 bg-[#1e1c22] hover:bg-[#25232a] p-1 rounded-[32px] transition-all cursor-pointer group border border-white/5 hover:border-[#b6f2af]/30"
              >
                <div className="bg-[#1d1b20] group-hover:bg-[#232127] rounded-[28px] p-8 flex items-center gap-8 relative overflow-hidden">
                   {/* Decorative Blur */}
                   <div className="absolute right-0 top-0 w-48 h-48 bg-[#b6f2af]/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-[#b6f2af]/20 transition"></div>

                   <div className="w-16 h-16 bg-[#163a15] text-[#b6f2af] rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition z-10 shadow-lg shadow-green-900/50">
                    <FileText size={32} />
                  </div>
                  <div className="z-10">
                    <h3 className="text-2xl font-normal mb-1 text-[#e6e1e5]">Resume Review</h3>
                    <p className="text-[#938f99] text-sm md:text-base">
                      Paste your resume context. The AI will interview you based on your actual experience.
                    </p>
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

        {/* --- VIEW 4: RAPID FIRE --- */}
        {view === "RAPID_FIRE" && (
          <RapidFire onBack={() => setView("DASHBOARD")} />
        )}

        {/* --- VIEW 5: RESUME INPUT --- */}
        {view === "RESUME_INPUT" && (
           <ResumeInput 
             onBack={() => setView("DASHBOARD")}
             onStart={handleResumeStart}
           />
        )}
      </div>
    </div>
  );
}

export default App;