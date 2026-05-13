/**
 * يفك `<p>` اللي جوّاه نص فقط (مفيش عناصر زي `<br>` أو `<span>`).
 * لو في فقرتين نص ورا بعض بعد الفك، بنحط `<br><br>` عشان ما يلزقش الكلام.
 */
function paragraphHasNoElementChildren(p: Element): boolean {
  for (const n of p.childNodes) {
    if (n.nodeType === Node.ELEMENT_NODE) return false;
  }
  return true;
}

export function unwrapTextOnlyParagraphs(root: ParentNode): void {
  const list = Array.from(root.querySelectorAll('p')).filter(
    paragraphHasNoElementChildren
  );

  for (const p of list) {
    if (!(p instanceof HTMLParagraphElement)) continue;
    const parent = p.parentNode;
    if (!parent) continue;

    const prev = p.previousSibling;
    if (prev?.nodeType === Node.TEXT_NODE) {
      parent.insertBefore(document.createElement('br'), p);
      parent.insertBefore(document.createElement('br'), p);
    }

    while (p.firstChild) {
      parent.insertBefore(p.firstChild, p);
    }
    parent.removeChild(p);
  }
}
