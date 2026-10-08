// 下载资源名称复制助手 - 后台服务工作者

// 可识别的下载文件扩展名
const DOWNLOAD_EXTENSIONS = [
  '.doc', '.docx', '.pdf', '.xls', '.xlsx', '.ppt', '.pptx',
  '.wps', '.et', '.dps',
  '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
  '.exe', '.msi', '.dmg', '.pkg', '.apk', '.deb', '.rpm',
  '.txt', '.csv', '.rtf', '.md', '.json', '.xml', '.yaml', '.yml',
  '.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a',
  '.mp4', '.avi', '.mov', '.wmv', '.mkv', '.flv', '.webm',
  '.iso', '.img', '.bin',
  '.epub', '.mobi', '.azw', '.azw3',
  '.dwg', '.dxf', '.cad',
  '.sql', '.db', '.sqlite'
];

// 扩展名集合，用于快速查找
const EXT_SET = new Set(DOWNLOAD_EXTENSIONS);

// 判断 URL 是否为可下载资源
function isDownloadable(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    pathname = decodeURIComponent(pathname);
    const segments = pathname.split('/');
    const filename = segments[segments.length - 1];
    if (!filename) return false;
    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const ext = filename.slice(dotIndex).toLowerCase();
    return EXT_SET.has(ext);
  } catch (e) {
    return false;
  }
}

// 从 URL 提取文件名
function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    pathname = decodeURIComponent(pathname);
    const segments = pathname.split('/');
    let filename = segments[segments.length - 1];
    return filename || '';
  } catch (e) {
    return '';
  }
}

// 判断文字是否含有可识别的文件扩展名
function hasFileExtension(text) {
  if (!text) return false;
  const dotIndex = text.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = text.slice(dotIndex).toLowerCase();
  return EXT_SET.has(ext);
}

// 常见的通用下载短语，不作为文件名使用
var GENERIC_PHRASES = new Set([
  '下载', '点击下载', '下载附件', '点击这里', '点此下载', '此处下载',
  '免费下载', '立即下载', '下载文件', '附件下载', '附件', '更多', '查看',
  '查看更多', '下载地址', '下载链接', '点击', '查看详情', '详情',
  'download', 'click', 'here', 'download here', 'click here',
  'click to download', 'more', 'view', 'pdf', 'doc', 'docx', 'link', 'href'
]);

// 判断链接文字是否为通用下载短语
function isGenericPhrase(text) {
  if (!text) return true;
  return GENERIC_PHRASES.has(text.trim().toLowerCase());
}

// 获取显示用的文件名：优先用链接可见文字
function getDisplayFilename(linkText, url) {
  if (linkText && hasFileExtension(linkText)) {
    return linkText.trim();
  }
  if (linkText && !isGenericPhrase(linkText) && linkText.trim().length >= 2) {
    return linkText.trim();
  }
  const name = extractFilename(url);
  return name || (linkText ? linkText.trim() : '');
}

// 插件安装时创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    createMenus();
  });
});

function createMenus() {
  chrome.contextMenus.create({
    id: 'copyLinkFilename',
    title: '复制文件名称',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'copyLinkText',
    title: '复制链接文字',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'separator_download',
    type: 'separator',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'downloadAutoName',
    title: '下载并自动命名',
    contexts: ['link']
  });

  chrome.contextMenus.create({
    id: 'separator1',
    type: 'separator',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'copyAllFilenames',
    title: '复制本页所有下载文件名称',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'copyAllFilenamesWithUrl',
    title: '复制本页所有下载文件名称（含链接）',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'separator2',
    type: 'separator',
    contexts: ['page']
  });

  chrome.contextMenus.create({
    id: 'copySelectionText',
    title: '复制所选文字',
    contexts: ['selection']
  });
}

