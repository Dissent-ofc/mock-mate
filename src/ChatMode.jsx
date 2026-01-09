import { useState, useEffect, useRef } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, User, Bot, MessageSquare, Plus, MicOff, Loader2, AlertTriangle, Trash2 } from 'lucide-react'; // Added Trash2
import { getGeminiResponse } from './gemini';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const ChatMode = ({ onBack, externalSessionId }) => {
  // --- STATE ---
  const [sessionId, setSessionId] = useState(externalSessionId || null); 
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
    if (externalSessionId) {
      setSessionId(externalSessionId);
    }
  }, [externalSessionId]);

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

  // --- 3b. DELETE CHAT ---
  const deleteChat = async (e, chatId) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "chats", chatId));
      if (sessionId === chatId) {
        setSessionId(null);
        setMessages([{ text: "Chat deleted. Start a new one!", sender: "ai", time: "Now" }]);
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  // --- 4. HANDLE SEND ---
  const handleSend = async () => {
    if (!inputText.trim() || isLimitHit) return;

    if (listening) {
      SpeechRecognition.stopListening();
    }
    
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

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputText("");
    resetTranscript();
    setIsLoading(true);

    try {
      const chatRef = doc(db, "chats", currentSessionId);
      await setDoc(chatRef, { messages: updatedMessages }, { merge: true });
      
      const aiText = await getGeminiResponse(updatedMessages, inputText);
      
      setIsLimitHit(false);

      const aiMsg = { 
        text: aiText, 
        sender: "ai", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      await setDoc(chatRef, { messages: finalMessages }, { merge: true });

      if (updatedMessages.length <= 2) {
        await setDoc(chatRef, { title: inputText.substring(0, 20) + "..." }, { merge: true });
      }

    } catch (error) {
      console.error("AI Error:", error);
      
      if (error.message?.includes("429") || error.message?.includes("503")) {
        setIsLimitHit(true);
        setTimeout(() => setIsLimitHit(false), 60000);
      } else {
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
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-bold tracking-tight">Mock Mate</h1>
      </div>

        <button 
          onClick={startNewChat}
          className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium transition mb-6 shadow-md"
        >
          <Plus size={18} /> New Chat
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold px-2 mb-2">History</p>
          {savedChats.map((chat) => (
  <div 
    key={chat.id}
    className={`group flex items-center justify-between w-full px-3 py-3 rounded-lg text-sm transition cursor-pointer ${
      sessionId === chat.id ? "bg-slate-800 text-white" : "text-gray-400 hover:bg-slate-800 hover:text-gray-200"
    }`}
    onClick={() => loadChat(chat)}
  >
    {/* Chat Title */}
    <div className="flex items-center gap-3 overflow-hidden">
      <MessageSquare size={16} className="shrink-0" />
      <span className="truncate">{chat.title || "Untitled Chat"}</span>
    </div>

    {/* Delete Button (Only visible on hover) */}
    <button 
      onClick={(e) => deleteChat(e, chat.id)}
      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-opacity"
      title="Delete Chat"
    >
      <Trash2 size={14} />
    </button>
  </div>
))}
        </div>
      </div>

      {/* --- MAIN CHAT WRAPPER (This was the missing piece!) --- */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* --- HEADER --- */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition"
              title="Back to Dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="font-bold text-lg text-gray-800">
              {sessionId ? "Interview in Progress" : "Start a New Interview"}
            </h2>
          </div>
        </header>

        {/* --- MESSAGES AREA --- */}
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

        {/* --- INPUT AREA --- */}
        <div className="p-4 bg-white border-t">
          {isLimitHit && (
             <div className="bg-amber-50 border-l-4 border-amber-500 p-3 mb-4 rounded shadow-sm flex items-center gap-2 animate-bounce">
                <AlertTriangle className="text-amber-500" size={20} />
                <p className="text-amber-700 text-xs font-medium">
                   Peak request limit hit! Please wait 60 seconds.
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
              disabled={isLimitHit || isLoading}
            />
            <button 
              onClick={handleSend} 
              className={`p-3 bg-blue-600 text-white rounded-lg shadow-md ${isLimitHit || isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}
              disabled={isLimitHit || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </div>

      </div> {/* End of Main Chat Wrapper */}
    </div>
  );
}

export default ChatMode;