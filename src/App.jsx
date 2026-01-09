import { useState, useEffect, useRef } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, User, Bot, MessageSquare, Plus, MicOff, Loader2, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { getGeminiResponse } from './gemini';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc } from 'firebase/firestore';

function App() {
  // --- STATE ---
  const [sessionId, setSessionId] = useState(null); 
  const [savedChats, setSavedChats] = useState([]); 
  const [messages, setMessages] = useState([
    { text: "Hello! Click 'New Chat' to start.", sender: "ai", time: "Now" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLimitHit, setIsLimitHit] = useState(false); // <--- NEW: Rate Limit State
  const messagesEndRef = useRef(null);
  
  // Voice Hook
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isLimitHit]); // Scroll when error appears too

  // --- 1. LOAD SIDEBAR HISTORY ---
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedChats(chatsData);
    });
    return () => unsubscribe();
  }, []);

  // --- 2. START NEW CHAT ---
  const startNewChat = async () => {
    const newChatRef = await addDoc(collection(db, "chats"), {
      title: "New Interview",
      createdAt: new Date(),
      messages: [] 
    });
    setSessionId(newChatRef.id);
    setMessages([{ text: "Hello! What role do you want to interview for?", sender: "ai", time: "Now" }]);
    setIsLimitHit(false); // Reset error on new chat
  };

  // --- 3. LOAD OLD CHAT ---
  const loadChat = (chat) => {
    setSessionId(chat.id);
    setMessages(chat.messages || []);
    setIsLimitHit(false); // Reset error
  };

  // --- 4. HANDLE SEND ---
  const handleSend = async () => {
    // Stop if empty OR if limit is hit
    if (!inputText.trim() || isLimitHit) return;

    if (listening) {
      SpeechRecognition.stopListening();
    }
    
    // Ensure we have a session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      const newChatRef = await addDoc(collection(db, "chats"), {
        title: inputText.substring(0, 20) + "...", 
        createdAt: new Date(),
        messages: []
      });
      currentSessionId = newChatRef.id;
      setSessionId(currentSessionId);
    }

    const userMsg = { 
      text: inputText, 
      sender: "user", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };

    // Update UI
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    resetTranscript();
    setIsLoading(true);

    // SAVE USER MSG TO FIRESTORE
    try {
      const chatRef = doc(db, "chats", currentSessionId);
      await setDoc(chatRef, { messages: updatedMessages }, { merge: true });
      
      // CALL GEMINI API
      const aiText = await getGeminiResponse(updatedMessages, inputText);
      
      // If we get here, it worked! Reset limit flag.
      setIsLimitHit(false);

      const aiMsg = { 
        text: aiText, 
        sender: "ai", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      // SAVE AI MSG TO FIRESTORE
      await setDoc(chatRef, { messages: finalMessages }, { merge: true });

      if (updatedMessages.length <= 2) {
        await setDoc(chatRef, { title: inputText.substring(0, 20) + "..." }, { merge: true });
      }

    } catch (error) {
      console.error("AI Error:", error);
      
      // CHECK FOR 429 (Too Many Requests) or 503 (Overloaded)
      if (error.message?.includes("429") || error.message?.includes("503")) {
        setIsLimitHit(true);
        // Auto-remove error after 60 seconds
        setTimeout(() => setIsLimitHit(false), 60000);
      } else {
        // Handle other errors (like network fail) gracefully
        const errorMsg = { text: "Error: Could not connect to AI. Please try again.", sender: "ai", time: "Now" };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* --- SIDEBAR --- */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">M</div>
          <h1 className="text-xl font-bold">Mock-Mate</h1>
        </div>

        <button 
          onClick={startNewChat}
          className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition mb-6 shadow-md"
        >
          <Plus size={18} /> New Interview
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold px-2 mb-2">History</p>
          {savedChats.map((chat) => (
            <button 
              key={chat.id}
              onClick={() => loadChat(chat)}
              className={`flex items-center gap-3 w-full text-left px-3 py-3 rounded-lg text-sm transition ${
                sessionId === chat.id ? "bg-slate-800 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-gray-200"
              }`}
            >
              <MessageSquare size={16} />
              <span className="truncate">{chat.title || "Untitled Chat"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* --- MAIN CHAT --- */}
      <div className="flex-1 flex flex-col h-full relative">
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <h2 className="font-bold text-lg text-gray-800">
            {sessionId ? "Interview in Progress" : "Start a New Interview"}
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-blue-600'
              }`}>
                {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm text-sm ${
                  msg.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-800 border'
                }`}>
                  {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-white border text-blue-600">
                <Bot size={20} />
              </div>
              <div className="bg-white border text-gray-500 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-xs font-medium">AI is thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT AREA */}
        <div className="p-4 bg-white border-t">
          
          {/* --- NEW: RATE LIMIT WARNING BANNER --- */}
          {isLimitHit && (
             <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 rounded shadow-sm flex items-center gap-2 animate-bounce">
                <AlertTriangle className="text-amber-500" size={20} />
                <p className="text-amber-700 text-xs font-medium">
                   Peak request limit hit! Please wait 60 seconds before sending your next answer.
                </p>
             </div>
          )}

          <div className={`max-w-4xl mx-auto flex items-center gap-3 bg-gray-50 p-2 rounded-xl border ${listening ? 'border-red-400 ring-1 ring-red-400' : ''}`}>
             <button 
              className={`p-3 rounded-lg transition-all ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-500 border'}`}
              onClick={() => listening ? SpeechRecognition.stopListening() : SpeechRecognition.startListening()}
            >
              {listening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none text-gray-700 px-2 disabled:text-gray-400"
              placeholder={isLimitHit ? "Please wait..." : "Type your answer..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLimitHit || isLoading} // <--- Disable input if limit hit
            />
            <button 
              onClick={handleSend} 
              className={`p-3 bg-blue-600 text-white rounded-lg shadow-md ${isLimitHit || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              disabled={isLimitHit || isLoading} // <--- Disable button if limit hit
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;