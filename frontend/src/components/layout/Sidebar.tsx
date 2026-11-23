import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { GlobalSearchModal } from './GlobalSearchModal';
import cmsLogo from '../../assets/cms-logo.jpeg';
import {
  LayoutDashboard,
  CalendarDays,
  Layers,
  ChevronDown,
  Search,
  Bell,
  Users,
  UserCog,
  Clock,
  ShieldCheck,
  ArrowLeftRight,
  Megaphone,
  History,
  FileSpreadsheet,
  LogOut,
  User as UserIcon,
  X,
  FileText,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  onOpenNotification?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  onOpenNotification
}) => {
  const { currentUser, notifications, logout, employees } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const userEmployee = employees?.find(
    (e) => e.id === currentUser?.employeeId || e.name === currentUser?.name
  );
  const userJabatan =
    userEmployee?.level ||
    (currentUser?.role === 'Admin'
      ? 'Lead Operations'
      : currentUser?.role === 'SPV'
      ? 'Supervisor Operasional'
      : 'NOC Engineer');

  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('cms_sidebar_collapsed') === 'true';
  });

  const [isManagementExpanded, setIsManagementExpanded] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('cms_sidebar_collapsed', String(next));
      window.dispatchEvent(new Event('cms_sidebar_toggle'));
      return next;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        if (isMobileOpen) setIsMobileOpen(false);
        if (isProfileOpen) setIsProfileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, isProfileOpen, setIsMobileOpen]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname, setIsMobileOpen]);

  const unreadCount = notifications.filter((n) => {
    if (n.isRead) return false;
    if (n.targetRole === 'all') return true;
    if (currentUser?.role === 'Admin') return true;
    if (n.targetRole && n.targetRole === currentUser?.role) return true;
    if (n.targetUserId && n.targetUserId === currentUser?.id) return true;
    return false;
  }).length;

  const handleLogout = async () => {
    setIsProfileOpen(false);
    await logout();
    navigate('/login');
    showToast('You have been logged out safely.', 'info');
  };

  const navItemClass = (path: string) => {
    const isActive = location.pathname === path || (path !== '/dashboard' && location.pathname.startsWith(path));
    return `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group ${
      isActive
        ? 'bg-[#111111] text-[#F9C900] shadow-sm dark:bg-white dark:text-[#111111]'
        : 'text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/5'
    } ${isCollapsed ? 'justify-center px-2' : ''}`;
  };

  const allManagementItems = [
    { label: 'Employees', path: '/management/employees', icon: Users, roles: ['Admin', 'SPV'] },
    { label: 'User Accounts', path: '/management/users', icon: UserCog, roles: ['Admin'] },
    { label: 'Schedule Master', path: '/management/shift-master', icon: Clock, roles: ['Admin', 'SPV'] },
    { label: 'Jobdesk Master', path: '/management/jobdesk-master', icon: Layers, roles: ['Admin', 'SPV'] },
    { label: 'Role & Permissions', path: '/management/permissions', icon: ShieldCheck, roles: ['Admin'] },
    { label: 'Announcements', path: '/management/announcements', icon: Megaphone, roles: ['Admin', 'SPV'] },
    { label: 'Activity Logs', path: '/management/activity-logs', icon: History, roles: ['Admin', 'SPV'] },
    { label: 'Schedule History', path: '/management/schedule-history', icon: FileSpreadsheet, roles: ['Admin', 'SPV'] },
  ];

  const visibleManagementItems = allManagementItems.filter((item) =>
    currentUser?.role ? item.roles.includes(currentUser.role) : false
  );

  const showReports = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';
  const showAnalytics = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';
  const showManagement = visibleManagementItems.length > 0;

  return (
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs lg:hidden animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside
        aria-label="Navigasi Utama"
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-white dark:bg-[#18181B] border-r border-slate-200 dark:border-white/10 lg:border lg:border-slate-200/80 dark:lg:border-white/10 lg:top-3 lg:bottom-3 lg:left-3 lg:rounded-2xl lg:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.04)] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-slate-200 dark:border-white/10 shrink-0`}>
          <NavLink to="/dashboard" aria-label="Dashboard CMS" className="flex items-center gap-2.5 overflow-hidden group">
            <img
              src={cmsLogo}
              alt="CMS Logo"
              className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-2xs border border-black/10 dark:border-white/10 transition-transform group-hover:scale-105"
            />
            {!isCollapsed && (
              <div className="flex flex-col truncate">
                <span className="font-black text-sm tracking-tight text-[#111111] dark:text-[#F2F4F7] leading-none">
                  CMS
                </span>
                <span className="text-[10px] font-semibold text-slate-600 dark:text-gray-300 tracking-tight leading-tight mt-0.5 truncate">
                  CTSO Management System
                </span>
              </div>
            )}
          </NavLink>

          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            aria-label="Tutup menu navigasi"
            className="flex lg:hidden p-2 rounded-lg text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-3 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            aria-label="Pencarian cepat (Command K)"
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-gray-300 text-xs transition-colors shadow-2xs ${
              isCollapsed ? 'justify-center px-2' : 'justify-between'
            }`}
            title="Search (⌘K)"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-[#0F172A] dark:text-[#F9C900] shrink-0" aria-hidden="true" />
              {!isCollapsed && <span className="font-medium text-[11px]">Quick search...</span>}
            </div>
            {!isCollapsed && (
              <kbd className="text-[9px] font-mono font-bold text-slate-600 dark:text-gray-300 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded-md border border-slate-200/80 dark:border-white/10">
                ⌘K
              </kbd>
            )}
          </button>
        </div>

        <nav aria-label="Menu Operasional" className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div className="space-y-1">
            <NavLink to="/dashboard" aria-label="Dashboard" className={() => navItemClass('/dashboard')} title={isCollapsed ? 'Dashboard' : undefined}>
              <LayoutDashboard className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Dashboard</span>}
            </NavLink>

            <NavLink to="/schedule" aria-label="Schedule" className={() => navItemClass('/schedule')} title={isCollapsed ? 'Schedule' : undefined}>
              <CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Schedule</span>}
            </NavLink>

            <NavLink to="/jobdesk" aria-label="Jobdesk" className={() => navItemClass('/jobdesk')} title={isCollapsed ? 'Jobdesk' : undefined}>
              <Layers className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Jobdesk</span>}
            </NavLink>

            <NavLink to="/requests" aria-label="Requests & Leaves" className={() => navItemClass('/requests')} title={isCollapsed ? 'Requests & Leaves' : undefined}>
              <ArrowLeftRight className="w-4 h-4 shrink-0" aria-hidden="true" />
              {!isCollapsed && <span>Requests & Leaves</span>}
            </NavLink>

            {showAnalytics && (
              <NavLink to="/analytics" aria-label="Analytics" className={() => navItemClass('/analytics')} title={isCollapsed ? 'Analytics' : undefined}>
                <BarChart3 className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && <span>Analytics</span>}
              </NavLink>
            )}

            {showReports && (
              <NavLink to="/reports" aria-label="Reports" className={() => navItemClass('/reports')} title={isCollapsed ? 'Reports' : undefined}>
                <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                {!isCollapsed && <span>Reports</span>}
              </NavLink>
            )}
          </div>

          {showManagement && (
            <div className="pt-4 mt-3 border-t border-slate-200 dark:border-white/10">
              {!isCollapsed && (
                <button
                  type="button"
                  aria-expanded={isManagementExpanded}
                  onClick={() => setIsManagementExpanded(!isManagementExpanded)}
                  className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 dark:text-gray-300 uppercase tracking-wider hover:text-[#111111] dark:hover:text-white"
                >
                  <span>Management</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={`w-3 h-3 transition-transform duration-200 ${
                      isManagementExpanded ? 'rotate-0' : '-rotate-90'
                    }`}
                  />
                </button>
              )}

              {(isManagementExpanded || isCollapsed) && (
                <div className="space-y-1 mt-1">
                  {visibleManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        aria-label={item.label}
                        className={() => navItemClass(item.path)}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                        {!isCollapsed && <span>{item.label}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="p-3 border-t border-slate-200 dark:border-white/10 shrink-0 space-y-2 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className={`flex items-center ${isCollapsed ? 'flex-col gap-2' : 'justify-between px-2'}`}>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Beralih ke mode terang' : 'Beralih ke mode gelap'}
              className="p-2.5 rounded-xl text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#F9C900]" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenNotification) {
                  onOpenNotification();
                } else {
                  setIsNotificationOpen(!isNotificationOpen);
                }
              }}
              aria-label="Pusat Notifikasi"
              className="relative p-2.5 rounded-xl text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title="Notification Center"
            >
              <Bell className="w-4 h-4" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F9C900] ring-2 ring-white dark:ring-[#111111]" />
              )}
            </button>

            <button
              type="button"
              onClick={toggleCollapse}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              className="hidden lg:flex p-2.5 rounded-xl text-slate-600 dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" aria-hidden="true" /> : <PanelLeftClose className="w-4 h-4" aria-hidden="true" />}
            </button>
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              aria-expanded={isProfileOpen}
              aria-label="Menu Profil Pengguna"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`w-full flex items-center gap-2.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 hover:border-[#111111] dark:hover:border-white/30 bg-white dark:bg-[#18181A] hover:bg-[#F5F6F8] dark:hover:bg-white/5 transition-all shadow-2xs ${
                isCollapsed ? 'justify-center px-1' : 'justify-between'
              }`}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-[#111111] dark:bg-white text-[#F9C900] dark:text-[#111111] font-black text-[10px] flex items-center justify-center shrink-0 ring-1 ring-black/10 dark:ring-white/20">
                  {currentUser?.avatarText || 'US'}
                </div>
                {!isCollapsed && (
                  <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-bold text-[#111111] dark:text-white truncate">
                      {currentUser?.name?.trim().split(/\s+/).slice(0, 3).join(' ')}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-gray-300 font-mono">
                      {currentUser?.role}
                    </span>
                  </div>
                )}
              </div>
              {!isCollapsed && <ChevronDown className="w-3.5 h-3.5 text-slate-500 dark:text-gray-300 shrink-0" aria-hidden="true" />}
            </button>

            {isProfileOpen && (
              <div className={`absolute bottom-full mb-2 ${isCollapsed ? 'left-full ml-2 w-64' : 'left-0 right-0 w-64'} bg-white dark:bg-[#18181A] rounded-2xl shadow-lg border border-slate-200 dark:border-white/10 py-2.5 z-50 animate-fade-in text-xs`}>
                <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10">
                  <p className="font-extrabold text-[#111111] dark:text-white">{currentUser?.name}</p>
                  <p className="text-[11px] text-slate-600 dark:text-gray-300 font-normal">{currentUser?.email}</p>
                  <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F9C900] text-[#111111]">
                      {currentUser?.role}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                      {userJabatan}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-gray-300 font-mono">{currentUser?.userId}</span>
                  </div>
                </div>

                <div className="px-1 pt-1">
                  <NavLink
                    to="/settings/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                    <span>Account Profile</span>
                  </NavLink>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    <span className="font-semibold">Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
