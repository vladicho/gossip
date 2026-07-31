import { mkdir, readFile, writeFile } from 'node:fs/promises';

const categories = [
  ['Farándula', 'farandula'],
  ['Virales', 'virales'],
  ['Insólito', 'insolito'],
  ['Tendencias', 'tendencias']
];

const clean = (html) => html
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
  .replace(/\s+/g, ' ').trim();

const fetchPage = async (url) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'gossip-public-index/1.0' } });
  if (!response.ok) throw new Error(`${response.status} ao acessar ${url}`);
  return response.text();
};

const items = [];
for (const [category, slug] of categories) {
  const html = await fetchPage(`https://unitel.bo/noticias/${slug}`);
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  for (const [, href, rawText] of links) {
    const title = clean(rawText);
    if (!title || title.length < 25 || href.includes(`/noticias/${slug}`)) continue;
    const url = new URL(href, 'https://unitel.bo/').href;
    if (!url.includes('/noticias/') || items.some((item) => item.url === url)) continue;
    items.push({ category, title: title.slice(0, 180), url, summary: title.slice(0, 280) });
  }
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
const archiveDir = new URL(`../archive/${today}/`, import.meta.url);
await mkdir(archiveDir, { recursive: true });
const selected = items.slice(0, 40);
await writeFile(new URL('items.json', archiveDir), `${JSON.stringify(selected, null, 2)}\n`);

let readme = `# Gossip\n\nAtualização de ${today}. Títulos e resumos curtos de páginas públicas da Unitel; leia o conteúdo completo na fonte original.\n\n`;
for (const item of selected) readme += `- **${item.category} — [${item.title}](${item.url})**\n  ${item.summary}\n\n`;
await writeFile(new URL('../LATEST.md', import.meta.url), readme);
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const cards = selected.map((item) => `<article><span>${escapeHtml(item.category)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.summary)}</p><a href="${item.url}" target="_blank" rel="noreferrer">Ler na Unitel ↗</a></article>`).join('');
const page = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gossip · Unitel</title><style>body{background:#f7f8fc;color:#252946;font:16px/1.55 Arial,sans-serif;margin:0}main{margin:auto;max-width:1100px;padding:64px 22px}header{align-items:end;display:flex;justify-content:space-between;margin-bottom:42px}h1{font-size:clamp(2.8rem,7vw,5.5rem);letter-spacing:-.07em;line-height:.9;margin:0}h1 em{color:#6759d9;font-style:normal}header p{color:#717b98;margin:0;max-width:330px}section{display:grid;gap:16px;grid-template-columns:repeat(3,1fr)}article{background:#fff;border:1px solid #e2e5f0;border-radius:18px;padding:24px;box-shadow:0 8px 24px #33385b0c}article span{color:#6759d9;font-size:11px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase}article h2{font-size:20px;line-height:1.15;margin:30px 0 12px}article p{color:#69728f;min-height:74px}a{color:#5b4fcf;font-weight:bold;text-decoration:none}@media(max-width:760px){header{align-items:start;display:block}header p{margin-top:22px}section{grid-template-columns:1fr}}footer{color:#8891aa;font-size:12px;margin-top:30px}</style></head><body><main><header><h1>Gossip<br><em>Unitel.</em></h1><p>Descobertas públicas de Farándula, Virales, Insólito e Tendencias.<br>Atualizado em ${today}.</p></header><section>${cards}</section><footer>Resumo e links para a fonte original · Unitel.bo</footer></main></body></html>`;
await writeFile(new URL('../index.html', import.meta.url), page);
console.log(`Unitel: ${selected.length} itens arquivados em ${today}.`);
