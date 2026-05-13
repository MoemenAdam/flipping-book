/**
 * يشيل غلافات الـ tooltip / اللينك الفاضية (نصها بعد التشذيب فاضي).
 * بعدها `unwrapTextOnlyParagraphs` يقدر يفك `<p>` اللي كان بس جوّاه الغلاف ده.
 */
function isVisuallyEmptyText(el: Element): boolean {
  const t = (el.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .trim();
  return t === '';
}

export function stripEmptyDecorativeWrappers(root: ParentNode): void {
  const maxRounds = 32;
  for (let r = 0; r < maxRounds; r++) {
    const nodes = root.querySelectorAll(
      '.tooltip-wrapper, .link-tooltip-wrapper'
    );
    let removed = false;
    for (const el of Array.from(nodes)) {
      if (!isVisuallyEmptyText(el)) continue;
      el.remove();
      removed = true;
    }
    if (!removed) break;
  }
}
