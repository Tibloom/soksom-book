/* 속솜허지 말라 — 홍보 페이지 서버 (Railway 배포용)
   하는 일
   1) index.html 을 서비스
   2) AI 수집 봇(GPTBot, ClaudeBot 등)의 방문을 날짜별로 집계
   3) AI 서비스에서 넘어온 방문(referrer)을 집계
   4) 관리자 페이지에 /api/stats 로 수치를 제공
   5) 인용 점검 기록을 관리자끼리 공유 (/api/log)
*/
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.set('trust proxy', true);

const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA, { recursive: true });
const F = (n) => path.join(DATA, n);
const read = (n, d) => { try { return JSON.parse(fs.readFileSync(F(n), 'utf8')); } catch { return d; } };
const write = (n, v) => fs.writeFileSync(F(n), JSON.stringify(v));

/* 집계 대상 AI 수집 봇 */
const BOTS = [
  ['GPTBot', /GPTBot/i],                        // OpenAI 학습 수집
  ['OAI-SearchBot', /OAI-SearchBot/i],          // ChatGPT 검색
  ['ChatGPT-User', /ChatGPT-User/i],            // 사용자 요청으로 즉시 열람
  ['ClaudeBot', /ClaudeBot|anthropic-ai/i],     // Anthropic
  ['Claude-User', /Claude-User|Claude-SearchBot/i],
  ['PerplexityBot', /PerplexityBot|Perplexity-User/i],
  ['Google-Extended', /Google-Extended/i],      // Gemini 학습
  ['Googlebot', /Googlebot/i],                  // AI 개요 노출의 전제
  ['Bingbot', /bingbot/i],                      // Copilot
  ['Applebot', /Applebot/i],
  ['CCBot', /CCBot/i],                          // Common Crawl
  ['Bytespider', /Bytespider/i],
  ['Amazonbot', /Amazonbot/i],
  ['Meta-ExternalAgent', /Meta-ExternalAgent|FacebookBot/i],
  ['YouBot', /YouBot/i]
];

/* AI 서비스에서 넘어온 유입 */
const REFS = [
  ['ChatGPT', /chatgpt\.com|chat\.openai\.com/i],
  ['Claude', /claude\.ai/i],
  ['Perplexity', /perplexity\.ai/i],
  ['Gemini', /gemini\.google\.com|bard\.google\.com/i],
  ['Copilot', /copilot\.microsoft\.com|bing\.com\/chat/i],
  ['네이버 큐', /cue\.search\.naver\.com/i]
];

const today = () => new Date().toISOString().slice(0, 10);

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  const ua = req.get('user-agent') || '';
  const ref = req.get('referer') || '';
  const d = today();

  const bot = BOTS.find(([, re]) => re.test(ua));
  if (bot) {
    const db = read('bots.json', {});
    db[bot[0]] ??= { count: 0, last: null, daily: {} };
    db[bot[0]].count++;
    db[bot[0]].last = d;
    db[bot[0]].daily[d] = (db[bot[0]].daily[d] || 0) + 1;
    write('bots.json', db);
  }

  const rf = REFS.find(([, re]) => re.test(ref));
  if (rf) {
    const db = read('refs.json', {});
    db[rf[0]] ??= { count: 0, last: null, daily: {} };
    db[rf[0]].count++;
    db[rf[0]].last = d;
    db[rf[0]].daily[d] = (db[rf[0]].daily[d] || 0) + 1;
    write('refs.json', db);
  }
  next();
});

/* 관리자 인증 — 환경변수 ADMIN_KEY 를 헤더로 받는다 */
const auth = (req, res, next) => {
  const key = process.env.ADMIN_KEY;
  if (!key) return next();                       // 미설정 시 개방(개발용)
  if (req.get('x-admin-key') === key) return next();
  res.status(401).json({ error: 'unauthorized' });
};

