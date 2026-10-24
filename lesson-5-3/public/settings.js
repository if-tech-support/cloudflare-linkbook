// 追加: 公開設定を画面の見出しとタブに反映する
async function loadSettings() {
  const response = await fetch('/api/settings');
  if (!response.ok) throw new Error('表示名を取得できませんでした');
  const settings = await response.json();
  document.querySelector('h1').textContent = settings.appName;
  document.title = settings.appName;
}
loadSettings().catch((error) => {
  document.querySelector('#message').textContent = error instanceof Error
    ? error.message : '設定の通信に失敗しました';
});
