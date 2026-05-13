import { stripEmptyDecorativeWrappers } from './stripEmptyDecorativeWrappers';
import { unwrapTextOnlyParagraphs } from './unwrapTextOnlyParagraphs';

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

  return body.innerHTML;
}