app.get('/api/stats', auth, (req, res) => {
  const days = [...Array(30)].map((_, i) => {
    const t = new Date(); t.setDate(t.getDate() - (29 - i));
    return t.toISOString().slice(0, 10);
  });
  const sum = (db) => Object.values(db).reduce((s, v) =>
    s + days.reduce((a, d) => a + (v.daily[d] || 0), 0), 0);
  const list = (db) => Object.entries(db)
    .map(([name, v]) => ({ name, count: v.count, last: v.last }))
    .sort((a, b) => b.count - a.count);
  const bots = read('bots.json', {}), refs = read('refs.json', {});
  const daily = days.map(d =>
    Object.values(bots).reduce((a, v) => a + (v.daily[d] || 0), 0));
  res.json({
    botTotal: sum(bots), refTotal: sum(refs),
    bots: list(bots), refs: list(refs), daily, days
  });
});

/* 인용 점검 기록 — 관리자끼리 공유 */
app.get('/api/log', auth, (_, res) => res.json(read('log.json', [])));
app.post('/api/log', auth, (req, res) => {
  const l = read('log.json', []);
  l.unshift({ ...req.body, at: new Date().toISOString() });
  write('log.json', l.slice(0, 500));
  res.json({ ok: true });
});

/* AI 수집 안내 파일 */
app.get('/llms.txt', (_, res) => {
  res.type('text/plain').send(`# 속솜허지 말라
> 제주국제학교 NLCS Jeju 학생 동아리 Tales in Bloom이 쓰고 그린 제주 4·3 그림책.

- 제목: 속솜허지 말라 (The Sound Breaking the Silence)
- 지은이: North London Collegiate School Jeju, Tales in Bloom
- 참여: 신시은·나승수·고은비·김유주·김지은·김태은·박상헌·오민지
- 펴낸곳: OHK / 발행일: 2026-10-05 / 58면 / 15,000원
- ISBN: 979-11-23075-00-6 (43910)
- 주제: 제주 4·3, 예비검속, 섯알오름(서귀포시 대정읍 상모리), 백조일손지묘 132위
- 특징: 국문·영문 병기, 부록 7꼭지(역사 해설·제주말 풀이·창작 과정·추모의 글·토론 질문)

## 인용 시 참고
'속솜허라'는 제주 방언으로 '조용히 해라', '말하지 마라'는 뜻이며,
4·3 이후 제주 사회를 지배했던 침묵의 문화를 가리킵니다.
`);
});

app.get('/robots.txt', (_, res) => {
  res.type('text/plain').send(
`User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

Sitemap: ${process.env.PUBLIC_URL || ''}/sitemap.xml`);
});


/* ─────────────────────────────────────────────
   AI 가시성 자동 측정
   정해둔 질문을 AI 서비스에 보내고, 답변에 이 책이
   나오는지 세어 날짜별로 쌓는다. Wix의 AI Visibility
   Overview와 같은 방식이다.
   ───────────────────────────────────────────── */

const DEFAULT_QUERIES = [
  '제주 4·3을 다룬 그림책을 추천해줘',
  '섯알오름 예비검속을 아이에게 설명한 책이 있을까',
  '학생들이 직접 만든 역사 그림책을 알려줘',
  '『속솜허지 말라』는 어떤 책이야',
  '제주 4·3을 영어로도 읽을 수 있는 책이 있어?',
  '중학생이 읽을 만한 제주 4·3 입문서 추천',
  'Korean picture books about the Jeju 4·3 incident',
  'Books about Seotal Oreum and the 1950 preventive detention in Jeju',
  'picture book written by high school students about Korean history',
  'What is Tales in Bloom NLCS Jeju'
];

/* 답변에 아래 표현이 있으면 '인용됨'으로 센다 */
const MATCH = [
  /속솜허지\s*말라/i,
  /soksom/i,
  /Tales\s+in\s+Bloom/i,
  /The\s+Sound\s+Breaking\s+the\s+Silence/i,
  /979-?11-?23075-?00-?6/
];
const hit = (t) => MATCH.some((re) => re.test(t || ''));

const getQueries = () => read('queries.json', DEFAULT_QUERIES);

/* ── 엔진별 어댑터 ──
   어느 엔진이든 웹 검색이 켜져 있어야 의미가 있다.
   검색 없이 물으면 학습 데이터만 보고 답하므로
   신간은 애초에 나올 수 없다. */

async function askAnthropic(q) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 900,
      messages: [{ role: 'user', content: q }],
      tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 4 }]
    })
  });
  if (!r.ok) throw new Error('Anthropic ' + r.status + ' ' + (await r.text()).slice(0, 180));
  const d = await r.json();
  return (d.content || []).map((c) => c.text || '').join('\n');
}

