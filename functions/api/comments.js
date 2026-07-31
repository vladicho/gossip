export async function onRequestGet({ request, env }) {
  const post = new URL(request.url).searchParams.get('post');
  if (!post || !env.DB) return Response.json({ error: 'Configuração incompleta' }, { status: 400 });
  const { results } = await env.DB.prepare('SELECT name, comment, created_at FROM comments WHERE post_url = ? ORDER BY created_at DESC LIMIT 100').bind(post).all();
  return Response.json(results);
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return Response.json({ error: 'Banco não configurado' }, { status: 503 });
  const body = await request.json();
  const name = String(body.name || '').trim().slice(0, 60);
  const comment = String(body.comment || '').trim().slice(0, 500);
  const post = String(body.post || '').trim().slice(0, 500);
  if (!name || !comment || !post) return Response.json({ error: 'Preencha todos os campos' }, { status: 400 });
  await env.DB.prepare('INSERT INTO comments (post_url, name, comment) VALUES (?, ?, ?)').bind(post, name, comment).run();
  return Response.json({ ok: true }, { status: 201 });
}
