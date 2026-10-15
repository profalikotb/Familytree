import crypto from 'node:crypto';
import {json,validOrigin,sessionCookie} from '../lib/security.js';
export default async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!validOrigin(req))return json(res,403,{error:'Invalid origin'});
 if(!process.env.APP_PASSWORD||!process.env.SESSION_SECRET)return json(res,503,{error:'Set APP_PASSWORD and SESSION_SECRET in Vercel'});
 const got=String(req.body?.password||'');const secret=process.env.APP_PASSWORD;
 const a=crypto.createHash('sha256').update(got).digest();const b=crypto.createHash('sha256').update(secret).digest();
 if(!crypto.timingSafeEqual(a,b))return json(res,401,{error:'Incorrect password'});
 res.setHeader('Set-Cookie',sessionCookie());return json(res,200,{ok:true});
}
