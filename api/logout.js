import {json,validOrigin} from '../lib/security.js';
export default function handler(req,res){if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});if(!validOrigin(req))return json(res,403,{error:'Invalid origin'});res.setHeader('Set-Cookie','sr_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0');return json(res,200,{ok:true});}
