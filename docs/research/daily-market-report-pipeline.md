# Daily Taiwan Stock Market Expert Report — Pipeline Research

> Source-of-truth research doc for designing a scheduled daily TWSE market report
> system that fans out to Email / Discord / Notion / Podcast / Video.
> Compiled 2026-05-09. Constraints: claude.ai routines (cloud) + MCP connectors
> available = Notion / Tavily / Exa / Firecrawl / Cloudflare / Figma.

---

## 0. Hard Constraint: claude.ai Routines Network Sandbox

This shapes every recommendation below. Findings from Anthropic docs + GitHub
issue #44214 (April 2026):

- Routines run on **Anthropic-managed cloud** with a **"Trusted network"**
  allowlist. Outbound HTTP to arbitrary domains returns
  `403 host_not_allowed`.
- **MCP connector traffic is proxied through Anthropic servers** — connectors
  you add to a routine work without allowlisting their hosts. This is the
  primary escape hatch.
- Known regression: MCP tools occasionally fail to load on subsequent runs
  after creation (workaround: spawn an Agent subagent that calls the MCP tool
  by name).
- Therefore: **anything that needs a non-allowlisted hostname must either
  (a) be an MCP connector, or (b) be reached via a thin Cloudflare Worker
  that *is* on the allowlist** (Cloudflare is in the default trusted set;
  worker subdomains under `*.workers.dev` are reachable).
- Net implication: Resend / ElevenLabs / HeyGen / Discord webhooks **cannot
  be hit directly with curl from a routine**. Use a Cloudflare Worker as a
  middleman, or wrap them as a custom MCP connector.

---

## 1. Discord Automation Push

### Key findings
1. **Webhooks are the simplest send-only path.** Per-channel URL, 30 req/min
   rate limit, 2,000-char content + up to 10 rich embeds. No bot account
   required.
2. **Discord Markdown is supported in `content` and embed `description`** —
   **but hyperlinks (`[text](url)`) only render when the message comes from
   a webhook or bot, NOT from a regular user-impersonating call.** Webhook
   wins here.
3. **No first-party "Discord MCP connector" in claude.ai's directory** today.
   Composio / Pipedream offer third-party Discord MCP servers, but they are
   bot-token-based and meant for richer bidirectional flow.
4. **Claude Code "Channels"** (research preview, v2.1.80+) allows
   bidirectional Discord pairing in *interactive* CLI sessions — **not
   useful for autonomous routines** (requires login pairing flow).
5. Embed payload supports color, fields (max 25), thumbnail, image, footer,
   timestamp — perfect for a "market snapshot" card with TAIEX / 三大法人 /
   top movers.

### Recommendation
**Discord Webhook via a Cloudflare Worker proxy.** Routine calls
`https://relay.<you>.workers.dev/discord` (allowlisted), worker forwards
JSON payload to `https://discord.com/api/webhooks/...` (not allowlisted).
The webhook URL stays as a Worker secret, not in the routine prompt.

For a richer experience, a **single embed + a follow-up plain-text
"detailed analysis" message** (Markdown) works better than one giant 4000-char
embed because mobile clipping starts around 2000 chars in `description`.

---

## 2. Email Automation

### Key findings
1. **Resend = best DX for developers**, $20/mo for 50k emails, $0.40/1k
   overage, React Email + clean REST API, idempotency keys. Free tier
   3,000/mo (plenty for a daily personal newsletter).
2. **SendGrid** is enterprise-grade but the free tier is a 60-day trial only;
   docs friction is real, and per-email cost similar to Resend at small
   volume.
3. **AWS SES** is cheapest at scale ($0.10/1k) but "difficult approval"
   (sandbox → production review) and zero DX polish — overkill here.
