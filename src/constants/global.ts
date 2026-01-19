'use client';
import { supabase } from '../components/supabase';

const BOOK_KEY = 'flipping-book';
const BUCKET_NAME = 'uploads';

export const api = {
  login: async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error?.message || 'فشل تسجيل الدخول');
    }
    return data.session;
  },
  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error?.message || 'فشل تسجيل الخروج');
    }
    return true;
  },
  deletePages: async () => {
    const { error } = await supabase
      .from('book_pages')
      .delete()
      .eq('book_key', BOOK_KEY);

    if (error) throw error;
    return true;
  },
  clearImagesBucket: async () => {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', { limit: 1000 });

    if (error) throw error;

    if (!data || data.length === 0) return true;

    const filePaths = data.map((file) => file.name);

    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove(filePaths);

    if (deleteError) throw deleteError;

    return true;
  },
  // 🔹 حفظ الصفحات صفحة صفحة
  savePages: async (pages: { html: string }[]) => {
    const rows = pages.map((p, index) => ({
      book_key: BOOK_KEY,
      page_index: index,
      title: extractTitle(p.html),
      html: p.html,
    }));

    const { error } = await supabase
      .from('book_pages')
      .upsert(rows, { onConflict: 'book_key,page_index' });

    if (error) throw error;
    return true;
  },
  saveSinglePage: async (
    pageIndex: number,
    html: string,
    totalPages: number
  ) => {
    const { error } = await supabase.from('book_pages').upsert(
      {
        book_key: 'flipping-book',
        page_index: pageIndex,
        title: extractTitle(html),
        html,
      },
      { onConflict: 'book_key,page_index' }
    );
    console.log({ totalPages });

    if (error) throw error;

    return true;
  },
  // 🔹 جلب صفحة واحدة
  getPage: async (pageIndex: number) => {
    const { data, error } = await supabase
      .from('book_pages')
      .select('html') // 👈 html بس
      .eq('book_key', BOOK_KEY)
      .eq('page_index', pageIndex)
      .single();

    if (error) throw error;
    return data.html;
  },
  getPagesCount: async () => {
    const { count, error } = await supabase
      .from('book_pages')
      .select('*', { count: 'exact', head: true })
      .eq('book_key', BOOK_KEY);

    if (error) throw error;
    return count || 0;
  },
  // 🔹 pagination (مثلاً 5 صفحات في الطلب)
  getPagesPaginated: async (page: number, pageSize = 5) => {
    const from = page * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('book_pages')
      .select('html, title, page_index', { count: 'exact' })
      .eq('book_key', BOOK_KEY)
      .order('page_index', { ascending: true })
      .range(from, to);

    if (error) throw error;

    return {
      pages: data,
      total: count,
    };
  },
  // 🔹 جلب العناوين بس (للـ sidebar مثلاً)
  getTitles: async () => {
    const { data, error } = await supabase
      .from('book_pages')
      .select('page_index, title')
      .eq('book_key', BOOK_KEY)
      .order('page_index', { ascending: true });

    if (error) throw error;
    return data as { page_index: number; title: string }[];
  },
};

export const extractTitle = (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const h1 = doc.querySelector('h1');
  const h2 = doc.querySelector('h2');

  const title =
    h1?.textContent?.trim() || h2?.textContent?.trim() || 'صفحة بدون عنوان';

  return title;
};
