import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import 'regenerator-runtime/runtime';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { Mic, Send, User, Bot, MessageSquare, Plus, MicOff, Loader2, AlertTriangle, Trash2, Code2, ShieldAlert, XCircle } from 'lucide-react';
import CodeEditor from './CodeEditor';
import { getGeminiResponse } from './gemini';
import { db } from './firebase'; 
import { collection, addDoc, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

const ChatMode = ({ onBack, externalSessionId, user }) => {
  const [sessionId, setSessionId] = useState(externalSessionId || null);
  const [savedChats, setSavedChats] = useState([]); 
  const [messages, setMessages] = useState([
    { text: "Hello! Click 'New Interview' to start.", sender: "ai", time: "Now" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLimitHit, setIsLimitHit] = useState(false);
  const messagesEndRef = useRef(null);
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [currentCode, setCurrentCode] = useState("// Write your solution here...");
  const [violation, setViolation] = useState(null);
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

  // Load chat history filtered by current user
  useEffect(() => {
    if (!user?.uid) return;
    
    const q = query(collection(db, "chats"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatsData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(chat => chat.userId === user.uid); // Only show user's own chats
      setSavedChats(chatsData);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  // Load chat messages when sessionId changes
  useEffect(() => {
    const loadChatData = async () => {
      if (!sessionId) return;
      
      const docRef = doc(db, "chats", sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const chatMessages = data.messages || [];
        setMessages(chatMessages);

        if (chatMessages.length === 1 && chatMessages[0].sender === "system") {
          generateAIResponse(chatMessages);
        }
      }
    };
    loadChatData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const generateAIResponse = async (history) => {
    setIsLoading(true);
    try {
      const systemMsg = history.find(msg => msg.sender === "system");
      const promptText = systemMsg ? systemMsg.text : "Start the interview";
      
      const response = await getGeminiResponse(history, promptText);
      
      const aiMsg = { 
        text: response, 
        sender: "ai", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const updatedMessages = [...history, aiMsg];
      setMessages(updatedMessages);

      await setDoc(doc(db, "chats", sessionId), { messages: updatedMessages }, { merge: true });
    } catch (error) {
      console.error(error);
      const isRateLimit = error.message?.includes("429") || 
                          error.message?.includes("rate") || 
                          error.message?.includes("quota") ||
                          error.message?.includes("503");
      if (isRateLimit) {
        setIsLimitHit(true);
        // Show rate limit message as AI response
        const errorMsg = {
          text: "⏳ I need a moment to catch my breath! The AI service is temporarily busy. Please wait 60 seconds and try again.",
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...history, errorMsg]);
        setTimeout(() => setIsLimitHit(false), 60000);
      } else {
        // Generic error
        const errorMsg = {
          text: "😅 Something went wrong. Please try sending your message again.",
          sender: "ai",
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages([...history, errorMsg]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("Tab switch detected. Creating incident report.");
      }
    };

    const handleMouseLeave = () => {
      triggerViolation("Focus lost! Keep mouse inside the exam window.");
    };

    const triggerViolation = (msg) => {
      setViolation(msg);
      setTimeout(() => setViolation(null), 3000);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  const startNewChat = async () => {
    const initialMessage = { text: "Hello! What role/language do you want to interview for?", sender: "ai", time: "Now" };
    const newChatRef = await addDoc(collection(db, "chats"), {
      userId: user?.uid, // Associate chat with current user
      title: "New Interview",
      createdAt: new Date(),
      messages: [initialMessage]
    });
    setSessionId(newChatRef.id);
    setMessages([initialMessage]);
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
        userId: user?.uid, // Associate chat with current user
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
      <div className="flex h-[85vh] w-full max-w-[1600px] mx-auto rounded-[28px] overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-subtle)] shadow-2xl animate-fade-in-up">      
      <div className="hidden md:flex flex-col w-72 bg-[var(--bg-card)] border-r border-[var(--border-subtle)] p-4">
        <div className="flex items-center gap-3 mb-8 px-2">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">Mock Mate</h1>
        </div>

        <button 
          onClick={startNewChat}
          className="btn-primary flex items-center gap-3 w-full px-4 py-4 rounded-2xl font-medium mb-6"
        >
          <Plus size={20} /> 
          <span>New Interview</span>
        </button>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          <p className="text-xs text-[var(--text-muted)] uppercase font-bold px-4 mb-3 tracking-wider">Your History</p>
          {savedChats.map((chat) => (
            <div 
              key={chat.id}
              onClick={() => loadChat(chat)}
              className={`group flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm transition-all cursor-pointer ${
                sessionId === chat.id 
                  ? "bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] border border-[var(--accent-purple)]/20" 
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] border border-transparent"
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare size={18} className="shrink-0 opacity-70" />
                <span className="truncate font-medium">{chat.title || "Untitled Chat"}</span>
              </div>
              <button 
                onClick={(e) => deleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-[var(--accent-red-dim)] hover:text-[var(--accent-red)] rounded-full transition-all"
                title="Delete Chat"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col relative bg-[var(--bg-primary)]">
        
        <header className="glass-panel border-b border-[var(--border-subtle)] px-6 py-4 flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack} 
              className="p-2.5 -ml-2 text-[var(--text-muted)] hover:text-[var(--accent-purple)] bg-[var(--bg-card)] hover:bg-[var(--bg-elevated)] rounded-full transition-all border border-[var(--border-subtle)] hover:border-[var(--accent-purple)] hover:scale-105 active:scale-95"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <h2 className="font-medium text-lg text-[var(--text-primary)]">
              {sessionId ? "Interview Session" : "Start New Session"}
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-green-dim)] text-[var(--accent-green)] rounded-full border border-[var(--accent-green)]/20">
              <span className="w-2 h-2 bg-[var(--accent-green)] rounded-full animate-pulse shadow-[0_0_8px_var(--accent-green)]"></span>
              <span className="text-xs font-medium uppercase tracking-wider">AI Live</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-red-dim)] text-[var(--accent-red)] rounded-full border border-[var(--accent-red)]/20">
              <ShieldAlert size={14} />
              <span className="text-xs font-medium uppercase tracking-wider">Proctored</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {messages.filter(msg => msg.sender !== 'system').map((msg, index) => (
            <div key={index} className={`flex gap-4 animate-slide-in ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
               <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                msg.sender === 'user' 
                  ? 'bg-[var(--accent-purple-dim)] border-[var(--accent-purple)]/30 text-[var(--accent-purple)]' 
                  : 'bg-[var(--bg-card)] border-[var(--border-subtle)] text-[var(--text-secondary)]'
              }`}>
                {msg.sender === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              
              <div className={`max-w-[85%] p-5 rounded-[20px] text-sm md:text-base leading-relaxed shadow-sm ${
                  msg.sender === 'user' 
                    ? 'bg-[var(--accent-purple)] text-white rounded-tr-none' 
                    : 'glass-card rounded-tl-none'
                }`}>
                  
                  <ReactMarkdown
                    children={msg.text}
                    components={{
                      code({inline, className, children, ...props}) {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                          <div className="rounded-xl overflow-hidden my-3 shadow-lg border border-[var(--border-medium)]">
                            <SyntaxHighlighter
                              children={String(children).replace(/\n$/, '')}
                              style={vscDarkPlus}
                              language={match[1]}
                              PreTag="div"
                              {...props}
                            />
                          </div>
                        ) : (
                          <code className={`${msg.sender === 'user' ? 'bg-white/20' : 'bg-[var(--bg-elevated)]'} px-1.5 py-0.5 rounded text-xs font-mono`} {...props}>
                            {children}
                          </code>
                        )
                      },
                      strong: ({...props}) => <span className="font-bold text-[var(--accent-purple)]" {...props} />,
                      
                      ul: ({...props}) => <ul className="list-disc pl-4 space-y-1 my-2" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-4 space-y-1 my-2" {...props} />,
                      li: ({...props}) => <li className="pl-1" {...props} />,

                      p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                    }}
                  />
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 animate-fade-in-up">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]">
                <Bot size={20} />
              </div>
              <div className="glass-card p-4 rounded-[20px] rounded-tl-none flex items-center gap-3">
                <Loader2 className="animate-spin text-[var(--accent-purple)]" size={18} />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Analyzing response...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 md:p-6 bg-[var(--bg-secondary)] border-t border-[var(--border-subtle)]">
          {isLimitHit && (
             <div className="bg-[var(--accent-red-dim)] border border-[var(--accent-red)]/20 p-4 mb-4 rounded-xl flex items-center gap-3 animate-bounce-subtle">
                <AlertTriangle className="text-[var(--accent-red)]" size={20} />
                <p className="text-[var(--accent-red)] text-sm font-medium">
                   Peak usage limit. Please wait 60 seconds.
                </p>
             </div>
          )}

          <div className={`max-w-4xl mx-auto flex items-center gap-2 bg-[var(--bg-card)] p-2 rounded-2xl border transition-all duration-300 ${listening ? 'border-[var(--accent-red)] shadow-[0_0_20px_var(--accent-red-glow)]' : 'border-[var(--border-medium)]'} focus-within:border-[var(--accent-purple)] focus-within:shadow-[0_0_20px_var(--accent-purple-glow)]`}>
             <button 
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${listening ? 'bg-[var(--accent-red)] text-white animate-pulse shadow-lg' : 'hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`}
              onClick={() => listening ? SpeechRecognition.stopListening() : SpeechRecognition.startListening()}
            >
              {listening ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button 
              className="w-12 h-12 rounded-full flex items-center justify-center hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all border border-[var(--border-subtle)] hover:border-[var(--accent-purple)] hover:text-[var(--accent-purple)] hover:scale-105 active:scale-95"
              onClick={() => setShowCodeEditor(true)}
              title="Open Code Editor"
            >
              <Code2 size={22} />
            </button>
            
            <textarea 
              className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] px-3 placeholder-[var(--text-muted)] min-h-[48px] max-h-32 py-3 resize-none leading-relaxed"
              placeholder={isLimitHit ? "Please wait..." : "Type your answer..."}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isLimitHit || isLoading}
              rows={1}
              style={{ height: 'auto', minHeight: '48px' }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
              }}
            />
            
            <button 
              onClick={handleSend} 
              className={`w-12 h-12 btn-primary rounded-full flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${isLimitHit || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLimitHit || isLoading}
            >
              <Send size={22} />
            </button>

            {showCodeEditor && (
              <CodeEditor 
                code={currentCode} 
                setCode={setCurrentCode} 
                onClose={() => setShowCodeEditor(false)}
                onSubmit={() => {
                  setShowCodeEditor(false);
                  setInputText(`Here is my code solution:\n\`\`\`javascript\n${currentCode}\n\`\`\``);
                }} 
              />
            )}

          {violation && (
            <div className="absolute inset-0 z-[150] bg-[var(--accent-red-dim)]/95 backdrop-blur-xl flex flex-col items-center justify-center text-center animate-fade-in-up">
              <div className="glass-card p-10 rounded-[32px] border-2 border-[var(--accent-red)]/30 shadow-2xl max-w-md mx-4">
                <div className="w-24 h-24 bg-[var(--accent-red)] rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_40px_var(--accent-red-glow)]">
                  <AlertTriangle size={52} className="text-white" />
                </div>
                
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-3">VIOLATION DETECTED</h2>
                <p className="text-[var(--accent-red)] text-lg font-medium mb-8">{violation}</p>
                <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">
                    Admin has been notified
                  </p>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatMode;