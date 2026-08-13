'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import DashboardView from '@/components/DashboardView';
import PatientsView from '@/components/PatientsView';
import PatientDetailView from '@/components/PatientDetailView';
import CalendarView from '@/components/CalendarView';

import FinancialView from '@/components/FinancialView';
import ProtocolsView from '@/components/ProtocolsView';
import SettingsView from '@/components/SettingsView';
import UsersManagementView from '@/components/UsersManagementView';
import InventoryView from '@/components/InventoryView';
import LowStockAlertModal from '@/components/LowStockAlertModal';
import AuditLogsView from '@/components/AuditLogsView';
import EvaluationsView from '@/components/EvaluationsView';
import LoginView from '@/components/LoginView';
import BottomNav from '@/components/BottomNav';
import ReportsView from '@/components/ReportsView';
import BillingView from '@/components/BillingView';
import { AnimatePresence, motion } from 'motion/react';
import PatientModal, { calculateAge } from '@/components/PatientModal';
import ConsultationModal from '@/components/ConsultationModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { User, ROLE_PERMISSIONS, ADMIN_PERMISSIONS } from '@/types/auth';
import { Shield, Check, AlertCircle, X, Bell } from 'lucide-react';
import { logAction } from '@/lib/auditLogService';

const INITIAL_PATIENTS = [
  {
    id: '1',
    name: 'Isabella Chen',
    age: 32,
    gender: 'Feminino',
    phone: '(11) 98877-6655',
    email: 'isabella.chen@email.com',
    address: 'Rua das Flores, 123 - São Paulo, SP',
    maritalStatus: 'Solteira',
    profession: 'Designer',
    status: 'Ativo',
    lastVisit: '2024-03-12',
    avatar: 'https://picsum.photos/seed/isabella/200/200'
  },
  {
    id: '2',
    name: 'Ricardo Santos',
    age: 45,
    gender: 'Masculino',
    phone: '(11) 97766-5544',
    email: 'ricardo.santos@email.com',
    address: 'Av. Paulista, 1500 - São Paulo, SP',
    maritalStatus: 'Casado',
    profession: 'Engenheiro',
    status: 'Ativo',
    lastVisit: '2024-03-10',
    avatar: 'https://picsum.photos/seed/ricardo/200/200'
  },
  {
    id: '3',
    name: 'Ana Oliveira',
    age: 28,
    gender: 'Feminino',
    phone: '(11) 96655-4433',
    email: 'ana.oliveira@email.com',
    address: 'Rua Augusta, 450 - São Paulo, SP',
    maritalStatus: 'Divorciada',
    profession: 'Advogada',
    status: 'Inativo',
    lastVisit: '2024-02-15',
    avatar: 'https://picsum.photos/seed/ana/200/200'
  }
];

import { useAuth } from '@/lib/AuthContext';
import { supabase, getClientSupabase } from '@/lib/supabase';

