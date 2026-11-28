import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopRightNotification } from './TopRightNotification';
import { ToastContainer } from '../common/ToastContainer';
import { useAuth } from '../../context/AuthContext';
import { Megaphone, X, Menu } from 'lucide-react';
import cmsLogo from '../../assets/cms-logo.jpeg';

export const AppLayout: React.FC = () => {
  const { announcements } = useAuth();
  const location = useLocation();
  const [dismissedBanner, setDismissedBanner] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('cms_sidebar_collapsed') === 'true';
  });

  useEffect(() => {
    const handleStorageChange = () => {
      setIsCollapsed(localStorage.getItem('cms_sidebar_collapsed') === 'true');
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('cms_sidebar_toggle', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cms_sidebar_toggle', handleStorageChange);
    };
  }, []);

  const publishedAnnouncements = announcements.filter((a) => a.status === 'Published');
  const [announcementIndex, setAnnouncementIndex] = useState(0);

  useEffect(() => {
    if (publishedAnnouncements.length <= 1) return;

    const interval = setInterval(() => {
      setAnnouncementIndex((prev) => (prev + 1) % publishedAnnouncements.length);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [publishedAnnouncements.length]);

  const activeAnnouncement = publishedAnnouncements[announcementIndex % (publishedAnnouncements.length || 1)];

  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/dashboard' || p === '/') return 'Dashboard';
    if (p === '/schedule') return 'Shift Schedule';
    if (p === '/jobdesk') return 'Jobdesk Matrix';
    if (p === '/requests') return 'Requests & Leaves';
    if (p === '/analytics') return 'Analytics & Shifting Insights';
    if (p === '/reports') return 'Operational Reports';
    if (p === '/history') return 'Schedule History';
    if (p.includes('/employees')) return 'Employee Directory';
    if (p.includes('/users')) return 'User Accounts';
    if (p.includes('/shift-master')) return 'Schedule Master';
    if (p.includes('/jobdesk-master')) return 'Jobdesk Master Catalog';
    if (p.includes('/permissions')) return 'Role & Permissions';
    if (p.includes('/announcements')) return 'Announcements';
    if (p.includes('/activity-logs')) return 'Activity Audit Trail';
    if (p.includes('/settings')) return 'Profile Settings';
    return 'Operations';
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] dark:bg-[#0E0F12] flex font-sans antialiased text-[#0F172A] dark:text-[#F2F4F7] transition-colors relative">
      <ToastContainer />

      <TopRightNotification
        isOpen={isNotificationOpen}
        onToggle={() => setIsNotificationOpen((prev) => !prev)}
        onClose={() => setIsNotificationOpen(false)}
      />

      <Sidebar
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        onOpenNotification={() => setIsNotificationOpen(true)}
      />

      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'lg:pl-28' : 'lg:pl-72'
        }`}
      >
        <header className="hidden lg:flex items-center justify-between h-14 px-6 lg:px-8 bg-transparent pt-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-slate-600 dark:text-gray-300">CTSO Operations</span>
            <span className="text-slate-400 dark:text-gray-500" aria-hidden="true">/</span>
            <span className="font-bold text-[#0F172A] dark:text-white">
              {getPageTitle()}
            </span>
          </div>
        </header>

        <header className="h-14 flex items-center justify-between px-4 bg-white dark:bg-[#18181A] border-b border-slate-200 dark:border-white/10 lg:hidden sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="p-2.5 rounded-xl text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            aria-label="Buka menu navigasi"
            aria-expanded={isMobileOpen}
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2">
            <img
              src={cmsLogo}
              alt="CMS Logo"
              className="w-7 h-7 rounded-lg object-cover border border-black/10 dark:border-white/10"
            />
            <span className="font-black text-xs text-[#111111] dark:text-white">CMS</span>
          </div>
          <div className="w-8" aria-hidden="true" />
        </header>

        {activeAnnouncement && !dismissedBanner && (
          <div className="px-4 sm:px-6 lg:px-8 xl:px-10 pt-2 pb-0 animate-fade-in" role="region" aria-label="Pengumuman Operasional">
            <div className="group/marquee bg-amber-50 dark:bg-[#1E1A11] rounded-2xl border border-amber-300/90 dark:border-amber-500/40 shadow-xs px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 flex-1 min-w-0 overflow-hidden">
                <div className="w-7 h-7 rounded-xl bg-amber-600 text-white dark:bg-[#F9C900] dark:text-[#111111] flex items-center justify-center shrink-0 shadow-2xs animate-pulse">
                  <Megaphone className="w-3.5 h-3.5" aria-hidden="true" />
                </div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-200/90 dark:bg-[#F9C900]/20 text-amber-950 dark:text-[#F9C900] border border-amber-300/90 dark:border-[#F9C900]/30 shrink-0 font-mono">
                  Pengumuman
                </span>
                <div className="flex-1 min-w-0 overflow-hidden relative" title="Arahkan kursor untuk menjeda teks berjalan">
                  <div className="animate-announcement-marquee gap-2 text-xs">
                    <span className="font-extrabold text-amber-950 dark:text-amber-100">
                      📢 {activeAnnouncement.title}:
                    </span>
                    <span className="text-amber-950 dark:text-amber-200 font-semibold">
                      {activeAnnouncement.content}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {publishedAnnouncements.length > 1 && (
                  <div className="flex items-center gap-1 font-mono text-[11px] text-amber-950 dark:text-amber-200 bg-amber-200/70 dark:bg-amber-400/15 border border-amber-300/80 dark:border-amber-400/30 px-2 py-0.5 rounded-lg">
                    <span>
                      {((announcementIndex % publishedAnnouncements.length) + 1)}/{publishedAnnouncements.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAnnouncementIndex((prev) => (prev + 1) % publishedAnnouncements.length)}
                      className="p-0.5 rounded hover:bg-amber-300/50 dark:hover:bg-amber-400/20 text-xs text-amber-950 dark:text-amber-100 font-bold"
                      aria-label="Pengumuman berikutnya"
                      title="Pengumuman berikutnya"
                    >
                      &rarr;
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setDismissedBanner(true)}
                  className="p-1.5 text-amber-800 hover:text-amber-950 dark:text-amber-300 dark:hover:text-white rounded-lg transition-colors hover:bg-amber-200/60 dark:hover:bg-amber-400/20"
                  aria-label="Tutup pengumuman"
                  title="Tutup pengumuman"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
