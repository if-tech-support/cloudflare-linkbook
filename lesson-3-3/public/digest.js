const message = document.querySelector('#message')
const period = document.querySelector('#period')
const list = document.querySelector('#digest-links')

async function loadDigest() {
  try {
    const response = await fetch('/api/digests/latest', { cache: 'no-store' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const { digest } = await response.json()
    if (!digest) {
      message.textContent = 'まとめはまだありません。最初の定期実行後に表示されます。'
      return
    }
    const format = (value) => new Intl.DateTimeFormat('ja-JP', {
      timeZone: 'Asia/Tokyo', dateStyle: 'medium', timeStyle: 'short',
    }).format(new Date(value))
    period.textContent = `${format(digest.periodStart)} 以上、${format(digest.periodEnd)} 未満`
    message.textContent = digest.links.length === 0
      ? 'この期間の新着リンクはありません。'
      : `${digest.links.length}件の新着リンクがあります。`
    for (const link of digest.links) {
      const url = new URL(link.url)
      if (!['http:', 'https:'].includes(url.protocol)) continue
      const item = document.createElement('li')
      const anchor = document.createElement('a')
      anchor.href = url.href
      anchor.textContent = link.title
      item.append(anchor)
      list.append(item)
    }
  } catch (error) {
    message.textContent = 'まとめを読み込めませんでした。時間を置いて再読み込みしてください。'
    console.error(error)
  }
}

loadDigest()