// 右键菜单点击处理
chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case 'copyLinkFilename': {
      sendMessageWithFallback(tab.id, { action: 'getClickedLinkFilename', linkUrl: info.linkUrl, linkText: info.linkText }, (response) => {
        var filename = (response && response.filename) || '';
        if (!filename) {
          filename = getDisplayFilename(info.linkText, info.linkUrl);
        }
        if (filename) {
          sendCopyCommand(tab.id, filename, `已复制文件名称：${filename}`);
        } else {
          sendCopyCommand(tab.id, '', '未能识别文件名称');
        }
      });
      break;
    }
    case 'copyLinkText': {
      const text = info.linkText || extractFilename(info.linkUrl) || '';
      sendCopyCommand(tab.id, text, `已复制链接文字：${text}`);
      break;
    }
    case 'downloadAutoName': {
      sendMessageWithFallback(tab.id, { action: 'getClickedLinkInfo', linkUrl: info.linkUrl, linkText: info.linkText }, (resp) => {
        const filename = (resp && resp.filename) || getDisplayFilename(info.linkText, info.linkUrl);
        const downloadUrl = (resp && resp.url) || info.linkUrl;
        chrome.downloads.download({
          url: downloadUrl,
          filename: filename || undefined,
          saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError || !downloadId) {
            sendCopyCommand(tab.id, '', '下载失败：' + (chrome.runtime.lastError ? chrome.runtime.lastError.message : '未知错误'));
          } else {
            sendCopyCommand(tab.id, '', '已开始下载：' + (filename || '文件'));
          }
        });
      });
      break;
    }
    case 'copyAllFilenames': {
      chrome.tabs.sendMessage(tab.id, { action: 'getAllFilenames' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('消息发送失败：', chrome.runtime.lastError.message);
          return;
        }
        const filenames = (response && response.filenames) || [];
        if (filenames.length === 0) {
          sendCopyCommand(tab.id, '', '未在当前页面检测到可下载资源');
        } else {
          const text = filenames.join('\n');
          sendCopyCommand(tab.id, text, `已复制 ${filenames.length} 个文件名称`);
        }
      });
      break;
    }
    case 'copyAllFilenamesWithUrl': {
      chrome.tabs.sendMessage(tab.id, { action: 'getAllFilenamesWithUrl' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('消息发送失败：', chrome.runtime.lastError.message);
          return;
        }
        const items = (response && response.items) || [];
        if (items.length === 0) {
          sendCopyCommand(tab.id, '', '未在当前页面检测到可下载资源');
        } else {
          const text = items.map(item => `${item.filename}\t${item.url}`).join('\n');
          sendCopyCommand(tab.id, text, `已复制 ${items.length} 个文件名称（含链接）`);
        }
      });
      break;
    }
    case 'copySelectionText': {
      const text = info.selectionText || '';
      sendCopyCommand(tab.id, text, '已复制所选文字');
      break;
    }
  }
});

// 向内容脚本发送复制指令（静默处理 content.js 未注入的情况）
function sendCopyCommand(tabId, text, message) {
  chrome.tabs.sendMessage(tabId, { action: 'copyToClipboard', text: text, message: message }, () => {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, () => {
        if (chrome.runtime.lastError) return;
        chrome.tabs.sendMessage(tabId, { action: 'copyToClipboard', text: text, message: message });
      });
    }
  });
}

// 确保内容脚本已注入，然后发送消息（需要回复的用这个）
function sendMessageWithFallback(tabId, message, callback) {
  chrome.tabs.sendMessage(tabId, message, (resp) => {
    if (chrome.runtime.lastError) {
      chrome.scripting.executeScript({ target: { tabId: tabId }, files: ['content.js'] }, () => {
        if (chrome.runtime.lastError) { callback(null); return; }
        chrome.tabs.sendMessage(tabId, message, callback);
      });
    } else {
      callback(resp);
    }
  });
}

// 监听扩展图标点击：向内容脚本请求扫描结果，转发给弹窗
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getDownloadableCount') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ count: 0, items: [] });
        return;
      }
      chrome.tabs.sendMessage(tabs[0].id, { action: 'getAllFilenamesWithUrl' }, (response) => {
        if (chrome.runtime.lastError) {
          sendResponse({ count: 0, items: [] });
          return;
        }
        const items = (response && response.items) || [];
        sendResponse({ count: items.length, items: items });
      });
    });
    return true;
  }
});