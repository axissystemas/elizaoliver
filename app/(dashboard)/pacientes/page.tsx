'use client';

import React, { useState, useEffect, useCallback } from 'react';
import PatientsView from '@/components/PatientsView';
import PatientModal, { calculateAge } from '@/components/PatientModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/auditLogService';
import { useRouter } from 'next/navigation';

export default function PatientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<any>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<any>(null);

  const fetchPatients = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      console.log('Buscando pacientes...');
      // Tentativa 1: Query completa com joins (Convênios e Pacotes)
      let { data, error } = await supabase
        .from('patients')
        .select('*, patient_packages(status), insurance:patient_insurances(*, plan:insurance_plans(name, insurer:insurers(name)))')
        .order('name')
        .range(0, 9999);
      
      // Se falhar (provavelmente por tabelas inexistentes), tenta Fallback (Query simples apenas na tabela patients)
      if (error) {
        console.warn('Erro na busca completa de pacientes, tentando fallback simples:', error.message);
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('patients')
          .select('*')
          .order('name')
          .range(0, 9999);
        
        if (fallbackError) throw fallbackError;
        data = fallbackData;
      }
      
      if (data) {
        setPatients(data.map(p => {
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
            hasActivePackage: Array.isArray(p.patient_packages) && (p as any).patient_packages.some((pkg: any) => pkg.status === 'active'),
            insurancePlanId: (p as any).insurance?.plan_id || '',
            insuranceCardNumber: (p as any).insurance?.card_number || '',
            insuranceValidity: (p as any).insurance?.validity_date || ''
          };
        }));
      }
    } catch (error: any) {
      console.error('Erro crítico ao buscar pacientes:', error);
      alert('Erro ao carregar lista de pacientes: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const handleSavePatient = async (data: any) => {
    if (!supabase || !user) return;

    try {
      const patientData = {
        name: data.name,
        cpf: data.cpf,
        age: parseInt(data.age) || 0,
        gender: data.gender,
        phone: data.phone,
        email: data.email,
        address: data.address,
        marital_status: data.maritalStatus,
        profession: data.profession,
        status: data.status,
        birth_date: data.birthDate || null,
        avatar_url: null // Mantendo a decisão técnica de remover avatares para performance
      };

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Tempo limite excedido')), 15000);
      });

      let patientId = editingPatient?.id;

      if (editingPatient) {
        const updateCall = supabase
          .from('patients')
          .update({ ...patientData, updated_at: new Date().toISOString() })
          .eq('id', editingPatient.id);

        const { error } = await Promise.race([updateCall, timeoutPromise]) as any;
        if (error) throw error;

        await logAction({
          action: 'UPDATE',
          entityType: 'PATIENTS',
          userId: user.id,
          details: { summary: `Paciente atualizado: ${data.name}`, id: editingPatient.id }
        });
      } else {
        const insertCall = supabase
          .from('patients')
          .insert([{ ...patientData, created_by: user.id }])
          .select()
          .single();

        const { data: newPatient, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        if (error) throw error;
        patientId = newPatient.id;

        await logAction({
          action: 'CREATE',
          entityType: 'PATIENTS',
          userId: user.id,
          details: { summary: `Novo paciente cadastrado: ${data.name}`, id: patientId }
        });
      }

      // Handle Insurance Data
      if (data.insurancePlanId) {
        // Upsert insurance info
        const insuranceData = {
          patient_id: patientId,
          plan_id: data.insurancePlanId,
          card_number: data.insuranceCardNumber,
          validity_date: data.insuranceValidity || null,
          is_active: true,
          created_by: user.id
        };

        const { data: insRecord, error: insError } = await (supabase as any)
          .from('patient_insurances')
          .upsert([insuranceData], { onConflict: 'patient_id, plan_id' })
          .select()
          .single();

        if (!insError && insRecord) {
          // Update patient with the active insurance ID
          await (supabase.from('patients').update({ active_insurance_id: insRecord.id } as any) as any)
            .eq('id', patientId);
        }
      } else if (editingPatient && editingPatient.active_insurance_id) {
         // Clear insurance if it was removed
         await (supabase.from('patients').update({ active_insurance_id: null } as any) as any)
            .eq('id', patientId);
      }
      
      await fetchPatients();
      setIsPatientModalOpen(false);
      setEditingPatient(null);
    } catch (error: any) {
      console.error('Erro ao salvar paciente:', error);
      alert(error.message || 'Erro ao salvar paciente. Verifique sua conexão.');
    }
  };

  const handleDeletePatient = async () => {
    if (!supabase || !patientToDelete || !user) return;
    try {
      const { error } = await supabase.from('patients').delete().eq('id', patientToDelete.id);
      if (error) throw error;

      await logAction({ 
        action: 'DELETE', 
        entityType: 'PATIENTS', 
        userId: user.id,
        details: { summary: `Paciente excluído: ${patientToDelete.name}`, id: patientToDelete.id } 
      });
      
      await fetchPatients();
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Não foi possível excluir o paciente. Verifique se há histórico clínico travado.');
    } finally {
      setIsDeleteModalOpen(false);
      setPatientToDelete(null);
    }
  };

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <PatientsView 
        user={user}
        patients={patients}
        setPatients={setPatients}
        onNewAppointment={() => router.push('/agenda')}
        onOpenEvaluations={(id) => router.push(`/avaliacoes?patientId=${id}`)}
        onOpenDetail={(p) => router.push(`/pacientes/${p.id}`)}
        onOpenPatientModal={(p) => {
          setEditingPatient(p || null);
          setIsPatientModalOpen(true);
        }}
        onDeletePatient={async (id) => {
          const p = patients.find(p => p.id === id);
          if (p) {
            setPatientToDelete(p);
            setIsDeleteModalOpen(true);
          }
        }}
      />

      <PatientModal 
        isOpen={isPatientModalOpen}
        onClose={() => {
          setIsPatientModalOpen(false);
          setEditingPatient(null);
        }}
        onSave={handleSavePatient}
        editingPatient={editingPatient}
      />

      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setPatientToDelete(null);
        }}
        onConfirm={handleDeletePatient}
        title="Excluir Paciente"
        message={`Tem certeza que deseja excluir o paciente ${patientToDelete?.name}? Todos os registros clínicos associados serão removidos permanentemente.`}
        confirmText="Excluir"
        type="danger"
      />
    </>
  );
}
