// Shared, fault-tolerant Gemini caller for SmartReply (draft + rephrase).
// - 400 caused by optional settings  → retries once without thinkingConfig / safetySettings
// - 429 / 500 / 503 (overloaded)     → short back-off, then falls back to a lighter model
// - Every failure returns the real HTTP status + Gemini reason (never the API key)

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-2.5-flash-lite';
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function safeModel(value, def = 'gemini-2.5-flash') {
  const m = String(value || def);
  return /^[a-zA-Z0-9._-]+$/.test(m) ? m : def;
}

function buildBody({ system, user, temperature, maxOutputTokens, json, model, lean }) {
  const generationConfig = { temperature, maxOutputTokens };
  if (json) generationConfig.responseMimeType = 'application/json';
  // 2.5 Flash "thinking" consumes output tokens; disable it (not supported on 2.5 Pro).
  if (!lean && /^gemini-2\.5-flash/.test(model)) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }
  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts: [{ text: user }] }],
    generationConfig
  };
  if (!lean) {
    body.safetySettings = [
      'HARM_CATEGORY_DANGEROUS_CONTENT',
      'HARM_CATEGORY_HARASSMENT',
      'HARM_CATEGORY_HATE_SPEECH',
      'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    ].map(category => ({ category, threshold: 'BLOCK_ONLY_HIGH' }));
  }
  return body;
}

async function callOnce(model, opts, lean, signal) {
  const res = await fetch(BASE + encodeURIComponent(model) + ':generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': opts.apiKey },
    body: JSON.stringify(buildBody({ ...opts, model, lean })),
    signal
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function extract(data) {
  const c = data.candidates?.[0];
  const text = (c?.content?.parts || [])
    .filter(p => typeof p.text === 'string' && !p.thought)
    .map(p => p.text)
    .join('')
    .trim();
  return { text, finish: c?.finishReason || data.promptFeedback?.blockReason || '' };
}

export function describeError(status, data) {
  const msg = String(data?.error?.message || '').slice(0, 160);
  const map = {
    400: 'Gemini rejected the request (400)',
    401: 'Invalid Gemini API key (401)',
    403: 'Gemini API key not allowed (403) — check key restrictions in Google AI Studio',
    404: 'Gemini model not found (404) — check GEMINI_MODEL in Vercel',
    429: 'Gemini free quota / rate limit reached (429) — wait a minute and retry',
    500: 'Gemini internal error (500) — retry',
    503: 'Gemini is overloaded (503) — retry in a few seconds'
  };
  const base = map[status] || `Gemini error (${status})`;
  return msg ? `${base}: ${msg}` : base;
}

/**
 * @returns {Promise<{ok:true,text:string,finish:string,model:string}|{ok:false,status:number,error:string}>}
 */
export async function gemini(opts) {
  const primary = safeModel(opts.model);
  const plan = [
    { model: primary, lean: false },
    { model: primary, lean: true, onlyIf: s => s === 400 },
    { model: primary, lean: false, onlyIf: s => s === 500 || s === 503, wait: 1200 },
    { model: FALLBACK_MODEL, lean: false, onlyIf: s => [429, 500, 503, 404].includes(s) && FALLBACK_MODEL !== primary }
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 24000);
  let last = { status: 0, data: {} };

  try {
    for (const step of plan) {
      if (step.onlyIf && !step.onlyIf(last.status)) continue;
      if (step.wait) await sleep(step.wait);

      const r = await callOnce(step.model, opts, step.lean, controller.signal);

      if (r.ok) {
        const { text, finish } = extract(r.data);
        if (text) return { ok: true, text, finish, model: step.model };
        return {
          ok: false,
          status: 502,
          error: finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT'
            ? 'Gemini filtered this text. Please edit it manually.'
            : `Gemini returned an empty response${finish ? ` (${finish})` : ''}. Try again.`
        };
      }

      console.error('Gemini error', {
        model: step.model, lean: step.lean, status: r.status,
        code: r.data?.error?.status || '', msg: String(r.data?.error?.message || '').slice(0, 200)
      });
      last = r;
    }
    return { ok: false, status: 502, error: describeError(last.status, last.data) };

  } catch (e) {
    console.error('Gemini request failed', { name: e.name });
    return {
      ok: false,
      status: 504,
      error: e.name === 'AbortError' ? 'Gemini request timed out. Please try again.' : 'Could not reach Gemini.'
    };
  } finally {
    clearTimeout(timer);
  }
}
