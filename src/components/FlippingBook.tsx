import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { extractTitle } from '../constants/global';

type Page = { html: string | null };

const FlippingBook = ({
  pages,
  titles,
  currentPageIndex,
  setCurrentPageIndex,
}: {
  pages: Page[];
  titles: string[];
  currentPageIndex: number;
  setCurrentPageIndex: (n: number) => void;
}) => {
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(
    null
  );
  const [pageHeight, setPageHeight] = useState(0);
  const pageRef = useRef<HTMLDivElement | null>(null);

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setFlipDirection('next');
      setCurrentPageIndex(currentPageIndex + 1);
      setTimeout(() => {
        setPageHeight(pageRef.current?.offsetHeight ?? 0);
      }, 100);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setFlipDirection('prev');
      setCurrentPageIndex(currentPageIndex - 1);
      setTimeout(() => {
        setPageHeight(pageRef.current?.offsetHeight ?? 0);
      }, 100);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPageIndex]);

  const underPage =
    flipDirection === 'prev'
      ? pages[currentPageIndex + 1]
      : pages[currentPageIndex];

  const flipPage =
    flipDirection === 'next'
      ? pages[currentPageIndex - 1]
      : pages[currentPageIndex];

  useEffect(() => {
    if (pageRef.current) {
      setTimeout(() => {
        setPageHeight(pageRef.current?.offsetHeight ?? 0);
      }, 100);
    }
  }, [underPage, pageRef]);

  return (
    <div className="book-container">
      <div className="nav-buttons-wrapper">
        <button
          className="nav-button"
          onClick={goToNextPage}
          disabled={
            currentPageIndex === pages.length - 1 ||
            !pages[currentPageIndex + 1]
          }
        >
          <ChevronRight />
        </button>
        <button
          className="nav-button"
          onClick={goToPreviousPage}
          disabled={currentPageIndex === 0}
        >
          <ChevronLeft />
        </button>
      </div>

      <div
        className="book"
        style={{
          height: pageHeight,
        }}
      >
        {/* الصفحة الثابتة تحت */}
        <div
          ref={pageRef}
          className={`page page-under ${
            flipDirection === 'next'
              ? 'shadow-next'
              : flipDirection === 'prev'
              ? 'shadow-prev'
              : ''
          }`}
        >
          {underPage?.html ? (
            <div dangerouslySetInnerHTML={{ __html: underPage.html }} />
          ) : (
            <div className="">جاري تحميل الصفحة...</div>
          )}
        </div>

        {/* الصفحة اللي بتتقلب */}
        {flipDirection && (
          <div
            className={`page page-flip flip-${flipDirection}`}
            onAnimationEnd={() => setFlipDirection(null)}
          >
            {flipPage?.html ? (
              <div dangerouslySetInnerHTML={{ __html: flipPage.html }} />
            ) : (
              <div className="page-skeleton">جاري تحميل الصفحة...</div>
            )}
          </div>
        )}
      </div>

      <PagesSidebar
        pages={pages}
        titles={titles}
        setFlipDirection={setFlipDirection}
        currentPageIndex={currentPageIndex}
        setCurrentPageIndex={setCurrentPageIndex}
      />
    </div>
  );
};

const PagesSidebar = ({
  pages,
  titles,
  setFlipDirection,
  currentPageIndex,
  setCurrentPageIndex,
}: {
  pages: Page[];
  titles: string[];
  setFlipDirection: (d: 'next' | 'prev' | null) => void;
  currentPageIndex: number;
  setCurrentPageIndex: (n: number) => void;
}) => {
  const renderTitle = (index: number) => {
    if (titles[index]) return titles[index];
    const html = pages[index]?.html;
    return html ? extractTitle(html) : `صفحة ${index + 1}`;
  };

  return (
    <aside className="pages-sidebar">
      {pages.map((_, index) => (
        <button
          key={index}
          className={`sidebar-item ${
            index === currentPageIndex ? 'active' : ''
          }`}
          onClick={() => {
            setFlipDirection(index > currentPageIndex ? 'next' : 'prev');
            setCurrentPageIndex(index);
          }}
          title={renderTitle(index)}
        >
          <span className="title">{renderTitle(index)}</span>

          {!pages[index]?.html && <span className="loading-dot">⏳</span>}
        </button>
      ))}
    </aside>
  );
};

export default FlippingBook;
