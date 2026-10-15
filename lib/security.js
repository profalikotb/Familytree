import crypto from 'node:crypto';

export function json(res, code, body) {res.status(code).setHeader('Content-Type','application/json; charset=utf-8').setHeader('Cache-Control','no-store');return res.end(JSON.stringify(body));}
export function validOrigin(req){const origin=req.headers.origin;const host=req.headers.host; if (!origin || !host) return false; try {return new URL(origin).host === host && new URL(origin).protocol === 'https:' || (new URL(origin).host === host && host.startsWith('localhost'));}catch{return false;}}
export function signature(value){return crypto.createHmac('sha256',process.env.SESSION_SECRET||'').update(value).digest('hex');}
export function sessionCookie(){let expiry=Date.now()+8*60*60*1000;let data='v1.'+expiry;return `sr_session=${data}.${signature(data)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`;}
export function authenticated(req){if(!process.env.SESSION_SECRET)return false;let match=(req.headers.cookie||'').match(/(?:^|;\s*)sr_session=([^;]+)/);if(!match)return false;let v=match[1];let p=v.lastIndexOf('.');if(p<0)return false;let raw=v.slice(0,p), sig=v.slice(p+1);let wanted=signature(raw);if(sig.length!==wanted.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(wanted)))return false;let [ver,expiry]=raw.split('.');return ver==='v1' && Number(expiry)>Date.now();}
export function secureHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');}
