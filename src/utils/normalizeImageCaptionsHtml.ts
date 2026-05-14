import { stripEmptyDecorativeWrappers } from './stripEmptyDecorativeWrappers';
import { unwrapTextOnlyParagraphs } from './unwrapTextOnlyParagraphs';

/** فواصل الشعر: شرطة أو أكثر مع مسافات (مثل `-` أو `- -` أو `-  -`). */
const POETRY_HEMISTICH_SPLIT = /\s*(?:-\s*)+\s*/;

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * `<em>شطر أيمن - شطر أيسر</em>` → صفوف بعرض الصفحة (يمين / شمال) زي تنسيق الشعر.
 */
function transformPoetryEmElements(body: HTMLElement): void {
  const ems = Array.from(body.querySelectorAll('em')).filter(
    (e) => !e.querySelector('em')
  );
  for (const em of ems) {
    const raw = (em.textContent || '').replace(/\u00a0/g, ' ');
    const parts = raw
      .split(POETRY_HEMISTICH_SPLIT)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    if (parts.length < 2) continue;

    const chunks: string[] = [];
    for (let i = 0; i + 1 < parts.length; i += 2) {
      chunks.push(
        `<span class="poetry-line"><span class="poetry-hemi poetry-start">${escapeHtmlText(
          parts[i]
        )}</span><span class="poetry-hemi poetry-end">${escapeHtmlText(
          parts[i + 1]
        )}</span></span>`
      );
    }
    if (parts.length % 2 === 1) {
      const lone = parts[parts.length - 1];
      chunks.push(
        `<span class="poetry-line poetry-line-single">${escapeHtmlText(lone)}</span>`
      );
    }
    em.classList.add('poetry-em');
    em.innerHTML = chunks.join('');
  }
}

/** يلفّ أي محتوى بعد آخر `img` داخل نفس الفقرة في span للكابشن (تنسيق أقرب وأصغر). */
function wrapImageCaptionsInParagraphs(body: HTMLElement, doc: Document): void {
  for (const p of Array.from(body.querySelectorAll('p'))) {
    const imgs = p.querySelectorAll('img');
    if (!imgs.length) continue;
    const lastImg = imgs[imgs.length - 1];
    let node: ChildNode | null = lastImg.nextSibling;
    if (!node) continue;
    const span = doc.createElement('span');
    span.className = 'image-caption';
    while (node) {
      const next: ChildNode | null = node.nextSibling;
      span.appendChild(node);
      node = next;
    }
    p.appendChild(span);
  }
}

/**
 * Word / mammoth غالبًا يطلعوا الصورة في `<p>` والكابشن في `<p>` منفصل.
 * ندمج الكابشن اللي جاي مباشرة بعد فقرة فيها صور بس في نفس الـ `<p>`،
 * ونضيف `text-center` لأي `<p>` فيه صورة ونص جنب بعض.
 */
function textWithoutImages(el: Element): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((img) => img.remove());
  return (clone.textContent || '').replace(/\u00a0/g, ' ').trim();
}

function paragraphIsImageOnly(p: Element): boolean {
  if (p.tagName !== 'P') return false;
  if (!p.querySelector('img')) return false;
  return textWithoutImages(p).length === 0;
}

function isTextOnlyParagraphAfterImage(p: Element | null): p is HTMLParagraphElement {
  if (!p || p.tagName !== 'P') return false;
  if (p.querySelector('img')) return false;
  return textWithoutImages(p).length > 0;
}

function addTextCenterIfImageWithCaption(p: Element): void {
  if (!p.querySelector('img')) return;
  if (textWithoutImages(p).length === 0) return;
  p.classList.add('text-center');
}

export function normalizeImageCaptionsHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  let el = body.firstElementChild;
  while (el) {
    const captionP = el.nextElementSibling;
    if (paragraphIsImageOnly(el) && isTextOnlyParagraphAfterImage(captionP)) {
      while (captionP.firstChild) {
        el.appendChild(captionP.firstChild);
      }
      captionP.remove();
      el.classList.add('text-center');
    }
    el = el.nextElementSibling;
  }

  body.querySelectorAll('p').forEach((p) => addTextCenterIfImageWithCaption(p));

  stripEmptyDecorativeWrappers(body);
  unwrapTextOnlyParagraphs(body);

  wrapImageCaptionsInParagraphs(body, doc);
  transformPoetryEmElements(body);

  return body.innerHTML;
}
