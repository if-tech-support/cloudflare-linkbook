const form = document.querySelector('#link-form');
const list = document.querySelector('#links');
const message = document.querySelector('#message');
const button = form.querySelector('button');

// 追加: 各リンクに画像選択と送信ボタンを付ける
function addUpload(item, link) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.setAttribute('aria-label', `${link.title}の画像`);
  const upload = document.createElement('button');
  upload.type = 'button';
  upload.textContent = '画像を保存';
  upload.addEventListener('click', async () => {
    if (!input.files[0]) { message.textContent = '画像を選んでください'; return; }
    upload.disabled = true;
    try {
      const data = new FormData();
      data.append('file', input.files[0]);
      const response = await fetch(`/api/links/${link.id}/thumbnail`, {
        method: 'POST', body: data,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || '保存できませんでした');
      message.textContent = '画像を保存しました';
      await loadLinks();
    } catch (error) {
      message.textContent = error instanceof Error ? error.message : '通信に失敗しました';
    } finally { upload.disabled = false; }
  });
  item.append(input, upload);
}

async function loadLinks() {
  const response = await fetch('/api/links');
  if (!response.ok) throw new Error('一覧を取得できませんでした');
  const links = await response.json();
  // 追加: R2を使わない公開では画像選択を表示しない
  const settingsResponse = await fetch('/api/settings');
  if (!settingsResponse.ok) throw new Error('設定を取得できませんでした');
  const settings = await settingsResponse.json();
  list.replaceChildren();
  for (const link of links) {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.textContent = link.title;
    anchor.href = link.url;
    item.append(anchor);
    if (settings.thumbnailsEnabled) addUpload(item, link); // 追加
    // 追加: キーがあるリンクだけ画像を表示する
    if (settings.thumbnailsEnabled && link.thumbnail_key) {
      const image = document.createElement('img');
      image.src = `/thumbs/${encodeURIComponent(link.thumbnail_key)}`;
      image.alt = `${link.title}のサムネイル`;
      image.width = 160;
      image.loading = 'lazy';
      item.append(image);
    }
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
