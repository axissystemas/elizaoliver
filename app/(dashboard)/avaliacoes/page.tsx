'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EvaluationsView from '@/components/EvaluationsView';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { logAction } from '@/lib/auditLogService';

function EvaluationsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const preSelectedPatientId = searchParams.get('patientId') || undefined;
  
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [
        { data: evalsData, error: evalsError },
        { data: patsData, error: patsError }
      ] = await Promise.all([
        supabase.from('evaluations').select('*').order('date', { ascending: false }),
        supabase.from('patients').select('id, name').order('name')
      ]);

      if (evalsError) throw evalsError;
      if (patsError) throw patsError;

      if (evalsData) {
        // Map JSONB data to flat object for EvaluationsView
        setEvaluations(evalsData.map(ev => ({
          ...ev.data,
          id: ev.id,
          code: ev.code,
          patientId: ev.patient_id,
          date: ev.date
        })));
      }

      if (patsData) {
        setPatients(patsData);
      }
    } catch (error) {
      console.error('Erro ao buscar avaliações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveEvaluation = async (data: any) => {
    if (!supabase || !user) return;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite de conexão excedido (15s)')), 15000);
    });

    try {
      const evaluationData = {
        patient_id: data.patientId,
        date: data.date || new Date().toISOString().split('T')[0],
        data: data,
        updated_at: new Date().toISOString()
      };

      if (data.id && !data.id.startsWith('eval-')) {
        const updateCall = supabase
          .from('evaluations')
          .update(evaluationData)
          .eq('id', data.id);
        
        const { error } = await Promise.race([updateCall, timeoutPromise]) as any;
        if (error) throw error;
        
        await logAction({ 
          action: 'UPDATE', 
          entityType: 'EVALUATIONS', 
          userId: user.id,
          details: { summary: `Avaliação atualizada para paciente ID: ${data.patientId}`, id: data.id } 
        });
      } else {
        const insertCall = supabase
          .from('evaluations')
          .insert([{ ...evaluationData, created_by: user.id }])
          .select()
          .single();
          
        const { data: newEvaluation, error } = await Promise.race([insertCall, timeoutPromise]) as any;
        if (error) throw error;
        
        if (newEvaluation) {
          await logAction({ 
            action: 'CREATE', 
            entityType: 'EVALUATIONS', 
            userId: user.id,
            details: { summary: `Nova avaliação criada para paciente ID: ${data.patientId}`, id: newEvaluation.id } 
          });
        }
      }
      
      await fetchData();
    } catch (error: any) {
      console.error('Erro ao salvar avaliação:', error);
      alert(error.message || 'Erro ao salvar avaliação. Verifique sua conexão.');
      throw error;
    }
  };

  const handleDeleteEvaluation = async (id: string) => {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase.from('evaluations').delete().eq('id', id);
      if (error) throw error;

      await logAction({ 
        action: 'DELETE', 
        entityType: 'EVALUATIONS', 
        userId: user.id,
        details: { summary: `Avaliação excluída: ${id}`, id } 
      });
      
      await fetchData();
    } catch (error) {
      console.error('Erro ao excluir avaliação:', error);
      alert('Erro ao excluir avaliação.');
    }
  };

  if (loading && evaluations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <EvaluationsView 
      user={user}
      evaluations={evaluations}
      patients={patients}
      preSelectedPatientId={preSelectedPatientId}
      onSaveEvaluation={handleSaveEvaluation}
      onDeleteEvaluation={handleDeleteEvaluation}
    />
  );
}

// Wrapper para Suspense exigido pelo useSearchParams em rotas estáticas
export default function EvaluationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <EvaluationsContent />
    </Suspense>
  );
}
