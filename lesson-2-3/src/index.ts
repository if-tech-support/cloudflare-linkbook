import { Hono } from 'hono'

type Link = { id: string; title: string; url: string; created_at: string; note: string; thumbnail_key: string | null }

const LINKS_CACHE_KEY = 'links:list:v1' // 追加
const LINKS_CACHE_TTL = 300 // 追加

// 追加: R2を使わない公開にも対応する
type Bindings = Omit<CloudflareBindings, 'THUMBS'> & { THUMBS?: R2Bucket }
const app = new Hono<{ Bindings: Bindings }>()

// 追加: 保存済みの変更を成功として返し、KVの失敗はログに残す
async function invalidateLinksCache(settings: KVNamespace) {
  try {
    await settings.delete(LINKS_CACHE_KEY)
  } catch {
    console.error('一覧キャッシュを削除できませんでした')
  }
}

app.get('/api/links', async (c) => {
  c.header('Cache-Control', 'no-store')
  try {
    const cached = await c.env.SETTINGS.get<Link[]>(LINKS_CACHE_KEY, 'json')
    if (cached !== null) {
      c.header('X-Cache', 'HIT')
      return c.json(cached)
    }
  } catch {
    console.error('一覧キャッシュを読めませんでした')
  }
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note, thumbnail_key FROM links ORDER BY created_at DESC, id DESC',
  ).all<Link>()
  try {
    await c.env.SETTINGS.put(LINKS_CACHE_KEY, JSON.stringify(results), {
      expirationTtl: LINKS_CACHE_TTL,
    })
  } catch {
    console.error('一覧キャッシュを保存できませんでした')
  }
  c.header('X-Cache', 'MISS')
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
    created_at: new Date().toISOString(), note, thumbnail_key: null,
  }
  await c.env.DB.prepare('INSERT INTO links (id, title, url, created_at, note) VALUES (?, ?, ?, ?, ?)')
    .bind(link.id, link.title, link.url, link.created_at, link.note).run()
  await invalidateLinksCache(c.env.SETTINGS) // 追加
  return c.json(link, 201)
})

app.get('/api/settings', async (c) => {
  const siteTitle = await c.env.SETTINGS.get('site_title')
  return c.json({
    appName: siteTitle ?? c.env.APP_NAME,
    maxLinks: Number(c.env.MAX_LINKS),
    thumbnailsEnabled: Boolean(c.env.THUMBS),
  })
})

app.delete('/api/links/:id', async (c) => {
  if (!c.env.ADMIN_TOKEN || c.req.header('Authorization') !== `Bearer ${c.env.ADMIN_TOKEN}`) {
    return c.json({ error: '削除する権限がありません' }, 401)
  }
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note, thumbnail_key FROM links WHERE id = ?',
  ).bind(c.req.param('id')).all<Link>()
  const link = results[0]
  if (!link) return c.json({ error: 'リンクが見つかりません' }, 404)
  await c.env.DB.prepare('DELETE FROM links WHERE id = ?').bind(link.id).run()
  await invalidateLinksCache(c.env.SETTINGS) // 追加
  return c.json(link)
})

app.get('/api/links/:id', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, title, url, created_at, note, thumbnail_key FROM links WHERE id = ?',
  ).bind(c.req.param('id')).all<Link>()
  const link = results[0]
  if (!link) return c.json({ error: 'リンクが見つかりません' }, 404)
  return c.json(link)
})

// 追加: サムネイルを保存する
app.post('/api/links/:id/thumbnail', async (c) => {
  const bucket = c.env.THUMBS
  if (!bucket) return c.json({ error: '画像保存は無効です' }, 503)
  const { results } = await c.env.DB.prepare('SELECT id FROM links WHERE id = ?')
    .bind(c.req.param('id')).all<{ id: string }>()
  if (!results[0]) return c.json({ error: 'リンクが見つかりません' }, 404)
  let data: FormData
  try { data = await c.req.formData() }
  catch { return c.json({ error: 'フォームで送ってください' }, 400) }
  const file = data.get('file')
  if (!(file instanceof File) || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    return c.json({ error: 'PNG・JPEG・WebPを選んでください' }, 400)
  }
  if (file.size === 0 || file.size > 2 * 1024 * 1024) {
    return c.json({ error: '画像は1バイト以上2MiB以下にしてください' }, 400)
  }
  const key = crypto.randomUUID()
  await bucket.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } })
  await c.env.DB.prepare('UPDATE links SET thumbnail_key = ? WHERE id = ?')
    .bind(key, c.req.param('id')).run()
  await invalidateLinksCache(c.env.SETTINGS) // 追加
  return c.json({ thumbnail_key: key }, 201)
})

// 追加: R2の画像をWorkerから配信する
app.get('/thumbs/:key', async (c) => {
  if (!c.env.THUMBS) return c.notFound()
  const object = await c.env.THUMBS.get(c.req.param('key'))
  if (!object) return c.notFound()
  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('Cache-Control', 'public, max-age=300')
  return new Response(object.body, { headers })
})

export default app
