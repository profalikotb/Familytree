// Shared, self-healing Gemini caller for SmartReply (draft + rephrase).
// - Model auto-discovery: if the configured model is retired (404), it asks Google
//   for the models this key can use and picks the newest Flash (then Flash-Lite).
// - 400 caused by optional settings  → retries once without thinking/safety settings
// - 429 / 500 / 503                  → short back-off, then the next available model
// - Every failure returns the real HTTP status + Gemini reason (never the API key)

const BASE = 'https://generativelanguage.googleapis.com/v1beta/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Warm-instance cache (Vercel reuses instances between requests)
let discovered = null;          // { at, models: [...] }
let lastGoodModel = null;

export function safeModel(value, def = '') {
  const m = String(value || def);
  return /^[a-zA-Z0-9._-]+$/.test(m) ? m : def;
}

const versionOf = name => {
  const m = name.match(/gemini-(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
};

async function listModels(apiKey) {
  if (discovered && Date.now() - discovered.at < 6 * 3600e3) return discovered.models;
  try {
    const r = await fetch(BASE + 'models?pageSize=200', {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(6000)
    });
    const d = await r.json().catch(() => ({}));
    const usable = (d.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => String(m.name || '').replace(/^models\//, ''))
      .filter(n => /^gemini-[\d.]+-flash/.test(n))
      .filter(n => !/(image|tts|audio|live|vision|embed|thinking-exp|exp-|-\d{4}$)/.test(n));
    // Stable before preview, Flash before Flash-Lite, newest version first.
    const rank = n => (/preview/.test(n) ? 2 : 0) + (/lite/.test(n) ? 1 : 0);
    usable.sort((a, b) => rank(a) - rank(b) || versionOf(b) - versionOf(a));
    discovered = { at: Date.now(), models: usable };
    console.log('Gemini models discovered', usable.slice(0, 6));
    return usable;
  } catch (e) {
    console.error('Gemini model discovery failed', { name: e.name });
    return [];
  }
}

function buildBody({ system, user, temperature, maxOutputTokens, json, model, lean }) {
  const v = versionOf(model);
  const generationConfig = { maxOutputTokens };
  if (json) generationConfig.responseMimeType = 'application/json';
  // Gemini 3+ recommends leaving temperature at default.
  if (v < 3 && typeof temperature === 'number') generationConfig.temperature = temperature;
  if (!lean) {
    if (v >= 3) generationConfig.thinkingConfig = { thinkingLevel: 'minimal' };
    else if (/flash/.test(model)) generationConfig.thinkingConfig = { thinkingBudget: 0 };
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
  const res = await fetch(BASE + 'models/' + encodeURIComponent(model) + ':generateContent', {
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
    404: 'No available Gemini model found (404)',
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs || 25000);

  // Candidate order: last model that worked → GEMINI_MODEL → discovered list (lazy)
  const tried = new Set();
  const queue = [lastGoodModel, safeModel(opts.model)].filter(Boolean);
  let discoveryDone = false;
  let last = { status: 0, data: {} };

  const next = async () => {
    while (true) {
      const m = queue.shift();
      if (m && !tried.has(m)) { tried.add(m); return m; }
      if (m) continue;
      if (discoveryDone) return null;
      discoveryDone = true;
      // Discovered models first; static safety net if discovery fails or is empty.
      queue.push(...(await listModels(opts.apiKey)).slice(0, 5),
        'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-flash-lite-latest');
    }
  };

  try {
    let model = await next();
    let attempts = 0;

    while (model && attempts < 8) {
      attempts++;
      let r = await callOnce(model, opts, false, controller.signal);

      if (r.status === 400) {                       // optional settings rejected
        r = await callOnce(model, opts, true, controller.signal);
      } else if (r.status === 500 || r.status === 503) {
        await sleep(1000);
        r = await callOnce(model, opts, false, controller.signal);
      }

      if (r.ok) {
        const { text, finish } = extract(r.data);
        if (text) {
          lastGoodModel = model;
          return { ok: true, text, finish, model };
        }
        return {
          ok: false,
          status: 502,
          error: finish === 'SAFETY' || finish === 'PROHIBITED_CONTENT'
            ? 'Gemini filtered this text. Please edit it manually.'
            : `Gemini returned an empty response${finish ? ` (${finish})` : ''}. Try again.`
        };
      }

      console.error('Gemini error', {
        model, status: r.status,
        code: r.data?.error?.status || '',
        msg: String(r.data?.error?.message || '').slice(0, 200)
      });
      last = r;
      if (lastGoodModel === model) lastGoodModel = null;

      // Key / permission problems will not be fixed by another model.
      if ([401, 403].includes(r.status)) break;
      model = await next();
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
