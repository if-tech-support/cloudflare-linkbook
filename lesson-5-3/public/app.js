const form = document.querySelector('#link-form');
const list = document.querySelector('#links');
const message = document.querySelector('#message');
const button = form.querySelector('button');
const rows = new Map(); // 追加: 再描画せず行を更新する
let thumbnailsEnabled = false;
let timer;
let polling = false;
let attempts = 0;

function updateRow(link) {
  const row = rows.get(link.id);
  row.link = link;
  row.anchor.textContent = link.title;
  row.state.textContent = {
    skipped: '取得対象外', pending: '取得中', completed: '完了',
    failed: '失敗（再試行される場合があります）',
  }[link.status];
}

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
      showImage(item, link.id, result.thumbnail_key);
      message.textContent = '画像を保存しました';
    } catch (error) {
      message.textContent = error.message;
    } finally { upload.disabled = false; }
  });
  item.append(input, upload);
}

function showImage(item, id, key) {
  if (!key) return;
  let image = item.querySelector('img');
  if (!image) {
    image = document.createElement('img');
    image.alt = `リンク${id}のサムネイル`;
    image.width = 160;
    image.loading = 'lazy';
    item.append(image);
  }
  image.src = `/thumbs/${encodeURIComponent(key)}`;
}

function addRow(link) {
  if (rows.has(link.id)) { updateRow(link); return; }
  const item = document.createElement('li');
  const anchor = document.createElement('a');
  anchor.href = link.url;
  const state = document.createElement('span'); // 追加
  item.append(anchor, ' ', state);
  rows.set(link.id, { link, anchor, state });
  updateRow(link);
  if (thumbnailsEnabled) {
    addUpload(item, link);
    showImage(item, link.id, link.thumbnail_key);
  }
  list.prepend(item);
  document.querySelector('#count').textContent = `${rows.size}件のリンク`;
}

// 追加: 一覧のキャッシュを避け、処理中のリンクだけD1から読み直す
function waiting() {
  return [...rows.values()].filter(({ link }) =>
    link.status === 'pending' || link.status === 'failed');
}

function schedule() {
  if (timer || polling || !waiting().length) return;
  if (attempts >= 20) {
    message.textContent = '自動更新を終了しました。あとで画面を再読み込みしてください';
    return;
  }
  timer = setTimeout(poll, 3000);
}

async function poll() {
  timer = undefined;
  polling = true;
  attempts += 1;
  try {
    for (const { link } of waiting()) {
      const response = await fetch(`/api/links/${link.id}`);
      if (!response.ok) throw new Error('状態を取得できませんでした');
      updateRow(await response.json());
    }
  } catch (error) {
    message.textContent = error.message;
  } finally {
    polling = false;
    schedule();
  }
}

async function loadLinks() {
  const response = await fetch('/api/links');
  if (!response.ok) throw new Error('一覧を取得できませんでした');
  const links = await response.json();
  const settingsResponse = await fetch('/api/settings');
  if (!settingsResponse.ok) throw new Error('設定を取得できませんでした');
  thumbnailsEnabled = (await settingsResponse.json()).thumbnailsEnabled;
  for (const link of [...links].reverse()) addRow(link);
  schedule();
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = '登録しています';
  try {
    const data = new FormData(form);
    const response = await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: data.get('title'), url: data.get('url') }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || '登録できませんでした');
    form.reset();
    addRow(result); // 変更: 登録結果をそのまま表示する
    message.textContent = result.status === 'failed'
      ? '登録済みですがページ取得に失敗しました。再登録は不要です'
      : '登録しました';
    schedule();
  } catch (error) {
    message.textContent = error.message;
  } finally { button.disabled = false; }
});

// 追加: 一覧キャッシュを通さず、通知されたリンクだけ取得する
const notification = document.createElement('p');
notification.setAttribute('role', 'status');
message.after(notification);

function connectNotifications() {
  const url = new URL('/api/ws', location.href);
  url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(url);
  socket.addEventListener('open', () => {
    notification.textContent = '新着通知に接続しました';
    socket.send('ping');
    loadLinks().catch((error) => { message.textContent = error.message; });
  });
  socket.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'pong') return;
      if (data.type !== 'link-ready' || typeof data.linkId !== 'string') return;
      const response = await fetch(`/api/links/${encodeURIComponent(data.linkId)}`);
      if (response.status === 404) return; // 通知後に削除された場合
      if (!response.ok) throw new Error('新着を取得できませんでした');
      const link = await response.json();
      addRow(link); // 同じIDなら更新する
      notification.textContent = `新着: ${link.title}`;
    } catch (error) {
      notification.textContent = error.message;
    }
  });
  socket.addEventListener('error', () => {
    socket.close();
  });
  socket.addEventListener('close', () => {
    notification.textContent = '新着通知が切断されました。3秒後に再接続します';
    setTimeout(connectNotifications, 3000); // 追加: closeだけで予約する
  });
}

// 通知に接続してから一覧と設定を読み込む
connectNotifications();

