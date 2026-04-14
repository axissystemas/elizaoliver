'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Search, AlertCircle, Building2, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';

interface AdminSaaSModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  availablePlans: any[];
}

export default function AdminSaaSModal({ isOpen, onClose, user, availablePlans }: AdminSaaSModalProps) {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) {
      loadOrganizations();
    }
  }, [isOpen]);

  const loadOrganizations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('admin_get_all_organizations');
      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Error fetching orgs:', error);
      alert('Erro ao carregar organizações. Verifique o console.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (organizationId: string, planId: string) => {
    if (!confirm('Tem certeza que deseja forçar a ativação deste plano para esta organização? Isso contornará qualquer cobrança externa.')) return;
    
    setProcessingId(organizationId);
    try {
      const { error } = await supabase.rpc('admin_force_plan_activation', {
        p_org_id: organizationId,
        p_plan_id: planId
      });
      if (error) throw error;
      
      alert('Plano ativado com sucesso para a organização!');
      await loadOrganizations();
    } catch (error) {
      console.error(error);
      alert('Falha ao ativar o plano.');
    } finally {
      setProcessingId(null);
    }
  };

  if (!isOpen) return null;

  const filteredOrgs = organizations.filter(org => 
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    org.profiles?.some((p: any) => p.email?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <Crown size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold font-headline text-on-surface">Administração SaaS</h3>
              <p className="text-xs text-on-surface-variant font-medium">Libere planos manualmente para as clínicas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-container rounded-full transition-all text-on-surface-variant">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b border-outline-variant/10 bg-surface-container-lowest">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text"
              placeholder="Buscar por nome da clínica ou email de dono..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-surface-container-low rounded-xl border-none outline-none font-medium text-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-surface-container-lowest">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-40 text-on-surface-variant">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
              <p className="font-medium text-sm">Carregando organizações...</p>
            </div>
          ) : filteredOrgs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-on-surface-variant">
              <AlertCircle size={32} className="mb-2 opacity-50" />
              <p className="font-medium">Nenhuma organização encontrada.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrgs.map((org) => {
                const activeSubs = org.organization_subscriptions?.filter((s:any) => s.status === 'active') || [];
                const currentSub = activeSubs[0];
                const currentPlan = availablePlans.find(p => p.id === currentSub?.plan_id);
                
                return (
                  <div key={org.id} className="bg-white border text-sm border-outline-variant/20 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      
                      {/* Org Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Building2 size={16} className="text-primary" />
                          <h4 className="font-bold text-base text-on-surface">{org.name}</h4>
                          {currentSub && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest rounded-md">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mb-3">ID: {org.id}</p>
                        
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Usuários Vinculados</p>
                          {org.profiles?.map((p: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-outline-variant/40" />
                              <span className="font-medium">{p.name || 'Sem Nome'}</span>
                              <span className="text-outline">({p.email})</span>
                              {p.role === 'ADMIN' && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">ADMIN</span>}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plan actions */}
                      <div className="bg-surface-container-low rounded-xl p-4 md:w-64 flex flex-col justify-between border border-outline-variant/10">
                        <div>
                          <p className="text-xs font-bold text-outline uppercase tracking-wider mb-2">Plano Atual</p>
                          <div className="font-medium text-on-surface mb-4">
                            {currentPlan ? (
                              <div className="flex items-center gap-2">
                                <Crown size={14} className="text-amber-500" />
                                {currentPlan.name}
                              </div>
                            ) : 'Nenhum plano ativo'}设
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-outline uppercase tracking-wider">Forçar Ativação</p>
                          <select 
                            className="w-full px-3 py-2 text-xs bg-white border border-outline-variant/20 rounded-lg outline-none cursor-pointer"
                            onChange={(e) => {
                              if (e.target.value) {
                                handleActivate(org.id, e.target.value);
                                e.target.value = ''; // reset after action
                              }
                            }}
                            disabled={processingId === org.id}
                            defaultValue=""
                          >
                            <option value="" disabled>Selecione um plano...</option>
                            {availablePlans.map(plan => (
                              <option key={plan.id} value={plan.id}>{plan.name} (R$ {plan.price_monthly})</option>
                            ))}
                          </select>
                          {processingId === org.id && <p className="text-[10px] text-primary animate-pulse font-medium">Processando...</p>}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
