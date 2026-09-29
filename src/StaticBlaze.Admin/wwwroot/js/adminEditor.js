// Toast UI Editor bridge.
//
// The library is VENDORED (see wwwroot/vendor/toastui/README.md). It used to load from
// uicdn.toast.com/editor/latest, which meant the CDN could change the editor under the app,
// the editor could not load offline, and — the reason the vendoring happened — the CDN has no
// dark theme stylesheet at any version, so `theme: 'dark'` silently did nothing and a dark
// shell rendered a light editor with its own grey text.
//
// The editor is therefore always initialised with Toast UI's light baseline, and
// styles/admin.css overrides every surface, text and control colour from the admin tokens for
// both themes. That also means switching the app theme does NOT need to re-create the editor.
//
// Responsibilities kept from before: stream markdown changes to Blazor, pipe pasted images
// through the .NET media service.

const VENDOR = './vendor/toastui/';

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`failed to load ${src}`));
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
  loadCSS(`${VENDOR}toastui-editor.min.css`);
  loadCSS(`${VENDOR}toastui-editor-plugin-code-syntax-highlight.min.css`);
  await loadScript(`${VENDOR}toastui-editor-all.min.js`);
  await loadScript(`${VENDOR}toastui-editor-plugin-code-syntax-highlight-all.min.js`);

  element.innerHTML = '';

  const { Editor } = window.toastui;
  const { codeSyntaxHighlight } = window.toastui.Editor.plugin;

  const editor = new Editor({
    el: element,
    initialValue: initialMarkdown || '',
    initialEditType: 'markdown',
    previewStyle: 'tab',
    height: 'auto',
    minHeight: '460px',
    usageStatistics: false,
    language: 'en',
    plugins: [codeSyntaxHighlight],
    // light is the baseline; both themes are re-coloured by admin.css from the shared tokens
    theme: 'light',
    toolbarItems: [
      ['heading', 'bold', 'italic', 'strike'],
      ['hr', 'quote'],
      ['ul', 'ol', 'task'],
      ['table', 'image', 'link'],
      ['code', 'codeblock'],
    ],
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

  // exposed for the harness and for debugging; harmless in production
  window.__sbEditor = editor;

  return {
    destroy: () => { try { editor.destroy(); } catch { /* already gone */ } delete window.__sbEditor; },
    setMarkdown: (markdown) => editor.setMarkdown(markdown, false),
    getMarkdown: () => editor.getMarkdown(),
  };
}
