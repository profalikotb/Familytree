const $=id=>document.getElementById(id);
const tr={en:{subtitle:'Private WhatsApp reply assistant',logout:'Logout',welcome:'Welcome back',intro:'Sign in to prepare private bilingual reply drafts.',password:'App password',signIn:'Sign in securely',private:'PRIVATE · APPROVAL REQUIRED',compose:'Create a smart reply',helper:'Paste a WhatsApp message. You decide what is sent.',incoming:'Incoming message',messageType:'Conversation type',clinic:'Clinic / professional',personal:'Personal',paste:'Paste WhatsApp message',pasteClipboard:'Paste from clipboard',tone:'Reply tone',formal:'Professional',friendly:'Warm and friendly',concise:'Very concise',generate:'✦ Generate draft reply',draft:'AI draft · editable',approval:'Approval required: nothing will be sent automatically.',edit:'Edit before copying',rephrase:'✨ Rephrase my reply',undoRephrase:'↶ Restore original',copy:'Copy approved reply',clear:'Clear both messages',manual:'Return to the original WhatsApp chat and paste the reply yourself. No automatic sending.',privacy:'Do not paste identifying patient information, medical records or sensitive clinical details into the AI service without an appropriate authorized data-processing arrangement. Messages are not saved in this app.'},ar:{subtitle:'مساعد خاص للرد على واتساب',logout:'خروج',welcome:'مرحباً بعودتك',intro:'ادخل كلمة المرور لإعداد ردود عربية وإنجليزية.',password:'كلمة مرور التطبيق',signIn:'دخول آمن',private:'خاص · يتطلب موافقتك',compose:'إعداد رد ذكي',helper:'الصق رسالة واتساب وراجع الرد قبل إرساله بنفسك.',incoming:'الرسالة الواردة',messageType:'نوع المحادثة',clinic:'العيادة / العمل',personal:'شخصية',paste:'الصق رسالة واتساب',pasteClipboard:'لصق من الحافظة',tone:'أسلوب الرد',formal:'رسمي ومحترف',friendly:'ودود',concise:'مختصر جداً',generate:'✦ إنشاء الرد المقترح',draft:'رد الذكاء الاصطناعي · قابل للتعديل',approval:'الموافقة مطلوبة: لن تُرسل أي رسالة تلقائياً.',edit:'راجع وعدّل قبل النسخ',rephrase:'✨ إعادة صياغة ردي',undoRephrase:'↶ استعادة النص الأصلي',copy:'نسخ الرد بعد المراجعة',clear:'مسح الرسالتين',manual:'ارجع إلى محادثة واتساب الأصلية وألصق الرد بنفسك. لا يوجد إرسال تلقائي.',privacy:'لا تلصق أسماء المرضى أو ملفاتهم الطبية أو بيانات سرية في خدمة الذكاء الاصطناعي دون ترتيبات قانونية وأمنية ملائمة. التطبيق لا يحفظ الرسائل.'}};
let lang=localStorage.getItem('sr_lang')||'ar';let logged=false;let originalReplyBeforeRephrase='';
function translate(){document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';$('lang').textContent=lang==='ar'?'English':'عربي';document.querySelectorAll('[data-i18n]').forEach(el=>{const v=tr[lang][el.dataset.i18n];if(v!==undefined)el.textContent=v;});if(!$('risk').classList.contains('danger'))$('risk').textContent=tr[lang].approval;}
function status(text='',error=false,id='status'){const el=$(id);el.textContent=text;el.classList.toggle('error',error);}
function resetRisk(){$('risk').classList.remove('danger');$('risk').textContent=tr[lang].approval;}
function resetUndo(){originalReplyBeforeRephrase='';$('undoRephrase').disabled=true;}
function show(yes){logged=yes;$('loginScreen').classList.toggle('hidden',yes);$('mainScreen').classList.toggle('hidden',!yes);$('logout').classList.toggle('hidden',!yes);}
async function request(path,options={}){const response=await fetch('/api/'+path,{credentials:'same-origin',...options});let data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Request failed');return data;}
const post=(path,body)=>request(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

$('lang').onclick=()=>{lang=lang==='ar'?'en':'ar';localStorage.setItem('sr_lang',lang);translate();};
$('loginForm').onsubmit=async e=>{e.preventDefault();status('',false,'loginStatus');try{await post('login',{password:$('password').value});$('password').value='';show(true);}catch(err){status(err.message,true,'loginStatus');}};
$('logout').onclick=async()=>{await request('logout',{method:'POST'}).catch(()=>{});$('message').value='';$('reply').value='';resetUndo();resetRisk();show(false);};
$('message').oninput=()=>{$('count').textContent=$('message').value.length+' / 4000';};
$('pasteButton').onclick=async()=>{try{$('message').value=await navigator.clipboard.readText();$('message').dispatchEvent(new Event('input'));status('');}catch{status(lang==='ar'?'اضغط مطولاً في مربع الرسالة ثم اختر لصق.':'Long press in the message box and select Paste.',true);}};

/* ---------- Generate draft ---------- */
$('generate').onclick=async()=>{const message=$('message').value.trim();if(message.length<2){status(lang==='ar'?'أدخل الرسالة أولاً.':'Paste a message first.',true);return;}
 $('generate').disabled=true;$('copy').disabled=true;status(lang==='ar'?'جارٍ إعداد الرد...':'Preparing draft…');$('reply').value='';resetRisk();resetUndo();
 try{const out=await post('draft',{message,tone:$('tone').value,context:$('context').value});$('reply').value=out.reply;$('reply').dir=out.language==='ar'?'rtl':'ltr';
  if(out.risk==='medical_review'){$('risk').classList.add('danger');$('risk').textContent=lang==='ar'?'تنبيه طبي: يتطلب مراجعتك الشخصية؛ لا ترسل نصائح أو تشخيصات تلقائياً.':'Medical caution: clinician review required. Do not send diagnostic or treatment advice automatically.';}
  status(lang==='ar'?'الرد جاهز للمراجعة والتعديل.':'Draft ready for your review and editing.');$('copy').disabled=false;
 }catch(err){status(err.message,true);}finally{$('generate').disabled=false;}};

/* ---------- Rephrase my own reply (no medical gate: author-approved text) ---------- */
$('rephrase').onclick=async()=>{const replyBox=$('reply');const sourceText=replyBox.value;const text=sourceText.trim();
 if(!text){status(lang==='ar'?'اكتب ردك أولاً في مربع الرد.':'Please write your reply first.',true);replyBox.focus();return;}
 $('rephrase').disabled=true;status(lang==='ar'?'جارٍ تحسين صياغة ردك...':'Rephrasing your message…');
 try{const out=await post('rephrase',{mode:'rephrase',text,tone:$('tone').value,context:$('context').value});
  const reply=(out.reply||'').trim();if(!reply)throw new Error(lang==='ar'?'لم يصل رد من الخدمة.':'Empty AI response.');
  originalReplyBeforeRephrase=sourceText;replyBox.value=reply;replyBox.dir=out.language==='ar'?'rtl':out.language==='en'?'ltr':'auto';
  resetRisk();$('copy').disabled=false;$('undoRephrase').disabled=false;
  status(lang==='ar'?'تمت إعادة الصياغة. راجع النص قبل نسخه.':'Reply rephrased. Please review before copying.');
 }catch(err){status(err.message,true);}finally{$('rephrase').disabled=false;}};

$('undoRephrase').onclick=()=>{if(!originalReplyBeforeRephrase)return;const replyBox=$('reply');replyBox.value=originalReplyBeforeRephrase;replyBox.dir='auto';resetUndo();$('copy').disabled=!replyBox.value.trim();status(lang==='ar'?'تمت استعادة النص الأصلي.':'Original reply restored.');};

$('copy').onclick=async()=>{if(!$('reply').value.trim())return;try{await navigator.clipboard.writeText($('reply').value);status(lang==='ar'?'تم النسخ. الصق الرد في واتساب بنفسك.':'Copied. Paste into WhatsApp yourself.');}catch{$('reply').focus();$('reply').select();status(lang==='ar'?'حدد النص وانسخه يدوياً.':'Select and copy the text manually.',true);}};
$('reply').oninput=()=>{$('copy').disabled=!$('reply').value.trim();};
$('clear').onclick=()=>{$('message').value='';$('reply').value='';$('message').dispatchEvent(new Event('input'));$('copy').disabled=true;resetRisk();resetUndo();status('');};

translate();request('session').then(j=>show(j.authenticated)).catch(()=>show(false));

/* ---------- Abbreviation expansion (reply box, live, offline) ----------
   Type an UPPERCASE abbreviation + space/Enter/punctuation → expanded.
   Backspace right after → reverts. Add/edit entries in SR_ABBR_BUILTIN below.
   (An optional /abbreviations.js defining window.SR_ABBR is merged on top.) */
const SR_ABBR_BUILTIN = {
  // Spine — cervical
  CD: 'cervical disc',
  CDS: 'cervical discs',
  CDNOT: 'cervical discs not improved by medical treatment',
  CX: 'cervical',
  NECKRT: 'neck pain and right brachialgia',
  NECKLT: 'neck pain and left brachialgia',
  NECKBIL: 'neck pain and bilateral brachialgia',
  INNK: 'neck spasm with intact motor power',

  // Spine — lumbar
  LD: 'lumbar disc',
  LDS: 'lumbar discs',
  LDNOT: 'lumbar discs not improved by medical treatment',
  LSS: 'lumbosacral',
  LBPRT: 'LBP and right sciatica',
  LBPLT: 'LBP and left sciatica',
  LBPBIL: 'LBP and bilateral sciatica',
  INBA: 'back spasm with intact motor power',
  SPOND: 'spondylolisthesis',
  SACRT: 'right sacroiliitis',
  SACLT: 'left sacroiliitis',
  SACBIL: 'bilateral sacroiliitis',

  // Limbs / joints
  UL: 'upper limb',
  LL: 'lower limb',
  RTSH: 'right shoulder',
  LTSH: 'left shoulder',
  POLY: 'polyarthropathy',
  PLM: 'pain limiting movement',

  // Cranial
  ESS: 'empty sella syndrome',
  NPH: 'normal pressure hydrocephalus',
  PAP: 'papilledema',
  ISC: 'ischemic changes',
  TSS: 'transverse sinus stenosis',
  FUNDV: 'for fundus and visual field',

  // Imaging
  PLX: 'plain X-ray',
  MRICX: 'MRI cervical spine',
  MRIBC: 'MRI brain with contrast',
  MRISEL: 'MRI sella with contrast',
  MRISPECT: 'MRI brain spectroscopy',
  DS: 'dynamic study',
  MRIDY: 'MRI LSS and dynamic study',
  MRILD: 'for MRI lumbosacral and dynamic study',
  MRILDD: 'MRI LSS, DEXA and dynamic study',
  MRICLD: 'for MRI cervical, lumbosacral and dynamic study',

  // Treatment / course
  MTPT: 'medical treatment then physiotherapy',
  NOTIMP: 'not improved by medical treatment',
  PIM: 'partially improved',
  MIMP: 'much improved for physiotherapy',
  MIP: 'much improved for physiotherapy',
  PPT: 'physiotherapy',
  PPTN: 'physiotherapy on the neck',
  PPTB: 'physiotherapy on the back',
  PPTNB: 'physiotherapy on the neck and back',
  SPT: 'for self physiotherapy',
  PAINTH: 'pain therapy',
  RF: 'radiofrequency',
  WFS: 'wait for surgery',
  PTRS: 'the patient refused the surgery',
  WC: 'wound is clean for follow-up',
  PT: 'patient',
  FB: 'fees back',

  // Colleagues
  DHO: 'Dr Hosam El Obrachy',
  DMAL: 'Dr Mohamed Alaa',
  DMF: 'Dr Mohamed Fouad',
  DMH: 'Dr Mahmoud Hemida',
  DTM: 'Dr Tarek El Menicie',
  DWAF: 'Dr Mohamed Wafa',
  DSYM: 'Dr Symon Halim',
  DOH: 'Dr Osama Abd El Hay',
  DSW: 'did surgery with Dr',
  DLPS: 'did LP with Dr Symon Halim',
  LPS: 'lumbar puncture by Dr Symon Halim'
  Callmag:'ممكن التواصل على هذا الرقم: 01222547661'
  Callram:'ممكن الاتصال بالأستاذ رامى فى وادى النيل على هذا الرقم: 01001703613'
 
};
(()=>{const box=$('reply');if(!box)return;
 const dict=()=>Object.assign({},SR_ABBR_BUILTIN,window.SR_ABBR||{});
 const kh=document.querySelector('.kbdhint');if(kh)kh.insertAdjacentHTML('beforeend',` · ${Object.keys(dict()).length} abbreviations`);
 const TRIGGER=/[\s.,;:!?)\]،؛؟]/;let last=null;
 const flash=(a,f)=>status(`${a} → ${f}`);
 const cap=(v,start,f)=>/(^|[.!?؟]\s+|\n\s*)$/.test(v.slice(0,start))||start===0?f.charAt(0).toUpperCase()+f.slice(1):f;
 function expandBefore(pos,trigLen){ // token ends at pos-trigLen
  const v=box.value,end=pos-trigLen,m=v.slice(0,end).match(/(^|[^A-Za-z0-9_'’\-\/])([A-Z][A-Z0-9]{1,9})$/);
  const ABBR=dict();if(!m||!Object.hasOwn(ABBR,m[2]))return false;
  const start=end-m[2].length,full=cap(v,start,ABBR[m[2]]);
  box.setRangeText(full,start,end,'end');const caret=start+full.length+trigLen;box.setSelectionRange(caret,caret);
  last={start,abbr:m[2],full,caret};flash(m[2],full);box.dispatchEvent(new Event('input',{bubbles:true}));return true;}
 box.addEventListener('beforeinput',e=>{
  if(e.inputType==='deleteContentBackward'&&last&&box.selectionStart===last.caret&&box.selectionEnd===last.caret){
   e.preventDefault();const s=last.start,e2=s+last.full.length;box.setRangeText(last.abbr,s,e2,'preserve');
   const c=last.caret-last.full.length+last.abbr.length;box.setSelectionRange(c,c);status('');last=null;
   box.dispatchEvent(new Event('input',{bubbles:true}));return;}
  if(e.isTrusted)last=null;});
 box.addEventListener('input',e=>{if(!e.isTrusted)return;
  const t=e.inputType,d=e.data||'';
  if(t==='insertLineBreak'||t==='insertParagraph')expandBefore(box.selectionStart,1);
  else if((t==='insertText'||t==='insertReplacementText')&&d&&TRIGGER.test(d.slice(-1)))expandBefore(box.selectionStart,1);});
 // Expand a trailing abbreviation (no trigger typed) before Rephrase / Copy
 const tail=()=>{const ABBR=dict(),v=box.value,m=v.match(/(^|[^A-Za-z0-9_'’\-\/])([A-Z][A-Z0-9]{1,9})\s*$/);
  if(m&&Object.hasOwn(ABBR,m[2])){const s=v.length-m[0].length+m[1].length;box.value=v.slice(0,s)+cap(v,s,ABBR[m[2]])+v.slice(s+m[2].length);}};
 ['rephrase','copy'].forEach(id=>$(id).addEventListener('click',tail,{capture:true}));
})();
