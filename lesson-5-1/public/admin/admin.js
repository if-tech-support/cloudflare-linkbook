const list = document.querySelector('#links');
const message = document.querySelector('#message');
async function load() {
  const response = await fetch('/api/links');
  if (!response.ok) throw new Error('一覧を取得できませんでした');
  const links = await response.json();
  list.replaceChildren();
  for (const link of links) {
    const item = document.createElement('li');
    const title = document.createElement('span');
    title.textContent = link.title;
    item.append(title);
    for (const [label, action, method] of [
      ['削除', '', 'DELETE'], ['要約をやり直す', '/summarize', 'POST'],
    ]) {
      const button = document.createElement('button');
      button.textContent = label;
      button.addEventListener('click', async () => {
        if (!confirm(`${link.title}：${label}を実行しますか？`)) return;
        button.disabled = true;
        try {
          const result = await fetch(`/api/admin/links/${encodeURIComponent(link.id)}${action}`, { method });
          if (result.status === 403 || result.redirected) throw new Error('管理画面を再読み込みしてログインしてください');
          const data = await result.json();
          if (!result.ok) throw new Error(data.error || '操作に失敗しました');
          message.textContent = `${label}が完了しました`;
          await load();
        } catch (error) { message.textContent = error.message; }
        finally { button.disabled = false; }
      });
      item.append(button);
    }
    list.append(item);
  }
}
load().catch((error) => { message.textContent = error.message; });
