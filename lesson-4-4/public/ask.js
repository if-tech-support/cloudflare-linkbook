// 追加: 秘密値は保存せず、回答も根拠もテキストとして表示する
const form = document.querySelector('#ask-form')
form.addEventListener('submit', async (event) => {
  event.preventDefault()
  const button = form.querySelector('button')
  const status = document.querySelector('#status')
  const answer = document.querySelector('#answer')
  const list = document.querySelector('#sources')
  button.disabled = true
  status.textContent = '検索して回答を作っています'
  answer.textContent = ''
  list.replaceChildren()
  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        Authorization: `Bearer ${document.querySelector('#token').value}` },
      body: JSON.stringify({ question: document.querySelector('#question').value }),
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error ?? '質問に失敗しました')
    answer.textContent = data.answer
    for (const source of data.sources) {
      const item = document.createElement('li')
      const link = document.createElement('a')
      const url = new URL(source.url)
      if (!['http:', 'https:'].includes(url.protocol)) continue
      link.href = url.href
      link.textContent = source.title
      item.append(link)
      list.append(item)
    }
    status.textContent = `根拠の候補: ${data.sources.length}件。内容をリンク先で確認してください`
  } catch (error) {
    status.textContent = error.message
  } finally {
    button.disabled = false
  }
})
