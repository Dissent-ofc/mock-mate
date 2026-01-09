import { useState } from 'react';
import { FileText, Play, ArrowLeft } from 'lucide-react';

const ResumeInput = ({ onBack, onStart }) => {
  const [resumeText, setResumeText] = useState("");

  return (
    <div className="max-w-3xl mx-auto p-6 animate-fade-in">
      {/* Header */}
      <button onClick={onBack} className="flex items-center text-gray-500 hover:text-blue-600 mb-6 transition">
        <ArrowLeft size={18} className="mr-1" /> Back to Dashboard
      </button>

      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FileText size={32} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Resume-Based Interview</h1>
        <p className="text-gray-500 mt-2">Paste your resume text below. The AI will analyze your experience and ask tailored questions.</p>
      </div>

      {/* Input Area */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <textarea 
          className="w-full h-64 p-4 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none bg-gray-50"
          placeholder="Paste your resume content here (Ctrl+V)..."
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
        />
        
        <div className="mt-4 flex justify-end">
          <button 
            onClick={() => onStart(resumeText)}
            disabled={!resumeText.trim()}
            className="flex items-center gap-2 bg-green-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-600/20"
          >
            <Play size={20} /> Start Personalized Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumeInput;