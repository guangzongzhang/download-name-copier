// 下载资源名称复制助手 - 内容脚本

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

const EXT_SET = new Set(DOWNLOAD_EXTENSIONS);

function isDownloadable(url) {
  try {
    const urlObj = new URL(url);
    if (['javascript:', 'mailto:', 'tel:', '#'].indexOf(urlObj.protocol) !== -1) {
      return false;
    }
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

function extractFilename(url) {
  try {
    const urlObj = new URL(url);
    let pathname = urlObj.pathname;
    pathname = decodeURIComponent(pathname);
    const segments = pathname.split('/');
    return segments[segments.length - 1] || '';
  } catch (e) {
    return '';
  }
}

function hasFileExtension(text) {
  if (!text) return false;
  const dotIndex = text.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = text.slice(dotIndex).toLowerCase();
  return EXT_SET.has(ext);
}

var GENERIC_PHRASES = new Set([
  '下载', '点击下载', '下载附件', '点击这里', '点此下载', '此处下载',
  '免费下载', '立即下载', '下载文件', '附件下载', '附件', '更多', '查看',
  '查看更多', '下载地址', '下载链接', '点击', '查看详情', '详情',
  'download', 'click', 'here', 'download here', 'click here',
  'click to download', 'more', 'view', 'pdf', 'doc', 'docx', 'link', 'href'
]);

function isGenericPhrase(text) {
  if (!text) return true;
  return GENERIC_PHRASES.has(text.trim().toLowerCase());
}

function getLinkText(link) {
  return (link.textContent || '').trim() || (link.innerText || '').trim();
}

function getDisplayFilename(link) {
  const href = link.href;
  const linkText = getLinkText(link);
  if (linkText && hasFileExtension(linkText)) {
    return linkText;
  }
  if (linkText && !isGenericPhrase(linkText) && linkText.length >= 2) {
    return linkText;
  }
  const name = extractFilename(href);
  return name || linkText;
}

function isDownloadableLink(link) {
  const href = link.href;
  if (!href) return false;
  if (isDownloadable(href)) return true;
  const linkText = getLinkText(link);
  return hasFileExtension(linkText);
}

function getAllFilenames() {
  const filenames = [];
  const seen = new Set();
  const links = document.querySelectorAll('a[href]');
  for (const link of links) {
    if (!isDownloadableLink(link)) continue;
    const filename = getDisplayFilename(link);
    if (filename && !seen.has(filename)) {
      seen.add(filename);
      filenames.push(filename);
    }
  }
  return filenames;
}

function getAllFilenamesWithUrl() {
  const items = [];
  const seen = new Set();
  const links = document.querySelectorAll('a[href]');
  for (const link of links) {
    if (!isDownloadableLink(link)) continue;
    const filename = getDisplayFilename(link);
    if (filename && !seen.has(filename)) {
      seen.add(filename);
      items.push({ filename: filename, url: link.href });
    }
  }
  return items;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API 失败，尝试备用方案：', err);
    }
  }
  return copyWithExecCommand(text);
}

function copyWithExecCommand(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch (e) {
    console.error('复制失败：', e);
    return false;
  }
}

function showToast(message, isError) {
  const toast = document.createElement('div');
  toast.className = 'dnc-toast' + (isError ? ' dnc-toast-error' : '');
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('dnc-show'));
  setTimeout(() => {
    toast.classList.remove('dnc-show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'copyToClipboard') {
    copyTextToClipboard(request.text).then((ok) => {
      if (ok) {
        showToast(request.message || '已复制到剪贴板', false);
      } else {
        showToast('复制失败，请手动复制', true);
      }
      sendResponse({ success: ok });
    }).catch((err) => {
      showToast('复制失败：' + (err.message || ''), true);
      sendResponse({ success: false });
    });
    return true;
  }

  if (request.action === 'getClickedLinkFilename') {
    var filename = '';
    if (lastClickedLink) {
      filename = getDisplayFilename(lastClickedLink);
    } else if (request.linkUrl) {
      var links = document.querySelectorAll('a[href]');
      for (var i = 0; i < links.length; i++) {
        if (links[i].href === request.linkUrl) {
          filename = getDisplayFilename(links[i]);
          break;
        }
      }
    }
    sendResponse({ filename: filename, linkText: lastClickedLink ? getLinkText(lastClickedLink) : (request.linkText || '') });
    return false;
  }

  if (request.action === 'getClickedLinkInfo') {
    var fname = '';
    var furl = request.linkUrl || '';
    if (lastClickedLink) {
      fname = getDisplayFilename(lastClickedLink);
      furl = lastClickedLink.href || furl;
    } else if (request.linkUrl) {
      var links2 = document.querySelectorAll('a[href]');
      for (var j = 0; j < links2.length; j++) {
        if (links2[j].href === request.linkUrl) {
          fname = getDisplayFilename(links2[j]);
          break;
        }
      }
    }
    sendResponse({ filename: fname, url: furl });
    return false;
  }

  if (request.action === 'getAllFilenames') {
    sendResponse({ filenames: getAllFilenames() });
    return false;
  }

  if (request.action === 'getAllFilenamesWithUrl') {
    sendResponse({ items: getAllFilenamesWithUrl() });
    return false;
  }
});

// 捕获右键点击的链接元素（捕获阶段，确保最早拿到）
var lastClickedLink = null;
document.addEventListener('contextmenu', function (e) {
  lastClickedLink = e.target.closest('a[href]') || null;
}, true);