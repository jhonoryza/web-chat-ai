import { marked } from 'marked';
import DOMPurify from 'dompurify';

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return s.replace(/[&<>"']/g, (c) => map[c]);
}

async function copyText(t: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(t);
    return;
  } catch {
    /* fall through to textarea fallback */
  }
  const ta = document.createElement('textarea');
  ta.value = t;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {
    /* ignore */
  }
  ta.remove();
}

export function renderMarkdown(src: string): string {
  let html: string;
  try {
    html = marked.parse(src, { breaks: true }) as string;
  } catch {
    html = '<p>' + escapeHtml(src) + '</p>';
  }
  const clean = DOMPurify.sanitize(html, { ADD_ATTR: ['target', 'rel'] });
  const box = document.createElement('div');
  box.innerHTML = clean;
  box.querySelectorAll('a').forEach((a) => {
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
  });
  box.querySelectorAll('pre').forEach((pre) => {
    const code = pre.querySelector('code');
    const m = /language-([\w+-]+)/.exec(code?.className || '');
    const lang = (m && m[1]) || 'code';
    const wrap = document.createElement('div');
    wrap.className = 'codeblock';
    const bar = document.createElement('div');
    bar.className = 'codebar';
    const lab = document.createElement('span');
    lab.textContent = lang;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mini-btn';
    btn.textContent = 'Copy';
    btn.setAttribute('data-copy-code', '');
    bar.appendChild(lab);
    bar.appendChild(btn);
    wrap.appendChild(bar);
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
  });
  return box.innerHTML;
}

export function delegateCopyClicks(root: HTMLElement): () => void {
  let timer: number | null = null;
  const onClick = (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    const btn = t?.closest?.('[data-copy-code]') as HTMLButtonElement | null;
    if (!btn || !root.contains(btn)) return;
    const codeEl = btn.closest('.codeblock')?.querySelector('pre code, pre');
    const text = (codeEl as HTMLElement | null)?.innerText ?? '';
    void copyText(text);
    btn.textContent = 'Copied ✓';
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      btn.textContent = 'Copy';
      timer = null;
    }, 1200);
  };
  root.addEventListener('click', onClick);
  return () => {
    root.removeEventListener('click', onClick);
    if (timer) window.clearTimeout(timer);
  };
}
