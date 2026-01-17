/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

const FlippingBook = ({
  pages,
  currentPageIndex,
  setCurrentPageIndex,
}: any) => {
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(
    null
  );

  const goToNextPage = () => {
    if (currentPageIndex < pages.length - 1) {
      setFlipDirection('next');
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setFlipDirection('prev');
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPageIndex]);

  console.log({ pages });
  return (
    <div className="book-container">
      <div className="nav-buttons-wrapper">
        <button
          className="nav-button"
          onClick={goToNextPage}
          disabled={currentPageIndex === pages.length - 1}
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
      <div className="book">
        {/* الصفحة الثابتة تحت */}
        <div
          className={`page page-under ${
            flipDirection === 'next'
              ? 'shadow-next'
              : flipDirection === 'prev'
              ? 'shadow-prev'
              : ''
          }`}
          dangerouslySetInnerHTML={{
            __html:
              flipDirection === 'prev'
                ? pages[currentPageIndex + 1]?.html
                : pages[currentPageIndex].html,
          }}
        />

        {/* الصفحة اللي بتتقلب */}
        {flipDirection && (
          <div
            className={`page page-flip flip-${flipDirection}`}
            onAnimationEnd={() => setFlipDirection(null)}
            dangerouslySetInnerHTML={{
              __html:
                flipDirection === 'next'
                  ? pages[currentPageIndex - 1]?.html
                  : pages[currentPageIndex].html,
            }}
          />
        )}
      </div>

      <PagesSidebar
        pages={pages}
        setFlipDirection={setFlipDirection}
        currentPageIndex={currentPageIndex}
        setCurrentPageIndex={setCurrentPageIndex}
      />
    </div>
  );
};

const PagesSidebar = ({
  pages,
  setFlipDirection,
  currentPageIndex,
  setCurrentPageIndex,
}: any) => {
  const extractTitle = (html: string) => {
    const match = html.match(/<h1[^>]*>(.*?)<\/h1>/);
    return match ? match[1] : `صفحة`;
  };
  return (
    <aside className="pages-sidebar">
      {pages.map((page: any, index: number) => (
        <button
          key={index}
          className={`sidebar-item ${
            index === currentPageIndex ? 'active' : ''
          }`}
          onClick={() => {
            setFlipDirection(index > currentPageIndex ? 'next' : 'prev');
            setCurrentPageIndex(index);
          }}
          title={extractTitle(page.html)}
        >
          <span
            className="title"
            dangerouslySetInnerHTML={{
              __html: extractTitle(page.html),
            }}
          />
        </button>
      ))}
    </aside>
  );
};

export default FlippingBook;
