'use client';

import { useEffect, useState } from 'react';
import ConfirmationModal from '@/components/ConfirmationModal';
import { getClinicSettings, ClinicSettings } from '@/lib/clinicService';

import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  FileText, 
  Settings, 
  CreditCard,
  PlusCircle,
  Sparkles,
  ClipboardList,
  Package,
  LogOut,
  Shield,
  BarChart3
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';
import { motion } from 'motion/react';
import { User, ROLE_PERMISSIONS, ROLE_LABELS } from '@/types/auth';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onNewAppointment?: () => void;
  onLogout?: () => void;
  user: User;
}

const navItems = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users, featureKey: 'mod_patients' },
  { id: 'evaluations', label: 'Avaliações', icon: ClipboardList, featureKey: 'mod_evaluations' },
  { id: 'calendar', label: 'Agenda', icon: Calendar, featureKey: 'mod_calendar' },
  { id: 'protocols', label: 'Protocolos e Orientações', icon: FileText, featureKey: 'mod_protocols' },
  { id: 'financial', label: 'Financeiro', icon: CreditCard, featureKey: 'mod_financial' },
  { id: 'inventory', label: 'Estoque', icon: Package, featureKey: 'mod_inventory' },
  { id: 'reports', label: 'Relatórios', icon: BarChart3, featureKey: 'mod_reports' },
  { id: 'billing', label: 'Faturamento', icon: FileText, featureKey: 'mod_billing' },
  { id: 'users', label: 'Usuários', icon: Users, featureKey: 'mod_users' },
  { id: 'audit_logs', label: 'Auditoria', icon: Shield, featureKey: 'mod_audit' },
  { id: 'settings', label: 'Configurações', icon: Settings },
];

export default function Sidebar({ activeView, setActiveView, onNewAppointment, onLogout, user }: SidebarProps) {
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings | null>(null);

  useEffect(() => {
    getClinicSettings(user.organizationId).then(setClinicSettings);

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
  }, [user.organizationId]);

  const allowedPermissions = user.permissions || [];
  const entitlements = user.subscription?.entitlements || [];

  const filteredNavItems = navItems.filter(item => {
    // 1. Permissão por Role (RBAC)
    const hasPermission = user.role === 'ADMIN' || allowedPermissions.some(p => p === item.id || p.startsWith(`${item.id}:`));
    if (!hasPermission) return false;

    // 2. Trava de Plano (SaaS) - Administradores sempre têm acesso a todas as funcionalidades
    if (item.featureKey) {
      const isFeatureEnabled = user.role === 'ADMIN' || entitlements.length === 0 || entitlements.includes(item.featureKey);
      if (!isFeatureEnabled) return false;
    }

    return true;
  });

  return (
    <aside className="w-64 flex flex-col bg-white border-r border-outline-variant/20 z-50 min-h-screen">
      <div className="p-6 flex flex-col gap-1">
        <div className="flex items-center gap-4 px-6 mb-10">
          {clinicSettings?.logo_url ? (
            <div className="w-12 h-12 rounded-2xl border border-outline-variant/20 bg-white flex items-center justify-center p-1 shadow-md shrink-0 overflow-hidden">
              <img src={clinicSettings.logo_url} alt={clinicSettings.name} className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center font-bold text-xl shadow-lg shadow-primary/30 shrink-0">
              {getInitials(clinicSettings?.name || 'Axis GC')}
            </div>
          )}
          <div className="overflow-hidden transition-all duration-300 whitespace-nowrap">
            <h1 className="text-lg font-extrabold text-primary font-headline leading-none truncate">{clinicSettings?.name || 'Axis GC'}</h1>
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Gestão de Clínica</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-on-surface-variant hover:bg-surface-container"
              )}
            >
              <Icon size={20} className={cn("shrink-0", isActive ? "text-white" : "group-hover:text-primary")} />
              <span className="font-medium text-sm text-left flex-1">{item.label}</span>
              {isActive && (
                <motion.div 
                  layoutId="active-pill"
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-white"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-4 mt-auto">

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 text-primary font-bold text-sm border border-primary/20">
              {getInitials(user.name)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user.name}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          
          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:text-error hover:bg-error/5 rounded-xl transition-all group"
          >
            <LogOut size={16} className="group-hover:text-error" />
            <span className="text-xs font-semibold">Sair do sistema</span>
          </button>
        </div>
      </div>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={() => {
          if (onLogout) onLogout();
        }}
        title="Sair do sistema"
        message="Tem certeza que deseja encerrar sua sessão? Você precisará informar seu e-mail e senha para entrar novamente."
        confirmText="Sair"
        cancelText="Cancelar"
        type="warning"
      />
    </aside>
  );
}
