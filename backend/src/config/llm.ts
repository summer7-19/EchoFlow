// backend/src/config/llm.ts
import OpenAI from 'openai';
import { config } from './env.js'; // 引入你现有的配置

export const llmClient = new OpenAI({
  apiKey: config.llm.apiKey, 
  baseURL: config.llm.baseUrl,
});