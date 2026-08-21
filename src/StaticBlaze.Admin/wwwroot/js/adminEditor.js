// Toast UI Editor bridge: lazily loads the editor from CDN on first use,
// streams markdown changes to Blazor, and pipes pasted images through the
// .NET media service (SHA-256 names, ImageSharp-free - bytes go up as-is).

async function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function loadCSS(href) {
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export async function initEditor(element, dotNetRef, initialMarkdown) {
  loadCSS('https://uicdn.toast.com/editor/latest/toastui-editor.min.css');
  loadCSS('https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight.min.css');
  await loadScript('https://uicdn.toast.com/editor/latest/toastui-editor-all.min.js');
  await loadScript('https://uicdn.toast.com/editor-plugin-code-syntax-highlight/latest/toastui-editor-plugin-code-syntax-highlight-all.min.js');

  element.innerHTML = '';

  const { Editor } = window.toastui;
  const { codeSyntaxHighlight } = window.toastui.Editor.plugin;

  const editor = new Editor({
    el: element,
    initialValue: initialMarkdown || '',
    initialEditType: 'markdown',
    previewStyle: 'tab',
    height: 'auto',
    minHeight: '420px',
    usageStatistics: false,
    language: 'en',
    plugins: [codeSyntaxHighlight],
    theme: document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
    events: {
      change: () => dotNetRef.invokeMethodAsync('OnMarkdownChangedAsync', editor.getMarkdown()),
    },
    hooks: {
      addImageBlobHook: async (blob, callback) => {
        const buffer = new Uint8Array(await blob.arrayBuffer());
        const url = await dotNetRef.invokeMethodAsync('UploadImageAsync', Array.from(buffer), blob.type);
        callback(url, blob.name || 'image');
      },
    },
  });

  return {
    destroy: () => editor.destroy(),
    setMarkdown: (markdown) => editor.setMarkdown(markdown, false),
  };
}
