import {json,authenticated} from '../lib/security.js';
export default function handler(req,res){if(req.method!=='GET')return json(res,405,{error:'Method not allowed'});return json(res,200,{authenticated:authenticated(req)});}
