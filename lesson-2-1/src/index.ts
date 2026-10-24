import { Hono } from 'hono'

type Link = { id: string; title: string; url: string; created_at: string; note: string }

const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/api/links', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note FROM links ORDER BY created_at DESC, id DESC',
  ).all<Link>()
  return c.json(results)
})

app.post('/api/links', async (c) => {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: 'JSONを送ってください' }, 400)
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return c.json({ error: 'オブジェクトを送ってください' }, 400)
  }
  const { title, url, note = '' } = body as Record<string, unknown>
  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 100) {
    return c.json({ error: 'タイトルは1〜100文字にしてください' }, 400)
  }
  if (typeof note !== 'string' || note.length > 500) {
    return c.json({ error: 'メモは500文字以内の文字列にしてください' }, 400)
  }
  if (typeof url !== 'string') {
    return c.json({ error: 'URLを文字列で送ってください' }, 400)
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return c.json({ error: 'URLの形式を確認してください' }, 400)
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return c.json({ error: 'httpかhttpsのURLを使ってください' }, 400)
  }
  const { results } = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM links')
    .all<{ count: number }>()
  if (results[0].count >= Number(c.env.MAX_LINKS)) {
    return c.json({ error: '登録数の上限です' }, 400)
  }
  const link: Link = {
    id: crypto.randomUUID(), title: title.trim(), url: parsed.href,
    created_at: new Date().toISOString(), note,
  }
  await c.env.DB.prepare('INSERT INTO links (id, title, url, created_at, note) VALUES (?, ?, ?, ?, ?)')
    .bind(link.id, link.title, link.url, link.created_at, link.note).run()
  return c.json(link, 201)
})

app.get('/api/settings', (c) => c.json({ appName: c.env.APP_NAME, maxLinks: Number(c.env.MAX_LINKS) }))

app.delete('/api/links/:id', async (c) => {
  if (!c.env.ADMIN_TOKEN || c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`) {
    return c.json({ error: '削除する権限がありません' }, 401)
  }
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note FROM links WHERE id = ?',
  ).bind(c.req.param('id')).all<Link>()
  const link = results[0]
  if (!link) return c.json({ error: 'リンクが見つかりません' }, 404)
  await c.env.DB.prepare('DELETE FROM links WHERE id = ?').bind(link.id).run()
  return c.json(link)
})

app.get('/api/links/:id', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note FROM links WHERE id = ?',
  ).bind(c.req.param('id')).all<Link>()
  const link = results[0]
  if (!link) return c.json({ error: 'リンクが見つかりません' }, 404)
  return c.json(link)
})

export default app
