import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

// Simple in-memory rate limiter: max 10 requests per IP per minute
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count++;
  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests — please wait a moment.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
  }

  const { prompt } = req.body as { prompt?: string };
  if (!prompt) {
    return res.status(400).json({ error: 'Missing prompt in request body.' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const explanation = response.text?.trim() ?? '';
    return res.status(200).json({ explanation });
  } catch (err: unknown) {
    console.error('Gemini error:', err);

    // Extract a clean message — Gemini SDK errors often nest the real message
    let msg = 'Gemini request failed';
    if (err instanceof Error) {
      // SDK wraps the HTTP body; try to pull out just the human-readable part
      const raw = err.message;
      // "429 Resource Exhausted" lines start with the status text
      if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
        msg = 'Gemini quota exceeded — please wait a minute and try again, or enable billing on your Google AI project.';
      } else if (raw.includes('API_KEY_INVALID') || raw.includes('401')) {
        msg = 'Invalid Gemini API key — check the GEMINI_API_KEY environment variable.';
      } else {
        // Try to grab just the first sentence of the message before any JSON
        msg = raw.split('\n')[0].slice(0, 200);
      }
    }

    const status = (err as { status?: number }).status ?? 502;
    return res.status(status === 429 ? 429 : 502).json({ error: msg });
  }
}
