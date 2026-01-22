/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import WordToFlipbook from './components/App';
import { api } from './constants/global';
import { Link } from 'react-router-dom';
import { supabase } from './components/supabase';

const Page = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [, setToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [finishCheckToken, setFinishCheckToken] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // 1️⃣ هات السيشن من Supabase
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) throw error;

        // 2️⃣ لو في Session سليمة
        if (session?.access_token && session.user?.email) {
          setToken(session.access_token);
          setUserEmail(session.user.email);
          setIsLoggedIn(true);

          // sync مع localStorage
          localStorage.setItem('authToken', session.access_token);
          localStorage.setItem('userEmail', session.user.email);
        } else {
          // 3️⃣ مفيش session → امسح أي junk
          setIsLoggedIn(false);
          setToken(null);
          setUserEmail('');
          localStorage.removeItem('authToken');
          localStorage.removeItem('userEmail');
        }
      } catch (err) {
        console.error('Session check failed:', err);

        setIsLoggedIn(false);
        setToken(null);
        setUserEmail('');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userEmail');
      } finally {
        setFinishCheckToken(true);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.login(email, password);

      // Adjust based on your API response structure
      const authToken = response.access_token;
      const userEmailResponse = response.user?.email || email;

      if (!authToken) {
        throw new Error('لم يتم استلام رمز المصادقة من الخادم');
      }

      setToken(authToken);
      setUserEmail(userEmailResponse);
      setIsLoggedIn(true);
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userEmail', userEmailResponse);
      setSuccess('تم تسجيل الدخول بنجاح!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setUserEmail('');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    setSuccess('');
    setEmail('');
    setPassword('');
    api.logout();
  };

  if (!finishCheckToken) {
    return <div>loading</div>;
  }

  if (!isLoggedIn) {
    return (
      <div style={styles.container}>
        <div style={styles.loginCard}>
          <div style={styles.logoSection as any}>
            <div style={styles.logo}>
              <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="var(--primary-color)"
                  strokeWidth="3"
                />
                <path
                  d="M25 15 L25 25 L32 32"
                  stroke="var(--primary-color)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <h1 style={styles.title}>مرحباً بك</h1>
            <p style={styles.subtitle}>سجل دخولك للوصول إلى لوحة التحكم</p>
          </div>

          <div style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input as any}
                placeholder="example@domain.com"
                required
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input as any}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={styles.errorMessage}>
                <span>⚠️</span> {error}
              </div>
            )}

            {success && (
              <div style={styles.successMessage}>
                <span>✓</span> {success}
              </div>
            )}

            <button
              onClick={handleLogin}
              style={styles.loginButton}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <header style={styles.header as any}>
        <div style={styles.headerContent as any}>
          <div style={styles.headerLeft as any}>
            <div style={styles.logoSmall}>
              <svg width="35" height="35" viewBox="0 0 50 50" fill="none">
                <circle
                  cx="25"
                  cy="25"
                  r="20"
                  stroke="var(--primary-color)"
                  strokeWidth="3"
                />
                <path
                  d="M25 15 L25 25 L32 32"
                  stroke="var(--primary-color)"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h2 style={styles.headerTitle}>لوحة التحكم</h2>

            {/* زرار عرض الكتاب */}
            <Link to="/view" style={styles.viewBookBtn}>
              📖 الكتاب الحالي
            </Link>
          </div>

          <div style={styles.headerRight}>
            <div style={styles.userInfo}>
              <span style={styles.userEmail}>{userEmail}</span>
              <div style={styles.userAvatar}>
                {userEmail.charAt(0).toUpperCase()}
              </div>
            </div>

            <button onClick={handleLogout} style={styles.logoutButton}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Content with File Upload */}
      <div className="mainApp">
        <WordToFlipbook />
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, var(--bg-light) 0%, #e8dfc4 100%)',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  loginCard: {
    background: 'var(--bg-white)',
    borderRadius: '20px',
    padding: '50px 40px',
    maxWidth: '450px',
    width: '100%',
    boxShadow: 'var(--shadow-lg)',
    border: '1px solid rgba(191, 148, 86, 0.1)',
  },
  viewBookBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    borderRadius: '12px',
    background:
      'linear-gradient(135deg, var(--primary-light), var(--primary-dark))',
    color: 'white',
    fontSize: '14px',
    fontWeight: '700',
    textDecoration: 'none',
    boxShadow: '0 6px 14px rgba(191, 148, 86, 0.35)',
    transition: 'var(--transition-fast)',
    marginLeft: '10px',
  },
  logoutButton: {
    padding: '10px 16px',
    borderRadius: '12px',
    background: 'transparent',
    color: 'var(--primary-color)',
    fontSize: '14px',
    fontWeight: '700',
    border: '2px solid rgba(191, 148, 86, 0.4)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  logoSection: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  logo: {
    display: 'inline-flex',
    marginBottom: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 10px 0',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  form: {
    marginTop: '30px',
  },
  inputGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    fontSize: '15px',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    transition: 'var(--transition-base)',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  loginButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'var(--primary-color)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
    marginTop: '10px',
  },
  errorMessage: {
    background: '#fee',
    color: '#c33',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '15px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  successMessage: {
    background: '#efe',
    color: '#3a3',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '15px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  header: {
    background: 'linear-gradient(180deg, #fff, var(--bg-white))',
    borderBottom: '1px solid rgba(191, 148, 86, 0.15)',
    boxShadow: 'var(--shadow-sm)',
    position: 'fixed',
    width: '100vw',
    top: 0,
    zIndex: 1000,
    backdropFilter: 'blur(6px)',
  },

  headerTitle: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    margin: 0,
    letterSpacing: '0.3px',
  },

  userAvatar: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background:
      'linear-gradient(135deg, var(--primary-light), var(--primary-dark))',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '16px',
    boxShadow: '0 4px 10px rgba(191, 148, 86, 0.4)',
  },
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
    flex: '1 1 auto',
  },
  logoSmall: {
    display: 'flex',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  userEmail: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  mainContent: {
    marginTop: '100px',
    padding: '20px',
  },
  uploadSection: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'grid',
    gap: '30px',
  },
  uploadCard: {
    background: 'var(--bg-white)',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid rgba(191, 148, 86, 0.1)',
  },
  cardTitle: {
    fontSize: '22px',
    fontWeight: '700',
    color: 'var(--text-primary)',
    margin: '0 0 30px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  icon: {
    fontSize: '24px',
  },
  uploadArea: {
    marginBottom: '25px',
  },
  fileInput: {
    display: 'none',
  },
  fileLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    border: '3px dashed rgba(191, 148, 86, 0.3)',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
    background: 'rgba(191, 148, 86, 0.02)',
  },
  uploadIcon: {
    marginBottom: '20px',
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 5px 0',
  },
  fileSize: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  uploadButton: {
    width: '100%',
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'var(--primary-color)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'var(--transition-base)',
  },
  filesCard: {
    background: 'var(--bg-white)',
    borderRadius: '20px',
    padding: '40px',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid rgba(191, 148, 86, 0.1)',
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    padding: '20px',
    background: 'rgba(191, 148, 86, 0.03)',
    borderRadius: '12px',
    border: '1px solid rgba(191, 148, 86, 0.1)',
    transition: 'var(--transition-base)',
  },
  fileIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text-primary)',
    margin: '0 0 5px 0',
    wordBreak: 'break-word',
  },
  fileMetadata: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    margin: 0,
  },
  fileStatus: {
    fontSize: '20px',
    color: 'var(--success-color)',
    flexShrink: 0,
  },
};

export default Page;
