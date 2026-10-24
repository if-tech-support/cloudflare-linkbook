import { Hono } from 'hono'

type Link = { id: string; title: string; url: string }

// 学習用の一時保存
const links: Link[] = []
const app = new Hono<{ Bindings: CloudflareBindings }>()

app.get('/api/links', (c) => c.json(links))

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
  const { title, url } = body as Record<string, unknown>
  if (typeof title !== 'string' || title.trim().length < 1 || title.trim().length > 100) {
    return c.json({ error: 'タイトルは1〜100文字にしてください' }, 400)
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
  if (links.length >= Number(c.env.MAX_LINKS)) {
    return c.json({ error: '登録数の上限です' }, 400)
  }
  const link: Link = { id: crypto.randomUUID(), title: title.trim(), url: parsed.href }
  links.push(link)
  return c.json(link, 201)
})

app.get('/api/settings', (c) => c.json({ appName: c.env.APP_NAME, maxLinks: Number(c.env.MAX_LINKS) }))

app.delete('/api/links/:id', (c) => {
  if (!c.env.ADMIN_TOKEN || c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`) {
    return c.json({ error: '削除する権限がありません' }, 401)
  }
  const index = links.findIndex((link) => link.id === c.req.param('id'))
  if (index === -1) return c.json({ error: 'リンクが見つかりません' }, 404)
  const [link] = links.splice(index, 1)
  return c.json(link)
})

app.get('/api/links/:id', (c) => {
  const link = links.find((item) => item.id === c.req.param('id'))
  if (!link) return c.json({ error: 'リンクが見つかりません' }, 404)
  return c.json(link)
})

export default app
