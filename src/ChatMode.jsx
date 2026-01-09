import { useState, useEffect, useRef } from 'react';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, User, Bot, MessageSquare, Plus, MicOff, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { getGeminiResponse } from './gemini';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';

const ChatMode = ({ onBack, externalSessionId }) => {
  const [sessionId, setSessionId] = useState(externalSessionId || null);
  const [savedChats, setSavedChats] = useState([]); 
  const [messages, setMessages] = useState([
    { text: "Hello! Click 'New Chat' to start.", sender: "ai", time: "Now" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLimitHit, setIsLimitHit] = useState(false);
  const messagesEndRef = useRef(null);
  
  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) setInputText(transcript);
  }, [transcript]);

  useEffect(() => {
    if (externalSessionId) setSessionId(externalSessionId);
  }, [externalSessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading, isLimitHit]);

  // Load History
  useEffect(() => {
    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedChats(chatsData);
    });
    return () => unsubscribe();
  }, []);

  const startNewChat = async () => {
    const newChatRef = await addDoc(collection(db, "chats"), {
      title: "New Interview",
      createdAt: new Date(),
      messages: [] 
    });
    setSessionId(newChatRef.id);
    setMessages([{ text: "Hello! What role do you want to interview for?", sender: "ai", time: "Now" }]);
    setIsLimitHit(false);
  };

  const loadChat = (chat) => {
    setSessionId(chat.id);
    setMessages(chat.messages || []);
    setIsLimitHit(false);
  };

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

  const handleSend = async () => {
    if (!inputText.trim() || isLimitHit) return;
    if (listening) SpeechRecognition.stopListening();
    
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

    const userMsg = { text: inputText, sender: "user", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
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
      const aiMsg = { text: aiText, sender: "ai", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);
      await setDoc(chatRef, { messages: finalMessages }, { merge: true });

      if (updatedMessages.length <= 2) {
        await setDoc(chatRef, { title: inputText.substring(0, 20) + "..." }, { merge: true });
      }
    } catch (error) {
      if (error.message?.includes("429") || error.message?.includes("503")) {
        setIsLimitHit(true);
        setTimeout(() => setIsLimitHit(false), 60000);
      }
    } finally {
      setIsLoading(false); 
    }
  };

  return (
    <div className="flex h-full rounded-[32px] overflow-hidden bg-[#141218] border border-white/5 shadow-2xl animate-fade-in-up">
      
      {/* --- M3 DARK SIDEBAR --- */}
      <div className="hidden md:flex flex-col w-72 bg-[#1d1b20] border-r border-white/5 p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-medium tracking-tight text-[#e6e1e5]">Mock Mate</h1>
        </div>

        <button 
          onClick={startNewChat}
          className="flex items-center gap-3 w-full bg-[#4f378b] hover:bg-[#6750a4] text-[#eaddff] px-4 py-4 rounded-[16px] font-medium transition-all mb-6 shadow-lg shadow-black/20"
        >
          <Plus size={20} /> 
          <span>New Interview</span>
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          <p className="text-xs text-[#938f99] uppercase font-bold px-4 mb-2 tracking-wider">Your History</p>
          {savedChats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => loadChat(chat)}
              className={`group flex items-center justify-between w-full px-4 py-3 rounded-[16px] text-sm transition cursor-pointer ${
                sessionId === chat.id 
                  ? "bg-[#332d41] text-[#e8def8]" 
                  : "text-[#cac4d0] hover:bg-[#2b2930]"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={18} className="shrink-0 opacity-70" />
                <span className="truncate font-medium">{chat.title || "Untitled Chat"}</span>
              </div>
              <button 
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[#410e0b] hover:text-[#ffb4ab] rounded-full transition-all"
                title="Delete Chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* --- MAIN CHAT AREA --- */}
      <div className="flex-1 flex flex-col relative bg-[#141218]">
        
        {/* Header */}
        <header className="bg-[#141218]/90 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="p-2 -ml-2 text-[#938f99] hover:text-[#d0bcff] hover:bg-[#332d41] rounded-full transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="font-normal text-lg text-[#e6e1e5]">
              {sessionId ? "Interview Session" : "Start New Session"}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-[#163a15] text-[#b6f2af] rounded-full border border-[#b6f2af]/10">
            <span className="w-2 h-2 bg-[#b6f2af] rounded-full animate-pulse"></span>
            <span className="text-xs font-medium uppercase tracking-wider">AI Live</span>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-4 animate-slide-in ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                msg.sender === 'user' 
                  ? 'bg-[#332d41] border-[#d0bcff]/20 text-[#d0bcff]' 
                  : 'bg-[#1e1c22] border-white/10 text-[#c4c7c5]'
              }`}>
                {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              
              <div className={`max-w-[80%] p-5 rounded-[24px] text-sm md:text-base leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[#4f378b] text-white rounded-tr-none' 
                    : 'bg-[#2b2930] text-[#e6e1e5] border border-white/5 rounded-tl-none'
                }`}>
                  {msg.text}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1e1c22] border border-white/10 text-[#c4c7c5]">
                <Bot size={20} />
              </div>
              <div className="bg-[#2b2930] border border-white/5 text-[#938f99] p-4 rounded-[24px] rounded-tl-none flex items-center gap-3">
                <Loader2 className="animate-spin text-[#d0bcff]" size={18} />
                <span className="text-sm font-medium">Analyzing response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[#141218] border-t border-white/5">
          {isLimitHit && (
             <div className="bg-[#410e0b] border border-[#f2b8b5]/20 p-3 mb-4 rounded-[12px] flex items-center gap-3 animate-bounce">
                <AlertTriangle className="text-[#f2b8b5]" size={20} />
                <p className="text-[#f2b8b5] text-sm font-medium">
                   Peak usage limit. Please wait 60 seconds.
                </p>
             </div>
          )}

          <div className={`max-w-4xl mx-auto flex items-center gap-3 bg-[#1e1c22] p-2 rounded-full border ${listening ? 'border-[#f2b8b5]' : 'border-white/10'} shadow-lg transition-colors focus-within:border-[#d0bcff]/50`}>
             <button 
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${listening ? 'bg-[#8c1d18] text-white animate-pulse' : 'hover:bg-[#332d41] text-[#cac4d0]'}`}
              onClick={() => listening ? SpeechRecognition.stopListening() : SpeechRecognition.startListening()}
            >
              {listening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none text-[#e6e1e5] px-2 placeholder-[#938f99] h-full"
              placeholder={isLimitHit ? "Please wait..." : "Type your answer..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLimitHit || isLoading}
            />
            
            <button 
              onClick={handleSend} 
              className={`w-12 h-12 bg-[#d0bcff] text-[#381e72] rounded-full flex items-center justify-center hover:bg-[#e8def8] transition-all shadow-md ${isLimitHit || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLimitHit || isLoading}
            >
              <Send size={22} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMode;