const SOURCE = 'https://www.uol.com.br/';
const UOL_HOSTS = new Set(['uol.com.br', 'www.uol.com.br', 'noticias.uol.com.br']);

const decode = (value) => value
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;/gi, "'")
  .replace(/&#x27;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const meta = (html, property) => {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i');
  return decode(html.match(pattern)?.[1] || '');
};

export async function onRequestGet() {
  try {
    const response = await fetch(SOURCE, {
      headers: { 'User-Agent': 'gossip-public-index/1.0' },
      cf: { cacheTtl: 900, cacheEverything: true }
    });
    if (!response.ok) throw new Error(`UOL respondeu ${response.status}`);
    const html = await response.text();
    const items = [];
    const seen = new Set();
    const links = html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);

    for (const [, href, rawTitle] of links) {
      let url;
      try { url = new URL(href, SOURCE); } catch { continue; }
      const title = decode(rawTitle);
      if (!UOL_HOSTS.has(url.hostname) || !url.pathname.startsWith('/')) continue;
      if (title.length < 35 || title.length > 220 || seen.has(url.href)) continue;
      if (/^(assine|login|buscar|menu|uol|saiba mais|leia mais)$/i.test(title)) continue;
      seen.add(url.href);
      items.push({ title, url: url.href, comments: 'indisponiveis-publicamente' });
      if (items.length === 12) break;
    }

    const visitedItems = await Promise.all(items.map(async (item) => {
      try {
        const articleResponse = await fetch(item.url, {
          headers: { 'User-Agent': 'gossip-public-index/1.0' },
          cf: { cacheTtl: 900, cacheEverything: true }
        });
        if (!articleResponse.ok) return { ...item, visited: false };
        const articleHtml = await articleResponse.text();
        return {
          ...item,
          summary: meta(articleHtml, 'description') || meta(articleHtml, 'og:description'),
          visited: true
        };
      } catch {
        return { ...item, visited: false };
      }
    }));

    return Response.json({ source: SOURCE, items: visitedItems }, {
      headers: { 'Cache-Control': 'public, max-age=900' }
    });
  } catch (error) {
    return Response.json({ error: 'Não foi possível carregar as manchetes do UOL.' }, { status: 502 });
  }
}
