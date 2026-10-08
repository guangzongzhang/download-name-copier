// 弹窗脚本

document.addEventListener('DOMContentLoaded', () => {
  const statusEl = document.getElementById('status');
  const listEl = document.getElementById('list');
  const copyAllBtn = document.getElementById('copyAll');

  chrome.runtime.sendMessage({ action: 'getDownloadableCount' }, (response) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = '无法访问当前页面';
      return;
    }
    const items = (response && response.items) || [];
    renderList(items);
  });

  function renderList(items) {
    listEl.innerHTML = '';
    if (items.length === 0) {
      statusEl.textContent = '当前页面未检测到可下载资源';
      copyAllBtn.disabled = true;
      return;
    }
    statusEl.textContent = `检测到 ${items.length} 个可下载资源`;
    copyAllBtn.disabled = false;

    for (const item of items) {
      const div = document.createElement('div');
      div.className = 'list-item';

      const extEl = document.createElement('span');
      extEl.className = 'ext';
      const dotIndex = item.filename.lastIndexOf('.');
      extEl.textContent = dotIndex !== -1 ? item.filename.slice(dotIndex + 1) : '?';

      const nameEl = document.createElement('span');
      nameEl.className = 'name';
      nameEl.textContent = item.filename;
      nameEl.title = '点击复制文件名称';
      nameEl.addEventListener('click', () => {
        copyText(item.filename, nameEl);
      });

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', () => {
        copyText(item.filename, btn);
      });

      div.appendChild(extEl);
      div.appendChild(nameEl);
      div.appendChild(btn);
      listEl.appendChild(div);
    }
  }

  copyAllBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'getDownloadableCount' }, (response) => {
      const items = (response && response.items) || [];
      if (items.length === 0) return;
      const text = items.map(i => i.filename).join('\n');
      copyText(text, copyAllBtn, `已复制 ${items.length} 个文件名称`);
    });
  });

  async function copyText(text, btnEl, successMsg) {
    try {
      await navigator.clipboard.writeText(text);
      if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = successMsg || '已复制';
        setTimeout(() => { btnEl.textContent = original; }, 1500);
      }
    } catch (err) {
      console.error('复制失败：', err);
      if (btnEl) {
        const original = btnEl.textContent;
        btnEl.textContent = '复制失败';
        setTimeout(() => { btnEl.textContent = original; }, 1500);
      }
    }
  }
});