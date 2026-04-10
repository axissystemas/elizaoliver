'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { getInitials } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useSubscription } from '@/lib/useSubscription';
import { 
  User as UserIcon, 
  Bell, 
  Shield, 
  Database, 
  CreditCard, 
  ChevronRight,
  LogOut,
  Moon,
  Globe,
  Smartphone,
  X,
  Check,
  Download,
  Upload, 
  Building2, 
  Save,
  Plus,
  Trash2,
  Edit2,
  Stethoscope,
  Users,
  FileText,
  Activity,
  AlertCircle,
  Crown,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, ROLE_LABELS, ALL_PERMISSIONS, ROLE_PERMISSIONS } from '@/types/auth';
import ConfirmationModal from './ConfirmationModal';

interface Profile {
  name: string;
  specialty: string;
  license: string;
  email: string;
  avatar: string;
}

interface Clinic {
  name: string;
  address: string;
  phone: string;
}

interface ConsultationType {
  id: string;
  name: string;
  price: number;
}

interface Specialty {
  id: string;
  name: string;
}

interface SettingsViewProps {
  user: User;
  onLogout: () => void;
}

export default function SettingsView({ user, onLogout }: SettingsViewProps) {
  const [profile, setProfile] = useState<Profile>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auriculocare_profile');
      return saved ? JSON.parse(saved) : {
        name: user.name,
        specialty: 'Acupunturista e Especialista em MTC',
        license: 'CRM-SP 123456',
        email: user.email,
        avatar: user.avatar || 'https://picsum.photos/seed/practitioner/200/200'
      };
    }
    return {
      name: user.name,
      specialty: 'Acupunturista e Especialista em MTC',
      license: 'CRM-SP 123456',
      email: user.email,
      avatar: user.avatar || 'https://picsum.photos/seed/practitioner/200/200'
    };
  });

  const [clinic, setClinic] = useState<Clinic>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auriculocare_clinic');
      return saved ? JSON.parse(saved) : {
        name: 'TCM Wellness Center',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        phone: '(11) 3222-4444'
      };
    }
    return {
      name: 'TCM Wellness Center',
      address: 'Av. Paulista, 1000 - São Paulo, SP',
      phone: '(11) 3222-4444'
    };
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isClinicModalOpen, setIsClinicModalOpen] = useState(false);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isDevicesModalOpen, setIsDevicesModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isServicesModalOpen, setIsServicesModalOpen] = useState(false);
  const [isSpecialtiesModalOpen, setIsSpecialtiesModalOpen] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isUpgradeViewOpen, setIsUpgradeViewOpen] = useState(false);

  const { plan, planCode, checkQuota, hasFeature } = useSubscription();
  const [quotas, setQuotas] = useState<Record<string, any>>({});
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Estados para atualização de senha
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [isAuditingLoading, setIsAuditingLoading] = useState(true);

  useEffect(() => {
    async function fetchAuditState() {
      if (!supabase) return;
      const { data } = await supabase.from('system_settings').select('audit_enabled').eq('id', 1).single();
      if (data) setAuditEnabled(data.audit_enabled ?? true);
      setIsAuditingLoading(false);
    }
    fetchAuditState();
  }, []);

  useEffect(() => {
    async function fetchQuotas() {
      const pQuota = await checkQuota('max_patients');
      const uQuota = await checkQuota('max_active_users');
      setQuotas({
        patients: pQuota,
        users: uQuota
      });
    }
    if (isSubscriptionModalOpen) {
      fetchQuotas();
    }
  }, [isSubscriptionModalOpen, checkQuota]);

  useEffect(() => {
    async function fetchPlans() {
      if (!supabase) return;
      setIsLoadingPlans(true);
      const { data } = await supabase
        .from('saas_plans')
        .select(`
          *,
          limits:saas_plan_limits(
            limit_key, 
            quota_value,
            catalog:saas_limit_catalog(description, unit)
          ),
          features:saas_plan_features(
            feature_key,
            catalog:saas_feature_catalog(description)
          )
        `)
        .neq('code', 'LEGACY')
        .order('price_monthly', { ascending: true });
      
      if (data) setAvailablePlans(data);
      setIsLoadingPlans(false);
    }
    
    if (isUpgradeViewOpen) {
      fetchPlans();
    }
  }, [isUpgradeViewOpen]);

  const canEditClinic = user?.permissions.includes('settings:clinic') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('settings:delete') || user?.role === 'ADMIN';
  const canManageUsers = user?.permissions.includes('settings:users') || user?.role === 'ADMIN';

  const handleToggleAudit = async () => {
    if (!supabase || user?.role !== 'ADMIN') return;
    const newState = !auditEnabled;
    setAuditEnabled(newState);
    await supabase.from('system_settings').update({ audit_enabled: newState }).eq('id', 1);
  };
  
  const [consultationTypes, setConsultationTypes] = useState<ConsultationType[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auriculocare_consultation_types');
      return saved ? JSON.parse(saved) : [
        { id: 'initial', name: 'Primeira Consulta', price: 250 },
        { id: 'followup', name: 'Retorno', price: 150 },
        { id: 'emergency', name: 'Emergência', price: 300 }
      ];
    }
    return [
      { id: 'initial', name: 'Primeira Consulta', price: 250 },
      { id: 'followup', name: 'Retorno', price: 150 },
      { id: 'emergency', name: 'Emergência', price: 300 }
    ];
  });

  const [editingService, setEditingService] = useState<ConsultationType | null>(null);
  const [serviceFormData, setServiceFormData] = useState({ name: '', price: 0 });
  const [serviceToDelete, setServiceToDelete] = useState<ConsultationType | null>(null);
  
  const [notifications, setNotifications] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('axis_notifications_enabled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });
  
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('Português (Brasil)');
  const [currency, setCurrency] = useState('BRL (R$)');

  const [confirmExtraConsultation, setConfirmExtraConsultation] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('axis_confirm_extra_consultation');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [specialties, setSpecialties] = useState<Specialty[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('axis_specialties');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Auriculoterapia' },
        { id: '2', name: 'Acupuntura Sistêmica' },
        { id: '3', name: 'Avaliação Inicial' },
        { id: '4', name: 'Retorno' }
      ];
    }
    return [
      { id: '1', name: 'Auriculoterapia' },
      { id: '2', name: 'Acupuntura Sistêmica' },
      { id: '3', name: 'Avaliação Inicial' },
      { id: '4', name: 'Retorno' }
    ];
  });

  const [editingSpecialty, setEditingSpecialty] = useState<Specialty | null>(null);
  const [specialtyFormData, setSpecialtyFormData] = useState({ name: '' });
  const [specialtyToDelete, setSpecialtyToDelete] = useState<Specialty | null>(null);

  useEffect(() => {
    localStorage.setItem('auriculocare_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('auriculocare_clinic', JSON.stringify(clinic));
  }, [clinic]);

  useEffect(() => {
    localStorage.setItem('axis_notifications_enabled', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('auriculocare_consultation_types', JSON.stringify(consultationTypes));
  }, [consultationTypes]);

  useEffect(() => {
    localStorage.setItem('axis_specialties', JSON.stringify(specialties));
  }, [specialties]);

  useEffect(() => {
    localStorage.setItem('axis_confirm_extra_consultation', JSON.stringify(confirmExtraConsultation));
  }, [confirmExtraConsultation]);

  const handleExportData = () => {
    const data = {
      profile,
      clinic,
      patients: JSON.parse(localStorage.getItem('auriculocare_patients') || '[]'),
      appointments: JSON.parse(localStorage.getItem('auriculocare_appointments') || '[]'),
      consultations: JSON.parse(localStorage.getItem('auriculocare_consultations') || '[]'),
      evaluations: JSON.parse(localStorage.getItem('auriculocare_evaluations') || '[]'),
      protocols: JSON.parse(localStorage.getItem('auriculocare_protocols') || '[]'),
      consultationTypes: JSON.parse(localStorage.getItem('auriculocare_consultation_types') || '[]'),
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tcm_clinic_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        
        if (data.profile) {
          localStorage.setItem('auriculocare_profile', JSON.stringify(data.profile));
        }
        if (data.clinic) {
          localStorage.setItem('auriculocare_clinic', JSON.stringify(data.clinic));
        }
        if (data.patients) localStorage.setItem('auriculocare_patients', JSON.stringify(data.patients));
        if (data.appointments) localStorage.setItem('auriculocare_appointments', JSON.stringify(data.appointments));
        if (data.consultations) localStorage.setItem('auriculocare_consultations', JSON.stringify(data.consultations));
        if (data.evaluations) localStorage.setItem('auriculocare_evaluations', JSON.stringify(data.evaluations));
        if (data.protocols) localStorage.setItem('auriculocare_protocols', JSON.stringify(data.protocols));
        if (data.consultationTypes) localStorage.setItem('auriculocare_consultation_types', JSON.stringify(data.consultationTypes));

        alert('Dados importados com sucesso! A página será recarregada.');
        window.location.reload();
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Erro ao importar dados. Verifique se o arquivo é um backup válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleUpdatePassword = async () => {
    setPasswordFeedback(null);
    console.log('[Password Update] Iniciando processo para o usuário:', user?.email);

    // Validações básicas
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'Por favor, preencha a nova senha e a confirmação.' });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordFeedback({ type: 'error', message: 'As senhas não coincidem.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordFeedback({ type: 'error', message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setIsPasswordUpdating(true);
    try {
      console.log('[Password Update] Enviando comando para o servidor...');

      // 1. Tenta atualizar a senha
      // Como já vimos que o servidor processa rápido mas o client trava no storage, 
      // vamos disparar e gerenciar o sucesso de forma proativa.
      const { data, error } = await supabase.auth.updateUser({ 
        password: passwordForm.newPassword 
      });

      if (error) {
        console.error('[Password Update] Erro imediato do servidor:', error);
        throw error;
      }

      console.log('[Password Update] Sucesso detectado! Forçando logout de segurança...');

      // 2. Feedback de sucesso
      setPasswordFeedback({ 
        type: 'success', 
        message: 'Senha alterada com sucesso! Para sua segurança, faça login novamente com sua nova senha.' 
      });

      // 3. Aguarda 2 segundos para o usuário ler a mensagem e então desloga
      // O logout limpa todos os tokens travados no localStorage.
      setTimeout(() => {
        setIsSecurityModalOpen(false);
        onLogout(); // Chama o logoff instantâneo
      }, 3000);
      
    } catch (error: any) {
      console.error('[Password Update] Erro no processo:', error);
      
      let friendlyMessage = error.message || 'Falha ao atualizar senha. Tente novamente.';
      
      if (friendlyMessage.includes('is not a string')) {
        friendlyMessage = 'Formato de senha inválido.';
      } else if (friendlyMessage.includes('New password must be different')) {
        friendlyMessage = 'A nova senha deve ser diferente da atual.';
      } else if (friendlyMessage.includes('Auth session missing')) {
        friendlyMessage = 'Sessão expirada. Por favor, saia e entre novamente.';
      }

      setPasswordFeedback({ type: 'error', message: friendlyMessage });
      setIsPasswordUpdating(false);
    }
  };

  const sections = [
    {
      title: 'Clínica e Serviços',
      items: [
        { 
          icon: Building2, 
          label: 'Dados da Clínica', 
          description: 'Nome da clínica, endereço e telefone comercial.', 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-50',
          onClick: () => setIsClinicModalOpen(true)
        },
        { 
          icon: Stethoscope, 
          label: 'Tipos de Consulta', 
          description: 'Gerencie os tipos de atendimento e seus valores.', 
          color: 'text-indigo-500', 
          bg: 'bg-indigo-50',
          onClick: () => setIsServicesModalOpen(true)
        },
        { 
          icon: Activity, 
          label: 'Especialidades', 
          description: 'Gerencie as especialidades disponíveis para atendimento.', 
          color: 'text-orange-500', 
          bg: 'bg-orange-50',
          onClick: () => setIsSpecialtiesModalOpen(true)
        },
      ]
    },
    {
      title: 'Conta e Segurança',
      items: [
        { 
          icon: UserIcon, 
          label: 'Informações Pessoais', 
          description: 'Nome, e-mail, foto de perfil e especialidades.', 
          color: 'text-blue-500', 
          bg: 'bg-blue-50',
          onClick: () => setIsProfileModalOpen(true)
        },
        { 
          icon: Shield, 
          label: 'Segurança e Senha', 
          description: 'Autenticação em duas etapas e histórico de login.', 
          color: 'text-rose-500', 
          bg: 'bg-rose-50',
          onClick: () => setIsSecurityModalOpen(true)
        },
      ]
    },
    {
      title: 'Preferências do App',
      items: [
        { 
          icon: Bell, 
          label: 'Notificações', 
          description: notifications ? 'Ativadas' : 'Desativadas', 
          color: 'text-amber-500', 
          bg: 'bg-amber-50',
          onClick: () => setNotifications(!notifications)
        },
        { 
          icon: Moon, 
          label: 'Aparência', 
          description: `Tema atual: ${theme === 'light' ? 'Claro' : 'Escuro'}`, 
          color: 'text-indigo-500', 
          bg: 'bg-indigo-50',
          onClick: () => setIsAppearanceModalOpen(true)
        },
        { 
          icon: Globe, 
          label: 'Idioma e Região', 
          description: `${language} • ${currency}`, 
          color: 'text-cyan-500', 
          bg: 'bg-cyan-50',
          onClick: () => setIsLanguageModalOpen(true)
        },
        { 
          icon: AlertCircle, 
          label: 'Confirmar Consultas Extras', 
          description: confirmExtraConsultation ? 'Ativado (Aviso Prévio)' : 'Desativado (Início Direto)', 
          color: 'text-rose-500', 
          bg: 'bg-rose-50',
          onClick: () => setConfirmExtraConsultation(!confirmExtraConsultation)
        },
      ]
    },
    {
      title: 'Faturamento e Plano',
      items: [
        { 
          icon: Crown, 
          label: 'Gerenciar Assinatura', 
          description: `Plano atual: ${plan}`, 
          color: 'text-amber-600', 
          bg: 'bg-amber-100',
          onClick: () => setIsSubscriptionModalOpen(true)
        },
        { 
          icon: CreditCard, 
          label: 'Métodos de Pagamento', 
          description: 'Cartões salvos e histórico de faturas.', 
          color: 'text-emerald-500', 
          bg: 'bg-emerald-50',
          onClick: () => {
            // Placeholder para redirecionamento ao portal do Mercado Pago/Stripe
            window.open('https://www.mercadopago.com.br/savings/subscriptions', '_blank');
          }
        },
      ]
    },
    {
      title: 'Dados e Integrações',
      items: [
        { 
          icon: Database, 
          label: 'Backup e Exportação', 
          description: 'Exportar dados de pacientes e histórico clínico.', 
          color: 'text-purple-500', 
          bg: 'bg-purple-50',
          onClick: handleExportData
        },
        { 
          icon: Upload, 
          label: 'Importar Dados', 
          description: 'Restaurar backup de pacientes e configurações.', 
          color: 'text-blue-500', 
          bg: 'bg-blue-50',
          onClick: () => setIsImportModalOpen(true)
        },
        { 
          icon: Smartphone, 
          label: 'Dispositivos Conectados', 
          description: 'Gerencie sessões ativas em outros aparelhos.', 
          color: 'text-slate-500', 
          bg: 'bg-slate-50',
          onClick: () => setIsDevicesModalOpen(true)
        },
      ]
    }
  ];

  if (user?.role === 'ADMIN') {
    sections.push({
      title: 'Auditoria de Sistema',
      items: [
        { 
          icon: Shield, 
          label: 'Gravação de Logs', 
          description: isAuditingLoading ? 'Carregando...' : (auditEnabled ? 'Ativada (Rastreando)' : 'Desativada (Pausada)'), 
          color: auditEnabled ? 'text-emerald-500' : 'text-rose-500', 
          bg: auditEnabled ? 'bg-emerald-50' : 'bg-rose-50',
          onClick: handleToggleAudit
        }
      ]
    });
  }

  return (
    <div className="p-10 space-y-10 relative max-w-5xl mx-auto relative">
      {/* Header */}
      <section>
        <h2 className="text-4xl font-bold font-headline text-on-surface">Configurações</h2>
        <p className="text-on-surface-variant text-lg mt-2 font-medium">Personalize sua experiência no Axis GC.</p>
      </section>

      {/* Profile Quick View */}
      <section className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-outline-variant/10 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-secondary-container relative">
            <Image 
              src={profile.avatar} 
              alt="Practitioner" 
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <h3 className="text-xl font-bold font-headline text-on-surface">{profile.name}</h3>
            <p className="text-on-surface-variant text-sm font-medium">{profile.specialty}</p>
            <div className="flex gap-2 mt-2">
              <span className={`px-3 py-1 ${planCode === 'LEGACY' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary'} text-[10px] font-bold rounded-lg uppercase tracking-widest flex items-center gap-1`}>
                <Crown size={10} />
                Plano {plan}
              </span>
              <span className="px-3 py-1 bg-surface-container-high text-outline text-[10px] font-bold rounded-lg uppercase tracking-widest">{profile.license}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsProfileModalOpen(true)}
          className="px-6 py-3 rounded-xl border border-outline-variant/30 text-sm font-bold text-on-surface hover:bg-surface-container-low transition-all"
        >
          Editar Perfil
        </button>
      </section>

      {/* Settings Sections */}
      <div className="space-y-12">
        {sections.map((section) => (
          <div key={section.title} className="space-y-6">
            <h3 className="text-xs font-bold uppercase tracking-widest text-outline ml-4">{section.title}</h3>
            <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm border border-outline-variant/10">
              {section.items.map((item, i) => (
                <button 
                  key={item.label}
                  onClick={item.onClick}
                  className={`w-full flex items-center justify-between p-8 hover:bg-surface-container-low transition-all text-left ${i !== section.items.length - 1 ? 'border-b border-outline-variant/5' : ''}`}
                >
                  <div className="flex items-center gap-6">
                    <div className={`w-12 h-12 rounded-2xl ${item.bg} ${item.color} flex items-center justify-center`}>
                      <item.icon size={24} />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface">{item.label}</p>
                      <p className="text-sm text-on-surface-variant font-medium">{item.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="text-outline" size={20} />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Danger Zone */}
      <section className="pt-10 border-t border-outline-variant/10">
        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-6 rounded-2xl bg-rose-50 text-rose-600 font-bold hover:bg-rose-100 transition-all"
        >
          <LogOut size={20} /> Sair da Conta
        </button>
        <p className="text-center text-[10px] text-outline mt-6 uppercase tracking-widest font-bold">Axis GC v2.4.0 • Made with ❤️ for Practitioners</p>
      </section>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProfileModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Editar Perfil</h3>
                <button onClick={() => setIsProfileModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome Completo</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={e => setProfile({...profile, name: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Especialidade</label>
                  <input 
                    type="text" 
                    value={profile.specialty}
                    onChange={e => setProfile({...profile, specialty: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Registro Profissional (CRM/CRP)</label>
                  <input 
                    type="text" 
                    value={profile.license}
                    onChange={e => setProfile({...profile, license: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <button 
                  onClick={() => setIsProfileModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} /> Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clinic Modal */}
      <AnimatePresence>
        {isClinicModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClinicModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Dados da Clínica</h3>
                <button onClick={() => setIsClinicModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome da Clínica</label>
                  <input 
                    type="text" 
                    value={clinic.name}
                    onChange={e => setClinic({...clinic, name: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Endereço</label>
                  <input 
                    type="text" 
                    value={clinic.address}
                    onChange={e => setClinic({...clinic, address: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Telefone Comercial</label>
                  <input 
                    type="text" 
                    value={clinic.phone}
                    onChange={e => setClinic({...clinic, phone: e.target.value})}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                  />
                </div>
                <button 
                  onClick={() => setIsClinicModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Save size={20} /> Salvar Dados
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Modal */}
      <AnimatePresence>
        {isSecurityModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSecurityModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Segurança</h3>
                <button onClick={() => setIsSecurityModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {passwordFeedback && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-medium animate-in fade-in slide-in-from-top-2 ${
                    passwordFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'
                  }`}>
                    {passwordFeedback.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
                    <p>{passwordFeedback.message}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Senha Atual (Opcional)</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium" 
                  />
                </div>
                <button 
                  onClick={handleUpdatePassword}
                  disabled={isPasswordUpdating}
                  className="w-full py-4 rounded-2xl bg-rose-500 text-white font-bold shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                >
                  {isPasswordUpdating ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Shield size={20} />
                  )}
                  {isPasswordUpdating ? 'Atualizando...' : 'Atualizar Senha'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appearance Modal */}
      <AnimatePresence>
        {isAppearanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAppearanceModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Aparência</h3>
                <button onClick={() => setIsAppearanceModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setTheme('light')}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Globe size={24} />
                    </div>
                    <span className="font-bold">Tema Claro</span>
                  </button>
                  <button 
                    onClick={() => setTheme('dark')}
                    className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-outline-variant/20 hover:border-outline-variant'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-800 text-white flex items-center justify-center">
                      <Moon size={24} />
                    </div>
                    <span className="font-bold">Tema Escuro</span>
                  </button>
                </div>
                <button 
                  onClick={() => setIsAppearanceModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Aplicar Preferências
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Language Modal */}
      <AnimatePresence>
        {isLanguageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLanguageModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Idioma e Região</h3>
                <button onClick={() => setIsLanguageModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Idioma do Sistema</label>
                  <select 
                    value={language}
                    onChange={e => setLanguage(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                  >
                    <option value="Português (Brasil)">Português (Brasil)</option>
                    <option value="English (US)">English (US)</option>
                    <option value="Español">Español</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Moeda</label>
                  <select 
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-full px-5 py-4 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none"
                  >
                    <option value="BRL (R$)">BRL (R$)</option>
                    <option value="USD ($)">USD ($)</option>
                    <option value="EUR (€)">EUR (€)</option>
                  </select>
                </div>
                <button 
                  onClick={() => setIsLanguageModalOpen(false)}
                  className="w-full py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Salvar Preferências
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Devices Modal */}
      <AnimatePresence>
        {isDevicesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDevicesModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Dispositivos Conectados</h3>
                <button onClick={() => setIsDevicesModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-4">
                {[
                  { device: 'MacBook Pro 14"', location: 'São Paulo, Brasil', status: 'Sessão Atual', icon: Smartphone, color: 'text-primary' },
                  { device: 'iPhone 15 Pro', location: 'São Paulo, Brasil', status: 'Ativo há 2 horas', icon: Smartphone, color: 'text-outline' },
                  { device: 'iPad Air', location: 'Rio de Janeiro, Brasil', status: 'Ativo há 3 dias', icon: Smartphone, color: 'text-outline' },
                ].map((session, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-surface-container-low border border-outline-variant/5">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center ${session.color}`}>
                        <session.icon size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{session.device}</p>
                        <p className="text-[10px] text-outline uppercase tracking-widest">{session.location} • {session.status}</p>
                      </div>
                    </div>
                    {i !== 0 && (
                      <button className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:underline">Revogar</button>
                    )}
                  </div>
                ))}
                <button 
                  onClick={() => setIsDevicesModalOpen(false)}
                  className="w-full mt-4 py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Subscription Modal */}
      <AnimatePresence>
        {isSubscriptionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSubscriptionModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {isUpgradeViewOpen ? 'Planos Disponíveis' : 'Minha Assinatura'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">
                    {isUpgradeViewOpen ? 'Escolha o plano ideal para a sua clínica profissional.' : 'Gerencie seu plano e visualize o consumo de dados.'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isUpgradeViewOpen && (
                    <button 
                      onClick={() => setIsUpgradeViewOpen(false)}
                      className="px-4 py-2 hover:bg-surface-container-low rounded-xl text-sm font-bold text-primary transition-all"
                    >
                      Voltar
                    </button>
                  )}
                  <button onClick={() => {
                    setIsSubscriptionModalOpen(false);
                    setIsUpgradeViewOpen(false);
                  }} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>
              
              <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {!isUpgradeViewOpen ? (
                  <>
                    {/* Current Plan Card */}
                    <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-6 border border-primary/10 relative overflow-hidden">
                      <div className="relative z-10 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Crown className="text-amber-500" size={20} />
                            <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Plano Ativo</span>
                          </div>
                          <h4 className="text-4xl font-black font-headline text-on-surface">{plan}</h4>
                          <p className="text-on-surface-variant mt-2 font-medium">Acesso total e suporte prioritário incluso.</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-outline uppercase tracking-widest">Renovação</p>
                          <p className="text-lg font-bold text-on-surface mt-1">Mensal</p>
                        </div>
                      </div>
                      <Zap className="absolute -right-4 -bottom-4 text-primary/5 w-32 h-32 rotate-12" />
                    </div>

                    {/* Quotas */}
                    <div className="space-y-6">
                      <h5 className="text-xs font-bold uppercase tracking-widest text-outline">Consumo do Período</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Patients Quota */}
                        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/5">
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">Pacientes</p>
                              <p className="text-2xl font-bold text-on-surface">
                                {quotas.patients?.usage ?? 0}
                                <span className="text-sm text-on-surface-variant font-medium ml-1">
                                  / {quotas.patients?.isUnlimited ? '∞' : quotas.patients?.quota}
                                </span>
                              </p>
                            </div>
                            <Users className="text-blue-500/30" size={32} />
                          </div>
                          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: quotas.patients?.isUnlimited ? '0%' : `${(quotas.patients?.usage / (quotas.patients?.quota || 1)) * 100}%` }}
                              className="h-full bg-blue-500 rounded-full"
                            />
                          </div>
                        </div>

                        {/* Users/Agendas Quota */}
                        <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/5">
                          <div className="flex justify-between items-end mb-4">
                            <div>
                              <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">Profissionais</p>
                              <p className="text-2xl font-bold text-on-surface">
                                {quotas.users?.usage ?? 0}
                                <span className="text-sm text-on-surface-variant font-medium ml-1">
                                  / {quotas.users?.isUnlimited ? '∞' : quotas.users?.quota}
                                </span>
                              </p>
                            </div>
                            <Activity className="text-emerald-500/30" size={32} />
                          </div>
                          <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: quotas.users?.isUnlimited ? '0%' : `${(quotas.users?.usage / (quotas.users?.quota || 1)) * 100}%` }}
                              className="h-full bg-emerald-500 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Included Features */}
                    <div className="space-y-4">
                      <h5 className="text-xs font-bold uppercase tracking-widest text-outline">Recursos do seu Plano</h5>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: 'mod_patients', label: 'Pacientes Ilimitados' },
                          { key: 'mod_calendar', label: 'Agenda Inteligente' },
                          { key: 'mod_financial', label: 'Financeiro Completo' },
                          { key: 'mod_billing', label: 'Faturamento TISS' },
                          { key: 'mod_inventory', label: 'Estoque' },
                          { key: 'mod_reports', label: 'Relatórios Avançados' }
                        ].map(feat => {
                          const enabled = hasFeature(feat.key as any);
                          return (
                            <div key={feat.key} className={`flex items-center gap-3 p-3 rounded-xl ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-container-high text-on-surface-variant/40 opacity-50'}`}>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${enabled ? 'bg-emerald-100' : 'bg-outline-variant/20'}`}>
                                {enabled ? <Check size={14} /> : <X size={14} />}
                              </div>
                              <span className="text-sm font-bold">{feat.label}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Upgrade CTA */}
                    {planCode !== 'PREMIUM' && planCode !== 'LEGACY' && (
                      <div className="bg-surface-container-highest p-6 rounded-3xl border border-primary/5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-on-surface leading-tight">Precisa de mais poder?</p>
                          <p className="text-xs text-on-surface-variant font-medium">Libere relatórios e mais agendas agora.</p>
                        </div>
                        <button 
                          onClick={() => setIsUpgradeViewOpen(true)}
                          className="bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all"
                        >
                          Fazer Upgrade
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="space-y-6">
                    {isLoadingPlans ? (
                      <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-sm font-bold text-on-surface-variant">Carregando planos...</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {availablePlans.map((p: any) => {
                          const isPro = p.code === 'PRO';
                          const isPremium = p.code === 'PREMIUM';
                          
                          return (
                            <div 
                              key={p.id} 
                              className={`flex flex-col p-8 rounded-[2.5rem] relative transition-all duration-500 hover:translate-y-[-8px] ${
                                isPremium 
                                  ? 'bg-gradient-to-br from-surface-container-high to-surface-container-highest border-2 border-primary/20 shadow-xl' 
                                  : 'bg-surface-container-lowest border border-outline-variant/10 shadow-sm'
                              }`}
                            >
                              {isPro && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider whitespace-nowrap z-10">
                                  Melhor Custo-Benefício
                                </div>
                              )}
                              
                              {isPremium && (
                                <div className="absolute top-6 right-6 text-primary/40 opacity-20 pointer-events-none">
                                  <Zap size={64} strokeWidth={1} />
                                </div>
                              )}

                              <div className="mb-6">
                                <h5 className={`font-black text-xl ${isPremium ? 'text-primary' : 'text-on-surface'}`}>{p.name}</h5>
                                <p className="text-on-surface-variant text-[11px] mt-2 font-medium leading-relaxed">
                                  {p.description}
                                </p>
                              </div>

                              <div className="mb-8">
                                <div className="flex items-baseline gap-1">
                                  <span className="text-on-surface-variant text-sm font-bold">R$</span>
                                  <span className={`text-4xl font-black ${isPremium ? 'text-primary' : 'text-on-surface'}`}>
                                    {p.price_monthly ? p.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                                  </span>
                                  <span className="text-on-surface-variant text-sm font-bold">/mês</span>
                                </div>
                              </div>
                              
                              <div className="space-y-4 mb-10 flex-1">
                                {p.features.map((f: any) => (
                                  <div key={f.feature_key} className="flex items-start gap-3">
                                    <Check className={`${isPremium ? 'text-primary' : 'text-emerald-500'} flex-shrink-0 mt-0.5`} size={16} />
                                    <span className="text-[12px] font-bold text-on-surface-variant leading-tight">
                                      {f.catalog?.description || f.feature_key}
                                    </span>
                                  </div>
                                ))}
                                {p.limits.map((l: any) => (
                                  <div key={l.limit_key} className="flex items-start gap-3">
                                    <Plus className="text-primary/40 flex-shrink-0 mt-0.5" size={14} />
                                    <span className="text-[12px] font-bold text-on-surface">
                                      {l.quota_value === null ? 'Ilimitado' : l.quota_value}{l.catalog?.unit ? ` ${l.catalog.unit}` : ''}
                                      <span className="text-on-surface-variant/60 font-medium ml-1">
                                        {l.catalog?.description || l.limit_key}
                                      </span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                              
                              <button 
                                onClick={() => {
                                  if (p.checkout_url) {
                                    window.open(p.checkout_url, '_blank');
                                  } else {
                                    alert('Link de pagamento não configurado para este plano.');
                                  }
                                }}
                                disabled={planCode === p.code || !p.checkout_url}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 ${
                                  planCode === p.code
                                    ? 'bg-outline-variant/10 text-on-surface-variant/40 cursor-default'
                                    : isPremium
                                      ? 'bg-primary text-on-primary shadow-lg shadow-primary/20 hover:scale-[1.02] hover:shadow-xl'
                                      : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest hover:scale-[1.02]'
                                }`}
                              >
                                {planCode === p.code ? 'Seu Plano Atual' : 'Assinar Agora'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="p-8 border-t border-outline-variant/10 bg-surface-container-lowest flex justify-end">
                <button 
                  onClick={() => {
                    setIsSubscriptionModalOpen(false);
                    setIsUpgradeViewOpen(false);
                  }}
                  className="px-8 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-all"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Services Modal */}
      <AnimatePresence>
        {isServicesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServicesModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Tipos de Consulta e Valores</h3>
                <button onClick={() => setIsServicesModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8">
                {/* Add/Edit Form */}
                <div className="bg-surface-container-low p-6 rounded-[2rem] space-y-4">
                  <h4 className="text-sm font-bold text-outline uppercase tracking-widest">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Nome do Serviço</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Primeira Consulta"
                        value={serviceFormData.name}
                        onChange={e => setServiceFormData({...serviceFormData, name: e.target.value})}
                        className="w-full px-5 py-3 bg-white rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Valor (R$)</label>
                      <input 
                        type="number" 
                        placeholder="0.00"
                        value={serviceFormData.price}
                        onChange={e => setServiceFormData({...serviceFormData, price: Number(e.target.value)})}
                        className="w-full px-5 py-3 bg-white rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (!serviceFormData.name) return;
                        if (editingService) {
                          setConsultationTypes(consultationTypes.map(t => t.id === editingService.id ? { ...t, ...serviceFormData } : t));
                          setEditingService(null);
                        } else {
                          const newType: ConsultationType = {
                            id: `type-${Date.now()}`,
                            ...serviceFormData
                          };
                          setConsultationTypes([...consultationTypes, newType]);
                        }
                        setServiceFormData({ name: '', price: 0 });
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/10 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      {editingService ? <Check size={18} /> : <Plus size={18} />}
                      {editingService ? 'Atualizar' : 'Adicionar'}
                    </button>
                    {editingService && (
                      <button 
                        onClick={() => {
                          setEditingService(null);
                          setServiceFormData({ name: '', price: 0 });
                        }}
                        className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-all"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-outline uppercase tracking-widest ml-2">Serviços Cadastrados</h4>
                  <div className="space-y-3">
                    {consultationTypes.map((type) => (
                      <div key={type.id} className="flex items-center justify-between p-5 bg-white border border-outline-variant/10 rounded-2xl hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
                            <Stethoscope size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-on-surface">{type.name}</p>
                            <p className="text-sm text-primary font-black">R$ {type.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingService(type);
                              setServiceFormData({ name: type.name, price: type.price });
                            }}
                            className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => {
                                setServiceToDelete(type);
                              }}
                              className="p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Modal */}
      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-2xl font-bold font-headline text-on-surface">Importar Dados</h3>
                <button onClick={() => setIsImportModalOpen(false)} className="p-2 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                <div className="p-10 border-2 border-dashed border-outline-variant/30 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4 hover:border-primary/50 transition-all group relative">
                  <div className="w-16 h-16 rounded-2xl bg-primary/5 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">Selecione o arquivo de backup</p>
                    <p className="text-sm text-on-surface-variant font-medium mt-1">Apenas arquivos .json exportados pelo Axis GC.</p>
                  </div>
                  <input 
                    type="file" 
                    accept=".json"
                    onChange={handleImportData}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2">Aviso Importante</p>
                  <p className="text-sm text-amber-700 font-medium">A importação irá substituir todos os dados atuais (pacientes, consultas, protocolos e perfil). Recomendamos fazer um backup antes de prosseguir.</p>
                </div>

                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="w-full py-4 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Specialties Modal */}
      <AnimatePresence>
        {isSpecialtiesModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsSpecialtiesModalOpen(false);
                setEditingSpecialty(null);
                setSpecialtyFormData({ name: '' });
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center text-on-surface">
                <h3 className="text-2xl font-bold font-headline">Gerenciar Especialidades</h3>
                <button 
                  onClick={() => {
                    setIsSpecialtiesModalOpen(false);
                    setEditingSpecialty(null);
                    setSpecialtyFormData({ name: '' });
                  }} 
                  className="p-2 hover:bg-surface-container-low rounded-full transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-8 overflow-y-auto space-y-8 custom-scrollbar">
                {/* Add/Edit Form */}
                <div className="bg-surface-container-low p-6 rounded-[2rem] space-y-4">
                  <h4 className="text-sm font-bold text-outline uppercase tracking-widest">
                    {editingSpecialty ? 'Editar Especialidade' : 'Nova Especialidade'}
                  </h4>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Nome da Especialidade</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Florais de Bach"
                      value={specialtyFormData.name}
                      onChange={e => setSpecialtyFormData({ name: e.target.value })}
                      className="w-full px-5 py-3 bg-white rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => {
                        if (!specialtyFormData.name) return;
                        if (editingSpecialty) {
                          setSpecialties(specialties.map(s => s.id === editingSpecialty.id ? { ...s, name: specialtyFormData.name } : s));
                          setEditingSpecialty(null);
                        } else {
                          setSpecialties([...specialties, { id: `spec-${Date.now()}`, name: specialtyFormData.name }]);
                        }
                        setSpecialtyFormData({ name: '' });
                      }}
                      className="flex-1 py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-lg shadow-primary/10 hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                    >
                      {editingSpecialty ? <Check size={18} /> : <Plus size={18} />}
                      {editingSpecialty ? 'Atualizar' : 'Adicionar'}
                    </button>
                    {editingSpecialty && (
                      <button 
                        onClick={() => {
                          setEditingSpecialty(null);
                          setSpecialtyFormData({ name: '' });
                        }}
                        className="px-6 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm hover:bg-surface-container-highest transition-all"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* List */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-outline uppercase tracking-widest ml-2">Especialidades Ativas</h4>
                  <div className="space-y-3">
                    {specialties.map((spec) => (
                      <div key={spec.id} className="flex items-center justify-between p-5 bg-white border border-outline-variant/10 rounded-2xl hover:shadow-md transition-all group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <Activity size={20} />
                          </div>
                          <p className="font-bold text-on-surface">{spec.name}</p>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setEditingSpecialty(spec);
                              setSpecialtyFormData({ name: spec.name });
                            }}
                            className="p-2 text-outline hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </button>
                          {canDelete && (
                            <button 
                              onClick={() => {
                                setSpecialtyToDelete(spec);
                              }}
                              className="p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        onConfirm={() => {
          if (serviceToDelete) {
            setConsultationTypes(consultationTypes.filter(t => t.id !== serviceToDelete.id));
            setServiceToDelete(null);
          }
        }}
        title="Excluir Serviço"
        message={`Tem certeza que deseja excluir o serviço "${serviceToDelete?.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      <ConfirmationModal
        isOpen={!!specialtyToDelete}
        onClose={() => setSpecialtyToDelete(null)}
        onConfirm={() => {
          if (specialtyToDelete) {
            setSpecialties(specialties.filter(s => s.id !== specialtyToDelete.id));
            setSpecialtyToDelete(null);
          }
        }}
        title="Excluir Especialidade"
        message={`Tem certeza que deseja excluir a especialidade "${specialtyToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        type="danger"
      />
    </div>
  );
}
