import { useState, useEffect, useRef } from 'react';
import { getGeminiResponse } from './gemini';
import { Mic, MicOff, Send, Play, CheckCircle, ArrowLeft, Zap, Loader2, RotateCcw, Sparkles, XCircle, AlertCircle, ChevronRight, Clock } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const TIMER_DURATION = 30; // seconds per question

const RapidFire = ({ onBack }) => {
  const [topic, setTopic] = useState("");
  const [gameState, setGameState] = useState("START");
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION);
  const timerRef = useRef(null);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  if (listening && transcript !== currentAnswer) {
    setCurrentAnswer(transcript);
  }

  // Timer effect
  useEffect(() => {
    if (gameState === "PLAYING") {
      setTimeLeft(TIMER_DURATION);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState, currentQIndex]);

  // Auto-submit when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && gameState === "PLAYING") {
      handleNext();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, gameState]);

  const startGame = async () => {
    if (!topic) return;
    setLoading(true);
    const prompt = `Generate 5 technical interview questions for a ${topic} role. Return ONLY a raw JSON array of strings. Example: ["Q1", "Q2"]`;
    try {
      const rawResponse = await getGeminiResponse([], prompt);
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const qArray = JSON.parse(cleanJson);
      setQuestions(qArray);
      setGameState("PLAYING");
    } catch (error) {
      const isRateLimit = error.message?.includes("429") || error.message?.includes("rate") || error.message?.includes("quota");
      if (isRateLimit) {
        alert("⏳ AI service is busy. Please wait 60 seconds and try again.");
      } else {
        alert("Error generating questions. Please try again.");
      }
    }
    setLoading(false);
  };

  const handleNext = async () => {
    const newAnswers = [...answers, { question: questions[currentQIndex], answer: currentAnswer || "No answer provided." }];
    setAnswers(newAnswers);
    setCurrentAnswer("");
    resetTranscript();

    if (currentQIndex < 4) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      setGameState("REPORT");
      setLoading(true);
      
      const reportPrompt = `
        Evaluate this Rapid Fire Interview for a ${topic} role.
        Analyze each response strictly.
        
        DATA:
        ${newAnswers.map((a, i) => `Q${i+1}: ${a.question}\nUser: ${a.answer}`).join('\n\n')}
        
        Return a JSON object:
        {
          "score": "X/10",
          "summary": "Overall vibe",
          "detailedAnalysis": [
            { "q": "Question text", "status": "Excellent/Poor", "feedback": "Why it was good or bad" }
          ],
          "improvementTips": ["Tip 1", "Tip 2"]
        }
      `;
      
      try {
        const rawReport = await getGeminiResponse([], reportPrompt);
        const cleanReport = rawReport.replace(/```json/g, "").replace(/```/g, "").trim();
        setReport(JSON.parse(cleanReport));
      } catch (e) {
        console.error("Report Error:", e);
        // Fallback report if API fails
        setReport({
          score: "N/A",
          summary: "Unable to generate AI analysis due to high traffic. Your answers have been recorded.",
          detailedAnalysis: newAnswers.map(a => ({
            q: a.question,
            status: "Pending",
            feedback: "Analysis unavailable - please try again later"
          })),
          improvementTips: ["Try the session again when API is available", "Practice your answers out loud"]
        });
      }
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto items-center p-4 md:p-6 animate-fade-in-up overflow-y-auto custom-scrollbar">
      
      <div className="w-full flex items-center justify-between mb-8 animate-slide-in-left">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 px-5 py-2.5 glass-card rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all hover:scale-105 active:scale-95"
        >
          <ArrowLeft size={18} />
          <span className="font-medium">Exit Session</span>
        </button>
        <div className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-red-dim)] rounded-full border border-[var(--accent-red)]/20">
          <Zap size={16} className="text-[var(--accent-red)]" />
          <span className="text-[var(--accent-red)] font-bold tracking-widest text-xs uppercase">Rapid Fire</span>
        </div>
      </div>

      {gameState === "START" && (
        <div className="w-full max-w-md text-center space-y-8 glass-card p-10 rounded-[32px] mt-10 animate-fade-in-scale">
          <div className="w-20 h-20 mx-auto bg-[var(--accent-red-dim)] text-[var(--accent-red)] rounded-3xl flex items-center justify-center mb-4">
            <Zap size={40} />
          </div>
          
          <div>
            <h1 className="text-4xl font-bold text-[var(--text-primary)] tracking-tight mb-2">Rapid Fire</h1>
            <p className="text-[var(--text-secondary)]">5 questions. Think fast. Answer faster.</p>
          </div>
          
          <input 
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-medium)] p-4 rounded-2xl text-center text-[var(--text-primary)] outline-none focus:ring-2 ring-[var(--accent-purple)]/50 focus:border-[var(--accent-purple)] transition-all placeholder:text-[var(--text-muted)]" 
            placeholder="Target Role (e.g. Java Dev)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && startGame()}
          />
          
          <button 
            onClick={startGame} 
            disabled={loading || !topic}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all flex justify-center items-center gap-3 ${
              !topic 
                ? 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-subtle)]' 
                : 'btn-primary hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={22} />
                <span>Generating Questions...</span>
              </>
            ) : (
              <>
                <Play size={22} className="ml-1" />
                <span>Start Interview</span>
              </>
            )}
          </button>
        </div>
      )}

      {gameState === "PLAYING" && (
        <div className="w-full max-w-3xl space-y-8 flex flex-col items-center animate-fade-in-up">
          <div className="flex items-center gap-2 mb-4">
            {[0,1,2,3,4].map((i) => (
              <div 
                key={i} 
                className={`w-12 h-1.5 rounded-full transition-all duration-500 ${
                  i < currentQIndex ? 'bg-[var(--accent-green)]' : 
                  i === currentQIndex ? 'bg-[var(--accent-purple)] animate-pulse' : 
                  'bg-[var(--bg-elevated)]'
                }`}
              />
            ))}
          </div>
          
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-[var(--text-muted)] uppercase tracking-widest">
              Question {currentQIndex + 1} of 5
            </div>
            
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-mono font-bold text-lg ${
              timeLeft <= 10 
                ? 'bg-[var(--accent-red-dim)] text-[var(--accent-red)] animate-pulse' 
                : timeLeft <= 20 
                  ? 'bg-yellow-500/20 text-yellow-500' 
                  : 'bg-[var(--accent-green-dim)] text-[var(--accent-green)]'
            }`}>
              <Clock size={18} />
              <span>{timeLeft}s</span>
            </div>
          </div>
          
          <div className="glass-card p-8 rounded-[28px] w-full animate-fade-in-scale">
            <h2 className="text-2xl md:text-3xl font-light text-[var(--text-primary)] text-center leading-relaxed">
              "{questions[currentQIndex]}"
            </h2>
          </div>
          
          <div className="relative w-full">
            <textarea 
              className="w-full bg-[var(--bg-card)] border border-[var(--border-medium)] p-6 rounded-[24px] h-48 focus:ring-2 ring-[var(--accent-purple)]/40 focus:border-[var(--accent-purple)] outline-none text-[var(--text-primary)] text-lg transition-all placeholder:text-[var(--text-muted)] resize-none"
              placeholder="Speak or type your answer..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            />
            <button 
              onClick={listening ? SpeechRecognition.stopListening : SpeechRecognition.startListening}
              className={`absolute bottom-5 right-5 p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-95 ${
                listening 
                  ? 'bg-[var(--accent-red)] text-white animate-pulse shadow-[0_0_20px_var(--accent-red-glow)]' 
                  : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-medium)] hover:border-[var(--accent-purple)]'
              }`}
            >
              {listening ? <MicOff size={24}/> : <Mic size={24}/>}
            </button>
          </div>
          
          <button 
            onClick={handleNext} 
            className="w-full btn-primary py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>{currentQIndex === 4 ? "Analyze Performance" : "Next Question"}</span>
            <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      )}

      {gameState === "REPORT" && (
        <div className="w-full max-w-4xl space-y-8 animate-fade-in-up pb-10">
          {loading ? (
             <div className="flex flex-col items-center gap-6 mt-20">
                <div className="relative">
                  <div className="absolute inset-0 bg-[var(--accent-purple)] blur-2xl opacity-30"></div>
                  <Loader2 className="animate-spin text-[var(--accent-purple)] relative z-10" size={56} />
                </div>
                <div className="text-xl font-light text-[var(--text-secondary)] animate-pulse">Generating detailed breakdown...</div>
             </div>
          ) : report && (
            <div className="space-y-8">
              <div className="text-center p-10 glass-card rounded-[32px] relative overflow-hidden animate-fade-in-scale">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--accent-purple)] via-[var(--accent-blue)] to-[var(--accent-green)]"></div>
                <p className="text-xs uppercase tracking-widest text-[var(--text-muted)] mb-4">Overall Performance</p>
                <div className="text-8xl font-black text-gradient mb-4">{report.score}</div>
                <h3 className="text-xl text-[var(--text-secondary)] italic">"{report.summary}"</h3>
              </div>

              <div className="grid gap-4">
                <h4 className="text-lg font-semibold text-[var(--text-primary)] px-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-[var(--accent-purple)] rounded-full"></span>
                  Question Breakdown
                </h4>
                {report.detailedAnalysis?.map((item, i) => (
                  <div key={i} className="glass-card p-6 rounded-[20px] flex flex-col md:flex-row gap-4 items-start animate-fade-in-up" style={{animationDelay: `${i * 0.1}s`}}>
                    <div className={`p-2.5 rounded-full ${item.status === 'Excellent' ? 'bg-[var(--accent-green-dim)] text-[var(--accent-green)]' : 'bg-[var(--accent-red-dim)] text-[var(--accent-red)]'}`}>
                      {item.status === 'Excellent' ? <CheckCircle size={22}/> : <AlertCircle size={22}/>}
                    </div>
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)] font-medium mb-2">{item.q}</p>
                      <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{item.feedback}</p>
                    </div>
                    <div className={`text-xs font-bold uppercase px-4 py-2 rounded-full ${item.status === 'Excellent' ? 'bg-[var(--accent-green-dim)] text-[var(--accent-green)]' : 'bg-[var(--accent-red-dim)] text-[var(--accent-red)]'}`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>

              <div className="glass-card p-8 rounded-[28px] border-l-4 border-[var(--accent-purple)]">
                <h4 className="font-bold text-[var(--accent-purple)] mb-5 flex items-center gap-2 uppercase text-sm tracking-widest">
                  <Sparkles size={18} />
                  Key Improvements
                </h4>
                <ul className="space-y-4">
                  {report.improvementTips?.map((tip, i) => (
                    <li key={i} className="flex gap-4 text-[var(--text-secondary)]">
                      <div className="w-6 h-6 bg-[var(--accent-purple-dim)] text-[var(--accent-purple)] rounded-full flex items-center justify-center shrink-0 text-xs font-bold">
                        {i + 1}
                      </div>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-center pt-6">
                 <button 
                   onClick={() => {
                     setGameState("START");
                     setCurrentQIndex(0);
                     setAnswers([]);
                     setReport(null);
                     setTopic("");
                   }} 
                   className="btn-secondary px-10 py-4 rounded-full font-bold flex items-center gap-3 hover:scale-105 active:scale-95"
                 >
                   <RotateCcw size={18}/> Start New Session
                 </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RapidFire;