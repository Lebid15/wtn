'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import SuperAdminSidebar from './SuperAdminSidebar';
import SuperAdminTopBar from './SuperAdminTopBar';
import api from '@/utils/api';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [authReady, setAuthReady] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // التحقق من تسجيل الدخول - معطل مؤقتاً للتطوير
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // TODO: إضافة التحقق من التوكن والصلاحيات عند الربط مع الـ Backend
        // const token = localStorage.getItem('token');
        // if (!token) {
        //   router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        //   return;
        // }
        
        // مؤقتاً: السماح بالدخول مباشرة للتطوير
        if (mounted) setAuthReady(true);
      } catch {
        if (!mounted) return;
        // router.replace(`/login?next=${encodeURIComponent(pathname)}`);
        if (mounted) setAuthReady(true);
      }
    })();
    return () => { mounted = false; };
  }, [router, pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {}
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userPriceGroupId');
    } catch {}
    router.replace('/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-base">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-text-secondary">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <SuperAdminSidebar 
        isMobileMenuOpen={isMobileMenuOpen}
        onCloseMobileMenu={closeMobileMenu}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <SuperAdminTopBar 
          onLogout={handleLogout}
          onToggleMobileMenu={toggleMobileMenu}
        />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
