'use client';

import React, { useState, useEffect } from 'react';
import DashboardView from '@/components/DashboardView';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [appointments, setAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const mapAppointmentFromDB = (app: any) => {
      const isInitial = app.type && (app.type.toLowerCase().includes('primeira') || app.type.toLowerCase() === 'initial');
      return {
        id: app.id,
        patientId: app.patient_id,
        patientName: app.patient_name,
        date: app.date,
        time: app.time,
        duration: (isInitial && (!app.duration || app.duration === 45)) ? 60 : (app.duration || 45),
        type: app.type,
        status: app.status,
        price: app.price,
        paymentStatus: app.payment_status,
        notes: app.notes,
        packageId: app.package_id,
        isPackageSession: app.is_package_session
      };
    };

    const mapPatientFromDB = (p: any) => ({
      ...p,
      maritalStatus: p.marital_status || 'Solteiro(a)',
      avatar: p.avatar_url || '',
      lastVisit: p.last_visit || 'N/A'
    });

    const mapEvaluationFromDB = (e: any) => ({
      ...(e.data as any),
      id: e.id,
      patientId: e.patient_id,
      date: e.date
    });

    async function fetchData() {
      if (!supabase || !user) return;
      setLoading(true);
      try {
        const [
          { data: appointmentsData },
          { data: patientsData },
          { data: evaluationsData }
        ] = await Promise.all([
          supabase.from('appointments').select('*').order('time'),
          supabase.from('patients').select('*'),
          supabase.from('evaluations').select('*')
        ]);

        if (appointmentsData) setAppointments(appointmentsData.map(mapAppointmentFromDB));
        if (patientsData) setPatients(patientsData.map(mapPatientFromDB));
        if (evaluationsData) setEvaluations(evaluationsData.map(mapEvaluationFromDB));
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <DashboardView 
      user={user}
      appointments={appointments}
      patients={patients}
      evaluations={evaluations}
      onNewAppointment={() => router.push('/agenda')}
      onOpenAgenda={() => router.push('/agenda')}
      onStartConsultation={(id) => router.push(`/pacientes/${id}/consulta`)}
      onViewPatientHistory={(id) => router.push(`/pacientes/${id}`)}
    />
  );
}