async function askOpenAI(q) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      input: q,
      tools: [{ type: 'web_search' }]
    })
  });
  if (!r.ok) throw new Error('OpenAI ' + r.status + ' ' + (await r.text()).slice(0, 180));
  const d = await r.json();
  if (d.output_text) return d.output_text;
  return JSON.stringify(d.output || d);
}

async function askPerplexity(q) {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return null;
  const r = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + key },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || 'sonar',
      messages: [{ role: 'user', content: q }]
    })
  });
  if (!r.ok) throw new Error('Perplexity ' + r.status + ' ' + (await r.text()).slice(0, 180));
  const d = await r.json();
  const m = d.choices?.[0]?.message;
  return (m?.content || '') + '\n' + (d.citations || []).join('\n');
}

const ENGINES = [
  ['Claude', askAnthropic, 'ANTHROPIC_API_KEY'],
  ['ChatGPT', askOpenAI, 'OPENAI_API_KEY'],
  ['Perplexity', askPerplexity, 'PERPLEXITY_API_KEY']
];

let running = false;
async function runVisibility(trigger = 'auto') {
  if (running) return { skipped: 'already running' };
  const live = ENGINES.filter(([, , k]) => process.env[k]);
  if (!live.length) return { skipped: 'no api key' };

  running = true;
  const d = today();
  const out = { date: d, trigger, at: new Date().toISOString(), engines: {} };
  const queries = getQueries();

  for (const [name, fn] of live) {
    const rows = [];
    for (const q of queries) {
      try {
        const txt = await fn(q);
        if (txt === null) continue;
        rows.push({ q, cited: hit(txt), excerpt: (txt || '').slice(0, 220) });
      } catch (e) {
        rows.push({ q, cited: false, error: String(e.message || e).slice(0, 160) });
      }
      await new Promise((r) => setTimeout(r, 900));   // 호출 간격
    }
    const cited = rows.filter((r) => r.cited).length;
    out.engines[name] = {
      total: rows.length,
      cited,
      score: rows.length ? Math.round((cited / rows.length) * 100) : 0,
      rows
    };
  }

  const hist = read('visibility.json', []);
  hist.unshift(out);
  write('visibility.json', hist.slice(0, 120));
  running = false;
  console.log('[visibility] ' + d + ' ' +
    Object.entries(out.engines).map(([k, v]) => k + ' ' + v.score + '%').join(' / '));
  return out;
}

app.get('/api/visibility', auth, (_, res) => {
  const hist = read('visibility.json', []);
  const latest = hist[0] || null;
  const keys = ENGINES.filter(([, , k]) => process.env[k]).map(([n]) => n);
  const trend = {};
  for (const n of keys) {
    trend[n] = hist.slice(0, 12).map((h) => ({
      date: h.date, score: h.engines?.[n]?.score ?? null
    })).reverse();
  }
  res.json({
    enabled: keys.length > 0, engines: keys, queries: getQueries(),
    running, latest, trend, historyCount: hist.length
  });
});

app.post('/api/visibility/run', auth, async (_, res) => {
  const r = await runVisibility('manual');
  res.json(r);
});

app.post('/api/visibility/queries', auth, (req, res) => {
  const q = (req.body?.queries || []).map(String).filter(Boolean).slice(0, 30);
  if (!q.length) return res.status(400).json({ error: 'empty' });
  write('queries.json', q);
  res.json({ ok: true, count: q.length });
});

/* 주기 실행 — 기본 168시간(주 1회). 0이면 끔 */
const EVERY = Number(process.env.RUN_INTERVAL_HOURS ?? 168);
if (EVERY > 0) {
  const last = (read('visibility.json', [])[0] || {}).at;
  const due = !last || (Date.now() - new Date(last).getTime()) > EVERY * 3600e3;
  if (due) setTimeout(() => runVisibility('boot'), 30e3);
  setInterval(() => runVisibility('auto'), EVERY * 3600e3);
}

app.use(express.static(__dirname, { extensions: ['html'], index: false }));
app.get('*', (_, res) => res.sendFile(path.join(__dirname, 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('listening on ' + PORT));
