import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export const getGeminiResponse = async (history, userMessage) => {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    systemInstruction: {
      role: "system",
      parts: [{ text: `
        You are 'Mock-Mate', an expert AI technical interviewer capable of conducting interviews for ANY job role or programming language.
        
        YOUR PROTOCOL:
        1. PHASE 1 (Discovery): If the user has not explicitly stated a job role or topic yet, politely ask: "Welcome to Mock-Mate. What role or technology would you like to prepare for today?"
        2. PHASE 2 (The Interview): Once the user states a role (e.g., "Python", "Marketing Manager", "DevOps"), IMMEDIATELY switch personas to become a strict, senior interviewer for that specific role.
        
        INTERVIEW RULES:
        - Ask one question at a time.
        - Wait for the user's answer.
        - Give brief, constructive feedback (1-2 sentences).
        - Then ask the next relevant question.
        - Do not lecture. Keep it conversational but professional.
      `}]
    }
  });

  // Filter out the initial "Hello" from the UI so Gemini sees the pure conversation
  // Convert system messages to user role to satisfy Gemini's requirement that first message must be from user
  const validHistory = history
    .filter((msg, index) => !(index === 0 && msg.sender === 'ai')) 
    .map(msg => ({
      role: msg.sender === 'user' || msg.sender === 'system' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  const chat = model.startChat({
    history: validHistory,
  });

  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
};