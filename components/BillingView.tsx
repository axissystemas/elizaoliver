'use client';

import React, { useState, useRef } from 'react';
import { 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Filter, 
  Search,
  Building2,
  ListOrdered,
  DollarSign,
  Package,
  Calendar,
  ChevronRight,
  MoreVertical,
  Clock,
  ArrowUpRight,
  Inbox,
  X,
  TrendingUp,
  Zap,
  BarChart3,
  Edit2,
  RotateCcw,
  Trash2,
  Edit3,
  AlertTriangle,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '@/types/auth';
import { BillingItem, BillingBatch, Insurer, InsurancePlan, InsurancePrice, BillingItemStatus, Procedure, MedicalSupply } from '@/types/billing';
import { supabase } from '@/lib/supabase';

interface BillingViewProps {
  user: User;
  billingItems?: BillingItem[];
  batches?: BillingBatch[];
  insurers?: Insurer[];
  plans?: InsurancePlan[];
  prices?: InsurancePrice[];
  procedures?: Procedure[];
  medicalSupplies?: MedicalSupply[];
  patients?: any[];
  loading?: boolean;
  onRefresh?: () => void;
}

export default function BillingView({ 
  user, 
  billingItems = [], 
  batches = [], 
  insurers = [], 
  plans = [], 
  prices = [],
  procedures = [],
  medicalSupplies = [],
  patients = [],
  loading = false,
  onRefresh 
}: BillingViewProps) {
  const [activeTab, setActiveTab] = useState<'pendencies' | 'batches' | 'analytics' | 'insurers' | 'prices'>('pendencies');
  const [activePricesTab, setActivePricesTab] = useState<'procedures' | 'medicalSupplies'>('procedures');
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(25);
  
  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch Details state
  const [selectedBatch, setSelectedBatch] = useState<BillingBatch | null>(null);
  
  // Reconciliation state (Phase 3)
  const [isReconciling, setIsReconciling] = useState(false);
  const [reconcileValues, setReconcileValues] = useState<Record<string, { paid: number; glossed: number }>>({});
  const [glossForm, setGlossForm] = useState<{ itemId: string; code: string; reason: string } | null>(null);
  const [reconcileSaving, setReconcileSaving] = useState(false);

  // Modals state
  const [isInsurerModalOpen, setIsInsurerModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isProcedureModalOpen, setIsProcedureModalOpen] = useState(false);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [isManualItemModalOpen, setIsManualItemModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  
  const [editingItem, setEditingItem] = useState<any>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [insurerForm, setInsurerForm] = useState({ name: '', ans_registration: '', logo_url: '' });
  const [planForm, setPlanForm] = useState({ name: '', insurer_id: '', type: 'ambulatorial' });
  const [procedureForm, setProcedureForm] = useState({ name: '', code: '', description: '', category: 'CONSULTA' });
  const [priceForm, setPriceForm] = useState({ plan_id: '', procedure_id: '', value: 0 });
  const [manualItemForm, setManualItemForm] = useState({ 
    patient_id: '', 
    insurance_plan_id: '', 
    procedure_id: '', 
    service_date: new Date().toISOString().split('T')[0], 
    guia_number: '', 
    auth_number: '' 
  });
  const [batchForm, setBatchForm] = useState({
    insurer_id: '',
    competence: new Date().toISOString().substring(0, 7), // YYYY-MM
  });

  // Derived filtered lists for the search
  const filteredProcedures = (procedures || []).filter(p => 
    (p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     p.code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredMedicalSupplies = (medicalSupplies || []).filter(m => 
    (m.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.code?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSaveInsurer = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      const { logo_url, ...validInsurerForm } = insurerForm;
      const payload: any = { ...validInsurerForm, created_by: user.id };
      if (editingItem?.id) payload.id = editingItem.id;

      const { error } = await (supabase as any).from('insurers').upsert([payload]);
      if (error) throw error;
      
      setIsInsurerModalOpen(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao salvar operadora:', error);
      alert('Erro ao salvar operadora: ' + (error.message || 'Verifique se o nome já existe.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInsurer = async () => {
    if (!supabase || !editingItem?.id) return;
    if (!window.confirm('Tem certeza que deseja excluir esta operadora?')) return;
    
    setIsSaving(true);
    try {
      const { error } = await (supabase as any).from('insurers').delete().eq('id', editingItem.id);
      if (error) throw error;
      
      setIsInsurerModalOpen(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao excluir operadora:', error);
      alert('Erro ao excluir operadora. Motivo: ' + (error.message || 'Existem dependências atreladas, como Planos, Lotes ou Guias.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePlan = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      const { type, ...validPlanForm } = planForm;
      const payload: any = { ...validPlanForm, created_by: user.id };
      if (editingItem?.id) payload.id = editingItem.id;

      const { error } = await (supabase as any).from('insurance_plans').upsert([payload]);
      if (error) throw error;
      setIsPlanModalOpen(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao salvar plano:', error);
      alert('Erro ao salvar plano: ' + (error.message || 'Verifique os dados.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveProcedure = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      const payload: any = { ...procedureForm, created_by: user.id };
      if (editingItem?.id) payload.id = editingItem.id;

      const { error } = await (supabase as any).from('procedures').upsert([payload]);
      if (error) throw error;
      setIsProcedureModalOpen(false);
      setEditingItem(null);
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao salvar procedimento:', error);
      alert('Erro ao salvar procedimento: ' + (error.message || 'Ocorreu um erro inesperado.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualItem = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      let unit_value = 0;
      const matchedPrice = prices.find(p => p.plan_id === manualItemForm.insurance_plan_id && p.procedure_id === manualItemForm.procedure_id);
      if (matchedPrice) {
         unit_value = matchedPrice.unit_price;
      }
      
      const serviceDate = new Date(manualItemForm.service_date);
      const competence = `${serviceDate.getFullYear()}-${String(serviceDate.getMonth() + 1).padStart(2, '0')}`;

      const payload: any = { 
        ...manualItemForm,
        competence,
        unit_value: Number(unit_value),
        total_presented_value: Number(unit_value),
        quantity: 1,
        created_by: user.id 
      };

      if (editingItem?.id && isManualItemModalOpen) {
        const { error } = await (supabase as any)
          .from('billing_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('billing_items')
          .insert([{ ...payload, status: 'pending' }]);
        if (error) throw error;
      }
      
      setIsManualItemModalOpen(false);
      setEditingItem(null);
      setManualItemForm({ patient_id: '', insurance_plan_id: '', procedure_id: '', service_date: new Date().toISOString().split('T')[0], guia_number: '', auth_number: '' });
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao salvar item:', error);
      alert('Erro ao processar item: ' + (error.message || 'Verifique os dados.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!supabase || !confirm('Tem certeza que deseja excluir esta pendência?')) return;
    try {
      const { error } = await (supabase as any).from('billing_items').delete().eq('id', itemId);
      if (error) throw error;
      if (onRefresh) onRefresh();
      setActiveMenuId(null);
    } catch (error) {
      console.error('Erro ao excluir item:', error);
      alert('Erro ao excluir item.');
    }
  };

  const handleUpdateItemStatus = async (itemId: string, status: BillingItemStatus) => {
    if (!supabase) return;
    try {
      const { error } = await (supabase as any).from('billing_items').update({ status }).eq('id', itemId);
      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar status do item:', error);
    }
  };

  const handleBulkUpdateStatus = async (status: BillingItemStatus) => {
    if (!supabase || selectedIds.size === 0) return;
    setIsSaving(true);
    try {
      const { error } = await (supabase as any)
        .from('billing_items')
        .update({ status })
        .in('id', Array.from(selectedIds));
      
      if (error) throw error;
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar itens em massa:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === billingItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(billingItems.map(item => item.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleOpenBatchModal = () => {
    if (selectedIds.size === 0) {
      alert('Selecione ao menos um item para criar um lote.');
      return;
    }

    // Validate that all selected items belong to the same insurer
    const selectedItems = billingItems.filter(i => selectedIds.has(i.id));
    const insurerIds = new Set(selectedItems.map(i => i.plan?.insurer_id).filter(Boolean));

    if (insurerIds.size > 1) {
      alert('Todos os itens de um lote devem pertencer à mesma operadora.');
      return;
    }

    if (insurerIds.size === 0) {
      alert('Não foi possível identificar a operadora dos itens selecionados.');
      return;
    }

    const insurerId = Array.from(insurerIds)[0] as string;
    setBatchForm({
      insurer_id: insurerId,
      competence: new Date().toISOString().substring(0, 7),
    });
    setIsBatchModalOpen(true);
  };

  const handleSaveBatch = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      // 1. Calculate total value of selected items
      const selectedItems = billingItems.filter(i => selectedIds.has(i.id));
      const totalPresented = selectedItems.reduce((acc, i) => acc + Number(i.total_presented_value || 0), 0);

      // 2. Create the batch
      const { data: batch, error: batchError } = await (supabase as any)
        .from('billing_batches')
        .insert([{
          insurer_id: batchForm.insurer_id,
          competence: batchForm.competence,
          status: 'open',
          total_presented_value: totalPresented,
          total_paid_value: 0,
          created_by: user.id
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      // 3. Update items with the new batch_id and status 'ready_to_bill'
      // We use RPC or multiple updates if the scale is small. 
      // For now, let's update them all to 'ready_to_bill' or keep status? 
      // The requirement says agrupá-los, usually billed items go to 'billed' status.
      const { error: itemsError } = await (supabase as any)
        .from('billing_items')
        .update({ 
          batch_id: batch.id,
          status: 'ready_to_bill' // Ready to be sent to insurer
        })
        .in('id', Array.from(selectedIds));

      if (itemsError) throw itemsError;

      setIsBatchModalOpen(false);
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
    } catch (error: any) {
      console.error('Erro ao criar lote:', error);
      alert('Erro ao criar lote: ' + (error.message || 'Verifique sua conexão.'));
    } finally {
      setIsSaving(false);
    }
  };

  // Renaming my handleSaveBatch back to handleCreateBatch or merging
  // Wait, I'll just use the existing handleCreateBatch implementation but with the modal data

  const canGenerateBatch = () => {
    if (selectedIds.size === 0) return false;
    const items = billingItems.filter(i => selectedIds.has(i.id));
    
    // Todos devem ser 'ready_to_bill'
    const allReady = items.every(i => i.status === 'ready_to_bill');
    if (!allReady) return false;

    // Todos devem ser da mesma operadora (insurer)
    const uniqueInsurers = new Set(items.map(i => i.plan?.insurer_id || i.insurance_plan_id));
    return uniqueInsurers.size === 1;
  };

  const handleCreateBatch = async () => {
    if (!supabase || !user) return;
    setIsSaving(true);
    try {
      const selectedItems = billingItems.filter(i => selectedIds.has(i.id));
      const totalPresented = selectedItems.reduce((acc, i) => acc + Number(i.total_presented_value || 0), 0);
      const insurer = insurers.find(ins => ins.id === batchForm.insurer_id);

      const { data: batch, error: batchError } = await (supabase as any)
        .from('billing_batches')
        .insert([{
          insurer_id: batchForm.insurer_id,
          competence: batchForm.competence,
          status: 'open',
          total_presented_value: totalPresented,
          total_paid_value: 0,
          created_by: user.id
        }])
        .select()
        .single();

      if (batchError) throw batchError;

      const { error: itemsError } = await (supabase as any)
        .from('billing_items')
        .update({ 
          batch_id: batch.id,
          status: 'billed' 
        })
        .in('id', Array.from(selectedIds));

      if (itemsError) throw itemsError;

      setIsBatchModalOpen(false);
      setSelectedIds(new Set());
      if (onRefresh) onRefresh();
      alert(`Lote #${batch.id.substring(0,8)} criado com sucesso para ${insurer?.name || 'Operadora'}`);
    } catch (error: any) {
      console.error('Erro ao criar lote:', error);
      alert('Erro ao criar lote: ' + (error.message || 'Verifique sua conexão.'));
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Phase 3: Reconciliation Handlers ───────────────────────────────────────

  const initReconcileValues = (batchItems: BillingItem[]) => {
    const init: Record<string, { paid: number; glossed: number }> = {};
    batchItems.forEach(item => {
      init[item.id] = {
        paid: Number(item.total_paid_value || 0),
        glossed: Number(item.total_glossed_value || 0),
      };
    });
    setReconcileValues(init);
  };

  const handleSaveReconciliation = async () => {
    if (!supabase || !selectedBatch) return;
    setReconcileSaving(true);
    const batchItems = billingItems.filter(i => i.batch_id === selectedBatch.id);
    try {
      await Promise.all(
        batchItems.map(async (item) => {
          const vals = reconcileValues[item.id];
          if (!vals) return;
          const paid = Number(vals.paid || 0);
          const glossed = Number(vals.glossed || 0);
          const presented = Number(item.total_presented_value || 0);
          let newStatus: BillingItemStatus = item.status;
          if (glossed > 0 && paid < presented) newStatus = 'partially_paid';
          if (glossed === 0 && paid >= presented) newStatus = 'paid';
          if (glossed > 0 && paid === 0) newStatus = 'glossed_total';

          await (supabase as any)
            .from('billing_items')
            .update({ total_paid_value: paid, total_glossed_value: glossed, status: newStatus })
            .eq('id', item.id);
        })
      );

      // Update batch totals
      const totalPaid = batchItems.reduce(
        (acc, item) => acc + Number(reconcileValues[item.id]?.paid || 0), 0
      );
      const allPaid = batchItems.every(item => {
        const vals = reconcileValues[item.id];
        return Number(vals?.paid || 0) >= Number(item.total_presented_value || 0);
      });
      await (supabase as any)
        .from('billing_batches')
        .update({ total_paid_value: totalPaid, status: allPaid ? 'paid' : 'sent' })
        .eq('id', selectedBatch.id);

      setIsReconciling(false);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar conciliação:', err);
      alert('Erro ao salvar conciliação: ' + (err.message || 'Ocorreu um erro inesperado.'));
    } finally {
      setReconcileSaving(false);
    }
  };

  const handleSettleBatch = () => {
    // Mark all items as fully paid
    const batchItems = billingItems.filter(i => i.batch_id === selectedBatch?.id);
    const settled: Record<string, { paid: number; glossed: number }> = {};
    batchItems.forEach(item => {
      settled[item.id] = { paid: Number(item.total_presented_value || 0), glossed: 0 };
    });
    setReconcileValues(settled);
  };

  const handleSaveGloss = async () => {
    if (!supabase || !glossForm) return;
    try {
      const item = billingItems.find(i => i.id === glossForm.itemId);
      const glossedValue = Number(reconcileValues[glossForm.itemId]?.glossed || 0);
      await (supabase as any).from('billing_glosses').insert([{
        billing_item_id: glossForm.itemId,
        gloss_code: glossForm.code,
        reason: glossForm.reason,
        value: glossedValue,
        status: 'pending',
      }]);
      setGlossForm(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error('Erro ao salvar glosa:', err);
      alert('Erro ao salvar glosa: ' + (err.message || 'Ocorreu um erro inesperado.'));
    }
  };

  const statusColors: Record<BillingItemStatus, string> = {
    draft: 'bg-amber-100 text-amber-700 border-amber-200',
    pending_review: 'bg-blue-100 text-blue-700 border-blue-200',
    ready_to_bill: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    billed: 'bg-purple-100 text-purple-700 border-purple-200',
    partially_paid: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    paid: 'bg-green-100 text-green-700 border-green-200',
    glossed_total: 'bg-error-container text-on-error-container border-error/20',
    cancelled: 'bg-surface-container-highest text-on-surface-variant border-outline-variant/30',
  };

  const statusLabels: Record<BillingItemStatus, string> = {
    draft: 'Draft',
    pending_review: 'Em Revisão',
    ready_to_bill: 'Pronto p/ Lote',
    billed: 'Faturado',
    partially_paid: 'Pago Parcial',
    paid: 'Pago',
    glossed_total: 'Glosado',
    cancelled: 'Cancelado',
  };

  const tabs = [
    { id: 'pendencies', label: 'Pendências', icon: AlertCircle, count: billingItems.filter(i => i.status === 'draft' || i.status === 'pending_review').length },
    { id: 'batches', label: 'Lotes / Envios', icon: Package, count: batches.length },
    { id: 'analytics', label: 'Desempenho', icon: TrendingUp, count: 0 },
    { id: 'insurers', label: 'Operadoras', icon: Building2, count: insurers.length },
    { id: 'prices', label: 'Tabelas & Preços', icon: ListOrdered, count: prices.length },
  ];

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto pb-20">
      {/* Header & Stats Summary */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-xs">
            <FileText size={14} />
            Gestão de Saúde Suplementar
          </div>
          <h1 className="text-3xl font-black tracking-tight text-on-surface">Faturamento</h1>
          <p className="text-on-surface-variant text-sm max-w-xl">
            Gerencie itens faturáveis, lotes de envio e tabelas de preços de operadoras em um só lugar.
          </p>
        </div>

        <div className="flex gap-2">
          {activeTab === 'pendencies' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-white border border-outline-variant/30 text-on-surface font-semibold rounded-xl hover:bg-surface-container-low transition-all shadow-sm">
              <Filter size={18} />
              <span className="hidden sm:inline">Filtrar</span>
            </button>
          )}
          {activeTab === 'insurers' && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setInsurerForm({ name: '', ans_registration: '', logo_url: '' });
                setIsInsurerModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              <span>Nova Operadora</span>
            </button>
          )}
          {activeTab === 'prices' && (
            <button 
              onClick={() => {
                setEditingItem(null);
                setProcedureForm({ name: '', code: '', description: '', category: 'CONSULTA' });
                setIsProcedureModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              <span>Novo Procedimento</span>
            </button>
          )}
          {activeTab === 'pendencies' && (
            <button 
              onClick={handleOpenBatchModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <Plus size={20} />
              <span>Novo Lote</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Pendentes de Guia', value: billingItems.filter(i => !i.guia_number).length, color: 'text-amber-600', bg: 'bg-amber-50', icon: AlertCircle },
          { label: 'Aguardando Lote', value: billingItems.filter(i => i.status === 'ready_to_bill').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
          { label: 'Lotes em Aberto', value: batches.filter(b => b.status === 'open').length, color: 'text-primary', bg: 'bg-primary/5', icon: Building2 },
          { label: 'Glosas do Mês', value: 'R$ 0,00', color: 'text-error', bg: 'bg-error/5', icon: DollarSign },
        ].map((stat, i) => (
          <div key={i} className={cn("p-4 rounded-2xl border border-outline-variant/10 flex flex-col gap-3 transition-all hover:shadow-md bg-white")}>
            <div className="flex items-center justify-between">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", stat.bg, stat.color)}>
                <stat.icon size={20} />
              </div>
              <ArrowUpRight size={16} className="text-on-surface-variant/30" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-on-surface">{stat.value}</span>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant/10 px-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "px-5 py-3 flex items-center gap-2 transition-all relative group",
                isActive 
                  ? "text-primary font-bold" 
                  : "text-on-surface-variant hover:text-on-surface font-medium"
              )}
            >
              <Icon size={18} className={isActive ? "text-primary" : "group-hover:text-on-surface"} />
              <span className="text-sm">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] min-w-[18px] text-center",
                  isActive ? "bg-primary text-white" : "bg-surface-container-highest text-on-surface-variant"
                )}>
                  {tab.count}
                </span>
              )}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'pendencies' && (
            <motion.div 
              key="pendencies"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar por paciente, guia ou procedimento..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border border-outline-variant/30 rounded-2xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {billingItems.length > 0 && (
                  <button 
                     onClick={() => setIsManualItemModalOpen(true)}
                     className="px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                     <Plus size={20} />
                     <span className="hidden sm:inline">Adicionar Manual</span>
                  </button>
                )}
              </div>

              {/* Items List */}
              <div className="bg-white rounded-3xl border border-outline-variant/20 shadow-xl shadow-surface-container-highest/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low border-b border-outline-variant/30">
                        <th className="px-6 py-4 w-10">
                          <input 
                            type="checkbox" 
                            checked={selectedIds.size === billingItems.length && billingItems.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-outline-variant/30 text-primary focus:ring-primary/20"
                          />
                        </th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Atendimento / Paciente</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Procedimento</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Guia / Autoriz.</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Valor</th>
                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant text-center">Status</th>
                        <th className="px-6 py-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {billingItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-20">
                            <div className="flex flex-col items-center justify-center gap-4 text-center">
                              <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30">
                                <Inbox size={32} />
                              </div>
                              <div className="flex flex-col gap-1">
                                <h3 className="font-black text-on-surface">Nenhuma pendência encontrada</h3>
                                <p className="text-sm text-on-surface-variant">Todos os atendimentos estão em dia ou não há faturamento pendente.</p>
                              </div>
                              <button onClick={() => setIsManualItemModalOpen(true)} className="text-primary font-bold text-sm hover:underline mt-2">
                                + Adicionar item manual
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        billingItems.map((item) => (
                          <tr key={item.id} className={cn(
                            "hover:bg-surface-container-lowest transition-colors group",
                            selectedIds.has(item.id) && "bg-primary/5 hover:bg-primary/10"
                          )}>
                            <td className="px-6 py-4">
                              <input 
                                type="checkbox" 
                                checked={selectedIds.has(item.id)}
                                onChange={() => toggleSelect(item.id)}
                                className="w-4 h-4 rounded border-outline-variant/30 text-primary focus:ring-primary/20"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-bold text-on-surface truncate max-w-[200px]">{item.patient?.name || 'Paciente'}</span>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">
                                  <Calendar size={10} />
                                  {item.service_date}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-semibold text-on-surface truncate max-w-[240px]">
                                  {item.procedure?.name || 'Procedimento não vinculado'}
                                </span>
                                <span className="text-[10px] font-bold text-on-surface-variant/60">TUSS: {item.procedure?.code || '---'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                {!item.guia_number ? (
                                  <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black border border-amber-200 w-fit uppercase">
                                    <AlertCircle size={10} /> Falta Guia
                                  </span>
                                ) : (
                                  <span className="text-xs font-mono font-bold text-on-surface uppercase">{item.guia_number}</span>
                                )}
                                {item.auth_number && (
                                  <span className="text-[10px] text-on-surface-variant font-bold leading-none">Aut: {item.auth_number}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-black text-on-surface">R$ {Number(item.total_presented_value || 0).toFixed(2)}</span>
                                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tighter">{item.plan?.name || 'Convênio'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex justify-center">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                  statusColors[item.status]
                                )}>
                                  {statusLabels[item.status]}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {item.status === 'pending_review' && (
                                  <>
                                    <button 
                                      onClick={() => handleUpdateItemStatus(item.id, 'ready_to_bill')}
                                      className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all"
                                      title="Conferir Guia"
                                    >
                                      <CheckCircle2 size={18} />
                                    </button>
                                    <button 
                                      onClick={() => handleUpdateItemStatus(item.id, 'glossed_total')}
                                      className="p-2 hover:bg-rose-50 text-rose-600 rounded-xl transition-all"
                                      title="Rejeitar/Glosar"
                                    >
                                      <X size={18} />
                                    </button>
                                  </>
                                )}
                                <div className="relative">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveMenuId(activeMenuId === item.id ? null : item.id);
                                    }}
                                    className="p-2 hover:bg-surface-container rounded-xl transition-all text-on-surface-variant active:scale-95"
                                  >
                                    <MoreVertical size={18} />
                                  </button>

                                  <AnimatePresence>
                                    {activeMenuId === item.id && (
                                      <>
                                        <div 
                                          className="fixed inset-0 z-[80]" 
                                          onClick={() => setActiveMenuId(null)}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                          className="absolute right-0 top-full mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 py-2 z-[90] overflow-hidden"
                                        >
                                          <button 
                                            onClick={() => {
                                              setEditingItem(item);
                                              setManualItemForm({
                                                patient_id: item.patient_id,
                                                insurance_plan_id: item.insurance_plan_id,
                                                procedure_id: item.procedure_id,
                                                service_date: item.service_date,
                                                guia_number: item.guia_number || '',
                                                auth_number: item.auth_number || ''
                                              });
                                              setIsManualItemModalOpen(true);
                                              setActiveMenuId(null);
                                            }}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-container-low transition-all flex items-center gap-2"
                                          >
                                            <Edit2 size={16} className="text-primary" />
                                            Editar Guia
                                          </button>

                                          {item.status !== 'pending' && (
                                            <button 
                                              onClick={() => {
                                                handleUpdateItemStatus(item.id, 'pending');
                                                setActiveMenuId(null);
                                              }}
                                              className="w-full px-4 py-2.5 text-left text-sm font-bold text-on-surface hover:bg-surface-container-low transition-all flex items-center gap-2"
                                            >
                                              <RotateCcw size={16} className="text-amber-500" />
                                              Voltar p/ Pendente
                                            </button>
                                          )}

                                          <div className="h-px bg-outline-variant/10 my-1" />

                                          <button 
                                            onClick={() => handleDeleteItem(item.id)}
                                            className="w-full px-4 py-2.5 text-left text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all flex items-center gap-2"
                                          >
                                            <Trash2 size={16} />
                                            Excluir
                                          </button>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'batches' && (
            <motion.div 
              key="batches"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-4"
            >
              {batches.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-20 text-center bg-white border border-outline-variant/20 rounded-3xl">
                   <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
                    <Package size={32} />
                  </div>
                  <h3 className="font-black text-on-surface">Nenhum lote enviado</h3>
                  <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                    Agrupe guias conferidas na aba de pendências para gerar seu primeiro lote de envio.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {batches.map((batch) => (
                    <div key={batch.id} className="bg-white p-5 rounded-2xl border border-outline-variant/10 shadow-sm flex items-center justify-between group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surface-container rounded-xl flex items-center justify-center text-primary group-hover:bg-primary/10 transition-colors">
                          <Package size={24} />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                             <span className="font-black text-on-surface">Lote #{batch.id.substring(0, 8)}</span>
                             <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase tracking-tighter border border-blue-100">{batch.status}</span>
                          </div>
                          <p className="text-xs font-bold text-on-surface-variant flex items-center gap-2">
                            <Building2 size={12} /> {batch.insurer?.name || 'Operadora'} • Comp: {batch.competence}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none mb-1">Valor Total</span>
                          <span className="font-black text-primary">R$ {Number(batch.total_presented_value || 0).toFixed(2)}</span>
                        </div>
                        <button 
                          onClick={() => setSelectedBatch(batch)}
                          className="p-2.5 bg-surface-container-low text-on-surface-variant rounded-xl hover:bg-primary hover:text-white transition-all"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'analytics' && (() => {
            const totalPresented = billingItems.reduce((acc, i) => acc + Number(i.total_presented_value || 0), 0);
            const totalPaid = billingItems.reduce((acc, i) => acc + Number(i.total_paid_value || 0), 0);
            const totalGlossed = billingItems.reduce((acc, i) => acc + Number(i.total_glossed_value || 0), 0);
            const glossRate = totalPresented > 0 ? ((totalGlossed / totalPresented) * 100) : 0;
            const paidRate = totalPresented > 0 ? ((totalPaid / totalPresented) * 100) : 0;

            const byInsurer = insurers.map(ins => {
              const insBatches = batches.filter(b => b.insurer_id === ins.id);
              const presented = insBatches.reduce((a, b) => a + Number(b.total_presented_value || 0), 0);
              const paid = insBatches.reduce((a, b) => a + Number(b.total_paid_value || 0), 0);
              const glossed = presented - paid;
              const gr = presented > 0 ? ((glossed / presented) * 100) : 0;
              return { ...ins, presented, paid, glossed, glossRate: gr, batchCount: insBatches.length };
            }).filter(i => i.presented > 0).sort((a, b) => b.presented - a.presented);

            return (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col gap-6"
              >
                {/* KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Apresentado', value: `R$ ${totalPresented.toFixed(2)}`, sub: 'todos os lotes', color: 'text-on-surface', icon: DollarSign, bg: 'bg-surface-container-low' },
                    { label: 'Total Recebido', value: `R$ ${totalPaid.toFixed(2)}`, sub: `${paidRate.toFixed(1)}% do apresentado`, color: 'text-emerald-600', icon: CheckCircle2, bg: 'bg-emerald-50' },
                    { label: 'Total Glosado', value: `R$ ${totalGlossed.toFixed(2)}`, sub: `${glossRate.toFixed(1)}% do apresentado`, color: 'text-rose-600', icon: AlertTriangle, bg: 'bg-rose-50' },
                    { label: 'Lotes Processados', value: batches.length, sub: `${batches.filter(b => b.status === 'paid').length} liquidados`, color: 'text-primary', icon: Package, bg: 'bg-primary/5' },
                  ].map((kpi, i) => (
                    <div key={i} className={cn('p-5 rounded-2xl border border-outline-variant/10 flex flex-col gap-3 bg-white shadow-sm')}>
                      <div className="flex items-center justify-between">
                        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', kpi.bg, kpi.color)}>
                          <kpi.icon size={20} />
                        </div>
                      </div>
                      <div>
                        <div className={cn('text-2xl font-black', kpi.color)}>{kpi.value}</div>
                        <div className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-tight">{kpi.label}</div>
                        <div className="text-[10px] text-on-surface-variant mt-0.5">{kpi.sub}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Gloss Rate Visual */}
                <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <BarChart3 size={20} className="text-primary" />
                      <h3 className="font-black text-on-surface">Recebido vs. Apresentado</h3>
                    </div>
                    <span className={cn(
                      'px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border',
                      glossRate > 10 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                    )}>
                      Taxa Glosa: {glossRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-6 bg-surface-container rounded-full overflow-hidden flex">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${paidRate}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-emerald-500 rounded-l-full"
                    />
                    {glossRate > 0 && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${glossRate}%` }}
                        transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                        className="h-full bg-rose-400"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-6 mt-3">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /><span className="text-xs font-bold text-on-surface-variant">Pago</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-rose-400 rounded-full" /><span className="text-xs font-bold text-on-surface-variant">Glosado</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-surface-container-highest rounded-full" /><span className="text-xs font-bold text-on-surface-variant">Pendente</span></div>
                  </div>
                </div>

                {/* By Insurer */}
                {byInsurer.length > 0 && (
                  <div className="bg-white p-6 rounded-3xl border border-outline-variant/10 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <Building2 size={20} className="text-primary" />
                      <h3 className="font-black text-on-surface">Por Operadora</h3>
                    </div>
                    <div className="flex flex-col gap-4">
                      {byInsurer.map((ins) => (
                        <div key={ins.id} className="flex flex-col gap-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface text-sm">{ins.name}</span>
                            <div className="flex items-center gap-4 text-xs font-bold">
                              <span className="text-on-surface-variant">{ins.batchCount} lote(s)</span>
                              <span className="text-emerald-600">R$ {ins.paid.toFixed(2)}</span>
                              {ins.glossed > 0 && <span className="text-rose-500">-R$ {ins.glossed.toFixed(2)}</span>}
                              <span className={cn(
                                'px-2 py-0.5 rounded text-[10px] uppercase tracking-tighter border font-black',
                                ins.glossRate > 10 ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                              )}>{ins.glossRate.toFixed(1)}% glosa</span>
                            </div>
                          </div>
                          <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex gap-0.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${ins.presented > 0 ? (ins.paid / ins.presented) * 100 : 0}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut' }}
                              className="h-full bg-emerald-500 rounded-l-full"
                            />
                            {ins.glossed > 0 && (
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(ins.glossed / ins.presented) * 100}%` }}
                                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                                className="h-full bg-rose-400"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })()}
          {activeTab === 'insurers' && (
            <motion.div 
              key="insurers"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {insurers.length === 0 ? (
                 <div className="col-span-full flex flex-col items-center justify-center p-20 text-center bg-white border border-outline-variant/20 rounded-3xl">
                    <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
                      <Building2 size={32} />
                    </div>
                    <h3 className="font-black text-on-surface">Nenhuma operadora cadastrada</h3>
                    <button 
                      onClick={() => {
                         setEditingItem(null);
                         setInsurerForm({ name: '', ans_registration: '', logo_url: '' });
                         setIsInsurerModalOpen(true);
                      }}
                      className="px-6 py-3 bg-primary text-white font-bold rounded-2xl hover:brightness-110 shadow-lg shadow-primary/20"
                    >
                      Cadastrar Operadora
                    </button>
                 </div>
              ) : (
                insurers.map((insurer) => (
                  <div key={insurer.id} className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all flex flex-col gap-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center font-black">
                        {insurer.name.substring(0, 2).toUpperCase()}
                      </div>
                      <button 
                        onClick={() => {
                          setEditingItem(insurer);
                          setInsurerForm({ name: insurer.name, ans_registration: insurer.ans_registration || '', logo_url: '' });
                          setIsInsurerModalOpen(true);
                        }}
                        className="p-2 hover:bg-surface-container rounded-xl transition-all"
                      >
                        <MoreVertical size={18} />
                      </button>
                    </div>
                    <div className="flex flex-col gap-1">
                      <h4 className="font-black text-lg text-on-surface">{insurer.name}</h4>
                      <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">ANS: {insurer.ans_registration || '---'}</p>
                    </div>
                    <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-outline-variant/10">
                       <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Planos ({plans.filter(p => p.insurer_id === insurer.id).length})</span>
                          <button 
                            onClick={() => {
                              setEditingItem(null);
                              setPlanForm({ name: '', insurer_id: insurer.id, type: 'ambulatorial' });
                              setIsPlanModalOpen(true);
                            }}
                            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            <Plus size={10} /> Novo Plano
                          </button>
                       </div>
                       <div className="flex flex-wrap gap-2">
                          {plans.filter(p => p.insurer_id === insurer.id).map(plan => (
                             <span key={plan.id} className="px-2 py-0.5 bg-surface-container-low text-on-surface-variant rounded text-[10px] font-bold border border-outline-variant/10">{plan.name}</span>
                          ))}
                       </div>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}

          {activeTab === 'prices' && (
            <motion.div 
               key="prices"
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               className="flex flex-col gap-6"
            >
                {/* Inner Tabs for Prices & Supplies */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-outline-variant/10 shadow-sm">
                  <div className="flex bg-surface-container-low p-1 rounded-xl">
                    <button
                      onClick={() => setActivePricesTab('procedures')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        activePricesTab === 'procedures' ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      Procedimentos (TUSS)
                    </button>
                    <button
                      onClick={() => setActivePricesTab('medicalSupplies')}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        activePricesTab === 'medicalSupplies' ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      Materiais & Medicamentos
                    </button>
                  </div>
                  
                  <div className="flex-1 flex items-center gap-3 px-4 py-2 bg-surface-container-low rounded-xl border border-outline-variant/10 focus-within:border-primary/30 transition-all max-w-md">
                    <Search size={16} className="text-on-surface-variant/40" />
                    <input 
                      type="text" 
                      placeholder="Buscar por nome ou código..."
                      spellCheck={false}
                      className="bg-transparent border-none outline-none text-sm w-full text-on-surface placeholder:text-on-surface-variant/40 font-bold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                      <button onClick={() => setSearchTerm('')} className="p-1 hover:bg-surface-container rounded-full"><X size={12} /></button>
                    )}
                  </div>
                </div>

                {activePricesTab === 'procedures' && (
                  <div className="flex flex-col gap-4">
                    {procedures.length > 0 && (
                      <div className="text-xs font-bold text-on-surface-variant flex items-center gap-2 px-2">
                        <Clock size={14} />
                        Última Carga: {new Date(procedures[0]?.updated_at || new Date()).toLocaleString('pt-BR')}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(prices.length === 0 && procedures.length === 0) ? (
                      <div className="col-span-full flex flex-col items-center justify-center p-20 text-center bg-white border border-outline-variant/20 rounded-3xl">
                        <div className="w-16 h-16 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant/30 mb-4">
                          <ListOrdered size={32} />
                        </div>
                        <h3 className="font-black text-on-surface">Tabelas de Procedimentos (TUSS)</h3>
                        <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                          Configure os valores negociados para cada procedimento por plano de saúde.
                        </p>
                      </div>
                    ) : (
                      <>
                        {filteredProcedures.slice(0, itemsPerPage).map((proc: Procedure) => (
                          <div key={proc.id} className="bg-white p-6 rounded-3xl border border-outline-variant/20 shadow-sm hover:shadow-xl transition-all">
                            <div className="flex justify-between items-start mb-4">
                              <span className="px-2 py-1 bg-surface-container text-on-surface-variant rounded text-[10px] font-bold uppercase">{proc.category || 'TUSS'}</span>
                              <button className="p-2 hover:bg-surface-container rounded-xl transition-all"><MoreVertical size={16} /></button>
                            </div>
                            <h4 className="font-black text-on-surface">{proc.name}</h4>
                            <p className="text-xs font-mono text-primary font-bold mt-1">Código: {proc.code}</p>
                          </div>
                        ))}
                        {filteredProcedures.length > 25 && (
                          <div className="col-span-full py-8 flex flex-col items-center gap-4">
                            <span className="text-sm font-bold text-on-surface-variant">
                              Mostrando {Math.min(itemsPerPage, filteredProcedures.length)} de {filteredProcedures.length} procedimentos...
                            </span>
                            
                            <div className="flex bg-surface-container-low p-1 rounded-xl items-center gap-1 border border-outline-variant/10">
                              <span className="text-[10px] font-black uppercase text-on-surface-variant px-2">Ver mais:</span>
                              {[25, 50, 100].map(val => (
                                <button 
                                  key={val}
                                  onClick={() => setItemsPerPage(val)}
                                  className={cn(
                                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                    itemsPerPage === val ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                  )}
                                >
                                  {val}
                                </button>
                              ))}
                              <button 
                                onClick={() => setItemsPerPage(9999)}
                                className={cn(
                                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                  itemsPerPage === 9999 ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                )}
                              >
                                Tudo
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    </div>
                  </div>
                )}

                {activePricesTab === 'medicalSupplies' && (
                  <div className="flex flex-col gap-4">
                    {medicalSupplies.length > 0 && (
                      <div className="text-xs font-bold text-on-surface-variant flex items-center gap-2 px-2">
                        <Clock size={14} />
                        Última Carga: {new Date(medicalSupplies[0]?.updated_at || new Date()).toLocaleString('pt-BR')}
                      </div>
                    )}
                    
                    <div className="bg-white rounded-3xl border border-outline-variant/20 shadow-sm overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                           <thead>
                             <tr className="bg-surface-container-low border-b border-outline-variant/30">
                               <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Código</th>
                               <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Material/Medicamento</th>
                               <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Apresentação</th>
                               <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Registro ANVISA</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-outline-variant/10">
                             {medicalSupplies.length === 0 ? (
                               <tr>
                                  <td colSpan={4} className="px-5 py-12 text-center text-sm font-bold text-on-surface-variant">
                                    Nenhum material ou medicamento importado. Adicione uma planilha para começar.
                                  </td>
                               </tr>
                             ) : (
                               <>
                                 {filteredMedicalSupplies.slice(0, itemsPerPage).map((supply: MedicalSupply) => (
                                   <tr key={supply.id} className="hover:bg-surface-container-lowest transition-colors">
                                     <td className="px-5 py-3 font-mono text-xs font-bold text-primary">{supply.code}</td>
                                     <td className="px-5 py-3 text-sm font-bold text-on-surface">
                                        {supply.name}
                                        <div className="text-[10px] text-on-surface-variant uppercase font-normal">{supply.laboratory}</div>
                                     </td>
                                     <td className="px-5 py-3 text-xs text-on-surface-variant">{supply.presentation || '---'}</td>
                                     <td className="px-5 py-3 text-xs text-on-surface-variant font-mono">{supply.anvisa_registry || '---'}</td>
                                   </tr>
                                 ))}
                                 {filteredMedicalSupplies.length > 25 && (
                                   <tr>
                                     <td colSpan={4} className="px-5 py-8">
                                       <div className="flex flex-col items-center gap-4">
                                          <span className="text-sm font-bold text-on-surface-variant">
                                            Mostrando {Math.min(itemsPerPage, filteredMedicalSupplies.length)} de {filteredMedicalSupplies.length} registros...
                                          </span>
                                          
                                          <div className="flex bg-surface-container-low p-1 rounded-xl items-center gap-1 border border-outline-variant/10">
                                            <span className="text-[10px] font-black uppercase text-on-surface-variant px-2">Ver mais:</span>
                                            {[25, 50, 100].map(val => (
                                              <button 
                                                key={val}
                                                onClick={() => setItemsPerPage(val)}
                                                className={cn(
                                                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                  itemsPerPage === val ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                                )}
                                              >
                                                {val}
                                              </button>
                                            ))}
                                            <button 
                                              onClick={() => setItemsPerPage(9999)}
                                              className={cn(
                                                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                                                itemsPerPage === 9999 ? "bg-white text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface"
                                              )}
                                            >
                                              Tudo
                                            </button>
                                          </div>
                                       </div>
                                     </td>
                                   </tr>
                                 )}
                               </>
                             )}
                           </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MODALS */}
      <AnimatePresence>
        {isInsurerModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsInsurerModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-on-surface mb-6">Cadastrar Operadora</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome da Operadora</label>
                  <input type="text" value={insurerForm.name} onChange={e => setInsurerForm({...insurerForm, name: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Unimed, Bradesco..." />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Registro ANS</label>
                  <input type="text" value={insurerForm.ans_registration} onChange={e => setInsurerForm({...insurerForm, ans_registration: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="00000-0" />
                </div>
                <div className="flex gap-3 pt-2">
                   {editingItem?.id && (
                     <button type="button" onClick={(e) => { e.preventDefault(); handleDeleteInsurer(); }} disabled={isSaving} className="py-4 px-6 border border-rose-200 text-rose-600 bg-rose-50 font-bold rounded-2xl hover:bg-rose-100 transition-all flex items-center justify-center">
                       Excluir
                     </button>
                   )}
                   <button type="button" onClick={(e) => { e.preventDefault(); handleSaveInsurer(); }} disabled={isSaving} className="flex-1 py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                     {isSaving ? 'Salvando...' : 'Salvar Operadora'}
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {isPlanModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPlanModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-on-surface mb-6">Cadastrar Plano</h3>
              <div className="space-y-4">
                 <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Operadora</label>
                  <select value={planForm.insurer_id} onChange={e => setPlanForm({...planForm, insurer_id: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none">
                    <option value="">Selecione uma operadora...</option>
                    {insurers.map((i: Insurer) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Plano</label>
                  <input type="text" value={planForm.name} onChange={e => setPlanForm({...planForm, name: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Saúde Top - Rede Nacional" />
                </div>
                <button onClick={handleSavePlan} disabled={isSaving} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                  {isSaving ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isProcedureModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsProcedureModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8">
              <h3 className="text-2xl font-black text-on-surface mb-6">Cadastrar Procedimento</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1 space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Código</label>
                    <input type="text" value={procedureForm.code} onChange={e => setProcedureForm({...procedureForm, code: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-mono" placeholder="00000000" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Nome do Procedimento</label>
                    <input type="text" value={procedureForm.name} onChange={e => setProcedureForm({...procedureForm, name: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: Consulta Médica" />
                  </div>
                </div>
                <button onClick={handleSaveProcedure} disabled={isSaving} className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 transition-all flex items-center justify-center gap-2">
                  {isSaving ? 'Salvando...' : 'Salvar Procedimento'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedBatch && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setSelectedBatch(null); setIsReconciling(false); }} className="absolute inset-0 bg-black/60 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }} className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col">
              {/* Batch Modal Header */}
              <div className="p-8 pb-4 flex items-center justify-between bg-surface-container-lowest">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                    <Package size={32} />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-2xl font-black text-on-surface">Lote #{selectedBatch.id.substring(0, 8)}</h3>
                    <p className="text-sm font-bold text-on-surface-variant flex items-center gap-2 uppercase tracking-widest">
                      <Building2 size={14} /> {selectedBatch.insurer?.name} • Competência {selectedBatch.competence}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {!isReconciling ? (
                    <button
                      onClick={() => {
                        const batchItems = billingItems.filter(i => i.batch_id === selectedBatch.id);
                        initReconcileValues(batchItems);
                        setIsReconciling(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                      <BarChart3 size={18} />
                      Conciliar Lote
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSettleBatch}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-xl hover:bg-emerald-100 transition-all border border-emerald-200"
                      >
                        <Zap size={16} />
                        Liquidar Tudo
                      </button>
                      <button
                        onClick={handleSaveReconciliation}
                        disabled={reconcileSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:brightness-110 transition-all shadow-lg shadow-primary/20"
                      >
                        <CheckCircle2 size={18} />
                        {reconcileSaving ? 'Salvando...' : 'Salvar Conciliação'}
                      </button>
                    </div>
                  )}
                  {!isReconciling && (
                    <button
                      onClick={() => window.print()}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white border border-outline-variant text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all"
                    >
                      <FileText size={18} />
                      Imprimir
                    </button>
                  )}
                  <button onClick={() => { setSelectedBatch(null); setIsReconciling(false); }} className="p-3 text-on-surface-variant hover:bg-surface-container rounded-full transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Batch Modal Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-4">
                {/* Summary Bar */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Apresentado', value: `R$ ${Number(selectedBatch.total_presented_value || 0).toFixed(2)}`, color: 'text-on-surface', bg: 'bg-surface-container-low' },
                    { label: 'Pago', value: `R$ ${Number(selectedBatch.total_paid_value || 0).toFixed(2)}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    {
                      label: 'Glosado',
                      value: `R$ ${(Number(selectedBatch.total_presented_value || 0) - Number(selectedBatch.total_paid_value || 0)).toFixed(2)}`,
                      color: 'text-rose-600',
                      bg: 'bg-rose-50',
                    },
                  ].map((s, i) => (
                    <div key={i} className={cn('p-4 rounded-2xl flex flex-col gap-1 border border-outline-variant/10', s.bg)}>
                      <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">{s.label}</span>
                      <span className={cn('text-xl font-black', s.color)}>{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Items Table */}
                <div className="bg-surface-container-low rounded-3xl border border-outline-variant/30 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-outline-variant/30 bg-surface-container-lowest">
                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Guia</th>
                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant">Paciente / Proc.</th>
                        <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant text-right">Apresentado</th>
                        {isReconciling && (
                          <>
                            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-emerald-600 text-right">Pago</th>
                            <th className="px-5 py-4 text-[11px] font-black uppercase tracking-widest text-rose-600 text-right">Glosado</th>
                            <th className="px-5 py-4 w-10"></th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/10">
                      {billingItems.filter(i => i.batch_id === selectedBatch.id).map((item) => (
                        <tr key={item.id} className="hover:bg-white transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono font-bold text-sm text-on-surface uppercase">{item.guia_number || '---'}</span>
                              <span className={cn('text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit border', statusColors[item.status])}>{statusLabels[item.status]}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold text-on-surface text-sm">{item.patient?.name}</span>
                              <span className="text-[10px] font-bold text-on-surface-variant line-clamp-1">{item.procedure?.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-black text-on-surface">R$ {Number(item.total_presented_value || 0).toFixed(2)}</span>
                          </td>
                          {isReconciling && (
                            <>
                              <td className="px-5 py-4">
                                <div className="flex justify-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={reconcileValues[item.id]?.paid ?? ''}
                                    onChange={e => setReconcileValues(prev => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], paid: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-28 text-right px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 font-bold focus:ring-2 focus:ring-emerald-300 outline-none text-sm"
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex justify-end">
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={reconcileValues[item.id]?.glossed ?? ''}
                                    onChange={e => setReconcileValues(prev => ({
                                      ...prev,
                                      [item.id]: { ...prev[item.id], glossed: parseFloat(e.target.value) || 0 }
                                    }))}
                                    className="w-28 text-right px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold focus:ring-2 focus:ring-rose-300 outline-none text-sm"
                                  />
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                {Number(reconcileValues[item.id]?.glossed || 0) > 0 && (
                                  <button
                                    onClick={() => setGlossForm({ itemId: item.id, code: '', reason: '' })}
                                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                    title="Registrar Motivo da Glosa"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                )}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-primary/5">
                        <td colSpan={2} className="px-5 py-4 text-right font-black text-on-surface uppercase tracking-widest text-sm">Total</td>
                        <td className="px-5 py-4 text-right font-black text-primary">
                          R$ {Number(selectedBatch.total_presented_value || 0).toFixed(2)}
                        </td>
                        {isReconciling && (
                          <>
                            <td className="px-5 py-4 text-right font-black text-emerald-600">
                              R$ {Object.values(reconcileValues).reduce((acc, v) => acc + Number(v.paid || 0), 0).toFixed(2)}
                            </td>
                            <td className="px-5 py-4 text-right font-black text-rose-600">
                              R$ {Object.values(reconcileValues).reduce((acc, v) => acc + Number(v.glossed || 0), 0).toFixed(2)}
                            </td>
                            <td />
                          </>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {glossForm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGlossForm(null)} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center">
                  <AlertTriangle size={20} />
                </div>
                <h3 className="text-xl font-black text-on-surface">Registrar Glosa</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Código da Glosa</label>
                  <input
                    type="text"
                    value={glossForm.code}
                    onChange={e => setGlossForm({ ...glossForm, code: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-rose-300 outline-none font-mono"
                    placeholder="Ex: GL001"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Motivo</label>
                  <textarea
                    value={glossForm.reason}
                    onChange={e => setGlossForm({ ...glossForm, reason: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-rose-300 outline-none resize-none"
                    placeholder="Descreva o motivo da glosa..."
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setGlossForm(null)} className="flex-1 py-3 border border-outline-variant/30 text-on-surface font-bold rounded-xl hover:bg-surface-container-low transition-all">Cancelar</button>
                <button onClick={handleSaveGloss} className="flex-1 py-3 bg-rose-500 text-white font-bold rounded-xl hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20">Salvar Glosa</button>
              </div>
            </motion.div>
          </div>
        )}

        {isManualItemModalOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsManualItemModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden p-8 max-h-[90vh] overflow-y-auto">
              <h3 className="text-2xl font-black text-on-surface mb-6">
                {editingItem?.id ? 'Editar Item de Faturamento' : 'Novo Item de Faturamento Manual'}
              </h3>
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Paciente</label>
                    <select value={manualItemForm.patient_id} onChange={e => setManualItemForm({...manualItemForm, patient_id: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Selecione um paciente...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Plano do Paciente</label>
                    <select value={manualItemForm.insurance_plan_id} onChange={e => setManualItemForm({...manualItemForm, insurance_plan_id: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Selecione um plano...</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Procedimento</label>
                    <select value={manualItemForm.procedure_id} onChange={e => setManualItemForm({...manualItemForm, procedure_id: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none">
                      <option value="">Selecione o procedimento realizado...</option>
                      {procedures.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Data do Atendimento</label>
                    <input type="date" value={manualItemForm.service_date} onChange={e => setManualItemForm({...manualItemForm, service_date: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Nº da Guia Física <span className="text-[10px] text-on-surface-variant font-normal">(Opcional)</span></label>
                    <input type="text" value={manualItemForm.guia_number} onChange={e => setManualItemForm({...manualItemForm, guia_number: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Ex: 0000000..." />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Senha de Autorização <span className="text-[10px] text-on-surface-variant font-normal">(Opcional)</span></label>
                    <input type="text" value={manualItemForm.auth_number} onChange={e => setManualItemForm({...manualItemForm, auth_number: e.target.value})} className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Senha do portal" />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setIsManualItemModalOpen(false)} className="flex-1 py-4 border border-outline-variant/30 text-on-surface font-bold rounded-2xl hover:bg-surface-container-low transition-all">Cancelar</button>
                  <button onClick={handleSaveManualItem} disabled={isSaving || !manualItemForm.patient_id || !manualItemForm.insurance_plan_id || !manualItemForm.procedure_id} className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {isSaving ? 'Salvando...' : editingItem?.id ? 'Salvar Alterações' : 'Adicionar Atendimento'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING ACTION BAR */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw]"
          >
            <div className="bg-surface-container-highest/90 backdrop-blur-xl border border-white/20 px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xl font-black text-on-surface">{selectedIds.size}</span>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest leading-none">Selecionados</span>
              </div>
              
              <div className="h-10 w-px bg-white/10" />

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleBulkUpdateStatus('ready_to_bill')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-emerald-500 hover:text-white text-on-surface font-bold rounded-2xl transition-all group"
                >
                  <CheckCircle2 size={20} className="text-emerald-500 group-hover:text-white" />
                  <span>Conferir</span>
                </button>

                <button 
                  onClick={() => handleBulkUpdateStatus('glossed_total')}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-rose-500 hover:text-white text-on-surface font-bold rounded-2xl transition-all group"
                >
                  <X size={20} className="text-rose-500 group-hover:text-white" />
                  <span>Rejeitar</span>
                </button>

                <button 
                  onClick={handleOpenBatchModal}
                  disabled={isSaving || !canGenerateBatch()}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 font-bold rounded-2xl transition-all group",
                    canGenerateBatch() 
                      ? "bg-primary text-white shadow-xl shadow-primary/20 hover:brightness-110" 
                      : "bg-surface-container-low text-on-surface-variant opacity-50 cursor-not-allowed"
                  )}
                >
                  <Package size={20} />
                  <span>Gerar Lote</span>
                </button>

                <button 
                   onClick={() => setSelectedIds(new Set())}
                   className="p-3 text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL: NOVO LOTE */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsBatchModalOpen(false)} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden p-8"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <Package size={28} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-on-surface">Criar Novo Lote</h3>
                  <p className="text-sm text-on-surface-variant font-medium">Agrupar guias para envio</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">Itens Selecionados</span>
                    <span className="font-black text-on-surface">{selectedIds.size} guias</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-outline-variant/10">
                    <span className="text-xs font-bold text-outline uppercase tracking-widest">Valor Total</span>
                    <span className="text-xl font-black text-primary">
                      R$ {billingItems.filter(i => selectedIds.has(i.id)).reduce((acc, i) => acc + Number(i.total_presented_value || 0), 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Operadora</label>
                    <div className="w-full px-4 py-4 bg-surface-container rounded-2xl border border-outline-variant/20 text-on-surface font-bold flex items-center gap-3">
                      <Building2 size={18} className="text-primary" />
                      {insurers.find(ins => ins.id === batchForm.insurer_id)?.name || 'Operadora não identificada'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">Competência (Mês/Ano)</label>
                    <input 
                      type="month" 
                      value={batchForm.competence}
                      onChange={(e) => setBatchForm({ ...batchForm, competence: e.target.value })}
                      className="w-full px-4 py-4 bg-white border border-outline-variant/30 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-on-surface"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={() => setIsBatchModalOpen(false)} 
                    className="flex-1 py-4 text-on-surface font-bold rounded-2xl hover:bg-surface-container transition-all"
                  >
                    Descartar
                  </button>
                  <button 
                    onClick={handleCreateBatch}
                    disabled={isSaving}
                    className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-xl shadow-primary/20 hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check size={20} />
                        <span>Confirmar Lote</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
