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
console.log(`Unitel: ${selected.length} itens arquivados em ${today}.`);
