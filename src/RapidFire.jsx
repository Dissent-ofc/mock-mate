import { useState } from 'react';
import { getGeminiResponse } from './gemini';
import { Mic, MicOff, Send, Play, CheckCircle } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const RapidFire = ({ onBack }) => {
  const [topic, setTopic] = useState("");
  const [gameState, setGameState] = useState("START"); // START, PLAYING, REPORT
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);

  const { transcript, listening, resetTranscript } = useSpeechRecognition();

  // Sync voice to input
  if (listening && transcript !== currentAnswer) {
    setCurrentAnswer(transcript);
  }

  const startGame = async () => {
    if (!topic) return;
    setLoading(true);
    
    // API CALL #1: Get 5 questions at once
    const prompt = `Generate 5 technical interview questions for a ${topic} role. Return ONLY a raw JSON array of strings. Example: ["Q1", "Q2"]`;
    
    try {
      const rawResponse = await getGeminiResponse([], prompt);
      // Clean up markdown if Gemini adds it (```json ...)
      const cleanJson = rawResponse.replace(/```json/g, "").replace(/```/g, "").trim();
      const qArray = JSON.parse(cleanJson);
      
      setQuestions(qArray);
      setGameState("PLAYING");
    } catch (e) {
      alert("Error starting game. Try again.");
      console.error(e);
    }
    setLoading(false);
  };

  const handleNext = async () => {
    // Save answer
    const newAnswers = [...answers, { question: questions[currentQIndex], answer: currentAnswer }];
    setAnswers(newAnswers);
    setCurrentAnswer("");
    resetTranscript();

    if (currentQIndex < 4) {
      // Next Question
      setCurrentQIndex(currentQIndex + 1);
    } else {
      // Game Over -> Generate Report
      setGameState("REPORT");
      setLoading(true);
      
      // API CALL #2: Grade everything at once
      const reportPrompt = `
        Evaluate this Rapid Fire Interview for a ${topic} role.
        
        ${newAnswers.map((a, i) => `Q${i+1}: ${a.question}\nUser Answer: ${a.answer}`).join('\n\n')}
        
        Provide a JSON object with: 
        { "score": "X/10", "feedback": "One sentence summary", "tips": ["Tip 1", "Tip 2"] }
      `;
      
      const rawReport = await getGeminiResponse([], reportPrompt);
       // Clean up markdown if Gemini adds it (```json ...)
      const cleanReport = rawReport.replace(/```json/g, "").replace(/```/g, "").trim();
      setReport(JSON.parse(cleanReport));
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <button onClick={onBack} className="mb-4 text-gray-500 hover:text-blue-600">← Back to Dashboard</button>
      
      {/* 1. START SCREEN */}
      {gameState === "START" && (
        <div className="text-center space-y-6">
          <h1 className="text-3xl font-bold text-blue-900">⚡ Rapid Fire Mode</h1>
          <p className="text-gray-600">5 Questions. Rapid pace. No pauses.</p>
          <input 
            className="border p-3 rounded w-full text-center text-lg" 
            placeholder="Enter Role (e.g. React Developer)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
          <button 
            onClick={startGame} 
            disabled={loading}
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold text-lg hover:bg-blue-700 w-full flex justify-center items-center gap-2"
          >
            {loading ? "Generating..." : <><Play size={20}/> Start Interview</>}
          </button>
        </div>
      )}

      {/* 2. GAME SCREEN */}
      {gameState === "PLAYING" && (
        <div className="space-y-6">
          <div className="flex justify-between text-sm text-gray-400 uppercase font-bold">
            <span>Question {currentQIndex + 1} of 5</span>
            <span>Rapid Fire</span>
          </div>
          
          <h2 className="text-2xl font-semibold text-gray-800 h-24">{questions[currentQIndex]}</h2>
          
          <div className="relative">
             <textarea 
              className="w-full border p-4 rounded-xl h-32 focus:ring-2 ring-blue-500 outline-none"
              placeholder="Speak or type your answer..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
            />
            <button 
              onClick={listening ? SpeechRecognition.stopListening : SpeechRecognition.startListening}
              className={`absolute bottom-4 right-4 p-2 rounded-full ${listening ? 'bg-red-500 animate-pulse' : 'bg-gray-200'}`}
            >
              {listening ? <MicOff color="white" size={20}/> : <Mic size={20}/>}
            </button>
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700"
          >
            {currentQIndex === 4 ? "Finish & Get Score" : "Next Question →"}
          </button>
        </div>
      )}

      {/* 3. REPORT SCREEN */}
      {gameState === "REPORT" && (
        <div className="text-center space-y-6 animate-fade-in">
          {loading ? (
             <div className="text-xl font-medium animate-pulse">Calculating Score...</div>
          ) : (
            <>
              <div className="text-6xl font-black text-blue-600">{report.score}</div>
              <h3 className="text-xl font-bold">Verdict: {report.feedback}</h3>
              
              <div className="bg-blue-50 p-6 rounded-xl text-left space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-2"><CheckCircle size={18}/> Top Tips for You:</h4>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {report.tips?.map((tip, i) => <li key={i}>{tip}</li>)}
                </ul>
              </div>

              <button onClick={() => setGameState("START")} className="bg-gray-800 text-white px-6 py-2 rounded-lg">Try Again</button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default RapidFire;