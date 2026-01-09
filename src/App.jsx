import { useState } from 'react';
import { signInWithGoogle } from './firebase';
import { db } from './firebase';
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { User as UserIcon, MessageSquare, Zap, LogOut, FileText } from 'lucide-react';
import ResumeInput from './ResumeInput';
import RapidFire from './RapidFire';
import ChatMode from './ChatMode';

// ✅ CORRECT
function App() {
  const [state, setState] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState("LOGIN");
  const [sessionId, setSessionId] = useState(null); // ✅ Move it here!

  // Handle Login
  const handleLogin = async () => {
    const userData = await signInWithGoogle();
    if (userData) {
      setUser(userData);
      setView("DASHBOARD");
    }
  };

  // --- HANDLE RESUME START ---
  const handleResumeStart = async (resumeText) => {
    const startMsg = `Here is my resume context: \n${resumeText}\n\n Please act as an interviewer and ask me questions based on my specific experience listed above. Start by welcoming me and mentioning a specific project from my resume.`;
    
    const newChatRef = await addDoc(collection(db, "chats"), {
      title: "Resume Interview",
      createdAt: new Date(),
      messages: [
        { text: startMsg, sender: "user", time: "Now" }
      ] 
    });

    setSessionId(newChatRef.id);
    setView("CHAT");
  }; // ✅ Add this closing brace!

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* --- HEADER (Visible everywhere except login) --- */}
      {view !== "LOGIN" && (
        <nav className="bg-white border-b px-6 py-3 flex justify-between items-center">
          <div className="font-bold text-xl tracking-tight text-blue-600 cursor-pointer" onClick={() => setView("DASHBOARD")}>
            Mock Mate
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <img src={user?.photoURL} alt="User" className="w-8 h-8 rounded-full" />
              <span className="hidden md:inline">{user?.displayName}</span>
            </div>
            <button onClick={() => window.location.reload()} className="text-gray-500 hover:text-red-500">
              <LogOut size={20} />
            </button>
          </div>
        </nav>
      )}

      {/* --- VIEW 1: LOGIN SCREEN --- */}
      {view === "LOGIN" && (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
          <div className="mb-8 p-4">
            <img src="/logo1.png" alt="Mock Mate Logo" className="w-20 h-20 object-contain" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">Master Your Interview.</h1>
          <p className="text-gray-400 text-lg mb-8 max-w-md text-center">
            AI-powered mock interviews. Practice via chat or rapid-fire voice sessions.
          </p>
          <button 
            onClick={handleLogin}
            className="bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-xl flex items-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6"/>
            Sign in with Google
          </button>
        </div>
      )}

      {/* --- VIEW 2: DASHBOARD --- */}
      {/* --- VIEW 2: DASHBOARD --- */}
      {view === "DASHBOARD" && (
        <div className="max-w-5xl mx-auto p-8">
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user?.displayName?.split(' ')[0]} 👋</h2>
          <p className="text-gray-500 mb-8">Choose how you want to prepare today.</p>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Card 1: Chat Mode */}
            <div 
              onClick={() => setView("CHAT")}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group hover:border-blue-200"
            >
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Deep Dive Chat</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                Practice with a full conversation. Great for explaining concepts and getting detailed feedback.
              </p>
            </div>

            {/* Card 2: Rapid Fire */}
            <div 
              onClick={() => setView("RAPID_FIRE")}
              className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group hover:border-orange-200"
            >
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-800">Rapid Fire Mode</h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                High pressure! 5 questions, back-to-back. Test your speed and instinct.
              </p>
            </div>
          </div>

          {/* --- BOTTOM CARD: RESUME MODE (CENTERED) --- */}
          <div className="flex justify-center">
             <div 
              onClick={() => setView("RESUME_INPUT")}
              className="w-full md:w-2/3 bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group flex items-center gap-6 hover:border-green-200 relative overflow-hidden"
            >
               {/* Decorative background blur */}
               <div className="absolute right-0 top-0 w-32 h-32 bg-green-50 rounded-full blur-3xl -mr-10 -mt-10 transition group-hover:bg-green-100"></div>

               <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition relative z-10">
                <FileText size={32} />
              </div>
              <div className="relative z-10">
                <h3 className="text-xl font-bold mb-1 text-gray-800">Resume Review</h3>
                <p className="text-gray-500 text-sm">
                  Paste your resume. The AI will interview you based on your actual work history.
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* --- VIEW 3: CHAT MODE --- */}
      {view === "CHAT" && (
        // Pass a "back" function so the chat can return to dashboard
        <ChatMode onBack={() => setView("DASHBOARD")}
        externalSessionId={sessionId} />
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
  );
}

export default App;