export default function Home() {
  const { user, signOut, loading: authLoading, connectionStatus, refreshConnection } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | undefined>(undefined);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [consultations, setConsultations] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [billingItems, setBillingItems] = useState<any[]>([]);
  const [billingBatches, setBillingBatches] = useState<any[]>([]);
  const [insurers, setInsurers] = useState<any[]>([]);
  const [insurancePlans, setInsurancePlans] = useState<any[]>([]);
  const [insurancePrices, setInsurancePrices] = useState<any[]>([]);
  const [medicalSupplies, setMedicalSupplies] = useState<any[]>([]);
  const [procedures, setProcedures] = useState<any[]>([]);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [activeConsultation, setActiveConsultation] = useState<any>(null);
  const [editingConsultation, setEditingConsultation] = useState<any>(null);
  const [consultationToDelete, setConsultationToDelete] = useState<string | null>(null);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [patientToDelete, setPatientToDelete] = useState<any | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isUnscheduledCandidate, setIsUnscheduledCandidate] = useState(false);
  const [isCurrentConsultationPackage, setIsCurrentConsultationPackage] = useState(false);
  
  // Inventory Alert
  const [isLowStockAlertOpen, setIsLowStockAlertOpen] = useState(false);
  const [hasDismissedLowStockAlert, setHasDismissedLowStockAlert] = useState(false);
  
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [requireExtraConsultationConfirm, setRequireExtraConsultationConfirm] = useState(true);

  // Notifications State
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [activeToasts, setActiveToasts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);

  const addNotification = useCallback((title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (!isNotificationsEnabled) return;
    
    const newNotif = {
      id: crypto.randomUUID(),
      title,
      message,
      type,
      time: new Date().toISOString(),
      read: false
    };
    
    setNotifications(prev => [newNotif, ...prev].slice(0, 30));
    
    // Add to toasts
    setActiveToasts(prev => [...prev, newNotif]);
    setTimeout(() => {
      setActiveToasts(prev => prev.filter(t => t.id !== newNotif.id));
    }, 5000);
  }, [isNotificationsEnabled]);

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };
  
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  useEffect(() => {
    const loadSpecialties = () => {
      if (typeof window === 'undefined') return;
      const saved = localStorage.getItem('axis_specialties');
      if (saved) {
        setSpecialties(JSON.parse(saved));
      } else {
        const defaults = [
          { id: '1', name: 'Auriculoterapia' },
          { id: '2', name: 'Acupuntura Sistêmica' },
          { id: '3', name: 'Avaliação Inicial' },
          { id: '4', name: 'Retorno' }
        ];
        setSpecialties(defaults);
        localStorage.setItem('axis_specialties', JSON.stringify(defaults));
      }
    };

    // Load initial data from localStorage
    const savedNotifications = localStorage.getItem('axis_notifications_history');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }


    loadSpecialties();
    
    // Load extra consultation confirm setting
    const savedConfirmSetting = localStorage.getItem('axis_confirm_extra_consultation');
    setRequireExtraConsultationConfirm(savedConfirmSetting !== null ? JSON.parse(savedConfirmSetting) : true);
    
    // Load notifications setting
    const savedNotifSetting = localStorage.getItem('axis_notifications_enabled');
    setIsNotificationsEnabled(savedNotifSetting !== null ? JSON.parse(savedNotifSetting) : true);
    
    // Listen for storage changes to sync across components (like SettingsView updating it)
    window.addEventListener('storage', (e) => {
      if (e.key === 'axis_specialties') loadSpecialties();
      if (e.key === 'axis_confirm_extra_consultation' && e.newValue !== null) {
        setRequireExtraConsultationConfirm(JSON.parse(e.newValue));
      }
      if (e.key === 'axis_notifications_enabled' && e.newValue !== null) {
        setIsNotificationsEnabled(JSON.parse(e.newValue));
      }
    });

    // Notify user about connection status changes
    if (connectionStatus === 'offline') {
      addNotification('Conexão Perdida', 'Você está offline. Algumas ações podem falhar.', 'error');
    } else if (connectionStatus === 'online' && notifications[0]?.title === 'Conexão Perdida') {
      addNotification('Conexão Restabelecida', 'O sistema está online novamente.', 'success');
    }

    // Check for subscription success
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('subscription') === 'success') {
        addNotification(
          'Assinatura Confirmada!', 
          'Seu plano foi atualizado com sucesso. Os novos recursos já estão disponíveis.', 
          'success'
        );
        // Limpa a URL para não repetir a notificação no refresh
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [activeView, connectionStatus, addNotification]);

  useEffect(() => {
    localStorage.setItem('axis_notifications_history', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setIsDataLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    if (!supabase) {
      setIsDataLoading(false);
      return;
    }
    setIsDataLoading(true);
    try {
      // Definimos as promessas individualmente para tratar erros de tabelas possivelmente inexistentes
      const patientsQuery = (supabase as any).from('patients')
        .select('*, patient_packages(status), insurance:patient_insurances(*)')
        .order('name')
        .then((res: any) => res.error ? (supabase as any).from('patients').select('*').order('name') : res);

      const packagesQuery = (supabase as any).from('patient_packages').select('*').order('date', { ascending: false })
        .then((res: any) => res.error ? { data: [], error: null } : res);

      const insurersQuery = (supabase as any).from('insurers').select('*').order('name')
        .then((res: any) => res.error ? { data: [], error: null } : res);

      const insurancePlansQuery = (supabase as any).from('insurance_plans').select('*').order('name')
        .then((res: any) => res.error ? { data: [], error: null } : res);
      
      const insurancePricesQuery = (supabase as any).from('insurance_prices').select('*, procedure:procedures(*), plan:insurance_plans(*)')
        .then((res: any) => res.error ? { data: [], error: null } : res);

      const [
        { data: patientsData },
        { data: appointmentsData },
        { data: consultationsData },
        { data: evaluationsData },
        { data: protocolsData },
        { data: inventoryData },
        { data: packagesData },
        { data: financialTransactionsData },
        { data: billingItemsData },
        { data: billingBatchesData },
        { data: insurersData },
        { data: insurancePlansData },
        { data: insurancePricesData },
        { data: proceduresData },
        { data: medicalSuppliesData }
      ] = await Promise.all([
        patientsQuery,
        (supabase as any).from('appointments').select('*').order('date', { ascending: false }),
        (supabase as any).from('consultations').select('*').order('date', { ascending: false }),
        (supabase as any).from('evaluations').select('*').order('date', { ascending: false }),
        (supabase as any).from('protocols').select('*').order('name'),
        (supabase as any).from('inventory_items').select('*').order('name'),
        packagesQuery,
        (supabase as any).from('financial_transactions').select('*').order('date', { ascending: false }),
        (supabase as any).from('billing_items').select('*, patient:patients(*), procedure:procedures(*)').order('created_at', { ascending: false }),
        (supabase as any).from('billing_batches').select('*, insurer:insurers(*)').order('created_at', { ascending: false }),
        insurersQuery,
        insurancePlansQuery,
        insurancePricesQuery,
        (supabase as any).from('procedures').select('*').order('code'),
        (supabase as any).from('medical_supplies').select('*').order('name')
      ]);

      if (patientsData) {
        setPatients((patientsData as any[]).map(p => {
          const bDate = p.birth_date || p.birthDate || '';
          let computedAge = p.age;
          if ((!computedAge || isNaN(computedAge) || computedAge <= 0) && bDate) {
            computedAge = parseInt(calculateAge(bDate)) || 0;
          }
          return {
            ...p,
            age: computedAge || 0,
            birthDate: bDate,
            maritalStatus: p.marital_status || 'Solteiro(a)',
            avatar: p.avatar_url || '',
            lastVisit: p.last_visit || 'N/A',
            hasActivePackage: Array.isArray(p.patient_packages) && p.patient_packages.some((pkg: any) => pkg.status === 'active'),
            insurancePlanId: p.insurance?.plan_id || '',
            insuranceCardNumber: p.insurance?.card_number || '',
            insuranceValidity: p.insurance?.validity_date || ''
          };
        }));
      }
      if (appointmentsData) {
        setAppointments((appointmentsData as any[]).map(a => {
          const patient = (patientsData || []).find((p: any) => p.id === a.patient_id);
          return {
            ...a,
            patientId: a.patient_id,
            patientName: a.patient_name,
            paymentStatus: a.payment_status,
            price: Number(a.price || 0),
            isInsurance: !!patient?.insurance,
            planName: patient?.insurance?.insurance_plans?.name || 'Convênio'
          };
        }));
      }
      if (consultationsData) {
        setConsultations((consultationsData as any[]).map(c => ({
          ...c,
          patientId: c.patient_id,
          startTime: (c as any).start_time,
          endTime: (c as any).end_time,
          type: c.main_complaint
        })));
      }
      if (evaluationsData) {
        setEvaluations((evaluationsData as any[]).map(e => ({
          ...(e.data as any),
          id: e.id,
          code: e.code,
          patientId: e.patient_id,
          date: e.date
        })));
      }
      if (protocolsData) {
        setProtocols(protocolsData as any[]);
      }
      if (inventoryData) {
        const mappedInventory = (inventoryData as any[]).map(item => ({
          ...item,
          quantity: Number(item.quantity),
          min_quantity: Number(item.min_quantity)
        }));
        setInventoryItems(mappedInventory);
        
        // Trigger low stock notifications
        (inventoryData as any[]).filter(item => Number(item.quantity) <= Number(item.min_quantity)).forEach(item => {
          // Only add if not already notified (simple check)
          const alreadyNotified = notifications.some(n => n.title === 'Estoque Baixo' && n.message.includes(item.name));
          if (!alreadyNotified) {
            addNotification('Estoque Baixo', `O item ${item.name} atingiu o nível crítico (${item.quantity} ${item.unit}).`, 'warning');
          }
        });
        
        // Show alert if there are low stock items
        const lowStock = mappedInventory.filter(item => item.quantity <= item.min_quantity);
        if (lowStock.length > 0 && !hasDismissedLowStockAlert) {
          setIsLowStockAlertOpen(true);
        }
      }
      if (packagesData) {
        setPackages(packagesData);
      }
      if (financialTransactionsData) {
        setFinancialTransactions((financialTransactionsData as any[]).map(t => ({
          ...t,
          amount: Number(t.amount || 0)
        })));
      }

      if (billingItemsData) setBillingItems(billingItemsData as any[]);
      if (billingBatchesData) setBillingBatches(billingBatchesData as any[]);
      if (insurersData) setInsurers(insurersData as any[]);
      if (insurancePlansData) setInsurancePlans(insurancePlansData as any[]);
      if (insurancePricesData) setInsurancePrices(insurancePricesData as any[]);
      if (proceduresData) setProcedures(proceduresData as any[]);
      if (medicalSuppliesData) setMedicalSupplies(medicalSuppliesData as any[]);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleLogin = () => {
    // Auth is handled by AuthProvider
    setActiveView('dashboard');
  };

  const handleLogout = async () => {
    console.log('handleLogout called');
    try {
      await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Forçar o redirecionamento/recarga para garantir limpeza total do estado
      window.location.href = '/';
    }
  };

  const handleViewChange = (view: string) => {
    if (view !== 'evaluations' && view !== 'patient-detail') {
      setSelectedPatientId(undefined);
      setSelectedPatient(null);
    }
    setActiveView(view);
  };

  const handleOpenEvaluations = (patientId: string) => {
    setSelectedPatientId(patientId);
    setActiveView('evaluations');
  };

  const handleOpenPatientDetail = (patient: any) => {
    setSelectedPatient(patient);
    setActiveView('patient-detail');
  };

  const handleSavePatient = useCallback(async (data: any) => {
    console.log('app/page.tsx: handleSavePatient called with data:', data);
    
    if (!supabase) {
      console.error('app/page.tsx: Supabase client is null');
      throw new Error('Cliente Supabase não inicializado. Verifique sua conexão.');
    }

    if (!user) {
      console.error('app/page.tsx: No authenticated user found');
      throw new Error('Usuário não autenticado.');
    }

    try {
      // Validate avatar size
      if (data.avatar && data.avatar.startsWith('data:')) {
        const sizeInBytes = Math.round((data.avatar.length * 3) / 4);
        console.log(`app/page.tsx: Avatar size: ~${(sizeInBytes / 1024).toFixed(2)} KB`);
        if (sizeInBytes > 500 * 1024) {
          console.warn('app/page.tsx: Avatar is quite large (>500KB). This might cause timeouts.');
        }
      }

      // Map camelCase to snake_case for Supabase
      const patientData = {
        name: data.name,
        age: parseInt(data.age) || 0,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        marital_status: data.maritalStatus,
        profession: data.profession,
        status: data.status,
        avatar_url: null // Retirada permanente das imagens para ganho de performance
      };

      // Safety timeout promise (15 seconds)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s). Verifique sua rede.')), 15000);
      });

      if (editingPatient) {
        console.log('app/page.tsx: Iniciando atualização do paciente:', editingPatient.id);
        
        console.dir(patientData);
        
        // Race the database update against the timeout
        const updateCall = supabase
          .from('patients')
          .update({
            ...patientData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPatient.id);

        const { error } = await Promise.race([updateCall, timeoutPromise]) as any;
        
        if (error) {
          console.error('app/page.tsx: Erro específico do Supabase:', error.message, error.code);
          throw error;
        }

        // Since we removed .select(), we update local state with the same data we sent
        const mappedPatient = {
          ...editingPatient,
          ...data,
          age: parseInt(data.age) || 0,
          maritalStatus: data.maritalStatus,
          avatar: '',
          lastVisit: editingPatient.lastVisit || 'N/A'
        };

        setPatients(prev => prev.map(p => p.id === editingPatient.id ? mappedPatient : p));
        if (selectedPatient?.id === editingPatient.id) {
          setSelectedPatient(mappedPatient);
        }
        console.log('app/page.tsx: Atualização concluída com sucesso');
      } else {
        console.log('app/page.tsx: Iniciando inserção de novo paciente');
        
        // Race the database insert against the timeout
        const insertCall = supabase
          .from('patients')
          .insert([{
            ...patientData,
            created_by: user.id
          }])
          .select();

        const { data: insertedRows, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        
        if (error) {
          console.error('app/page.tsx: Erro no insert do Supabase:', error);
          throw error;
        }

        if (!insertedRows || insertedRows.length === 0) {
          console.error('app/page.tsx: Erro ao inserir paciente.');
          throw new Error('Erro ao inserir paciente.');
        }

        const newPatient = insertedRows[0];
        const mappedPatient = {
          ...newPatient,
          maritalStatus: newPatient.marital_status || 'Solteiro(a)',
          avatar: newPatient.avatar_url || '',
          lastVisit: newPatient.last_visit || 'N/A'
        };

        setPatients(prev => [mappedPatient, ...prev]);
        console.log('app/page.tsx: Insert successful');
      }
      
      setIsPatientModalOpen(false);
      setEditingPatient(null);
      
    } catch (error: any) {
      console.error('app/page.tsx: Error in handleSavePatient:', error);
      throw error;
    }
  }, [user, editingPatient, selectedPatient, setPatients, setSelectedPatient, setIsPatientModalOpen, setEditingPatient]);

  const [isSlowLoading, setIsSlowLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (authLoading) setIsSlowLoading(true);
    }, 5000);
    return () => clearTimeout(timer);
  }, [authLoading]);

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-surface px-6">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          {isSlowLoading && (
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center border-2 border-white"
            >
              <AlertCircle size={14} />
            </motion.div>
          )}
        </div>
        
        <div className="space-y-2">
          <p className="text-on-surface font-bold text-xl">
            {isSlowLoading ? 'Conexão Instável' : 'Carregando...'}
          </p>
          <p className="text-on-surface-variant text-sm">
            {isSlowLoading 
              ? 'A autenticação está demorando mais que o esperado. Verifique sua internet.' 
              : 'Preparando seu ambiente de trabalho...'}
          </p>
        </div>

        {isSlowLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-3 w-full pt-4"
          >
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
            >
              Recarregar Página
            </button>
            <button 
              onClick={() => {
                // Forçar limpeza de sessão local se estiver travado
                localStorage.clear();
                window.location.href = '/';
              }}
              className="px-6 py-3 bg-surface border border-outline-variant text-on-surface-variant rounded-2xl font-medium text-sm"
            >
              Limpar Cache e Sair
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const handleNewAppointment = () => {
    setActiveView('calendar');
    setIsCalendarModalOpen(true);
  };

  const handleDeletePatient = async () => {
    if (!supabase || !patientToDelete) return;
    try {
      const { error } = await supabase.from('patients').delete().eq('id', patientToDelete.id);
      if (error) throw error;
      setPatients(prev => prev.filter(p => p.id !== patientToDelete.id));
      await logAction({ 
        action: 'DELETE', 
        entityType: 'PATIENTS', 
        userId: user.id,
        details: { summary: `Paciente excluído: ${patientToDelete.name}`, id: patientToDelete.id } 
      });
      console.log('app/page.tsx: Paciente excluído com sucesso');
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Não foi possível excluir o paciente. Verifique se há histórico clínico travado ou permissões de administrador.');
    } finally {
      setPatientToDelete(null);
    }
  };

  const handleSaveAppointment = async (data: any) => {
    if (!supabase) return;

    // Safety timeout promise (15 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s). Verifique sua rede.')), 15000);
    });

    try {
      console.log('app/page.tsx: Iniciando agendamento para:', data.patientName);
      
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }

      const appointmentData = {
        patient_id: data.patientId,
        patient_name: data.patientName,
        date: data.date,
        time: data.time,
        duration: data.duration,
        type: data.type,
        status: data.status,
        payment_status: data.paymentStatus || 'pendente',
        price: data.price,
        notes: data.notes,
        package_id: data.packageId || null,
        is_package_session: data.isPackageSession || false,
        updated_at: new Date().toISOString()
      };

      if (data.id) {
        const updateCall = supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', data.id);
        
        const { error } = await Promise.race([updateCall, timeoutPromise]) as any;
        if (error) {
          console.error('app/page.tsx: Erro no update do agendamento:', error.message);
          throw error;
        }
        setAppointments(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
      } else {
        const insertCall = supabase
          .from('appointments')
          .insert([{ ...appointmentData, created_by: user?.id }])
          .select()
          .single();
          
        const { data: newAppointment, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        if (error) {
          console.error('app/page.tsx: Erro no insert do agendamento:', error.message);
          throw error;
        }
        if (newAppointment) {
          setAppointments(prev => [newAppointment, ...prev]);
          await logAction({ 
            action: 'CREATE', 
            entityType: 'FINANCIAL', 
            userId: user.id,
            details: { summary: `Novo Lançamento/Agendamento: ${data.patientName} (Status: ${data.paymentStatus})`, id: newAppointment.id } 
          });

          // If it's a package session, update the package usage
          if (data.isPackageSession && data.packageId) {
            const pkg = packages.find(p => p.id === data.packageId);
            if (pkg) {
              const newUsed = pkg.used_sessions + 1;
              const { error: pkgError } = await (supabase as any)
                .from('patient_packages')
                .update({ 
                  used_sessions: newUsed,
                  status: newUsed >= pkg.total_sessions ? 'completed' : 'active'
                })
                .eq('id', data.packageId);
              
              if (pkgError) console.error('Error updating package usage:', pkgError);
              
              setPackages(prev => prev.map(p => p.id === data.packageId ? { 
                ...p, 
                used_sessions: newUsed,
                status: newUsed >= pkg.total_sessions ? 'completed' : 'active'
              } : p));
            }
          }
        }
      }
      
      if (data.id) {
        await logAction({ 
          action: 'UPDATE', 
          entityType: 'FINANCIAL', 
          userId: user.id,
          details: { summary: `Lançamento/Agendamento Atualizado: ${data.patientName} (Status: ${data.paymentStatus})`, id: data.id } 
        });
      }
      
      console.log('app/page.tsx: Agendamento salvo com sucesso');
    } catch (error: any) {
      console.error('Error saving appointment:', error);
      alert(error.message || 'Erro ao salvar agendamento. Verifique sua conexão.');
      throw error; // Re-throw to be caught by CalendarView
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!supabase) return;
    try {
      const appToDel = appointments.find(a => a.id === id);
      if (!appToDel) return;

      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      
      setAppointments(prev => prev.filter(a => a.id !== id));
      
      // If it was a package session, REVERSE the usage
      if (appToDel.is_package_session && appToDel.package_id) {
        const pkg = packages.find(p => p.id === appToDel.package_id);
        if (pkg) {
          const newUsed = Math.max(0, pkg.used_sessions - 1);
          const { error: pkgError } = await (supabase as any)
            .from('patient_packages')
            .update({ 
              used_sessions: newUsed,
              status: 'active' // Always reset to active if we have sessions left or just deleted one
            })
            .eq('id', appToDel.package_id);
          
          if (pkgError) console.error('Error reversing package usage:', pkgError);
          
          setPackages(prev => prev.map(p => p.id === appToDel.package_id ? { 
            ...p, 
            used_sessions: newUsed,
            status: 'active'
          } : p));
        }
      }

      await logAction({ 
        action: 'DELETE', 
        entityType: 'APPOINTMENTS', 
        userId: user.id,
        details: { summary: `Consulta/Transação excluída: ${appToDel.patientName}`, id } 
      });
    } catch (error) {
      console.error('Error deleting appointment:', error);
    }
  };

  const handleSaveEvaluation = async (data: any) => {
    if (!supabase) return;

    // Safety timeout promise (15 seconds)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s). Verifique sua rede.')), 15000);
    });

    try {
      console.log('app/page.tsx: Iniciando salvamento de avaliação para paciente ID:', data.patientId);
      
      if (!user) {
        throw new Error('Usuário não autenticado.');
      }

      const evaluationData = {
        patient_id: data.patientId,
        date: data.date || new Date().toISOString().split('T')[0],
        data: data, // Store full object in JSONB column
        updated_at: new Date().toISOString()
      };

      if (data.id && data.id.startsWith('eval-') === false) { // Check if it's a real UUID or temp ID
        const updateCall = supabase
          .from('evaluations')
          .update(evaluationData)
          .eq('id', data.id);
        
        const { error } = await Promise.race([updateCall, timeoutPromise]) as any;
        if (error) {
          console.error('app/page.tsx: Erro no update da avaliação:', error.message);
          throw error;
        }
        setEvaluations(prev => prev.map(e => e.id === data.id ? { ...e, ...data } : e));
      } else {
        const insertCall = supabase
          .from('evaluations')
          .insert([{ ...evaluationData, created_by: user?.id }])
          .select()
          .single();
          
        const { data: newEvaluation, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        if (error) {
          console.error('app/page.tsx: Erro no insert da avaliação:', error.message);
          throw error;
        }
        if (newEvaluation) {
          // Map back for local state
          const mappedEval = {
            ...newEvaluation.data,
            id: newEvaluation.id,
            patientId: newEvaluation.patient_id,
            date: newEvaluation.date
          };
          setEvaluations(prev => [mappedEval, ...prev]);
        }
      }
      console.log('app/page.tsx: Avaliação salva com sucesso');
    } catch (error: any) {
      console.error('Error saving evaluation:', error);
      alert(error.message || 'Erro ao finalizar avaliação. Verifique sua conexão.');
      throw error; // Re-throw to be caught by EvaluationsView
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('evaluations').delete().eq('id', id);
      if (error) throw error;
      setEvaluations(prev => prev.filter(e => e.id !== id));
      await logAction({ 
        action: 'DELETE', 
        entityType: 'EVALUATIONS', 
        userId: user.id,
        details: { id } 
      });
    } catch (error) {
      console.error('Error deleting evaluation:', error);
    }
  };

  const handleSaveProtocol = async (data: any) => {
    if (!supabase) return;
    try {
      const protocolData = {
        name: data.title,
        description: data.description,
        points: data.points,
        category: data.category,
        updated_at: new Date().toISOString()
      };

      if (data.id && data.id.length > 10) { // Check if it's a real UUID
        const { error } = await supabase
          .from('protocols')
          .update(protocolData)
          .eq('id', data.id);
        if (error) throw error;
        setProtocols(prev => prev.map(p => p.id === data.id ? { ...p, ...data } : p));
      } else {
        const { data: newProtocol, error } = await supabase
          .from('protocols')
          .insert([{ ...protocolData, created_by: user?.id }])
          .select()
          .single();
        if (error) throw error;
        if (newProtocol) {
          setProtocols(prev => [{
            ...newProtocol,
            title: newProtocol.name,
            points: newProtocol.points || [],
            duration: '20 min',
            usage: 0,
            rating: 5.0,
            color: 'bg-emerald-500'
          }, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error saving protocol:', error);
    }
  };

  const handleDeleteProtocol = async (id: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase.from('protocols').delete().eq('id', id);
      if (error) throw error;
      setProtocols(prev => prev.filter(p => p.id !== id));
      await logAction({ 
        action: 'DELETE', 
        entityType: 'SYSTEM', 
        userId: user.id,
        details: { target: 'Protocolo', id } 
      });
    } catch (error) {
      console.error('Error deleting protocol:', error);
    }
  };

  const COLORS_ARRAY = ['bg-emerald-500', 'bg-indigo-500', 'bg-blue-500', 'bg-rose-500', 'bg-amber-500', 'bg-purple-500'];

  const handleSavePackage = async (data: any) => {
    if (!supabase) return;
    try {
      // 1. Save the package record (for usage tracking)
      const packageToInsert = {
        patient_id: data.patientId || data.patient_id,
        total_sessions: data.total_sessions,
        price: data.price,
        status: data.status || 'active',
        used_sessions: 0,
        created_by: user?.id
      };

      const { data: newPackage, error: pkgError } = await (supabase as any)
        .from('patient_packages')
        .insert([packageToInsert])
        .select()
        .single();
      
      if (pkgError) throw pkgError;
      
      // 2. Create a PENDING "Appointment" for the Package Sale
      // This makes it show up in "SESSÕES A RECEBER" in Financial View
      const financialAppointment = {
        patient_id: data.patientId || data.patient_id,
        patient_name: selectedPatient?.name || 'Paciente',
        date: data.date || new Date().toISOString().split('T')[0],
        time: '00:00',
        duration: 0,
        type: `Venda de Pacote - ${data.total_sessions} sessões`,
        status: 'scheduled',
        payment_status: 'pendente',
        price: data.price,
        notes: `Pacote ID: ${newPackage.id}`,
        created_by: user?.id,
        updated_at: new Date().toISOString()
      };

      const { data: newApp, error: appError } = await (supabase as any)
        .from('appointments')
        .insert([financialAppointment])
        .select()
        .single();

      if (appError) {
        console.error('Error creating financial appointment for package:', JSON.stringify(appError, null, 2));
        throw appError;
      }

      if (newPackage) {
        setPackages(prev => [newPackage, ...prev]);
        if (newApp) setAppointments(prev => [newApp, ...prev]);
        
        await logAction({ 
          action: 'CREATE', 
          entityType: 'FINANCIAL', 
          userId: user.id,
          details: { summary: `Venda de Pacote: ${data.total_sessions} sessões para ${selectedPatient?.name}`, id: newPackage.id } 
        });

        addNotification(
          'Pacote Vendido', 
          `Pacote registrado. Confirme o recebimento de R$ ${data.price.toLocaleString('pt-BR')} no Financeiro.`, 
          'success'
        );
        fetchData();
      }
    } catch (error: any) {
      console.error('Error saving package:', error);
      addNotification('Erro ao salvar pacote', `Ocorreu um erro: ${error.message || 'Verifique a conexão.'}`, 'error');
    }
  };

  const handleUpdatePackage = async (id: string, data: any) => {
    if (!supabase) return;
    try {
      const { error } = await (supabase as any)
        .from('patient_packages')
        .update({
          total_sessions: data.total_sessions,
          price: data.price,
          status: data.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      await logAction({ 
        action: 'UPDATE', 
        entityType: 'FINANCIAL', 
        userId: user.id,
        details: { summary: `Pacote atualizado: ${id}`, id } 
      });

      addNotification('Pacote Atualizado', 'As alterações foram salvas com sucesso.', 'success');
      fetchData();
    } catch (error: any) {
      console.error('Error updating package:', error);
      addNotification('Erro ao atualizar pacote', error.message, 'error');
    }
  };

  const handleDeletePackage = async (id: string) => {
    if (!supabase) return;
    try {
      // 1. Check for pending financial appointment associated with this package
      // The notes field contains "Pacote ID: {id}"
      const { data: pendingApps } = await (supabase as any)
        .from('appointments')
        .select('*')
        .eq('payment_status', 'pendente')
        .like('notes', `%Pacote ID: ${id}%`);

      if (pendingApps && pendingApps.length > 0) {
        // Delete pending financial entries
        for (const app of pendingApps) {
          await (supabase as any).from('appointments').delete().eq('id', app.id);
        }
      }

      // 2. Delete the package
      const { error } = await (supabase as any)
        .from('patient_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await logAction({ 
        action: 'DELETE', 
        entityType: 'FINANCIAL', 
        userId: user.id,
        details: { summary: `Pacote excluído: ${id}`, id } 
      });

      addNotification('Pacote Excluído', 'O pacote e seus lançamentos pendentes foram removidos.', 'info');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting package:', error);
      addNotification('Erro ao excluir pacote', error.message, 'error');
    }
  };

  const handleSaveInventoryItem = async (data: any) => {
    const sb = getClientSupabase();
    if (!sb) throw new Error('Não foi possível conectar ao banco de dados. Recarregue a página.');
    try {
      if (!user) throw new Error('Usuário não autenticado.');

      const itemData = {
        name: data.name,
        description: data.description,
        quantity: data.quantity,
        min_quantity: data.min_quantity,
        unit: data.unit,
        category: data.category,
        expiry_date: data.expiry_date || null,
        unit_cost: data.unit_cost || 0,
        updated_at: new Date().toISOString()
      };

      if (data.id) {
        // Prevent editing quantity directly if handled by transactions, but fallback available
        const { error } = await sb.from('inventory_items').update(itemData).eq('id', data.id);
        if (error) throw error;
        setInventoryItems(prev => prev.map(i => i.id === data.id ? { ...i, ...data } : i));
      } else {
        const { data: newItem, error } = await sb
          .from('inventory_items')
          .insert([{ ...itemData, created_by: user.id }])
          .select()
          .single();
        if (error) throw error;
        if (newItem) {
          setInventoryItems(prev => [{ ...newItem, color: COLORS_ARRAY[Math.floor(Math.random() * COLORS_ARRAY.length)] }, ...prev]);
        }
      }
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      throw error; // Re-throw para o InventoryView capturar e exibir ao usuário
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    const sb = getClientSupabase();
    if (!sb) return;
    try {
      const { error } = await sb.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      setInventoryItems(prev => prev.filter(i => i.id !== id));
      await logAction({ 
        action: 'DELETE', 
        entityType: 'INVENTORY', 
        userId: user.id,
        details: { summary: 'Item de estoque excluído', id } 
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      alert('Erro ao excluir produto.');
    }
  };

  const handleAddInventoryTransaction = async (data: any) => {
    const sb = getClientSupabase();
    if (!sb || !user) return;
    try {
      const item = inventoryItems.find(i => i.id === data.item_id);
      if (!item) throw new Error('Item não encontrado.');

      let financialId: string | null = null;
      let newQty = Number(item.quantity) || 0;
      let newAvgCost = Number(item.unit_cost || 0);

      const Q_curr = Number(item.quantity) || 0;
      const C_curr = Number(item.unit_cost || 0);
      const Q_trans = Number(data.quantity) || 0;
      const C_trans = Number(data.unit_price || 0);

      // --- 1. Lógica por Categoria ---
      if (data.category === 'PURCHASE') {
        // Compra sempre aumenta estoque e recalcula Custo Médio
        newAvgCost = (Q_curr + Q_trans) > 0 ? ((Q_curr * C_curr) + (Q_trans * C_trans)) / (Q_curr + Q_trans) : C_trans;
        newQty = Q_curr + Q_trans;

        // Gera registro financeiro se houver valor
        if (C_trans > 0) {
          const { data: finData, error: financialError } = await (sb as any)
            .from('financial_transactions')
            .insert([{
              type: 'EXPENSE',
              description: `Compra: ${item.name} (${Q_trans} ${item.unit})`,
              amount: Q_trans * C_trans,
              category: 'Materiais',
              date: new Date().toISOString().split('T')[0],
              created_by: user.id
            }])
            .select()
            .single();
          
          if (financialError) console.error('Erro ao registrar despesa automática:', financialError);
          if (finData) financialId = (finData as any).id;
        }
      } 
      else if (data.category === 'USAGE') {
        // Consumo apenas reduz estoque, mantém custo médio atual
        newQty = Math.max(0, Q_curr - Q_trans);
      } 
      else if (data.category === 'ADJUST') {
        // Ajuste Técnico (Aumenta ou Diminui) sem alterar Custo Médio (conforme regra de negócio aprovada)
        if (data.type === 'IN') {
          newQty = Q_curr + Q_trans;
        } else {
          newQty = Math.max(0, Q_curr - Q_trans);
        }
      }

      // --- 2. Salvar Transação de Estoque ---
      const { error: transactionError } = await (sb as any).from('inventory_transactions').insert([{
        item_id: data.item_id,
        type: data.type,
        category: data.category,
        quantity: Q_trans,
        unit_price: data.category === 'PURCHASE' ? C_trans : 0, // Apenas compras registram preço de custo novo
        notes: data.notes || null,
        financial_id: financialId,
        created_by: user.id
      }]);
      if (transactionError) throw transactionError;

      // --- 3. Atualizar Item Principal ---
      const { error: updateError } = await sb.from('inventory_items').update({ 
        quantity: newQty, 
        unit_cost: newAvgCost,
        updated_at: new Date().toISOString() 
      }).eq('id', item.id);
      
      if (updateError) throw updateError;

      setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, unit_cost: newAvgCost } : i));
      
      if (data.category === 'PURCHASE' && C_trans > 0) {
        fetchData(); 
      }
    } catch (error) {
      console.error('Error adding transaction:', error);
      throw error;
    }
  };

  const handleDeleteInventoryTransaction = async (transactionId: string) => {
    const sb = getClientSupabase();
    if (!sb || !user) return;
    try {
      const { data: transaction, error: tError } = await (sb as any)
        .from('inventory_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();
      
      if (tError || !transaction) throw new Error('Transação não encontrada.');

      const item = inventoryItems.find(i => i.id === (transaction as any).item_id);
      if (!item) throw new Error('Item de estoque não encontrado.');

      let newQty = Number(item.quantity);
      let newAvgCost = Number(item.unit_cost || 0);

      const Q_curr = Number(item.quantity);
      const C_curr = Number(item.unit_cost || 0);
      const Q_trans = Number((transaction as any).quantity);
      const C_trans = Number((transaction as any).unit_price || 0);

      if ((transaction as any).type === 'IN') {
        const Q_old = Q_curr - Q_trans;
        if (Q_old > 0) {
          newAvgCost = ((Q_curr * C_curr) - (Q_trans * C_trans)) / Q_old;
        } else {
          newAvgCost = 0;
        }
        newQty = Math.max(0, Q_old);

        if ((transaction as any).financial_id) {
          await (sb as any).from('financial_transactions').delete().eq('id', (transaction as any).financial_id);
        }
      } else {
        newQty = Q_curr + Q_trans;
      }

      // 4. Mark the inventory transaction as reversed (instead of deletion for audit)
      const { error: markError } = await (sb as any)
        .from('inventory_transactions')
        .update({ 
          is_reversed: true, 
          reversed_at: new Date().toISOString() 
        })
        .eq('id', transactionId);
      
      if (markError) throw markError;

      const { error: updateError } = await sb.from('inventory_items').update({ 
        quantity: newQty, 
        unit_cost: Math.max(0, newAvgCost),
        updated_at: new Date().toISOString() 
      }).eq('id', item.id);
      if (updateError) throw updateError;

      setInventoryItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, unit_cost: Math.max(0, newAvgCost) } : i));
      
      addNotification('Estorno Realizado', 'A movimentação foi desfeita e os custos recalculados.', 'success');
      fetchData(); 
    } catch (error: any) {
      console.error('Error deleting inventory transaction:', error);
      addNotification('Erro no Estorno', error.message, 'error');
    }
  };
  const handleFetchInventoryHistory = async (itemId: string) => {
    const sb = getClientSupabase();
    if (!sb) return [];
    try {
      const { data, error } = await (sb as any)
        .from('inventory_transactions')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching inventory history:', error);
      return [];
    }
  };

  const renderView = () => {
    const allowedViews = user.permissions || [];
    const hasAccess = user.role === 'ADMIN' || allowedViews.some(p => p === activeView || p.startsWith(`${activeView}:`));
    
    if (!hasAccess && activeView !== 'patient-detail') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-10 text-center">
          <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mb-6">
            <Shield size={40} />
          </div>
          <h3 className="text-2xl font-bold text-on-surface">Acesso Restrito</h3>
          <p className="text-on-surface-variant mt-2 max-w-md">
            Você não tem permissão para acessar esta área ({activeView}). 
            Entre em contato com o administrador se precisar de acesso.
          </p>
          <button 
            onClick={() => setActiveView('dashboard')}
            className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
          >
            Voltar ao Painel
          </button>
        </div>
      );
    }

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView 
            onNewAppointment={handleNewAppointment} 
            onOpenAgenda={() => setActiveView('calendar')}
            appointments={appointments}
            patients={patients}
            evaluations={evaluations}
            onStartConsultation={(patientId) => {
              const patient = patients.find(p => p.id === patientId);
              if (patient) {
                setSelectedPatient(patient);
                setEditingConsultation(null);
                setIsConsultationModalOpen(true);
              }
            }}
            onViewPatientHistory={(patientId) => {
              const patient = patients.find(p => p.id === patientId);
              if (patient) {
                setSelectedPatient(patient);
                setActiveView('patient-detail');
              }
            }}
            user={user}
          />
        );
      case 'patients':
        return <PatientsView 
          patients={patients}
          setPatients={setPatients}
          onNewAppointment={handleNewAppointment} 
          onOpenEvaluations={handleOpenEvaluations} 
          onOpenDetail={handleOpenPatientDetail}
          onOpenPatientModal={(patient) => {
            setEditingPatient(patient || null);
            setIsPatientModalOpen(true);
          }}
          onDeletePatient={async (id) => {
            const patient = patients.find(p => p.id === id);
            if (patient) setPatientToDelete(patient);
          }}
          user={user}
        />;
      case 'patient-detail':
        return (
          <PatientDetailView 
            patient={selectedPatient}
            consultations={consultations.filter(c => c.patientId === selectedPatient?.id)}
            evaluations={evaluations.filter(e => e.patientId === selectedPatient?.id)}
            inventoryItems={inventoryItems}
            user={user}
            onBack={() => {
              setSelectedPatient(null);
              setActiveView('patients');
            }}
            onEditPersonal={() => {
              setEditingPatient(selectedPatient);
              setIsPatientModalOpen(true);
            }}
            onStartConsultation={() => {
              // DETECT: Is there an appointment for this patient today?
              const todayStr = new Date().toISOString().split('T')[0];
              const todayAppointment = appointments.find(app => 
                app.patientId === selectedPatient?.id && 
                app.date === todayStr && 
                app.status === 'scheduled'
              );
              
              setIsUnscheduledCandidate(!todayAppointment);
              setIsCurrentConsultationPackage(!!todayAppointment?.is_package_session);
              setEditingConsultation(null);
              setIsConsultationModalOpen(true);
              
              addNotification(
                'Consulta Iniciada', 
                `Atendimento com ${selectedPatient?.name} iniciado com sucesso.`, 
                'success'
              );
            }}
            onEditConsultation={(consultation) => {
              setEditingConsultation(consultation);
              setIsConsultationModalOpen(true);
            }}
            onDeleteConsultation={(consultationId) => {
              setConsultationToDelete(consultationId);
            }}
            packages={packages}
            onSavePackage={handleSavePackage}
            onUpdatePackage={handleUpdatePackage}
            onDeletePackage={handleDeletePackage}
          />
        );
      case 'evaluations':
        return (
          <EvaluationsView 
            key={selectedPatientId || 'all'} 
            preSelectedPatientId={selectedPatientId} 
            evaluations={evaluations}
            patients={patients}
            onSaveEvaluation={handleSaveEvaluation}
            onDeleteEvaluation={async (id) => {
              if (!supabase) return;
              try {
                const { error } = await supabase.from('evaluations').delete().eq('id', id);
                if (error) throw error;
                setEvaluations(prev => prev.filter(e => e.id !== id));
                addNotification('Avaliação Excluída', 'Registro removido com sucesso.', 'info');
              } catch (e) {
                console.error(e);
              }
            }}
            user={user!}
          />
        );
      case 'calendar':
        return (
          <CalendarView 
            forceOpenModal={isCalendarModalOpen} 
            onModalClose={() => setIsCalendarModalOpen(false)} 
            user={user}
            appointments={appointments}
            patients={patients}
            onSaveAppointment={handleSaveAppointment}
            onDeleteAppointment={handleDeleteAppointment}
            onOpenPatientModal={() => {
              setEditingPatient(null);
              setIsPatientModalOpen(true);
            }}
            packages={packages}
          />
        );

      case 'protocols':
        return (
          <ProtocolsView 
            user={user} 
            protocols={protocols}
            onSaveProtocol={handleSaveProtocol}
            onDeleteProtocol={handleDeleteProtocol}
          />
        );
      case 'inventory':
        return <InventoryView 
          items={inventoryItems}
          onSaveItem={handleSaveInventoryItem}
          onDeleteItem={handleDeleteInventoryItem}
          onAddTransaction={handleAddInventoryTransaction}
          onDeleteTransaction={handleDeleteInventoryTransaction}
          onFetchHistory={handleFetchInventoryHistory}
          user={user}
        />;
      case 'financial':
        return (
          <FinancialView 
            user={user} 
            appointments={appointments} 
            onConfirmPayment={async (id) => {
              const app = appointments.find(a => a.id === id);
              if (app) {
                await handleSaveAppointment({ ...app, paymentStatus: 'pago' });
              }
            }}
            onDeleteTransaction={handleDeleteAppointment}
          />
        );
      case 'users':
        return <UsersManagementView user={user} />;
      case 'settings':
        return <SettingsView user={user} onLogout={handleLogout} />;
      case 'audit_logs':
        return <AuditLogsView user={user} />;
      case 'reports':
        return (
          <ReportsView 
            user={user}
            patients={patients}
            appointments={appointments}
            financialTransactions={financialTransactions}
            inventoryItems={inventoryItems}
          />
        );
      case 'billing':
        return <BillingView patients={patients} user={user} onRefresh={fetchData} billingItems={billingItems} batches={billingBatches} insurers={insurers} plans={insurancePlans} prices={insurancePrices} procedures={procedures} medicalSupplies={medicalSupplies} loading={isDataLoading} />;
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-on-surface-variant font-medium">Esta visualização ({activeView}) está em desenvolvimento.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex min-h-[100dvh] bg-surface pb-16 md:pb-0">
      <div className="no-print hidden md:block">
        <Sidebar 
          activeView={activeView} 
          setActiveView={handleViewChange} 
          onNewAppointment={handleNewAppointment} 
          onLogout={handleLogout} 
          user={user}
        />
      </div>
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden print:h-auto print:overflow-visible">
        <div className="no-print">
          <TopBar 
            user={user} 
            onLogout={handleLogout}
            notifications={notifications}
            onMarkAsRead={markNotificationAsRead}
            onClearAll={clearAllNotifications}
            connectionStatus={connectionStatus}
            onRefreshConnection={refreshConnection}
          />
        </div>
        
        <div className="flex-1 overflow-hidden relative print:overflow-visible print:h-auto">
          {/* Toasts Overlay */}
          <div className="fixed top-24 right-8 z-[100] pointer-events-none flex flex-col gap-3">
            <AnimatePresence>
              {activeToasts.map((toast) => (
                <motion.div
                  key={toast.id}
                  initial={{ opacity: 0, x: 50, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.95 }}
                  className={`pointer-events-auto p-5 rounded-[1.5rem] shadow-2xl border border-white/20 backdrop-blur-xl flex items-start gap-4 min-w-[320px] max-w-md ${
                    toast.type === 'success' ? 'bg-emerald-500/90 text-white' :
                    toast.type === 'warning' ? 'bg-amber-500/90 text-white' :
                    toast.type === 'error' ? 'bg-rose-500/90 text-white' :
                    'bg-slate-800/90 text-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                    {toast.type === 'success' ? <Check size={20} /> : 
                     toast.type === 'warning' ? <AlertCircle size={20} /> : 
                     toast.type === 'error' ? <X size={20} /> : 
                     <Bell size={20} />}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">{toast.title}</p>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed">{toast.message}</p>
                  </div>
                  <button 
                    onClick={() => setActiveToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="h-full overflow-y-auto"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
        <BottomNav activeView={activeView} setActiveView={handleViewChange} user={user!} />
      </main>

      <LowStockAlertModal 
        isOpen={isLowStockAlertOpen}
        onClose={() => {
          setIsLowStockAlertOpen(false);
          setHasDismissedLowStockAlert(true);
        }}
        onNavigateToInventory={() => {
          setActiveView('inventory');
          setHasDismissedLowStockAlert(true);
        }}
        lowStockItems={inventoryItems.filter(item => item.quantity <= item.min_quantity)}
      />

      <PatientModal 
        key={`patient-modal-${editingPatient?.id || (isPatientModalOpen ? 'new' : 'closed')}`}
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={handleSavePatient}
        editingPatient={editingPatient}
      />
      <ConsultationModal 
        key={`consultation-modal-${selectedPatient?.id || 'new'}-${editingConsultation?.id || 'new'}`}
        isOpen={isConsultationModalOpen}
        onClose={() => {
          setIsConsultationModalOpen(false);
          setEditingConsultation(null);
          setIsCurrentConsultationPackage(false);
          setIsUnscheduledCandidate(false);
        }}
        inventoryItems={inventoryItems}
        specialties={specialties}
        isUnscheduledCandidate={isUnscheduledCandidate}
        isPackageSession={isCurrentConsultationPackage}
        requireExtraConsultationConfirm={requireExtraConsultationConfirm}
        onSave={async (data) => {
          if (!supabase) return;
          try {
            // Map to consultations table schema
            const consultationData = {
              patient_id: data.patientId,
              date: new Date(data.startTime).toISOString().split('T')[0],
              start_time: data.startTime,
              end_time: data.endTime,
              notes: data.notes,
              main_complaint: data.type,
              materials_used: data.materials_used || [],
              is_unscheduled: data.is_unscheduled,
              updated_at: new Date().toISOString()
            };

            if (editingConsultation) {
              const { error } = await supabase
                .from('consultations')
                .update(consultationData)
                .eq('id', editingConsultation.id);
              
              if (error) throw error;
              setConsultations(prev => prev.map(c => c.id === editingConsultation.id ? { 
                ...c, 
                ...data,
                startTime: data.startTime,
                endTime: data.endTime
              } : c));

              // Update associated billing item if exists
              if (data.procedureId) {
                await (supabase as any)
                  .from('billing_items')
                  .update({
                    procedure_id: data.procedureId,
                    guia_number: data.guiaNumber,
                    authorization_code: data.authCode,
                    status: (data.guiaNumber && data.authCode) ? 'pending_review' : 'draft'
                  })
                  .eq('consultation_id', editingConsultation.id);
              }
            } else {
              const { data: newConsultation, error } = await supabase
                .from('consultations')
                .insert([{
                  ...consultationData,
                  created_by: user?.id
                }])
                .select()
                .single();
              
              if (error) throw error;
              addNotification('Consulta Registrada', `Atendimento de ${selectedPatient?.name} salvo com sucesso.`, 'success');
              if (newConsultation) {
                const mappedConsultation = {
                  ...newConsultation,
                  patientId: newConsultation.patient_id,
                  startTime: (newConsultation as any).start_time,
                  endTime: (newConsultation as any).end_time,
                  type: newConsultation.main_complaint
                };
                setConsultations(prev => [mappedConsultation, ...prev]);
                
                // Create Billing Item if insurance/procedure is selected
                if (data.procedureId) {
                  const billingItem = {
                    patient_id: data.patientId,
                    consultation_id: newConsultation.id,
                    procedure_id: data.procedureId,
                    plan_id: selectedPatient?.insurancePlanId,
                    professional_id: user?.id,
                    service_date: new Date(data.startTime).toISOString(),
                    guia_number: data.guiaNumber,
                    authorization_code: data.authCode,
                    status: (data.guiaNumber && data.authCode) ? 'pending_review' : 'draft',
                    created_by: user?.id
                  };
                  await (supabase as any).from('billing_items').insert([billingItem]);
                }

                // Update patient's last visit
                const lastVisit = new Date(data.endTime).toISOString().split('T')[0];
                await supabase
                  .from('patients')
                  .update({ last_visit: lastVisit })
                  .eq('id', data.patientId);
                
                setPatients(prev => prev.map(p => p.id === data.patientId ? { ...p, last_visit: lastVisit } : p));
                if (selectedPatient?.id === data.patientId) {
                  setSelectedPatient({ ...selectedPatient, last_visit: lastVisit });
                }
              }
            }

            // --- INTEGRATION: Inventory Stock Reduction & Financial Expense ---
            if (data.materials_used && data.materials_used.length > 0) {
              let totalMaterialCost = 0;
              for (const mat of data.materials_used) {
                if (!mat.itemId || !mat.quantity) continue;
                
                const item = inventoryItems.find(i => i.id === mat.itemId);
                if (item) {
                  // 1. Reduce inventory_items quantity
                  const newQty = Math.max(0, Number(item.quantity) - Number(mat.quantity));
                  await supabase.from('inventory_items').update({ quantity: newQty }).eq('id', mat.itemId);
                  
                  // 2. Add inventory_transactions record
                  await supabase.from('inventory_transactions').insert([{
                    item_id: mat.itemId,
                    type: 'OUT',
                    quantity: mat.quantity,
                    notes: `Uso em consulta: ${data.type} - Paciente: ${selectedPatient?.name}`,
                    created_by: user?.id
                  }]);
                  
                  // 3. Accumulate cost for financial entry
                  totalMaterialCost += (Number(item.unit_cost) || 0) * Number(mat.quantity);
                }
              }

              // 4. Create financial_transactions record (Expense)
              if (totalMaterialCost > 0) {
                await (supabase as any).from('financial_transactions').insert([{
                  type: 'EXPENSE',
                  description: `Materiais: ${data.type} - Paciente: ${selectedPatient?.name}`,
                  amount: totalMaterialCost,
                  category: 'Materiais',
                  date: new Date(data.startTime).toISOString().split('T')[0],
                  created_by: user?.id
                }]);
              }
            }

            // Refresh all data to reflect changes in Inventory and Financial views
            await fetchData();
          } catch (error) {
            console.error('Error saving consultation:', error);
          } finally {
            setIsConsultationModalOpen(false);
            setEditingConsultation(null);
          }
        }}
        patient={selectedPatient}
        editingConsultation={editingConsultation}
      />
      <ConfirmationModal 
        isOpen={!!consultationToDelete}
        onClose={() => setConsultationToDelete(null)}
        onConfirm={async () => {
          if (!supabase) return;
          if (consultationToDelete) {
            try {
              const { error } = await supabase
                .from('consultations')
                .delete()
                .eq('id', consultationToDelete);
              
              if (error) throw error;
              setConsultations(prev => prev.filter(c => c.id !== consultationToDelete));
            } catch (error) {
              console.error('Error deleting consultation:', error);
            } finally {
              setConsultationToDelete(null);
            }
          }
        }}
        title="Excluir Consulta"
        message="Tem certeza que deseja excluir este registro de consulta? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Manter"
      />
      <ConfirmationModal 
        isOpen={!!patientToDelete}
        onClose={() => setPatientToDelete(null)}
        onConfirm={handleDeletePatient}
        title="Excluir Paciente"
        message={`Tem certeza que deseja excluir "${patientToDelete?.name}"? Esta ação apagará permanentemente todo o histórico de consultas, agendamentos e evoluções em cascata. Não é possível desfazer.`}
        confirmText="Excluir Permanentemente"
        cancelText="Cancelar"
      />
    </div>
  );
}
