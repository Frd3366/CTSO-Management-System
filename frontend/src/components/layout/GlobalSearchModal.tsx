import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  X,
  Users,
  Calendar,
  Clock,
  Layers,
  ArrowRight,
  MapPin,
  LayoutDashboard,
  CalendarDays,
  ArrowLeftRight,
  FileText,
  UserCog,
  ShieldCheck,
  Megaphone,
  History,
  FileSpreadsheet,
  User as UserIcon,
  Compass
} from 'lucide-react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const { employees, schedules, shifts, jobdesks, currentUser } = useAuth();

  // Listen for Escape key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // System pages definition for search (Requirement 8: search page menu)
  const systemPages = useMemo(() => [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, desc: 'Operational overview & KPI metrics', roles: ['Admin', 'SPV', 'Employee'] },
    { name: 'Schedule', path: '/schedule', icon: CalendarDays, desc: 'Shift roster calendar (Daily, Weekly, Monthly)', roles: ['Admin', 'SPV', 'Employee'] },
    { name: 'Jobdesk', path: '/jobdesk', icon: Layers, desc: 'CT1, CT2, CT4 work distribution matrix', roles: ['Admin', 'SPV', 'Employee'] },
    { name: 'Requests & Leaves', path: '/requests', icon: ArrowLeftRight, desc: 'Shift exchange, roster change, cuti & izin', roles: ['Admin', 'SPV', 'Employee'] },
    { name: 'Reports', path: '/reports', icon: FileText, desc: 'Operational data exports & attendance analytics', roles: ['Admin', 'SPV'] },
    { name: 'Employees Directory', path: '/management/employees', icon: Users, desc: 'Master personnel data and profiles', roles: ['Admin', 'SPV'] },
    { name: 'User Accounts', path: '/management/users', icon: UserCog, desc: 'Account credentials, logins & roles', roles: ['Admin'] },
    { name: 'Schedule Master', path: '/management/shift-master', icon: Clock, desc: 'Work schedule codes & standard hours', roles: ['Admin', 'SPV'] },
    { name: 'Jobdesk Master', path: '/management/jobdesk-master', icon: Layers, desc: 'CT task code definitions & catalogs', roles: ['Admin', 'SPV'] },
    { name: 'Role & Permissions', path: '/management/permissions', icon: ShieldCheck, desc: 'SPV & Employee granular permission matrix', roles: ['Admin'] },
    { name: 'Announcements', path: '/management/announcements', icon: Megaphone, desc: 'Broadcast operational notices to staff', roles: ['Admin', 'SPV'] },
    { name: 'Activity Logs', path: '/management/activity-logs', icon: History, desc: 'Immutable security audit trail', roles: ['Admin', 'SPV'] },
    { name: 'Schedule History', path: '/management/schedule-history', icon: FileSpreadsheet, desc: 'Roster version snapshots & diffs', roles: ['Admin', 'SPV'] },
    { name: 'Profile Settings', path: '/settings/profile', icon: UserIcon, desc: 'Personal profile & contact info', roles: ['Admin', 'SPV', 'Employee'] },
  ], []);

  // Filter based on search query
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return {
        pages: [],
        employees: [],
        schedules: [],
        shifts: [],
        jobdesks: []
      };
    }

    // 1. Pages / Menus (PRD & Requirement 8)
    const pageMatches = systemPages.filter((p) => {
      if (currentUser?.role && !p.roles.includes(currentUser.role)) return false;
      return p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.path.toLowerCase().includes(q);
    }).slice(0, 5);

    // 2. Employees (PRD 12.1: Employee ID, Name, Email)
    const empMatches = employees.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.employeeNo.toLowerCase().includes(q) ||
      e.email.toLowerCase().includes(q)
    ).slice(0, 5);

    // 3. Schedules (PRD 12.1: Employee ID, Name, Shift, Jobdesk, Location)
    const schedMatches = schedules.filter((s) => {
      if (currentUser?.role === 'Employee' && s.publicationStatus !== 'Published') {
        return false;
      }
      return (
        s.employeeName.toLowerCase().includes(q) ||
        s.employeeCode.toLowerCase().includes(q) ||
        s.shiftCode.toLowerCase().includes(q) ||
        (s.jobdeskCode && s.jobdeskCode.toLowerCase().includes(q)) ||
        (s.location && s.location.toLowerCase().includes(q)) ||
        s.date.includes(q)
      );
    }).slice(0, 5);

    // 4. Shifts
    const shiftMatches = shifts.filter((sh) =>
      sh.code.toLowerCase().includes(q) ||
      sh.name.toLowerCase().includes(q)
    ).slice(0, 4);

    // 5. Jobdesks
    const jobdeskMatches = jobdesks.filter((j) =>
      j.code.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      pages: pageMatches,
      employees: empMatches,
      schedules: schedMatches,
      shifts: shiftMatches,
      jobdesks: jobdeskMatches
    };
  }, [query, employees, schedules, shifts, jobdesks, currentUser, systemPages]);

  if (!isOpen) return null;

  const totalResults =
    searchResults.pages.length +
    searchResults.employees.length +
    searchResults.schedules.length +
    searchResults.shifts.length +
    searchResults.jobdesks.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs animate-fade-in cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-[#18181A] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden cursor-default transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3 bg-[#E7F0FE]/70 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
          <Search className="w-5 h-5 text-[#111111] dark:text-[#F9C900] flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, employees, shifts, jobdesks, or locations..."
            className="global-search-input no-focus-ring w-full pl-3 pr-8 py-1.5 text-sm text-[#111111] dark:text-white font-medium placeholder-[#647084] dark:placeholder-gray-400 bg-transparent border-0 border-none outline-none ring-0 focus:ring-0 focus:outline-none focus:border-none focus-visible:outline-none shadow-none"
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white rounded-md transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {/* Permanent Modal Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 ml-1 text-[#647084] dark:text-gray-400 hover:text-[#111111] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors flex items-center gap-1"
            title="Close Search (ESC)"
            aria-label="Close search modal"
          >
            <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-white/10 border border-slate-200 dark:border-white/10 rounded text-[#647084] dark:text-gray-300">
              ESC
            </kbd>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-[460px] overflow-y-auto p-3 space-y-4 bg-white dark:bg-[#18181A]">
          {!query && (
            <div className="py-8 text-center text-[#647084] dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#111111] dark:text-white" />
              <p className="text-xs font-semibold text-[#111111] dark:text-white">Type to search anything in CTSO Management System</p>
              <p className="text-[11px] text-[#647084] dark:text-gray-400 mt-1">Jump to pages, find scheduled personnel, or check master shift codes</p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setQuery('Schedule')}
                  className="px-2.5 py-1 rounded-lg bg-[#E7F0FE] dark:bg-white/5 text-[#111111] dark:text-gray-200 font-semibold border border-slate-200 dark:border-white/10 hover:border-[#F9C900]"
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Requests')}
                  className="px-2.5 py-1 rounded-lg bg-[#E7F0FE] dark:bg-white/5 text-[#111111] dark:text-gray-200 font-semibold border border-slate-200 dark:border-white/10 hover:border-[#F9C900]"
                >
                  Requests
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Admin')}
                  className="px-2.5 py-1 rounded-lg bg-[#E7F0FE] dark:bg-white/5 text-[#111111] dark:text-gray-200 font-mono font-semibold border border-slate-200 dark:border-white/10 hover:border-[#F9C900]"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Pagi 7')}
                  className="px-2.5 py-1 rounded-lg bg-[#E7F0FE] dark:bg-white/5 text-[#111111] dark:text-gray-200 font-mono font-semibold border border-slate-200 dark:border-white/10 hover:border-[#F9C900]"
                >
                  Pagi 7
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('Badung')}
                  className="px-2.5 py-1 rounded-lg bg-[#E7F0FE] dark:bg-white/5 text-[#111111] dark:text-gray-200 font-semibold border border-slate-200 dark:border-white/10 hover:border-[#F9C900]"
                >
                  Badung
                </button>
              </div>
            </div>
          )}

          {query && totalResults === 0 && (
            <div className="py-12 text-center text-[#647084] dark:text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30 text-[#111111] dark:text-white" />
              <p className="text-xs font-semibold text-[#111111] dark:text-white">No results found for &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-[#647084] dark:text-gray-400 mt-1">Try searching for an employee name, shift code, or page name</p>
            </div>
          )}

          {/* 1. System Pages & Menu Navigation (Requirement 8) */}
          {searchResults.pages.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#647084] dark:text-gray-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-[#F9C900]" />
                <span>Pages & Navigation ({searchResults.pages.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.pages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div
                      key={p.path}
                      onClick={() => {
                        navigate(p.path);
                        onClose();
                      }}
                      className="p-2.5 rounded-xl hover:bg-[#F5F6F8] dark:hover:bg-white/5 cursor-pointer flex items-center justify-between border border-transparent hover:border-[#E2E8F0] dark:hover:border-white/10 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-[#111111] dark:bg-white text-[#F9C900] dark:text-[#111111] flex items-center justify-center flex-shrink-0 shadow-2xs">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#111111] dark:text-white group-hover:text-[#F9C900] transition-colors">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-[#647084] dark:text-gray-400">
                            {p.desc}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-[#647084] dark:text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Employees */}
          {searchResults.employees.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#647084] dark:text-gray-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#F9C900]" />
                <span>Employees ({searchResults.employees.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.employees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => {
                      navigate('/management/employees');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-[#F5F6F8] dark:hover:bg-white/5 cursor-pointer flex items-center justify-between border border-transparent hover:border-[#E2E8F0] dark:hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#111111] dark:bg-white text-[#F9C900] dark:text-[#111111] font-black text-xs flex items-center justify-center flex-shrink-0">
                        {emp.avatarText || 'EM'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#111111] dark:text-white">
                          {emp.name}
                        </div>
                        <div className="text-[10px] text-[#647084] dark:text-gray-400 font-mono">
                          {emp.employeeNo} &bull; {emp.level} &bull; {emp.defaultLocation}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#647084] dark:text-gray-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Schedules */}
          {searchResults.schedules.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#647084] dark:text-gray-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#F9C900]" />
                <span>Roster Schedules ({searchResults.schedules.length})</span>
              </div>
              <div className="space-y-1">
                {searchResults.schedules.map((sch) => (
                  <div
                    key={sch.id}
                    onClick={() => {
                      navigate('/schedule');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl hover:bg-[#F5F6F8] dark:hover:bg-white/5 cursor-pointer flex items-center justify-between border border-transparent hover:border-[#E2E8F0] dark:hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-[#E7F0FE] dark:bg-white/10 text-[#111111] dark:text-[#F9C900]">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#111111] dark:text-white">
                          {sch.employeeName} ({sch.employeeCode})
                        </div>
                        <div className="text-[10px] text-[#647084] dark:text-gray-400 flex items-center gap-2 mt-0.5">
                          <span className="font-semibold text-[#111111] dark:text-white">{sch.date}</span>
                          <span className="px-1.5 py-0.2 rounded bg-[#E7F0FE] dark:bg-white/10 text-[#111111] dark:text-[#F9C900] font-bold border border-[#CBD5E1] dark:border-white/10">
                            {sch.shiftCode}
                          </span>
                          {sch.jobdeskCode && (
                            <span className="px-1.5 py-0.2 rounded bg-[#F9C900]/25 text-[#111111] dark:text-[#F9C900] font-bold border border-[#F9C900]/60">
                              {sch.jobdeskCode}
                            </span>
                          )}
                          {sch.location && (
                            <span className="flex items-center gap-0.5 text-[#647084] dark:text-gray-400 font-medium">
                              <MapPin className="w-2.5 h-2.5" />
                              {sch.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        sch.publicationStatus === 'Published'
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-[#FFFBEA] dark:bg-yellow-500/10 text-[#8C6700] dark:text-yellow-400 border border-[#FFEE85] dark:border-yellow-500/30'
                      }`}
                    >
                      {sch.publicationStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Master Shifts */}
          {searchResults.shifts.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#647084] dark:text-gray-400 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#F9C900]" />
                <span>Master Shifts ({searchResults.shifts.length})</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {searchResults.shifts.map((sh) => (
                  <div
                    key={sh.id}
                    onClick={() => {
                      navigate('/management/shift-master');
                      onClose();
                    }}
                    className="p-2.5 rounded-xl bg-[#F5F6F8] dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-[#111111] dark:hover:border-white/30 cursor-pointer transition-all"
                  >
                    <div className="text-xs font-bold text-[#111111] dark:text-white">{sh.name}</div>
                    <div className="text-[10px] text-[#647084] dark:text-gray-400 font-mono">
                      {sh.startTime} - {sh.endTime}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-[#F5F6F8] dark:bg-white/5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-[11px] text-[#647084] dark:text-gray-400">
          <span>Click any item to navigate immediately</span>
          <span className="font-bold text-[#111111] dark:text-white">Press ESC to close</span>
        </div>
      </div>
    </div>
  );
};
