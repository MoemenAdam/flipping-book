import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
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
    if (!pageRef.current) return;
  
    const interval = setInterval(() => {
      setPageHeight(pageRef.current?.offsetHeight ?? 0);
    }, 100);
  
    return () => {
      clearInterval(interval);
    };
  }, [underPage]);

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
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // التحقق من حجم الشاشة
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 1380);
      if (window.innerWidth > 1380) {
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const renderTitle = (index: number) => {
    if (titles[index]) return titles[index];
    const html = pages[index]?.html;
    return html ? extractTitle(html) : `صفحة ${index + 1}`;
  };

  return (
    <>
      {/* Burger Menu Button */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            top: '0px',
            left: '0px',
            zIndex: 2000,
            background: '#bf9456',
            border: 'none',
            padding: '5px',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
          }}
        >
          {isOpen ? (
            <X size={24} color="white" />
          ) : (
            <Menu size={24} color="white" />
          )}
        </button>
      )}

      {/* Overlay للموبايل */}
      {isMobile && isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1500,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className="pages-sidebar"
        style={{
          position: 'fixed',
          top: isMobile ? 0 : '100px',
          left: 0,
          background: '#f5f5dc',
          borderLeft: '1px solid #eee',
          padding: isMobile ? '80px 12px 20px' : '10px 12px',
          zIndex: 1600,
          transform:
            isMobile && !isOpen ? 'translateX(-100%)' : 'translateX(0)',
          transition: 'transform 0.3s ease',
        }}
      >
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

            {!pages[index]?.html && <span>⏳</span>}
          </button>
        ))}
      </aside>

      {/* Spacer للمحتوى في الشاشات الكبيرة */}
      {/* {!isMobile && <div style={{ width: '260px', flexShrink: 0 }} />} */}
    </>
  );
};

export default FlippingBook;

