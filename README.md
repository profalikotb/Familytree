# SmartReply AI — iPhone WhatsApp Draft Assistant

A private, bilingual (Arabic RTL / English) **manual-review** Progressive Web App for iPhone and desktop. Works with messages manually copied from **personal WhatsApp** and **WhatsApp Business**. **It does not read WhatsApp conversations or send WhatsApp messages.**

## Contents
- `public/index.html`, `style.css`, `app.js`: responsive, installable bilingual interface.
- `api/login.js`, `api/logout.js`, `api/session.js`: signed HTTP-only same-site cookie login (8-hour expiry).
- `api/draft.js`: server-side OpenAI-generated proposed reply, safety-oriented prompts, medical warning.
- `lib/security.js`: origin validation, HMAC cookie signing, timing-safe verification.
- `n8n/smartreply-activity.json`: OPTIONAL n8n workflow accepting anonymous *metadata fields* after being correctly secured. It never receives patient text from this app.
- `.env.example`: deployment settings (never publish real secrets).

## 1. Deploy on Vercel using GitHub (Windows browser, no terminal required)
1. Extract the ZIP. It contains a folder called `smartreply-ai`.
2. On GitHub: **New repository** → call it `smartreply-ai` → set **Private**.
3. Upload the **contents inside** `smartreply-ai` to the repository root (including `api`, `lib`, `public`, `n8n`, `package.json`, `vercel.json`). Never upload real `.env` files or credentials.
4. In Vercel: **Add New > Project** → import that GitHub repo → Framework Preset **Other** → Root Directory `./` → Deploy.
5. In Vercel Project > Settings > Environment Variables, add:
   - `APP_PASSWORD`: unique strong password, ideally 20+ characters.
   - `SESSION_SECRET`: 64+ random characters (suggest `openssl rand -hex 32`, or generate using a trusted password manager).
   - `OPENAI_API_KEY`: your OpenAI API project key (not your ChatGPT password).
   - `OPENAI_MODEL`: `gpt-4.1-mini` (change to another supported Chat Completions model if unavailable).
6. Enable for **Production** environment. Go to Deployments → select the most recent production deployment → **Redeploy** (environment changes only affect subsequent deployments).
7. Visit your Vercel domain over HTTPS. Sign in using `APP_PASSWORD`.
8. Test with an administrative message *without patient data*:
   `السلام عليكم، كيف أحجز موعداً في عيادة مصر الجديدة؟`
   Verify the draft includes `https://calendly.com/alikotb/neurosurgery`. Edit, copy, then paste manually into WhatsApp.
9. Test with a clinical question *without real patient identifying details*: `لدي صداع شديد مفاجئ وضعف في الذراع، ماذا أفعل؟` Confirm orange medical caution and no diagnostic or prescription advice.

**NOTE:** A private GitHub repository does not itself password-protect your Vercel page; the app login protects draft functionality. Add Vercel Deployment Protection if your plan permits it. For clinical deployment, arrange appropriate privacy, consent, retention, and vendor/legal review before transmitting real patient details to any AI service. A plain password login is a single-user starter safeguard, not enterprise healthcare compliance.

## 2. Install on iPhone
1. Open your deployed HTTPS Vercel URL **in Safari**.
2. Tap **Share** (square with up arrow) → **Add to Home Screen** → name it `SmartReply AI` → **Add**.
3. Tap the Home Screen icon → sign in → paste copied WhatsApp message → Generate → edit and copy → switch to WhatsApp → paste and send manually.
4. If Clipboard Paste is blocked, tap and hold in the incoming message field and choose **Paste**.
5. To change language tap **English / عربي** in the header. The language preference is stored locally; message contents are not stored intentionally in localStorage.

## 3. n8n server integration (optional, privacy-preserving)
Your known n8n host is:
`https://n8n.srv1044029.hstgr.cloud/`

1. Open n8n → **Workflows → Import from File** → select `n8n/smartreply-activity.json`.
2. Select the `Activity Webhook` node. In the node's **Authentication**, choose **Header Auth**. Create/select credentials with:
    - Header name: `X-SmartReply-Token`
    - Header value: a new independent secret, 24+ random characters.
3. Save → Publish/Activate workflow (exact button depends on installed n8n version).
4. Verify the **Production URL** (expected path `https://n8n.srv1044029.hstgr.cloud/webhook/smartreply-activity`; verify rather than assuming).
5. Set Vercel environment variables:
    - `N8N_ACTIVITY_WEBHOOK`: the verified production URL.
    - `N8N_ACTIVITY_TOKEN`: the same Header Auth secret.
6. Redeploy Vercel. Generate a test draft; check **Executions** in n8n.

**Privacy caveat:** only minimal data (draft-created event, language, generic category, medical-risk boolean and time) is POSTed from Vercel to n8n, **not** the original message, generated draft, patient name or phone number. n8n may retain metadata execution history depending on its settings. The imported workflow currently has no connected spreadsheet/database: the execution history itself is the optional activity record. Lock down and limit that retention as appropriate.

The AI generation itself runs on Vercel using OpenAI API. n8n is an optional activity/event integration, not the primary inference engine. This design minimizes exposure of clinical content across services and avoids unavailable native WhatsApp access. An official WhatsApp Business Cloud API workflow can be added as a *separate* supervised channel in a future version after Meta onboarding; **do not use unofficial WhatsApp Web scraping tools**.

## 4. Safety and limitations
- The app never sends WhatsApp replies. Copying text is not approval by WhatsApp; you still choose when and to whom to send.
- The system prompt asks AI not to give individual diagnosis, medication advice, test interpretations or fabricated appointment availability. This is a guardrail, not a guarantee; the clinician must read all drafts.
- The medical regex is an extra warning only; it is not a clinical classifier. Some medical messages will not be flagged, so all responses always require review.
- Do not enter identifiable patient data unless privacy/legal and appropriate data-processing arrangements have been established with all processors.
- Password authentication is basic single-user access. There's no persistent conversation history, phone contact sync, WhatsApp inbox, notifications, or HIPAA/GDPR/EG healthcare certification.
- The app uses OpenAI API billing, separate from ChatGPT subscription.
- It uses the Chat Completions endpoint. Check model eligibility at deployment time.
- No patient text is stored deliberately in the app's backend. Requests go from browser to Vercel and from Vercel to OpenAI for processing; providers may have applicable logs and retention practices.
- Add Vercel firewall or abuse mitigation for public traffic; simple login does not implement per-IP rate limiting.

## 5. Troubleshooting
- Login says `Set APP_PASSWORD...`: create the env vars, then redeploy.
- AI says `OPENAI_API_KEY is not configured`: set API key in Vercel and redeploy.
- AI says `AI service error`: verify key, API project billing, model availability, and account limits.
- `Invalid origin`: use the deployed HTTPS URL directly rather than a mismatched iframe/proxy domain.
- Clipboard permission error: use iPhone long-press → Paste.
- n8n events missing: ensure Header Auth matches, Production URL is correct, workflow active and Vercel env vars redeployed. The drafting app continues working without n8n.
- Do not embed an n8n URL in an iframe inside a GitHub/Vercel page. This app communicates through API endpoints instead.
