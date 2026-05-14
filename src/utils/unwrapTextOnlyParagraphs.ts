function paragraphHasNoElementChildren(p: Element): boolean {
  for (const n of p.childNodes) {
    if (n.nodeType === Node.ELEMENT_NODE) return false;
  }
  return true;
}

/**
 * Unwrap `<p>` that contain only text nodes; insert `<br><br>` between merged runs.
 */
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
