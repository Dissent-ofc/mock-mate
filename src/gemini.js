import { GoogleGenerativeAI } from "@google/generative-ai";


const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
].filter(Boolean);

let currentKeyIndex = 0;
const keyFailures = new Map();

const getNextWorkingKey = () => {
  const now = Date.now();
  
  for (let i = 0; i < API_KEYS.length; i++) {
    const index = (currentKeyIndex + i) % API_KEYS.length;
    const lastFailure = keyFailures.get(index) || 0;
    
    if (now - lastFailure > 60000) {
      currentKeyIndex = index;
      return API_KEYS[index];
    }
  }

  let oldestFailureIndex = 0;
  let oldestTime = Infinity;
  keyFailures.forEach((time, index) => {
    if (time < oldestTime) {
      oldestTime = time;
      oldestFailureIndex = index;
    }
  });
  
  currentKeyIndex = oldestFailureIndex;
  return API_KEYS[oldestFailureIndex];
};

const markKeyAsFailed = (keyIndex) => {
  keyFailures.set(keyIndex, Date.now());
  console.log(`API key ${keyIndex + 1} rate limited, rotating to next key...`);
};

const createGenAI = (apiKey) => new GoogleGenerativeAI(apiKey);


let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000;

const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, onRateLimit) => {
  const maxRetries = API_KEYS.length * 2;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
   
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;
      if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
        await sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
      }
      lastRequestTime = Date.now();
      
      return await fn();
    } catch (error) {
      const isRateLimit = error.message?.includes('429') || 
                          error.message?.includes('rate') || 
                          error.message?.includes('quota') ||
                          error.status === 429;
      
      if (isRateLimit) {
      
        markKeyAsFailed(currentKeyIndex);
        onRateLimit?.();
        
        if (attempt < maxRetries - 1) {
          const delay = 1000;
          console.log(`Switching to key ${currentKeyIndex + 1}, retrying...`);
          await sleep(delay);
          continue;
        }
      }
      throw error;
    }
  }
};

export const getGeminiResponse = async (history, userMessage) => {
  const cacheKey = JSON.stringify({ history: history.slice(-3), userMessage });
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached response');
    return cached.response;
  }

  let apiKey = getNextWorkingKey();
  let genAI = createGenAI(apiKey);

  const getModel = () => genAI.getGenerativeModel({ 
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

  const validHistory = history
    .filter((msg, index) => !(index === 0 && msg.sender === 'ai')) 
    .map(msg => ({
      role: msg.sender === 'user' || msg.sender === 'system' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

  const response = await retryWithBackoff(
    async () => {
      const model = getModel();
      const chat = model.startChat({
        history: validHistory,
      });

      const result = await chat.sendMessage(userMessage);
      const res = await result.response;
      return res.text();
    },
    () => {
      apiKey = getNextWorkingKey();
      genAI = createGenAI(apiKey);
    }
  );

  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  
  if (responseCache.size > 50) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }

  return response;
};