import { useState, useEffect, useRef } from 'react';
import 'regenerator-runtime/runtime'; // Core fix for speech recognition
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, User, Bot, Menu, Settings, MicOff } from 'lucide-react';

function App() {
  // --- 1. SETUP VOICE RECOGNITION ---
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // --- 2. STATE MANAGEMENT ---
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm Mock-Mate. Which role are we interviewing for today?", sender: "ai", time: "10:00 AM" },
  ]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  // Sync Voice to Input Box
  useEffect(() => {
    if (transcript) {
      setInputText(transcript);
    }
  }, [transcript]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 3. HANDLERS ---
  const handleSend = () => {
    if (!inputText.trim()) return;
    
    // Add User Message
    const userMsg = { 
      id: messages.length + 1, 
      text: inputText, 
      sender: "user", 
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    };
    
    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    resetTranscript(); // Clear voice buffer

    // Simulate AI Reply (Fake for now - Backend connects tomorrow)
    setTimeout(() => {
      const aiMsg = { 
        id: messages.length + 2, 
        text: "That's an interesting point. Can you explain how you would handle state management in this scenario?", 
        sender: "ai", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };
      setMessages((prev) => [...prev, aiMsg]);
    }, 1500);
  };

  const toggleMic = () => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return <span>Browser doesn't support speech recognition. Try Chrome.</span>;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      
      {/* --- SIDEBAR (Left) --- */}
      <div className="hidden md:flex flex-col w-64 bg-slate-900 text-white p-4">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold shadow-lg shadow-blue-500/50">M</div>
          <h1 className="text-xl font-bold tracking-tight">Mock-Mate</h1>
        </div>
        
        <div className="space-y-2">
          <p className="text-xs text-gray-400 uppercase font-semibold px-2 mb-2">Select Interview</p>
          <button className="w-full text-left px-3 py-2 bg-blue-600 rounded-lg text-sm font-medium shadow-md">
            Frontend Developer
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition text-gray-300">
            Data Analyst
          </button>
          <button className="w-full text-left px-3 py-2 hover:bg-slate-800 rounded-lg text-sm font-medium transition text-gray-300">
            Product Manager
          </button>
        </div>

        <div className="mt-auto pt-6 border-t border-slate-700">
          <button className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
            <Settings size={18} /> Settings
          </button>
        </div>
      </div>

      {/* --- MAIN CONTENT (Right) --- */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* Header */}
        <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-gray-600"><Menu /></button>
            <div>
              <h2 className="font-bold text-lg text-gray-800">Frontend Developer Interview</h2>
              <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                AI Recruiter Online
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 border px-3 py-1 rounded-full bg-gray-50 border-gray-200">
             Topic: <strong className="text-blue-600">React.js & Performance</strong>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gray-50/50">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
              
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white border text-blue-600'
              }`}>
                {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>

              {/* Message Bubble */}
              <div className={`max-w-[80%] md:max-w-[70%] space-y-1 ${msg.sender === 'user' ? 'items-end flex flex-col' : ''}`}>
                <div className={`p-4 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-gray-800 border rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
                <span className="text-xs text-gray-400 px-1">{msg.time}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t">
          <div className={`max-w-4xl mx-auto flex items-center gap-3 bg-gray-50 p-2 rounded-xl border transition-all shadow-inner ${
            listening ? 'ring-2 ring-red-200 border-red-300' : 'focus-within:ring-2 focus-within:ring-blue-100'
          }`}>
            
            {/* MIC BUTTON */}
            <button 
              className={`p-3 rounded-lg transition-all duration-300 ${
                listening 
                  ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-lg' 
                  : 'bg-white text-gray-500 hover:text-blue-600 shadow-sm border'
              }`}
              onClick={toggleMic}
              title="Hold to Speak"
            >
              {listening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>
            
            <input 
              type="text" 
              className="flex-1 bg-transparent border-none outline-none text-gray-700 placeholder-gray-400 px-2"
              placeholder={listening ? "Listening..." : "Type your answer..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            
            <button 
              onClick={handleSend}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!inputText.trim()}
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
             {listening ? <span className="text-red-500 font-bold animate-pulse">● Recording...</span> : "Press the Mic to speak"}
          </p>
        </div>

      </div>
    </div>
  );
}

export default App;