const form = document.querySelector('#link-form');
const list = document.querySelector('#links');
const message = document.querySelector('#message');
const button = form.querySelector('button');

async function loadLinks() {
  const response = await fetch('/api/links');
  if (!response.ok) throw new Error('一覧を取得できませんでした');
  const links = await response.json();
  list.replaceChildren();
  for (const link of links) {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.textContent = link.title;
    anchor.href = link.url;
    item.append(anchor);
    list.append(item);
  }
  // 追加: 取得した一覧の件数を表示する
  document.querySelector('#count').textContent = `${links.length}件のリンク`;
  return links;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = '登録しています';
  let registered = false;
  try {
    const data = new FormData(form);
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.get('title'), url: data.get('url') }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '登録できませんでした');
    registered = true;
    form.reset(); // 追加: 登録成功時だけ入力欄を空にする
    await loadLinks();
    message.textContent = '登録しました';
  } catch (error) {
    message.textContent = registered
      ? '登録済みですが一覧を更新できませんでした。再登録せず画面を再読み込みしてください'
      : error instanceof Error ? error.message : '通信に失敗しました';
  } finally {
    button.disabled = false;
  }
});

loadLinks().catch((error) => {
  message.textContent = error instanceof Error ? error.message : '通信に失敗しました';
});
