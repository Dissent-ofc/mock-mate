import { GoogleGenerativeAI } from "@google/generative-ai";

// Multiple API keys for rotation (add as many as you have)
const API_KEYS = [
  import.meta.env.VITE_GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
].filter(Boolean); // Remove undefined keys

let currentKeyIndex = 0;
const keyFailures = new Map(); // Track which keys are rate limited

const getNextWorkingKey = () => {
  const now = Date.now();
  
  // Try each key, skipping ones that failed recently (within 60s)
  for (let i = 0; i < API_KEYS.length; i++) {
    const index = (currentKeyIndex + i) % API_KEYS.length;
    const lastFailure = keyFailures.get(index) || 0;
    
    if (now - lastFailure > 60000) { // 60 second cooldown per key
      currentKeyIndex = index;
      return API_KEYS[index];
    }
  }
  
  // All keys are on cooldown, use the one that failed longest ago
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

// Rate limit protection
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

// Simple response cache for identical prompts
const responseCache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Retry with exponential backoff AND key rotation
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async (fn, onRateLimit) => {
  const maxRetries = API_KEYS.length * 2; // Try each key twice
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Ensure minimum time between requests
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
        // Mark current key as failed and get next one
        markKeyAsFailed(currentKeyIndex);
        onRateLimit?.(); // Callback to update the genAI instance
        
        if (attempt < maxRetries - 1) {
          const delay = 1000; // Quick retry with new key
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
  // Check cache first (for repeated identical requests)
  const cacheKey = JSON.stringify({ history: history.slice(-3), userMessage });
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('Using cached response');
    return cached.response;
  }

  // Get current working API key
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
    // Callback when rate limited - switch to next API key
    () => {
      apiKey = getNextWorkingKey();
      genAI = createGenAI(apiKey);
    }
  );

  // Cache the response
  responseCache.set(cacheKey, { response, timestamp: Date.now() });
  
  // Clean old cache entries
  if (responseCache.size > 50) {
    const oldestKey = responseCache.keys().next().value;
    responseCache.delete(oldestKey);
  }

  return response;
};