4. **Gmail API as MCP** (Composio's `gmail` connector) is available in
   claude.ai, has `Send Email` tool, but: (a) Gmail's daily send caps
   (500/day for free Gmail, 2000/day for Workspace) and reputation rules
   make it bad for "newsletter-shaped" content; (b) deliverability to
   third-party recipients is shakier than dedicated providers.
5. **Resend has an official Claude Code MCP** (`resend-mcp` via npx) —
   `claude mcp add resend -e RESEND_API_KEY=re_xxx -- npx -y resend-mcp`.
   This is local-only though; for cloud routines you'd need to deploy the
   Resend MCP as a remote MCP server (or use a Worker proxy, which is
   simpler).

### Recommendation
- **Single recipient (yourself / inner circle, < 10 people):** Gmail MCP
  connector is fine. Already authed, zero new accounts, sender = you.
- **Newsletter shape (≥ 10 recipients, branded "from" address):** **Resend
  via Cloudflare Worker proxy.** $0 if you stay under 3k/mo. Add
  `react-email` later for prettier templates. SPF/DKIM/DMARC must be set on
  your domain.

---

## 3. Podcast TTS Generation

Single 5–10 min episode = ~750–1500 Mandarin characters per minute spoken
≈ **5,000–15,000 characters of script per episode**. (Mandarin is denser
than English; ~3.5–5 chars/sec at conversational pace.)

### Key findings
1. **ElevenLabs Flash v2.5** = 32 languages incl. Traditional Chinese /
   Mandarin, sub-75ms latency, **$0.05 per 1,000 characters** on
   pay-as-you-go via WaveSpeedAI ($0.10/1k on direct subscription overages
   at Creator tier, dropping to ~$0.06–0.15/min equivalents at higher
   tiers). Voice cloning available. Best overall expressiveness for
   long-form narration.
2. **OpenAI TTS** (`tts-1` / `tts-1-hd`) = $15/1M chars (~$0.015/1k), 6
   preset voices, supports Chinese acceptably but **no voice cloning, no
   SSML, robotic on long passages**. Cheapest option, weakest expression.
3. **Google Cloud TTS** = $16/1M chars for Neural2, ~300 voices, strong
   `cmn-TW` (Mandarin Taiwan) Neural2 + Chirp3 voices, full SSML support
   (pause, emphasis, prosody). Solid middle ground — verifiable Taiwan
   accent.
4. **Azure Speech (Dragon HD voices, GA Oct 2025)** = 600+ neural voices,
   `zh-TW` Neural with Hsiao-Chen / Hsiao-Yu / Yun-Jhe built-ins, automatic
   emotion detection, ~$16/1M chars Neural / ~$30/1M HD. Best for
   "broadcaster-style" Taiwan Mandarin.
5. **MiniMax Speech-02-HD** = strong Mandarin/Cantonese, long-text mode up
   to 200k chars per request, $50/1M chars, 99% voice cloning similarity
   from 10s sample. Worth considering for "host + guest dialogue" formats.

### Per-episode cost (10 min, ~12,000 chars)
| Engine | Cost / episode | Cost / month (22 trading days) |
| --- | --- | --- |
| OpenAI TTS-1 | $0.18 | $4 |
| Google TTS Neural2 | $0.19 | $4.20 |
| Azure Neural | $0.19 | $4.20 |
| ElevenLabs Flash v2.5 | $0.60 | $13.20 |
| ElevenLabs Multilingual v2 | $1.20 | $26.40 |
| MiniMax Speech-02-HD | $0.60 | $13.20 |

### Recommendation
- **MVP:** Google Cloud TTS Neural2 `cmn-TW-Wavenet-A` or Azure
  `zh-TW-HsiaoChenNeural`. ~$4/mo, broadcaster-quality, decent prosody.
- **Standard:** ElevenLabs **Flash v2.5** with a cloned host voice. ~$13/mo.
  Flash > Multilingual v2 here because you don't need 192kbps studio
  fidelity for daily talk content, and Flash is half the credit cost.
- **Pro:** ElevenLabs Multilingual v2 + voice cloning of your own voice.
  ~$26/mo; pair with `pyttsx3`/`ffmpeg` for intro/outro stings.

None of these are claude.ai-allowlisted hostnames, so go via a **Cloudflare
Worker** that streams the synthesized MP3 to R2 / S3 and returns a
public URL.

---

## 4. AI Video Generation (Talking-Head + Charts)

### Key findings
1. **HeyGen API** = pay-as-you-go, **$1/min for Avatar III 1080p,
   $3–4/min for Avatar IV / Photo Avatar / Studio Avatar / Digital Twin
   1080p**. Charged in 30s increments. 30-min cap per render unless
   enterprise. Also: $2/min "Video Agent" mode (prompt-to-video),
   $2/min lip-sync video translation. **Best API DX of the three** and
   built-in presenter avatars suit a "market anchor" framing.
2. **Synthesia** = 230+ avatars, 140+ languages, **best enterprise
   compliance** (SOC 2, GDPR), but custom avatars require Enterprise plan
   + studio recording, 360 min/year on Creator ($64/mo annual). API is
   gated behind sales. Slowest path to ship.
3. **D-ID** = best photo-to-talking-head, REST API published, ~$0.10–$0.30
   per minute equivalent on Pro tier ($29/mo for 60 credits ≈ ~15 min).
   Lower realism than HeyGen for full-body avatars. Strong for "single
   founder photo → daily commentary" framing.
4. **Tavus** = developer-first API for embedded talking heads, conversational
   real-time avatars. Strong for interactive use, overkill for one-way
   daily reports.
5. **Runway Gen-3 / Veo / Sora** are *cinematic generative video*, not
   "talking head" — wrong tool for this use case. They're great for B-roll
   inserts but not the anchor segment.

### Per-episode cost (3-min talking-head video)
| Tool | Cost / 3-min video | Cost / month (22 days) |
| --- | --- | --- |
| HeyGen Avatar III API (1080p) | $3.00 | $66 |
| HeyGen Avatar IV API (1080p) | $9–12 | $198–264 |
| HeyGen Video Agent API | $6.00 | $132 |
| D-ID Pro plan | ~$1.50 (4 credits) | $33 + $29 base |
| Synthesia Creator | ~$1.80 amortized | $64 base |

### Recommendation
- **MVP / no video:** Skip video for the first 2–4 weeks. Validate that
  audio + text formats are getting consumed before you spend $60+/mo.
- **Standard:** **HeyGen Avatar III API** at $1/min. Pre-record 1 personal
  Photo Avatar from a 2-min selfie video (one-time setup), then daily
  3-min anchor segments = ~$66/mo. Good enough realism for a personal
  brand.
- **Pro:** HeyGen Avatar IV (Digital Twin) for highest realism (~$200/mo)
  plus B-roll chart cuts generated from your data via a script that
  renders TradingView screenshots and stitches with `ffmpeg`. Or stay on
  Avatar III and put the savings into B-roll.

HeyGen's API isn't on the claude.ai allowlist either → Worker proxy.

---

## 5. One-to-Many Distribution Architecture

### Key findings
1. **Source of truth pattern**: store one canonical JSON (the "market
   report object") in Notion or R2, then have N renderers (Email / Discord
   / Podcast / Video / Notion page) consume it. Avoid generating each
   format from scratch — they'd drift.
2. **n8n** wins on self-host + open source + 400+ nodes; **€20/mo cloud
   starter or free self-host**. Strongest if you'll add 5+ workflows.
3. **Make.com** is more polished UI, tiered pricing from $9/mo; weaker
   raw flexibility.
4. **Zapier** is highest cost per task; only justifiable for non-technical
   teams.
5. **Cloudflare Workers + Workflows** = serverless durable execution, free
   tier 100k requests/day, **paid $5/mo for 30s CPU time per request**,
   Cron Triggers built-in. Pairs perfectly with the claude.ai routine
   network constraint because Cloudflare hostnames are pre-allowlisted.
6. **Cloudflare Queues** (no per-request CPU cap, "minutes not seconds"
   wall-time) is the right home for the heavy steps — TTS rendering,
   HeyGen polling, R2 uploads.

### Reference architecture (recommended)

```
┌────────────────────┐
│ claude.ai Routine  │  scheduled 16:00 TWT (post-market close)
│ (Anthropic cloud)  │
└─────────┬──────────┘
          │  ① Tavily/Exa MCP → fetch news + market data
          │  ② Notion MCP → write canonical "report" page
          │  ③ HTTP POST to Cloudflare Worker /publish
          ▼
┌────────────────────────────────────────────┐
│  Cloudflare Worker /publish                │
│  ─ reads canonical report JSON             │
│  ─ enqueues 4 jobs to Cloudflare Queues:   │
└────┬──────────┬───────────┬────────────────┘
     │          │           │
     ▼          ▼           ▼
   email     discord     tts→r2→podcast.xml
   (Resend)  (webhook)   (ElevenLabs)
                              │
                              ▼
                          video (HeyGen
                          Avatar III API)
                              │
                              ▼
                          R2 + RSS feed
```

### Recommendation
**Cloudflare Workers as the fan-out hub.** One Worker route per channel,
plus a Queue consumer for the slow async ones (TTS / video). Total
infra cost: **$5/mo (Workers Paid)** + R2 storage (negligible at this
volume) + the per-channel API costs above.

Avoid n8n/Make/Zapier unless you hate writing 50 lines of TS — for a
solo developer, Workers is faster to ship and cheaper.

---

## 6. Taiwan Stock AI Report Prompt — Best Practices

### Key findings
1. **Bloomberg "Morning Briefing" model** uses 3-bullet AI summaries +
   a fixed "Market Snapshot" table (S&P / Brent / WTI / treasury yields)
   + 5–7 themed sections. Three-bullet TL;DR at the top is the
   highest-leverage formatting choice — every channel can render it.
2. **Stockcast.tw** (Taiwan, live example) uses a 5-block structure per
   stock: 投資論點 / 市場規模 / 個股深度 / 供應鏈邏輯 / 關鍵風險 +
   催化劑. Highly imitable for our daily report.
3. **Seeking Alpha AI summaries** lead with "Bull case / Bear case /
   Verdict" — three-column structure, easy to render in Discord embed
   fields.
4. **The "AI 炒股 Prompt"** ZhuLinsen pattern (火山引擎) decomposes
   into 5 phases: 商業模式 → 行業景氣 → 財務質量 → 股權治理 → 估值
   風險. Solid for individual stock deep-dives but **too long for a
   daily report**; use for the "weekly stock spotlight" subsection only.
5. **TWSE official feeds** (`twse.com.tw/zh/trading/foreign/t86.html`)
   provide free 三大法人 / 外資 / 投信 / 自營商 daily data — should be
   the deterministic numerical core, with LLM only narrating around it.

### Recommended report structure (daily, ~600 Chinese chars + tables)

```markdown
# 今日台股觀察 YYYY-MM-DD

## 一句話結論
<🟢/🟡/🔴> + 25 字內主旨

## 📊 大盤快照
| 指標 | 收盤 | 漲跌 | 成交量 |
| 加權指數 | … | … | … |
| 櫃買指數 | … | … | … |
| 台積電 ADR | … | … | – |

## 🏛️ 三大法人
- 外資 買/賣 超 X 億：<一句點評>
- 投信 …
- 自營商 …

## 🔥 今日題材輪動 (top 3)
1. **<題材>** — 領漲股 X/Y/Z — 推升原因（≤30 字）
2. …
3. …

## 📈 強勢個股 / 異常量
- <code> <name>：<關鍵變化> + <風險提示>

## 🌍 影響明日的隔夜變數
- 美股收盤 / 半導體 ETF / 美元指數 / 油價
- 重要新聞 1–3 條

## 🎯 明日盤前觀察
- 三件事 (≤15 字 each)

## ⚠️ 免責聲明
本報告由 AI 生成，非投資建議，請自行判斷風險。
```

This structure is **channel-agnostic** — Discord embed renders it as
fields, Email renders it as HTML, Podcast script wraps each `##`
section in a 30s spoken segment, Video uses one slide per `##` section.

---

## 7. Three Architecture Options

### Option A — MVP ($5–10/mo, ~1 weekend)
- claude.ai routine → Notion MCP (write report page) + Gmail MCP (send
  to yourself only) + Cloudflare Worker (Discord webhook fan-out).
- **No podcast, no video.** Just text in three places.
- Stack: Notion / Gmail / Discord webhook / Cloudflare Worker (free tier
  enough).
- Monthly cost: ~$0 if you stay under Worker free tier.
- Time to build: 4–8 hours.

### Option B — Standard ($25–35/mo, 1 week)
- A + **Podcast**: Cloudflare Worker calls Google TTS Neural2
  `cmn-TW-Wavenet-A` → uploads MP3 to R2 → updates an RSS feed served
  from Worker → subscribable in Apple Podcasts / Spotify.
- A + **Resend** for branded email (replace Gmail).
- Stack: + Resend ($0 free tier) + Google TTS (~$5/mo) + R2 storage
  (~$0.50/mo) + Worker Paid ($5/mo).
- Monthly cost: **~$10–15/mo**.
- Time to build: 2–3 days.

### Option C — Pro ($80–120/mo, 2 weeks)
- B + **HeyGen Avatar III API** for daily 3-min anchor video → R2 →
  YouTube unlisted upload via API (or just R2-hosted MP4).
- Upgrade TTS to **ElevenLabs Flash v2.5** with cloned voice for podcast
  intro/outro consistency with the video.
- Add **Tavily MCP** advanced searches + **Firecrawl** for paywalled
  source extraction.
- Monthly cost: ~$5 (Worker) + $13 (ElevenLabs Creator) + $66 (HeyGen
  API @ 3min/day) + ~$1 R2 = **~$85–95/mo**, plus optional $20 Resend Pro
  if you cross 3k emails.
- Time to build: 1.5–2 weeks.

---

## 8. claude.ai Routine Capability Matrix

| Channel/Service | Direct from routine? | How |
| --- | --- | --- |
| Notion | ✅ Native MCP | claude.ai built-in Notion connector |
| Tavily / Exa / Firecrawl | ✅ Native MCP | already connected |
| Cloudflare Workers (`*.workers.dev`) | ✅ HTTP curl | hostname allowlisted |
| Gmail (send mail to self/few) | ✅ MCP (Composio) | Gmail MCP connector |
| Discord webhook | ❌ direct | needs Worker proxy |
| Resend / SendGrid | ❌ direct | needs Worker proxy or remote MCP |
| ElevenLabs / Google TTS / Azure TTS | ❌ direct | needs Worker proxy |
| HeyGen / D-ID / Synthesia | ❌ direct | needs Worker proxy |
| TWSE / cnyes / Yahoo Finance HTML | ⚠️ via Tavily / Firecrawl MCP | direct curl returns 403 for non-allowlisted |
| RSS feed publishing | ✅ via Worker + R2 | Worker hosts the XML |

**Key takeaway:** A single Cloudflare Worker (`relay.<you>.workers.dev`)
exposing routes like `/email`, `/discord`, `/tts`, `/video`, `/publish-rss`
unlocks every blocked integration with one trusted hostname. ~150 LoC of
TypeScript total.

---

## 9. Data Source Notes

- **TWSE** has free open-data CSV/JSON endpoints (no auth) for
  三大法人, 個股漲跌, 融資融券. Domain `www.twse.com.tw` likely needs
  Firecrawl/Tavily fetch from a routine.
- **TPEx (櫃買中心)** likewise.
- **FinMind** (free tier 600 calls/hour, paid from NT$199/mo) is a
  cleaner JSON API but again — non-allowlisted, so route via Worker.
- **cnyes.com / 鉅亨 / 經濟日報 / MoneyDJ** for narrative news — Tavily
  MCP `tavily_search` with `country: "Taiwan"` + `time_range: "day"` +
  `include_domains: ["cnyes.com", "ec.ltn.com.tw", "moneydj.com"]`
  works well within the routine.

---

## 10. Open Questions for User

1. Single recipient (you) or list (≥10 people)? Drives Gmail-MCP vs Resend.
2. Podcast: hosted on your own RSS or pushed to Spotify for Podcasters /
   Apple Podcasts Connect? Latter needs manual one-time submission.
3. Video: YouTube channel exists? If yes, get YouTube Data API key for
   automated uploads. If no, skip Option C until ready.
4. Voice cloning: willing to record 1–2 min of your own voice for cloning
   in ElevenLabs / MiniMax? Hugely improves perceived quality.
5. Brand domain for "from address" + RSS host? (`reports.<yourdomain>.com`)
   Affects DNS setup time.
6. Comfortable with TypeScript / `wrangler` CLI? If not, n8n self-host on
   a $5 VPS is a fallback (but loses the claude.ai allowlist advantage).
