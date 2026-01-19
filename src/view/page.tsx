/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import FlippingBook from '../components/FlippingBook';
import { Link } from 'react-router-dom';
import { api } from '../constants/global';

const View = () => {
  const [pages, setPages] = useState<{ html: string | null }[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        // 1) titles فورًا (خفيف جدًا)
        const titlesData = await api.getTitles();
        setTitles(titlesData.map((t: any) => t.title));

        // 2) عدد الصفحات
        const count = await api.getPagesCount();
        if (!count) {
          setLoading(false);
          return;
        }

        // 3) نجهز array فاضي بالحجم الصح
        setPages(Array.from({ length: count }, () => ({ html: null })));

        // 4) نبعث request لكل صفحة (parallel)
        const requests = Array.from({ length: count }, (_, i) => i).map(
          async (index) => {
            const html = await api.getPage(index);
            setPages((prev) => {
              const copy = [...prev];
              copy[index] = { html };
              return copy;
            });
          }
        );

        await Promise.allSettled(requests);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (!loading && pages.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-card">
          <div className="empty-icon">📄</div>

          <h2 className="empty-title">لم يتم رفع اي صفحة بعد</h2>

          <Link to="/" className="empty-action">
            ⬆️ ارفع ملف جديد
          </Link>
        </div>
      </div>
    );
  }

  return (
    <FlippingBook
      pages={pages}
      titles={titles}
      currentPageIndex={currentPageIndex}
      setCurrentPageIndex={setCurrentPageIndex}
    />
  );
};

export default View;
