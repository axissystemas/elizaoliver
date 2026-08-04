'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CalendarView from '@/components/CalendarView';
import PatientModal from '@/components/PatientModal';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/auditLogService';

function AgendaContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const forceOpen = searchParams.get('new') === 'true';
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);

  const mapAppointmentFromDB = (app: any) => ({
    id: app.id,
    patientId: app.patient_id,
    patientName: app.patient_name,
    date: app.date,
    time: app.time,
    duration: app.duration,
    type: app.type,
    status: app.status,
    price: app.price,
    paymentStatus: app.payment_status,
    notes: app.notes,
    packageId: app.package_id,
    isPackageSession: app.is_package_session
  });

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      console.log('Buscando dados da agenda (Agendamentos e Pacientes)...');
      
      // Buscamos pacotes separadamente para não quebrar a agenda se a tabela estiver ausente
      const fetchPackages = async () => {
        try {
          const { data, error } = await supabase.from('patient_packages').select('*').eq('status', 'active');
          if (error) {
            console.warn('Tabela patient_packages não encontrada ou erro de RLS. Agenda continuará sem pacotes ativos.');
            return [];
          }
          return data || [];
        } catch (e) {
          return [];
        }
      };

      const [
        { data: appData, error: appError },
        { data: patsData, error: patsError },
        pkgsData
      ] = await Promise.all([
        supabase.from('appointments').select('*').order('date', { ascending: false }),
        supabase.from('patients').select('id, name').order('name'),
        fetchPackages()
      ]);

      if (appError) throw appError;
      if (patsError) throw patsError;

      if (appData) setAppointments(appData.map(mapAppointmentFromDB));
      if (patsData) setPatients(patsData);
      setPackages(pkgsData);
    } catch (error: any) {
      console.error('Erro ao buscar dados da agenda:', error);
      alert('Aviso: Alguns dados da agenda não puderam ser carregados. ' + (error.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveAppointment = async (data: any) => {
    if (!supabase || !user) return;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s)')), 15000);
    });

    try {
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
        if (error) throw error;
        
        await logAction({ 
          action: 'UPDATE', 
          entityType: 'APPOINTMENTS', 
          userId: user.id,
          details: { summary: `Agendamento atualizado: ${data.patientName}`, id: data.id } 
        });
      } else {
        const insertCall = supabase
          .from('appointments')
          .insert([{ ...appointmentData, created_by: user.id }])
          .select()
          .single();
          
        const { data: newAppointment, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        if (error) throw error;
        
        if (newAppointment) {
          await logAction({ 
            action: 'CREATE', 
            entityType: 'APPOINTMENTS', 
            userId: user.id,
            details: { summary: `Novo agendamento: ${data.patientName}`, id: newAppointment.id } 
          });

          // Se for sessão de pacote, atualiza o uso do pacote
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
              
              if (pkgError) console.error('Erro ao atualizar uso do pacote:', pkgError);
            }
          }
        }
      }
      
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar agendamento:', error);
      alert(error.message || 'Erro ao salvar agendamento.');
      throw error;
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!supabase || !user) return;
    try {
      const appToDel = appointments.find(a => a.id === id);
      if (!appToDel) return;

      const { error } = await supabase.from('appointments').delete().eq('id', id);
      if (error) throw error;
      
      // Se era sessão de pacote, reverte o uso
      if (appToDel.is_package_session && appToDel.package_id) {
        const pkg = packages.find(p => p.id === appToDel.package_id);
        if (pkg) {
          const newUsed = Math.max(0, pkg.used_sessions - 1);
          await (supabase as any)
            .from('patient_packages')
            .update({ used_sessions: newUsed, status: 'active' })
            .eq('id', appToDel.package_id);
        }
      }

      await logAction({ 
        action: 'DELETE', 
        entityType: 'APPOINTMENTS', 
        userId: user.id,
        details: { summary: `Agendamento excluído: ${appToDel.patient_name}`, id } 
      });
      
      await fetchData();
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      alert('Erro ao excluir agendamento.');
    }
  };

  const handleSavePatient = async (patientData: any) => {
    if (!supabase || !user) return;
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{ ...patientData, created_by: user.id }])
        .select()
        .single();
      
      if (error) throw error;
      
      await logAction({
        action: 'CREATE',
        entityType: 'PATIENTS',
        userId: user.id,
        details: { summary: `Paciente criado via Agenda: ${patientData.name}`, id: data.id }
      });
      
      await fetchData();
      setIsPatientModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar paciente via agenda:', error);
      alert('Erro ao cadastrar paciente.');
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <CalendarView 
        user={user}
        appointments={appointments}
        patients={patients}
        packages={packages}
        onSaveAppointment={handleSaveAppointment}
        onDeleteAppointment={handleDeleteAppointment}
        onOpenPatientModal={() => setIsPatientModalOpen(true)}
        forceOpenModal={forceOpen}
        onRefreshData={fetchData}
      />

      <PatientModal 
        isOpen={isPatientModalOpen}
        onClose={() => setIsPatientModalOpen(false)}
        onSave={handleSavePatient}
        editingPatient={null}
      />
    </>
  );
}

export default function AgendaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <AgendaContent />
    </Suspense>
  );
}
