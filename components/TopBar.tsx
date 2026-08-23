'use client';

import { Search, Bell, HelpCircle, User as UserIcon, LogOut, Check, AlertCircle, X, Wifi, WifiOff, RefreshCw, Sun, Moon } from 'lucide-react';
import { User, ROLE_LABELS } from '@/types/auth';
import { getInitials } from '@/lib/utils';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '@/lib/ThemeContext';

import { fetchPreBookingRequests } from '@/lib/preBookingService';
import { getClinicSettings, ClinicSettings } from '@/lib/clinicService';

interface TopBarProps {
  user?: User | null;
  onLogout?: () => void;
  notifications?: any[];
  onMarkAsRead?: (id: string) => void;
  onClearAll?: () => void;
  connectionStatus?: 'online' | 'offline' | 'reconnecting';
  onRefreshConnection?: () => void;
}

export default function TopBar({ 
  user, 
  onLogout,
  notifications = [],
  onMarkAsRead,
  onClearAll,
  connectionStatus = 'online',
  onRefreshConnection
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const [profileName, setProfileName] = useState(user?.name || 'Dr. Elena Wu');
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [preBookingNotifications, setPreBookingNotifications] = useState<any[]>([]);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

  useEffect(() => {
    getClinicSettings(user?.organizationId).then(setClinicSettings);

    const handleUpdate = (e: any) => {
      if (e.detail) setClinicSettings(e.detail);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('clinic_settings_updated', handleUpdate);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('clinic_settings_updated', handleUpdate);
      }
    };
  }, [user?.organizationId]);

  useEffect(() => {
    if (user?.name) {
      setProfileName(user.name);
    }
  }, [user]);

  useEffect(() => {
    async function checkPreBookings() {
      const list = await fetchPreBookingRequests();
      const pending = list.filter(r => r.status === 'PENDENTE');
      const mapped = pending.map(req => ({
        id: `pb-${req.id}`,
        title: 'Novo Pré-Agendamento Pendente',
        message: `${req.patient_name} solicitou ${req.service_type} para ${new Date(req.requested_date + 'T00:00:00').toLocaleDateString('pt-BR')} às ${req.requested_time}.`,
        time: req.created_at,
        type: 'warning',
        read: false
      }));
      setPreBookingNotifications(mapped);
    }

    checkPreBookings();
    const interval = setInterval(checkPreBookings, 30000); // 30s silent refresh
    return () => clearInterval(interval);
  }, []);

  const allNotifications = [...preBookingNotifications, ...notifications];
  const unreadCount = allNotifications.filter(n => !n.read).length;

  return (
    <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-outline-variant/10 z-40">
      <div className="flex items-center gap-8 w-1/2">
        <div className="flex items-center gap-2.5">
          {clinicSettings?.logo_url ? (
            <img src={clinicSettings.logo_url} alt={clinicSettings.name} className="h-8 w-auto max-w-[120px] object-contain shrink-0" />
          ) : null}
          <span className="text-lg font-bold text-primary font-headline">
            {clinicSettings?.name || 'Axis GC'}
          </span>
        </div>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
          <input 
            type="text" 
            placeholder="Buscar paciente ou histórico..." 
            className="w-full pl-10 pr-4 py-2.5 bg-surface-container-high border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/60"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Connection Status Indicator */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${
          connectionStatus === 'online' ? 'bg-emerald-50 text-emerald-600' :
          connectionStatus === 'offline' ? 'bg-rose-50 text-rose-600 animate-pulse' :
          'bg-amber-50 text-amber-600'
        }`}>
          {connectionStatus === 'online' ? <Wifi size={14} /> : 
           connectionStatus === 'offline' ? <WifiOff size={14} /> : 
           <RefreshCw size={14} className="animate-spin" />}
          <span className="hidden sm:inline">
            {connectionStatus === 'online' ? 'Sistema Online' : 
             connectionStatus === 'offline' ? 'Sistema Offline' : 
             'Reconectando...'}
          </span>
          {connectionStatus === 'offline' && (
            <button 
              onClick={onRefreshConnection}
              className="ml-1 hover:bg-rose-100 p-0.5 rounded-full transition-colors"
              title="Tentar reconectar"
            >
              <RefreshCw size={12} />
            </button>
          )}
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors"
          title={theme === 'dark' ? 'Alternar para Tema Claro' : 'Alternar para Tema Escuro'}
        >
          {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} />}
        </button>

        <div className="relative">
          <button 
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isNotificationsOpen && (
              <>
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsNotificationsOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 bg-white rounded-3xl shadow-2xl border border-outline-variant/10 z-50 overflow-hidden flex flex-col max-h-[500px]"
                >
                  <div className="p-5 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-low/30">
                    <h3 className="text-sm font-bold text-on-surface">Notificações</h3>
                    <button 
                      onClick={() => {
                        onClearAll?.();
                        setIsNotificationsOpen(false);
                      }}
                      className="text-[10px] font-bold text-primary hover:underline uppercase tracking-widest"
                    >
                      Limpar Tudo
                    </button>
                  </div>
                  
                  <div className="overflow-y-auto custom-scrollbar flex-1">
                    {allNotifications.length > 0 ? (
                      allNotifications.map((n) => (
                        <div 
                          key={n.id} 
                          onClick={() => {
                            if (!n.read) onMarkAsRead?.(n.id);
                          }}
                          className={`p-4 border-b border-outline-variant/5 hover:bg-surface-container-low transition-all cursor-pointer relative group ${!n.read ? 'bg-primary/[0.02]' : ''}`}
                        >
                          <div className="flex gap-4">
                            <div className={`w-10 h-10 rounded-2xl shrink-0 flex items-center justify-center ${
                              n.type === 'success' ? 'bg-emerald-50 text-emerald-500' :
                              n.type === 'warning' ? 'bg-amber-50 text-amber-500' :
                              n.type === 'error' ? 'bg-rose-50 text-rose-500' :
                              'bg-blue-50 text-blue-500'
                            }`}>
                              {n.type === 'success' ? <Check size={18} /> : 
                               n.type === 'warning' ? <AlertCircle size={18} /> : 
                               n.type === 'error' ? <X size={18} /> : 
                               <HelpCircle size={18} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold truncate ${!n.read ? 'text-on-surface' : 'text-on-surface-variant'}`}>{n.title}</p>
                              <p className="text-[10px] text-on-surface-variant line-clamp-2 mt-0.5">{n.message}</p>
                              <p className="text-[8px] text-outline mt-2 font-bold uppercase tracking-widest">{new Date(n.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                            {!n.read && (
                              <div className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0"></div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-10 text-center space-y-3">
                        <div className="w-16 h-16 bg-surface-container-low rounded-full flex items-center justify-center mx-auto text-outline-variant">
                          <Bell size={24} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-on-surface-variant">Tudo limpo!</p>
                          <p className="text-[10px] text-outline font-medium">Você não tem novas notificações no momento.</p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-4 bg-surface-container-low/50 text-center border-t border-outline-variant/5">
                      <p className="text-[10px] text-outline font-bold uppercase tracking-widest">Fim das notificações</p>
                    </div>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
        <button className="p-2.5 text-on-surface-variant hover:bg-surface-container rounded-full transition-colors">
          <HelpCircle size={20} />
        </button>
        <div className="h-8 w-[1px] bg-outline-variant/30 mx-2"></div>
        <div className="flex items-center gap-3 pl-2 group relative">
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-on-surface">{profileName}</p>
            <p className="text-[10px] text-on-surface-variant font-medium">{user ? ROLE_LABELS[user.role] : 'Profissional'}</p>
          </div>
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm border border-primary/20 overflow-hidden relative">
            {getInitials(profileName)}
          </div>
          
          {/* Logout Dropdown */}
          <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-xl border border-outline-variant/10 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all p-2">
            <p className="px-4 py-2 text-[10px] text-outline uppercase tracking-widest font-bold border-b border-outline-variant/5 mb-1">{user?.email}</p>
            <button 
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all"
            >
              <LogOut size={18} /> Sair do Sistema
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
