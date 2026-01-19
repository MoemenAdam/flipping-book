/* eslint-disable @typescript-eslint/no-explicit-any */
import type React from 'react';
import { useEffect, useState } from 'react';
import mammoth from 'mammoth';
import { supabase } from './supabase';
import { api } from '../constants/global';
import { useNavigate } from 'react-router-dom';

const BUCKET_NAME = 'uploads'; // اسم الـ bucket

function WordToFlipbook() {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('جاري معالجة الملف...');
  const [dots, setDots] = useState('');
  const [, setCurrentPageIndex] = useState(0);
  const [uploadStage, setUploadStage] = useState<'idle' | 'images' | 'pages'>(
    'idle'
  );
  const [uploadError, setUploadError] = useState('');
  const [uploadedCount, setUploadedCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();

  // 🔹 تأثير النقط المتحركة
  useEffect(() => {
    if (!uploading) return;

    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [uploading]);

  // 🔹 تغيير رسائل التحميل
  useEffect(() => {
    if (!uploading) return;

    const messages = [
      'جاري معالجة الملف',
      'جاري قراءة المحتوى',
      'جاري تحليل الصفحات',
      'جاري معالجة الصور',
      'تقريباً انتهينا',
    ];

    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, 3000);

    return () => clearInterval(interval);
  }, [uploading]);

  // 🔹 منع إغلاق الصفحة أثناء الرفع
  useEffect(() => {
    if (!uploading) return;

    // دالة التحذير عند محاولة المغادرة
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue =
        'جاري رفع الملف! إذا أغلقت الصفحة الآن، ستفقد كل التقدم. هل أنت متأكد؟';
      return e.returnValue;
    };

    // إضافة المستمع
    window.addEventListener('beforeunload', handleBeforeUnload);

    // تنظيف المستمع عند الانتهاء
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [uploading]);

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
    setLoadingMessage('جاري معالجة الملف');

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
      setUploadStage('images');
      html = await processAndUploadImages(doc.body.innerHTML);

      const rawPages = html
        .split(/<h[1-2]>/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, index) => (index === 0 ? p : '<h1>' + p));

      const pagesArray = rawPages.map((pageHtml) => ({ html: pageHtml }));

      try {
        const total = pagesArray.length;
        setUploadStage('pages');
        setTotalPages(total);
        setUploadedCount(0);
        setUploadError('');

        for (let i = 0; i < total; i++) {
          setUploadProgress(`جاري رفع الصفحات... (${i + 1}/${total})`);

          await api.saveSinglePage(i, pagesArray[i].html, total);

          setUploadedCount(i + 1);
        }

        setUploadProgress('تم الانتهاء من رفع الكتاب بالكامل ✅');
        setCurrentPageIndex(0);

        navigate('/view');
      } catch (err: any) {
        console.error(err);

        setUploadError(
          err?.message ||
            'حصل خطأ أثناء رفع الصفحات. تأكد من الاتصال بالإنترنت وحاول مرة أخرى.'
        );

        setUploading(false);
        setUploadStage('idle');
        return;
      } finally {
        setUploading(false);
        setUploadStage('idle');
      }

      setCurrentPageIndex(0);
    } catch (err) {
      console.error('Error processing file:', err);
    } finally {
      setUploading(false);
      setUploadStage('idle');
    }
  };

  return (
    <div className="app-container">
      <div className="upload-section">
        <div className="upload-card">
          <h2>Word to Flipbook</h2>
          <p className="subtitle">تحويل ملفات Word إلى كتاب تفاعلي جميل</p>
          {uploadError ? (
            <div className="upload-error-box">
              <span className="error-icon">❌</span>
              <p className="error-text">{uploadError}</p>

              <button
                className="retry-btn"
                onClick={() => {
                  setUploadError('');
                  setUploadedCount(0);
                  setTotalPages(0);
                }}
              >
                🔁 حاول مرة أخرى
              </button>
            </div>
          ) : uploading ? (
            uploadStage === 'images' ? (
              <div className="loading-container">
                <div className="warning-badge">
                  ⚠️ لا تغلق الصفحة أثناء الرفع!
                </div>
                <div className="progress-bar-container">
                  <div className="progress-bar"></div>
                </div>
                <p className="loading-text">
                  {uploadProgress || `${loadingMessage}${dots}`}
                </p>
                <p className="loading-subtext">قد يستغرق الأمر عدة دقائق...</p>
              </div>
            ) : uploadStage === 'pages' ? (
              <div className="loading-container">
                <div className="warning-badge">
                  ⚠️ لا تغلق الصفحة أثناء الرفع!
                </div>

                <div className="progress-bar-container">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${Math.round(
                        (uploadedCount / totalPages) * 100
                      )}%`,
                    }}
                  />
                </div>

                <p className="loading-text">
                  تم رفع {uploadedCount} من {totalPages} صفحة
                </p>
              </div>
            ) : (
              'loading'
            )
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
    </div>
  );
}

export default WordToFlipbook;
