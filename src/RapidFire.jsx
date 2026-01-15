import { useState } from 'react';
import { getGeminiResponse } from './gemini';
import { Mic, MicOff, Send, Play, CheckCircle, ArrowLeft, Zap, Loader2, RotateCcw, Sparkles, XCircle, AlertCircle } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const RapidFire = ({ onBack }) => {
  const [topic, setTopic] = useState("");
  const [gameState, setGameState] = useState("START"); // START, PLAYING, REPORT
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  if (listening && transcript !== currentAnswer) {
    setCurrentAnswer(transcript);
  }

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
    } catch (e) {
      alert("Error generating questions.");
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
      
      // ELABORATE REPORT PROMPT
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
      }
      setLoading(false);
    }
  };

  return (
    // Added pt-24 to prevent overlap with the main App Navbar
    <div className="flex flex-col h-full w-full max-w-5xl mx-auto items-center p-6 pt-24 animate-fade-in-up overflow-y-auto custom-scrollbar">
      
      {/* 1. UPDATED HEADER (Simplified to avoid overlap) */}
      <div className="w-full flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-[#1d1b20] rounded-full text-[#cac4d0] hover:text-white transition border border-white/5 shadow-lg">
          <ArrowLeft size={18} />
          <span>Exit Session</span>
        </button>
        <div className="flex items-center gap-2 px-4 py-2 bg-[#4f378b]/20 rounded-full border border-[#d0bcff]/20">
          <Zap size={16} className="text-[#d0bcff] fill-current" />
          <span className="text-[#d0bcff] font-bold tracking-widest text-xs uppercase">Rapid Fire</span>
        </div>
      </div>

      {/* --- START SCREEN --- */}
      {gameState === "START" && (
        <div className="w-full max-w-md text-center space-y-8 glass-panel p-10 rounded-[40px] border border-white/10 mt-10">
          <h1 className="text-4xl font-bold text-white tracking-tight">Rapid Fire</h1>
          <input 
            className="w-full bg-[#141218] border border-white/10 p-4 rounded-2xl text-center text-white outline-none focus:ring-2 ring-[#d0bcff]/50" 
            placeholder="Target Role (e.g. Java Dev)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button 
            onClick={startGame} 
            disabled={loading || !topic}
            className="w-full bg-[#d0bcff] text-[#381e72] py-4 rounded-full font-bold text-lg hover:shadow-[0_0_20px_rgba(208,188,255,0.4)] transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Start Interview"}
          </button>
        </div>
      )}

      {/* --- GAME SCREEN --- */}
      {gameState === "PLAYING" && (
        <div className="w-full max-w-3xl space-y-8 flex flex-col items-center">
          <h2 className="text-3xl font-light text-white text-center leading-tight min-h-[100px]">
            "{questions[currentQIndex]}"
          </h2>
          <div className="relative w-full">
            <textarea 
              className="w-full bg-[#1d1b20] border border-white/10 p-6 rounded-[32px] h-48 focus:ring-2 ring-[#d0bcff]/40 outline-none text-white text-lg"
              placeholder="Speak or type your answer..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            />
            <button 
              onClick={listening ? SpeechRecognition.stopListening : SpeechRecognition.startListening}
              className={`absolute bottom-6 right-6 p-4 rounded-full shadow-xl transition-all ${listening ? 'bg-red-600 animate-pulse text-white' : 'bg-[#332d41] text-[#cac4d0]'}`}
            >
              {listening ? <MicOff size={24}/> : <Mic size={24}/>}
            </button>
          </div>
          <button onClick={handleNext} className="w-full bg-[#eaddff] text-[#21005d] py-4 rounded-2xl font-bold hover:bg-[#d0bcff] transition-all">
            {currentQIndex === 4 ? "Analyze Performance" : "Next Question ➜"}
          </button>
        </div>
      )}

      {/* --- ELABORATE REPORT SCREEN --- */}
      {gameState === "REPORT" && (
        <div className="w-full max-w-4xl space-y-8 animate-fade-in-up pb-10">
          {loading ? (
             <div className="flex flex-col items-center gap-6 mt-20">
                <Loader2 className="animate-spin text-[#d0bcff]" size={48} />
                <div className="text-xl font-light text-[#cac4d0] animate-pulse">Generating detailed breakdown...</div>
             </div>
          ) : report && (
            <div className="space-y-8">
              {/* Score Card */}
              <div className="text-center p-10 rounded-[40px] bg-[#1d1b20] border border-white/5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#d0bcff] to-[#4f378b]"></div>
                <p className="text-xs uppercase tracking-widest text-[#938f99] mb-4">Overall Performance</p>
                <div className="text-8xl font-black text-white mb-2">{report.score}</div>
                <h3 className="text-xl text-[#d0bcff] italic">"{report.summary}"</h3>
              </div>

              {/* DETAILED ANALYSIS TABLE */}
              <div className="grid gap-4">
                <h4 className="text-lg font-medium text-white px-2">Question Breakdown</h4>
                {report.detailedAnalysis?.map((item, i) => (
                  <div key={i} className="p-6 rounded-[24px] bg-[#1d1b20] border border-white/5 flex flex-col md:flex-row gap-4 items-start">
                    <div className={`p-2 rounded-full ${item.status === 'Excellent' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {item.status === 'Excellent' ? <CheckCircle size={20}/> : <AlertCircle size={20}/>}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium mb-1">{item.q}</p>
                      <p className="text-[#938f99] text-sm leading-relaxed">{item.feedback}</p>
                    </div>
                    <div className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${item.status === 'Excellent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {item.status}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actionable Tips */}
              <div className="bg-[#4f378b]/10 p-8 rounded-[32px] border border-[#d0bcff]/10">
                <h4 className="font-bold text-[#d0bcff] mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                  Key Improvements
                </h4>
                <ul className="space-y-3">
                  {report.improvementTips?.map((tip, i) => (
                    <li key={i} className="flex gap-3 text-[#cac4d0] text-sm">
                      <Sparkles size={16} className="text-[#d0bcff] shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex justify-center pt-6">
                 <button onClick={() => setGameState("START")} className="bg-[#1d1b20] text-white px-10 py-4 rounded-full font-bold hover:bg-[#332d41] transition-all flex items-center gap-2 border border-white/10">
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