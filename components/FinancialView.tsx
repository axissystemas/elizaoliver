'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownLeft,
  Download, Plus, Trash2, AlertTriangle, X, Check, Calendar,
  Filter, ChevronDown, DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { User as UserType } from '@/types/auth';
import { getClientSupabase } from '@/lib/supabase';

const INCOME_CATEGORIES = ['Consulta', 'Avaliação', 'Protocolo', 'Produto', 'Pacote', 'Outros'];
const EXPENSE_CATEGORIES = ['Aluguel', 'Materiais', 'Equipamentos', 'Marketing', 'Salários', 'Utilidades', 'Impostos', 'Outros'];

interface FinancialTransaction {
  id: string;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  amount: number;
  category: string;
  date: string;
  notes?: string;
  source: 'manual' | 'appointment';
}

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatDate = (dateStr: string) =>
  new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR');

export default function FinancialView({
  user,
  appointments: initialAppointments,
  onConfirmPayment,
  onDeleteTransaction,
}: {
  user: UserType | null;
  appointments: any[];
  onConfirmPayment?: (id: string) => Promise<void>;
  onDeleteTransaction?: (id: string) => Promise<void>;
}) {
  const [appointments, setAppointments] = useState<any[]>(initialAppointments);
  const [manualTransactions, setManualTransactions] = useState<FinancialTransaction[]>([]);
  const [isLoadingManual, setIsLoadingManual] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; source: 'manual' | 'appointment' } | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'INCOME' | 'EXPENSE'>('all');
  const [timeRange, setTimeRange] = useState<'hoje' | '7d' | 'mes' | 'semestre' | 'ano'>('7d');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, timeRange]);

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: 'Consulta',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const canCreate = user?.permissions.includes('financial:create') || user?.role === 'ADMIN';
  const canReport = user?.permissions.includes('financial:reports') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('financial:delete') || user?.role === 'ADMIN';

  useEffect(() => { setAppointments(initialAppointments); }, [initialAppointments]);

  useEffect(() => {
    fetchManualTransactions();
  }, []);

  const fetchManualTransactions = async () => {
    const sb = getClientSupabase();
    if (!sb) { setIsLoadingManual(false); return; }
    setIsLoadingManual(true);
    try {
      const { data, error } = await (sb as any)
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      if (data) {
        setManualTransactions((data as any[]).map(t => ({
          ...t,
          type: t.type as 'INCOME' | 'EXPENSE',
          source: 'manual' as const,
        })));
      }
    } catch (err) {
      console.error('Error fetching financial transactions:', err);
    } finally {
      setIsLoadingManual(false);
    }
  };

  // ── Unified transaction list ──────────────────────────────────────────────
  const allTransactions = useMemo((): FinancialTransaction[] => {
    const fromAppointments: FinancialTransaction[] = appointments
      .filter(a => a.paymentStatus === 'pago' && typeof a.price === 'number')
      .map(a => ({
        id: a.id,
        type: 'INCOME' as const,
        description: a.patientName || 'Consulta',
        amount: a.price,
        category: 'Consulta',
        date: a.date,
        source: 'appointment' as const,
      }));
    return [...fromAppointments, ...manualTransactions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments, manualTransactions]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  const thisMonthTransactions = allTransactions.filter(t => new Date(t.date + 'T12:00:00') >= monthStart);
  const totalIncome = allTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const totalExpense = allTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;
  const monthIncome = thisMonthTransactions.filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
  const monthExpense = thisMonthTransactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

  const pendingAmount = appointments
    .filter(a => a.paymentStatus === 'pendente')
    .reduce((s, a) => s + (a.price || 0), 0);

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const buckets: { label: string; income: number; expense: number }[] = [];

    if (timeRange === 'hoje') {
      const todayStr = now.toISOString().split('T')[0];
      for (let i = 0; i < 6; i++) {
        const hStart = i * 4;
        const hEnd = hStart + 3;
        const label = `${String(hStart).padStart(2, '0')}-${String(hEnd).padStart(2, '0')}h`;
        
        // Simulação de distribuição horária simples (já que t.date não costuma ter H/M no banco se for tipo date)
        // Se t.created_at existisse, poderíamos ser mais precisos. 
        // Para agora, vamos somar tudo no primeiro bloco comercial (08-12h) se não tivermos hora
        const income = allTransactions.filter(t => t.date === todayStr && t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
        const expense = allTransactions.filter(t => t.date === todayStr && t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);
        
        // Como o banco armazena apenas data YYYY-MM-DD, vamos mostrar o total no slot das 12h-16h 
        // ou dividir se tivéssemos timestamp. Por enquanto, vamos concentrar ou deixar vazio os slots
        if (i === 3) { // 12-15h
           buckets.push({ label, income, expense });
        } else {
           buckets.push({ label, income: 0, expense: 0 });
        }
      }
    } else if (timeRange === '7d') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
        const end = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
        const income = allTransactions.filter(t => t.type === 'INCOME' && new Date(t.date + 'T12:00:00') >= start && new Date(t.date + 'T12:00:00') <= end).reduce((s, t) => s + t.amount, 0);
        const expense = allTransactions.filter(t => t.type === 'EXPENSE' && new Date(t.date + 'T12:00:00') >= start && new Date(t.date + 'T12:00:00') <= end).reduce((s, t) => s + t.amount, 0);
        buckets.push({ label: label.charAt(0).toUpperCase() + label.slice(1), income, expense });
      }
    } else if (timeRange === 'mes') {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(); end.setDate(now.getDate() - i * 7); end.setHours(23,59,59);
        const start = new Date(end); start.setDate(end.getDate() - 6); start.setHours(0,0,0);
        const label = `Sem ${4 - i}`;
        const income = allTransactions.filter(t => t.type === 'INCOME' && new Date(t.date + 'T12:00:00') >= start && new Date(t.date + 'T12:00:00') <= end).reduce((s, t) => s + t.amount, 0);
        const expense = allTransactions.filter(t => t.type === 'EXPENSE' && new Date(t.date + 'T12:00:00') >= start && new Date(t.date + 'T12:00:00') <= end).reduce((s, t) => s + t.amount, 0);
        buckets.push({ label, income, expense });
      }
    } else if (timeRange === 'semestre') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const income = allTransactions.filter(t => t.type === 'INCOME' && new Date(t.date + 'T12:00:00').getMonth() === d.getMonth() && new Date(t.date + 'T12:00:00').getFullYear() === d.getFullYear()).reduce((s, t) => s + t.amount, 0);
        const expense = allTransactions.filter(t => t.type === 'EXPENSE' && new Date(t.date + 'T12:00:00').getMonth() === d.getMonth() && new Date(t.date + 'T12:00:00').getFullYear() === d.getFullYear()).reduce((s, t) => s + t.amount, 0);
        buckets.push({ label: label.charAt(0).toUpperCase() + label.slice(1), income, expense });
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const income = allTransactions.filter(t => t.type === 'INCOME' && new Date(t.date + 'T12:00:00').getFullYear() === year).reduce((s, t) => s + t.amount, 0);
        const expense = allTransactions.filter(t => t.type === 'EXPENSE' && new Date(t.date + 'T12:00:00').getFullYear() === year).reduce((s, t) => s + t.amount, 0);
        buckets.push({ label: year.toString(), income, expense });
      }
    }

    const maxVal = Math.max(...buckets.map(b => Math.max(b.income, b.expense)), 1);
    return buckets.map(b => ({
      ...b,
      incomeH: Math.max((b.income / maxVal) * 100, b.income > 0 ? 5 : 0),
      expenseH: Math.max((b.expense / maxVal) * 100, b.expense > 0 ? 5 : 0),
    }));
  }, [allTransactions, timeRange]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() =>
    filterType === 'all' ? allTransactions : allTransactions.filter(t => t.type === filterType),
    [allTransactions, filterType]
  );

  const totalPagesCount = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage, itemsPerPage]);

  const paginationInfo = {
    start: (currentPage - 1) * itemsPerPage + 1,
    end: Math.min(currentPage * itemsPerPage, filteredTransactions.length),
    total: filteredTransactions.length
  };

  // ── Actions ───────────────────────────────────────────────────────────────
  const openModal = (type: 'INCOME' | 'EXPENSE') => {
    setModalType(type);
    setFormData({ description: '', amount: '', category: type === 'INCOME' ? 'Consulta' : 'Outros', date: new Date().toISOString().split('T')[0], notes: '' });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const sb = getClientSupabase();
    if (!sb || !user) return;
    setIsSaving(true);
    try {
      const { data, error } = await (sb as any).from('financial_transactions').insert([{
        type: modalType,
        description: formData.description,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        notes: formData.notes || null,
        created_by: user.id,
      }]).select().single();
      if (error) throw error;
      if (data) {
        const newTx: FinancialTransaction = {
          id: (data as any).id,
          type: (data as any).type as 'INCOME' | 'EXPENSE',
          description: (data as any).description,
          amount: (data as any).amount,
          category: (data as any).category,
          date: (data as any).date,
          notes: (data as any).notes,
          source: 'manual' as const,
        };
        setManualTransactions(prev => [newTx, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar lançamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPayment = async (id: string) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, paymentStatus: 'pago' } : a));
    try { await onConfirmPayment?.(id); } catch { setAppointments(appointments); }
  };

  const confirmDelete = (id: string, source: 'manual' | 'appointment') => {
    setItemToDelete({ id, source });
    setShowDeleteConfirm(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    if (itemToDelete.source === 'manual') {
      const sb = getClientSupabase();
      if (!sb) return;
      const prev = [...manualTransactions];
      setManualTransactions(p => p.filter(t => t.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      try {
        const { error } = await (sb as any).from('financial_transactions').delete().eq('id', itemToDelete.id);
        if (error) throw error;
      } catch { setManualTransactions(prev); }
    } else {
      const prev = [...appointments];
      setAppointments(p => p.filter(a => a.id !== itemToDelete.id));
      setShowDeleteConfirm(false);
      try { await onDeleteTransaction?.(itemToDelete.id); } catch { setAppointments(prev); }
    }
    setItemToDelete(null);
  };

  const handleExportPDF = () => {
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF();
      const pw = doc.internal.pageSize.getWidth();
      doc.setFontSize(20); doc.setTextColor(15, 82, 56);
      doc.text('Relatório Financeiro — Axis GC', pw / 2, 20, { align: 'center' });
      doc.setFontSize(9); doc.setTextColor(100);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pw / 2, 28, { align: 'center' });

      autoTable(doc, {
        startY: 38,
        head: [['Indicador', 'Valor']],
        body: [
          ['Total de Receitas', formatCurrency(totalIncome)],
          ['Total de Despesas', formatCurrency(totalExpense)],
          ['Saldo', formatCurrency(balance)],
          ['Receitas do Mês', formatCurrency(monthIncome)],
          ['Despesas do Mês', formatCurrency(monthExpense)],
          ['A Receber (Pendente)', formatCurrency(pendingAmount)],
        ],
        theme: 'striped',
        headStyles: { fillColor: [16, 185, 129] }, // Verde Esmeralda para Relatórios
      });

      let y = (doc as any).lastAutoTable.finalY + 12;
      doc.setFontSize(14); doc.setTextColor(0);
      doc.text('Transações', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
        body: allTransactions.map(t => [
          formatDate(t.date), t.description, t.category,
          t.type === 'INCOME' ? 'Receita' : 'Despesa',
          formatCurrency(t.amount),
        ]),
        theme: 'striped',
        headStyles: { fillColor: [17, 37, 84] }, // Marinho Axis para o resto
      });

      doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      alert('Erro ao gerar relatório.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-10 space-y-10 relative">

      {/* Header */}
      <section className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">Gestão Financeira</h2>
          <p className="text-on-surface-variant/80 font-medium text-lg mt-1">Controle de receitas, despesas e saldo.</p>
        </div>
        {canCreate && (
          <div className="flex gap-2.5">
            <button
              onClick={() => openModal('INCOME')}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <ArrowUpRight size={15} /> Receita
            </button>
            <button
              onClick={() => openModal('EXPENSE')}
              className="px-4 py-2.5 rounded-xl bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-1.5"
            >
              <ArrowDownLeft size={15} /> Despesa
            </button>
          </div>
        )}
      </section>

      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {[
          {
            label: 'Saldo Atual', value: formatCurrency(balance), icon: Wallet,
            bg: balance >= 0 ? 'bg-primary/5' : 'bg-rose-50',
            iconBg: balance >= 0 ? 'bg-primary/10 text-primary' : 'bg-rose-100 text-rose-600',
            valueColor: balance >= 0 ? 'text-primary' : 'text-rose-600',
            sub: balance >= 0 ? 'Balanço positivo' : 'Balanço negativo',
          },
          {
            label: 'Total de Receitas', value: formatCurrency(totalIncome), icon: TrendingUp,
            bg: 'bg-emerald-50', iconBg: 'bg-emerald-100 text-emerald-600',
            valueColor: 'text-emerald-700',
            sub: `Este mês: ${formatCurrency(monthIncome)}`,
          },
          {
            label: 'Total de Despesas', value: formatCurrency(totalExpense), icon: TrendingDown,
            bg: 'bg-rose-50', iconBg: 'bg-rose-100 text-rose-600',
            valueColor: 'text-rose-700',
            sub: `Este mês: ${formatCurrency(monthExpense)}`,
          },
          {
            label: 'A Receber', value: formatCurrency(pendingAmount), icon: DollarSign,
            bg: 'bg-amber-50', iconBg: 'bg-amber-100 text-amber-600',
            valueColor: 'text-amber-700',
            sub: `${appointments.filter(a => a.paymentStatus === 'pendente').length} sessões pendentes`,
          },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`${card.bg} p-6 rounded-[2rem] border border-white/60 shadow-sm`}
          >
            <div className={`w-11 h-11 rounded-xl ${card.iconBg} flex items-center justify-center mb-4`}>
              <card.icon size={22} />
            </div>
            <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">{card.label}</p>
            <h3 className={`text-2xl font-headline font-extrabold ${card.valueColor}`}>{card.value}</h3>
            <p className="text-xs text-outline mt-1 font-medium">{card.sub}</p>
          </motion.div>
        ))}
      </section>

      {/* Chart */}
      <section className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h4 className="text-xl font-headline font-bold text-on-surface">Entradas × Saídas</h4>
            <p className="text-sm text-outline font-medium mt-0.5">Comparativo por período</p>
          </div>
          <div className="flex bg-surface-container-low p-1 rounded-2xl gap-1 flex-wrap">
            {[{ id: 'hoje', label: 'Hoje' }, { id: '7d', label: '7d' }, { id: 'mes', label: 'Mês' }, { id: 'semestre', label: 'Semestre' }, { id: 'ano', label: 'Ano' }].map(r => (
              <button key={r.id} onClick={() => setTimeRange(r.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${timeRange === r.id ? 'bg-white shadow text-on-surface' : 'text-outline hover:text-on-surface'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mb-6">
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-outline">Receitas</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-400" /><span className="text-xs font-bold text-outline">Despesas</span></div>
        </div>

        <div className="flex items-end justify-between gap-3 px-2" style={{ height: '240px' }}>
          {chartData.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative" style={{ height: '100%' }}>
              
              {/* Value labels above bars */}
              <div className="w-full flex gap-1 items-end justify-center px-1" style={{ height: 'calc(100% - 25px)' }}>
                {/* Income Bar */}
                <div className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  {b.income > 0 && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-black text-emerald-700 mb-1 leading-none bg-emerald-50 px-1.5 py-0.5 rounded-md shadow-sm border border-emerald-100 z-10"
                    >
                      {b.income >= 1000 ? `${(b.income/1000).toFixed(1)}k` : b.income.toFixed(0)}
                    </motion.span>
                  )}
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${b.incomeH}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: 'circOut' }}
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 hover:from-emerald-600 hover:to-emerald-500 rounded-t-xl transition-all cursor-pointer shadow-sm relative group/bar"
                    style={{ minHeight: b.income > 0 ? '6px' : '0' }}
                  >
                     <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-xl" />
                  </motion.div>
                </div>

                {/* Expense Bar */}
                <div className="flex-1 flex flex-col items-center justify-end" style={{ height: '100%' }}>
                  {b.expense > 0 && (
                    <motion.span 
                      initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      className="text-[10px] font-black text-rose-700 mb-1 leading-none bg-rose-50 px-1.5 py-0.5 rounded-md shadow-sm border border-rose-100 z-10"
                    >
                      {b.expense >= 1000 ? `${(b.expense/1000).toFixed(1)}k` : b.expense.toFixed(0)}
                    </motion.span>
                  )}
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: `${b.expenseH}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 + 0.1, ease: 'circOut' }}
                    className="w-full bg-gradient-to-t from-rose-500 to-rose-400 hover:from-rose-600 hover:to-rose-500 rounded-t-xl transition-all cursor-pointer shadow-sm relative group/bar"
                    style={{ minHeight: b.expense > 0 ? '6px' : '0' }}
                  >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover/bar:opacity-100 transition-opacity rounded-t-xl" />
                  </motion.div>
                </div>
              </div>

              {/* Tooltip on hover (Full value) */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-20 pointer-events-none translate-y-2 group-hover:translate-y-0">
                <div className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl whitespace-nowrap shadow-xl flex flex-col gap-0.5">
                   {b.income > 0 && <span className="text-emerald-400">Receita: {formatCurrency(b.income)}</span>}
                   {b.expense > 0 && <span className="text-rose-400">Despesa: {formatCurrency(b.expense)}</span>}
                </div>
              </div>

              <span className="text-[10px] font-bold text-outline text-center w-full truncate pb-1">{b.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Pending appointments - Recem Movido para cá */}
      {appointments.filter(a => a.paymentStatus === 'pendente').length > 0 && (
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/40 rounded-[2.5rem] border border-amber-100 shadow-sm p-8"
        >
          <p className="text-xs font-bold text-amber-700 uppercase tracking-widest mb-6 flex items-center gap-2">
            <AlertTriangle size={16} /> Sessões a Receber
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.filter(a => a.paymentStatus === 'pendente').slice(0, 6).map(a => (
              <div key={a.id} className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-amber-100 shadow-sm hover:shadow-md transition-all group">
                <div>
                  <p className="font-bold text-on-surface text-sm">{a.patientName}</p>
                  <p className="text-[10px] text-outline mt-0.5">{formatDate(a.date)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-black text-amber-700">{formatCurrency(a.price || 0)}</span>
                  {canCreate && (
                    <button onClick={() => handleConfirmPayment(a.id)}
                      className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      title="Confirmar Pagamento"
                    >
                      <Check size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}

      {/* Transaction Table */}
      <section className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
        <div className="px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-outline-variant/10 bg-surface-container-low/30">
          <h4 className="text-xl font-headline font-bold text-on-surface">Extrato de Transações</h4>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Filter */}
            <div className="flex bg-surface-container-low rounded-xl p-1 gap-1">
              {[{ id: 'all', label: 'Todos' }, { id: 'INCOME', label: 'Receitas' }, { id: 'EXPENSE', label: 'Despesas' }].map(f => (
                <button key={f.id} onClick={() => setFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === f.id ? 'bg-white shadow text-on-surface' : 'text-outline'}`}>
                  {f.label}
                </button>
              ))}
            </div>
            {canReport && (
              <button onClick={handleExportPDF} disabled={isGeneratingReport}
                className="flex items-center gap-2 text-primary font-bold text-sm hover:underline disabled:opacity-50">
                {isGeneratingReport ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /> : <Download size={16} />}
                Exportar PDF
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold tracking-widest uppercase text-outline border-b border-outline-variant/10">
                <th className="px-8 py-4">Data</th>
                <th className="px-8 py-4">Descrição</th>
                <th className="px-8 py-4">Categoria</th>
                <th className="px-8 py-4">Tipo</th>
                <th className="px-8 py-4 text-right">Valor</th>
                {canDelete && <th className="px-8 py-4" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {paginatedTransactions.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-16 text-center text-outline italic opacity-60">
                  {isLoadingManual ? 'Carregando...' : 'Nenhuma transação encontrada.'}
                </td></tr>
              ) : paginatedTransactions.map(t => (
                <tr key={`${t.source}-${t.id}`} className="hover:bg-surface-container-low/40 transition-colors group">
                  <td className="px-8 py-4 text-sm font-medium text-outline">{formatDate(t.date)}</td>
                  <td className="px-8 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {t.type === 'INCOME' ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                      </div>
                      <div>
                        <p className="font-bold text-on-surface text-sm">{t.description}</p>
                        {t.source === 'appointment' && <p className="text-[10px] text-outline">Via Agenda</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-4">
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant">
                      {t.category}
                    </span>
                  </td>
                  <td className="px-8 py-4">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                      {t.type === 'INCOME' ? '↑ Receita' : '↓ Despesa'}
                    </span>
                  </td>
                  <td className={`px-8 py-4 text-right font-extrabold text-lg ${t.type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {t.type === 'INCOME' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  {canDelete && (
                    <td className="px-8 py-4 text-right">
                      <button onClick={() => confirmDelete(t.id, t.source)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
            {filteredTransactions.length > 0 && (
              <tfoot>
                <tr className="bg-surface-container-low/50 border-t border-outline-variant/10">
                  <td colSpan={3} className="px-8 py-4 text-xs font-bold text-outline uppercase tracking-wider">Total no período</td>
                  <td className="px-8 py-4">
                    <span className={`text-xs font-bold ${balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {balance >= 0 ? 'Positivo' : 'Negativo'}
                    </span>
                  </td>
                  <td className={`px-8 py-4 text-right font-extrabold text-xl ${balance >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
                  </td>
                  {canDelete && <td />}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Pagination Bar */}
        {filteredTransactions.length > 0 && (
          <div className="px-8 py-4 border-t border-outline-variant/10 bg-surface-container-low/20 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-outline uppercase tracking-tight">Exibir:</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="bg-white border border-outline-variant/20 rounded-lg px-2 py-1 text-xs font-bold outline-none focus:ring-1 focus:ring-primary/20 cursor-pointer"
                >
                  {[10, 20, 50, 100].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <span className="text-[10px] font-bold text-outline-variant uppercase tracking-widest hidden md:inline">
                Mostrando {paginationInfo.start}-{paginationInfo.end} de {paginationInfo.total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-xl border border-outline-variant/10 bg-white shadow-sm hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Página Anterior"
              >
                <ChevronDown size={18} className="rotate-90" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPagesCount) }).map((_, i) => {
                  // Lógica simples de exibição de números (primeiras 5 páginas)
                  const pageNum = i + 1;
                  const isActive = currentPage === pageNum;
                  return (
                    <button 
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${isActive ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-outline hover:bg-surface-container-low'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                {totalPagesCount > 5 && <span className="text-outline text-xs px-1">...</span>}
              </div>

              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPagesCount, prev + 1))}
                disabled={currentPage === totalPagesCount}
                className="p-2 rounded-xl border border-outline-variant/10 bg-white shadow-sm hover:bg-surface-container-low disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Próxima Página"
              >
                <ChevronDown size={18} className="-rotate-90" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Launch Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
              {/* Header color */}
              <div className={`px-8 py-6 flex justify-between items-center ${modalType === 'INCOME' ? 'bg-emerald-500' : 'bg-rose-500'} text-white`}>
                <div className="flex items-center gap-3">
                  {modalType === 'INCOME' ? <ArrowUpRight size={24} /> : <ArrowDownLeft size={24} />}
                  <h3 className="text-xl font-headline font-bold">
                    {modalType === 'INCOME' ? 'Lançar Receita' : 'Lançar Despesa'}
                  </h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-white/20 rounded-full transition-all"><X size={22} /></button>
              </div>

              <form onSubmit={handleSave} className="p-8 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Descrição</label>
                  <input required type="text" value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder={modalType === 'INCOME' ? 'Ex: Consulta - João Silva' : 'Ex: Conta de energia'}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Valor (R$)</label>
                    <input required type="number" min="0.01" step="0.01" value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0,00"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-bold text-lg" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest">Data</label>
                    <input required type="date" value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Categoria</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium appearance-none">
                    {(modalType === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-outline uppercase tracking-widest">Observação (opcional)</label>
                  <textarea rows={2} value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium resize-none"
                    placeholder="Detalhes adicionais..." />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 rounded-2xl border border-outline-variant/20 font-bold text-outline hover:bg-surface-container-low transition-all">
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSaving}
                    className={`flex-1 py-3.5 rounded-2xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${modalType === 'INCOME' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'}`}>
                    {isSaving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</> : <><Check size={18} /> Confirmar Lançamento</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6"><AlertTriangle size={32} /></div>
                <h3 className="text-xl font-headline font-bold text-on-surface mb-3">Excluir Transação?</h3>
                <p className="text-on-surface-variant font-medium text-sm leading-relaxed mb-8">Esta ação é permanente e não pode ser desfeita.</p>
                <div className="flex gap-3 w-full">
                  <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3 rounded-2xl font-bold text-sm bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all">Cancelar</button>
                  <button onClick={handleDelete} className="flex-1 py-3 rounded-2xl font-bold text-sm bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all">Excluir</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
