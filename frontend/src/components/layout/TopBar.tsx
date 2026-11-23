import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationPopover } from './NotificationPopover';
import { GlobalSearchModal } from './GlobalSearchModal';
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
  CalendarOff,
  Megaphone,
  History,
  FileSpreadsheet,
  LogOut,
  User as UserIcon,
  Menu,
  X,
  FileText,
  KeyRound,
  Sun,
  Moon,
  Eye,
  EyeOff
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const { currentUser, switchUserRole, notifications, logout } = useAuth();
  const { showToast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [isManagementOpen, setIsManagementOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Top Bar Nav Collapse/Hide Feature (Requirement: Top bar ada fitur hide menu)
  const [isMenuHidden, setIsMenuHidden] = useState<boolean>(() => {
    return localStorage.getItem('cms_menu_hidden') === 'true';
  });

  const toggleHideMenu = () => {
    setIsMenuHidden((prev) => {
      const next = !prev;
      localStorage.setItem('cms_menu_hidden', String(next));
      return next;
    });
  };

  const mgmtRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mgmtRef.current && !mgmtRef.current.contains(e.target as Node)) {
        setIsManagementOpen(false);
      }
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

  // Global keyboard shortcut for Search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Unread notifications count
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

  // Nav Pill Styling: Compact vertical stack with icon on top and text underneath
  const navPillClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-tight transition-all ${
      isActive
        ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
        : 'text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
    }`;

  // Role-filtered Management Menu (Requirement 4 & 10)
  // Employee has NO access to: User Accounts, Permissions, Activity Log, Schedule History, Master codes
  const allManagementItems = [
    { label: 'Employees', path: '/management/employees', icon: Users, desc: 'Master personnel data', roles: ['Admin', 'SPV'] },
    { label: 'User Accounts', path: '/management/users', icon: UserCog, desc: 'Account credentials & roles', roles: ['Admin'] },
    { label: 'Schedule Master', path: '/management/shift-master', icon: Clock, desc: 'Work schedule codes', roles: ['Admin', 'SPV'] },
    { label: 'Jobdesk Master', path: '/management/jobdesk-master', icon: Layers, desc: 'CT1, CT2, CT4 catalog', roles: ['Admin', 'SPV'] },
    { label: 'Role & Permissions', path: '/management/permissions', icon: ShieldCheck, desc: 'SPV granular permission matrix', roles: ['Admin'] },
    { label: 'Announcements', path: '/management/announcements', icon: Megaphone, desc: 'Operational broadcasts', roles: ['Admin', 'SPV'] },
    { label: 'Activity Logs', path: '/management/activity-logs', icon: History, desc: 'Immutable audit trail', roles: ['Admin', 'SPV'] },
    { label: 'Schedule History', path: '/management/schedule-history', icon: FileSpreadsheet, desc: 'Roster version snapshots', roles: ['Admin', 'SPV'] },
  ];

  const visibleManagementItems = allManagementItems.filter((item) =>
    currentUser?.role ? item.roles.includes(currentUser.role) : false
  );

  const isManagementActive = location.pathname.startsWith('/management');
  const showManagementDropdown = visibleManagementItems.length > 0;
  const showReports = currentUser?.role === 'Admin' || currentUser?.role === 'SPV';

  return (
    <>
      <header className="sticky top-0 z-40 bg-white dark:bg-[#111111] border-b border-slate-200/90 dark:border-white/10 shadow-xs transition-colors">
        <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-10 h-12 flex items-center justify-between gap-3">
          
          {/* 1. Left: Single Menu Icon + Compact CMS Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Single Menu Icon Button (Point 1: 1 ikon menu untuk menampilkan top bar jangan hide menu itu) */}
            <button
              type="button"
              onClick={toggleHideMenu}
              className="p-1.5 rounded-lg text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={isMenuHidden ? 'Show Navigation Menu' : 'Hide Navigation Menu'}
              aria-label="Toggle navigation menu"
            >
              <Menu className="w-4 h-4" />
            </button>

            <NavLink to="/dashboard" className="flex items-center gap-2 group">
              {/* Logo emblem: constant in both light and dark mode, never inverts (Point 4) */}
              <div className="w-7 h-7 rounded-lg bg-[#111111] text-[#F9C900] font-black text-[10px] flex items-center justify-center shadow-2xs border border-black/15 dark:border-[#F9C900]/30 transition-transform group-hover:scale-105">
                CMS
              </div>
              <div className="flex flex-col">
                <span className="font-black text-xs tracking-tight text-[#111111] dark:text-[#F2F4F7] leading-none">
                  CMS
                </span>
                <span className="text-[9px] font-semibold text-[#647084] dark:text-gray-400 tracking-tight leading-tight mt-0.5">
                  CTSO Management System
                </span>
              </div>
            </NavLink>
          </div>

          {/* 2. Center: Compact Pill Navigation (Text underneath icons, hidden if toggled) */}
          {!isMenuHidden && (
            <nav className="hidden lg:flex items-center p-0.5 rounded-xl bg-[#F5F6F8] dark:bg-white/5 border border-slate-200 dark:border-white/10 gap-0.5 animate-fade-in">
              <NavLink to="/dashboard" className={navPillClass}>
                <LayoutDashboard className="w-3.5 h-3.5 mb-0.5" />
                <span>Dashboard</span>
              </NavLink>

              <NavLink to="/schedule" className={navPillClass}>
                <CalendarDays className="w-3.5 h-3.5 mb-0.5" />
                <span>Schedule</span>
              </NavLink>

              <NavLink to="/jobdesk" className={navPillClass}>
                <Layers className="w-3.5 h-3.5 mb-0.5" />
                <span>Jobdesk</span>
              </NavLink>

              {/* Combined Requests & Leaves menu */}
              <NavLink to="/requests" className={navPillClass}>
                <ArrowLeftRight className="w-3.5 h-3.5 mb-0.5" />
                <span>Requests</span>
              </NavLink>

              {/* Reports: Only for Admin and SPV */}
              {showReports && (
                <NavLink to="/reports" className={navPillClass}>
                  <FileText className="w-3.5 h-3.5 mb-0.5" />
                  <span>Reports</span>
                </NavLink>
              )}

              {/* Management Dropdown: Only if user role has visible items */}
              {showManagementDropdown && (
                <div className="relative" ref={mgmtRef}>
                  <button
                    type="button"
                    onClick={() => setIsManagementOpen(!isManagementOpen)}
                    className={`flex flex-col items-center justify-center px-2.5 py-0.5 rounded-lg text-[9px] font-bold tracking-tight transition-all ${
                      isManagementActive || isManagementOpen
                        ? 'bg-[#111111] text-[#F9C900] shadow-2xs dark:bg-white dark:text-[#111111]'
                        : 'text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-0.5 mb-0.5">
                      <Users className="w-3.5 h-3.5" />
                      <ChevronDown className={`w-2 h-2 transition-transform duration-150 ${isManagementOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <span>Management</span>
                  </button>

                  {/* Dropdown Menu */}
                  {isManagementOpen && (
                    <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-64 bg-white dark:bg-[#18181A] rounded-2xl shadow-clean-lg border border-slate-200 dark:border-white/10 py-2 z-50 animate-fade-in">
                      <div className="px-3.5 py-1 text-[10px] font-bold text-[#647084] dark:text-gray-400 uppercase tracking-wider">
                        Operational Modules
                      </div>
                      <div className="max-h-[380px] overflow-y-auto px-1 space-y-0.5">
                        {visibleManagementItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location.pathname === item.path;
                          return (
                            <NavLink
                              key={item.path}
                              to={item.path}
                              onClick={() => setIsManagementOpen(false)}
                              className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs transition-colors ${
                                isActive
                                  ? 'bg-[#111111] text-[#F9C900] font-bold dark:bg-white dark:text-[#111111]'
                                  : 'text-[#111111] dark:text-gray-300 hover:bg-[#E7F0FE]/60 dark:hover:bg-white/10'
                              }`}
                            >
                              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#F9C900] dark:text-[#111111]' : 'text-[#647084]'}`} />
                              <span className="font-semibold">{item.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}

          {/* 3. Right: Utility Controls (Search, Dark Mode Toggle, Notification Bell, User Avatar) */}
          <div className="flex items-center gap-2">
            
            {/* Quick Search Button (sleek input style with ⌘K) */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden sm:flex items-center justify-between w-36 sm:w-48 md:w-56 h-8 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-[#E7F0FE]/60 dark:bg-white/5 hover:bg-[#E7F0FE] dark:hover:bg-white/10 text-[#647084] dark:text-gray-300 text-xs transition-colors shadow-2xs"
              title="Search data (⌘K / Ctrl+K)"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-[#111111] dark:text-[#F9C900] flex-shrink-0" />
                <span className="text-[#647084] dark:text-gray-400 font-medium text-[11px] truncate">Search...</span>
              </div>
              <kbd className="text-[9px] font-mono font-bold text-[#647084] dark:text-gray-400 bg-white dark:bg-white/10 px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 flex-shrink-0">
                ⌘K
              </kbd>
            </button>

            {/* Dark Mode Toggle (Requirement: tambah fitur dark mode) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-full text-[#647084] dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-[#F9C900]" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                className="relative p-2 rounded-full text-[#647084] dark:text-gray-300 hover:text-[#111111] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                title="Notification Center"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F9C900] ring-2 ring-white dark:ring-[#111111]" />
                )}
              </button>

              <NotificationPopover
                isOpen={isNotificationOpen}
                onClose={() => setIsNotificationOpen(false)}
              />
            </div>

            {/* 4. Elegant User Profile Button (Requirement 5: Foto/Avatar lebih elegan, teks proporsional) */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-white/10 hover:border-[#111111] dark:hover:border-white/30 bg-white dark:bg-[#18181A] hover:bg-[#F5F6F8] dark:hover:bg-white/5 transition-all shadow-2xs"
              >
                {/* Elegant Circular Avatar with balanced typography */}
                <div className="w-6 h-6 rounded-full bg-[#111111] dark:bg-white text-[#F9C900] dark:text-[#111111] font-black text-[9px] flex items-center justify-center ring-1 ring-black/10 dark:ring-white/20">
                  {currentUser?.avatarText || 'US'}
                </div>
                <span className="hidden sm:inline text-xs font-bold text-[#111111] dark:text-[#F2F4F7]">
                  {currentUser?.name?.split(' ')[0]}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-black rounded-full bg-[#F9C900] text-[#111111]">
                  {currentUser?.role}
                </span>
                <ChevronDown className="w-3 h-3 text-[#647084] dark:text-gray-400" />
              </button>

              {/* Profile Popover */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#18181A] rounded-2xl shadow-clean-lg border border-slate-200 dark:border-white/10 py-2.5 z-50 animate-fade-in text-xs">
                  <div className="px-4 py-2 border-b border-slate-100 dark:border-white/10">
                    <p className="font-extrabold text-[#111111] dark:text-white">{currentUser?.name}</p>
                    <p className="text-[11px] text-[#647084] dark:text-gray-400 font-normal">{currentUser?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F9C900] text-[#111111]">
                        {currentUser?.role}
                      </span>
                      <span className="text-[10px] text-[#647084] dark:text-gray-400 font-mono">{currentUser?.userId}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/settings/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60 dark:hover:bg-white/10 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-[#647084]" />
                      <span>Account Profile</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        navigate('/settings/profile');
                      }}
                      className="w-full text-left px-4 py-2 text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60 dark:hover:bg-white/10 flex items-center gap-2.5 font-medium transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-[#647084]" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  <div className="border-t border-slate-100 dark:border-white/10 pt-1 mt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 font-semibold transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-500" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-full text-[#647084] dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#18181A] px-4 pt-2 pb-6 space-y-2 animate-fade-in">
            <NavLink
              to="/dashboard"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60'
                }`
              }
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink
              to="/schedule"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60'
                }`
              }
            >
              <CalendarDays className="w-4 h-4" />
              <span>Schedule</span>
            </NavLink>

            <NavLink
              to="/jobdesk"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60'
                }`
              }
            >
              <Layers className="w-4 h-4" />
              <span>Jobdesk</span>
            </NavLink>

            <NavLink
              to="/requests"
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                  isActive ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60'
                }`
              }
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>Requests</span>
            </NavLink>

            {showReports && (
              <NavLink
                to="/reports"
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold ${
                    isActive ? 'bg-[#111111] text-[#F9C900] dark:bg-white dark:text-[#111111]' : 'text-[#111111] dark:text-gray-200 hover:bg-[#E7F0FE]/60'
                  }`
                }
              >
                <FileText className="w-4 h-4" />
                <span>Reports</span>
              </NavLink>
            )}

            {showManagementDropdown && (
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="text-[10px] font-bold text-[#647084] uppercase tracking-wider px-3 mb-1">
                  Management
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {visibleManagementItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[#111111] dark:text-gray-300 hover:bg-[#E7F0FE]/60"
                      >
                        <Icon className="w-3.5 h-3.5 text-[#647084]" />
                        <span className="truncate">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Global Spotlight Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
