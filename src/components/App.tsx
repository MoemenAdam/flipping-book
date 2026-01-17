/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';
import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { supabase } from './supabase';
import FlippingBook from './FlippingBook';

const BUCKET_NAME = 'uploads'; // اسم الـ bucket


function WordToFlipbook({
  savePages,
  getPages,
}: {
  savePages: (pages: { html: string }[]) => any;
  getPages: () => Promise<{ html: string }[]>;
}) {
  const [pages, setPages] = useState<{ html: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const existingPages = await getPages();
        if (existingPages && existingPages.length > 0) {
          setPages(existingPages);
          setCurrentPageIndex(0);
        }
      } catch (err) {
        console.error('Error fetching pages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [getPages]);

  // 🔹 دالة تحويل Base64 لـ Blob
  const base64ToBlob = (base64: string, contentType = 'image/png') => {
    const byteCharacters = atob(base64);
    const byteArrays = [];

    for (let i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }

    return new Blob([new Uint8Array(byteArrays)], { type: contentType });
  };

  // 🔹 دالة رفع الصورة على Supabase
  const uploadImageToSupabase = async (
    base64Data: string,
    fileName: string
  ): Promise<string | null> => {
    try {
      // نستخرج الـ content type
      const matches = base64Data.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return null;

      const contentType = matches[1];
      const base64 = matches[2];

      // نحول لـ Blob
      const blob = base64ToBlob(base64, contentType);

      // نرفع على Supabase
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, blob, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.error('Upload error:', error);
        return null;
      }

      // نجيب الـ public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET_NAME).getPublicUrl(data.path);

      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  // 🔹 دالة معالجة كل الصور في الـ HTML
  const processAndUploadImages = async (html: string): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const images = doc.querySelectorAll('img');

    let imageCount = 0;
    const totalImages = images.length;

    for (const img of Array.from(images)) {
      const src = img.getAttribute('src');

      // لو الصورة Base64
      if (src && src.startsWith('data:image')) {
        imageCount++;
        setUploadProgress(`جاري رفع الصور... (${imageCount}/${totalImages})`);

        // نعمل اسم فريد للصورة
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const extension = src.includes('image/png') ? 'png' : 'jpg';
        const fileName = `image_${timestamp}_${random}.${extension}`;

        // نرفع الصورة
        const publicUrl = await uploadImageToSupabase(src, fileName);

        // لو الرفع نجح، نستبدل الـ src
        if (publicUrl) {
          img.setAttribute('src', publicUrl);
        }
      }
    }

    setUploadProgress('');
    return doc.body.innerHTML;
  };

  const processItalicTooltips = (root: HTMLElement) => {
    root.querySelectorAll('em, i').forEach((italic) => {
      const strikethrough = italic.querySelector('s, del, strike');

      if (!strikethrough) return;

      const triggerText = Array.from(italic.childNodes)
        .filter(
          (node) => node !== strikethrough && node.nodeType === Node.TEXT_NODE
        )
        .map((node) => node.textContent)
        .join('')
        .trim();

      const tooltipText = strikethrough.textContent?.trim() || '';

      if (!triggerText || !tooltipText) return;

      const span = document.createElement('span');
      span.className = 'tooltip-wrapper percent-tooltip';
      span.innerHTML = `
        <div class="tooltip-wrapper percent-tooltip">
          <span class="tooltip-trigger percent-trigger">${triggerText}</span>
          <div class="tooltip-content percent-tooltip-content">
            <div class="tooltip-arrow"></div>
            <span class="tooltip-text">${tooltipText}</span>
          </div>
        </div>
      `;

      italic.replaceWith(span);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const realFile = e.target.files?.[0];
    if (!realFile) return;

    setUploading(true);

    try {
      const arrayBuffer = await realFile.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      let html = result.value;

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      doc.querySelectorAll('a').forEach((a) => {
        const text = a.innerText;
        const href = a.getAttribute('href') || '';

        const anchor = doc.createElement('a');
        anchor.innerHTML = `<a href="${href}" class="link-text">${text}</a>`;
        a.replaceWith(anchor);
      });

      processItalicTooltips(doc.body);

      // 🔹 نرفع الصور قبل تقسيم الصفحات
      html = await processAndUploadImages(doc.body.innerHTML);

      const rawPages = html
        .split(/<h[1-2]>/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, index) => (index === 0 ? p : '<h1>' + p));

      const pagesArray = rawPages.map((pageHtml) => ({ html: pageHtml }));

      await savePages(pagesArray);

      setPages(pagesArray);
      setCurrentPageIndex(0);
    } catch (err) {
      console.error('Error processing file:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="app-container">
      {loading ? (
        <div className="upload-section">جاري التحميل...</div>
      ) : pages.length > 0 ? (
        <>
          <div className="upload-section">
            <div className="upload-card">
              <h2>Word to Flipbook</h2>
              <p className="subtitle">تحويل ملفات Word إلى كتاب تفاعلي جميل</p>
              {uploading ? (
                <div className="loading">
                  {uploadProgress || 'جاري التحميل...'}
                </div>
              ) : (
                <label className="file-input-wrapper">
                  <input
                    type="file"
                    accept=".docx"
                    onChange={handleFile}
                    className="file-input"
                  />
                  <span className="file-label">اختر ملف Word</span>
                </label>
              )}
            </div>
          </div>
          <FlippingBook
            pages={pages}
            currentPageIndex={currentPageIndex}
            setCurrentPageIndex={setCurrentPageIndex}
          />
        </>
      ) : (
        <div className="upload-section">
          <div className="upload-card">
            <h2>Word to Flipbook</h2>
            <p className="subtitle">تحويل ملفات Word إلى كتاب تفاعلي جميل</p>
            {uploading ? (
              <div className="loading">
                {uploadProgress || 'جاري التحميل...'}
              </div>
            ) : (
              <label className="file-input-wrapper">
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFile}
                  className="file-input"
                />
                <span className="file-label">اختر ملف Word</span>
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default WordToFlipbook;