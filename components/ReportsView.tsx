'use client';

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  BarChart3, Download, Calendar, Users, TrendingUp, TrendingDown, 
  Package, FileText, ChevronDown, Filter, FileSpreadsheet, File
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as UserType } from '@/types/auth';

const COLORS = ['#172554', '#0EA5E9', '#F2994A', '#EB5757', '#9B51E0', '#27AE60'];

interface ReportsViewProps {
  user: UserType | null;
  patients: any[];
  appointments: any[];
  financialTransactions: any[];
  inventoryItems: any[];
}

export default function ReportsView({ 
  user, 
  patients, 
  appointments, 
  financialTransactions,
  inventoryItems 
}: ReportsViewProps) {
  const [timeRange, setTimeRange] = useState<'mes' | 'trimestre' | 'ano' | 'tudo'>('mes');
  const [isExporting, setIsExporting] = useState(false);

  // ── Data Processing ────────────────────────────────────────────────────────
  
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate = new Date(0);

    if (timeRange === 'mes') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (timeRange === 'trimestre') startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    else if (timeRange === 'ano') startDate = new Date(now.getFullYear(), 0, 1);

    const startDateStr = startDate.toISOString().split('T')[0];

    const filterByDateStr = (dateStr: string) => {
      if (!dateStr) return false;
      if (timeRange === 'tudo') return true;
      const ds = dateStr.substring(0, 10);
      return ds >= startDateStr;
    };

    return {
      patients: patients.filter(p => {
        const d = p.created_at || p.date;
        return filterByDateStr(d);
      }),
      appointments: appointments.filter(a => filterByDateStr(a.date)),
      transactions: financialTransactions.filter(t => filterByDateStr(t.date))
    };
  }, [timeRange, patients, appointments, financialTransactions]);

  // ── Metrics Calculation ────────────────────────────────────────────────────
  
  const metrics = useMemo(() => {
    const revenue = filteredData.appointments
      .filter(a => (a.paymentStatus === 'pago' || a.payment_status === 'pago'))
      .reduce((s, a) => s + Number(a.price || 0), 0) +
      filteredData.transactions
      .filter(t => t.type === 'INCOME')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const pendingRevenue = filteredData.appointments
      .filter(a => (a.paymentStatus === 'pendente' || a.payment_status === 'pendente'))
      .reduce((s, a) => s + Number(a.price || 0), 0);

    const expenses = filteredData.transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((s, t) => s + Number(t.amount || 0), 0);

    const avgTicket = filteredData.appointments.length > 0 ? revenue / filteredData.appointments.length : 0;

    return {
      revenue,
      pendingRevenue,
      expenses,
      profit: revenue - expenses,
      newPatients: filteredData.patients.length,
      appointmentsCount: filteredData.appointments.length,
      avgTicket
    };
  }, [filteredData]);

  // ── Chart Data Preparation ─────────────────────────────────────────────────
  
  const revenueChartData = useMemo(() => {
    // Group by month
    const months: Record<string, { month: string, receita: number, despesa: number }> = {};
    
    // Process appointments
    filteredData.appointments.forEach(a => {
      const status = a.paymentStatus || a.payment_status;
      if (status !== 'pago') return;
      const dateStr = a.date || a.created_at;
      const d = new Date(dateStr + (dateStr.length === 10 ? 'T12:00:00' : ''));
      const m = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receita: 0, despesa: 0 };
      months[m].receita += Number(a.price || 0);
    });

    // Process transactions
    filteredData.transactions.forEach(t => {
      const d = new Date(t.date + (t.date.length === 10 ? 'T12:00:00' : ''));
      const m = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!months[m]) months[m] = { month: m, receita: 0, despesa: 0 };
      if (t.type === 'INCOME') months[m].receita += Number(t.amount || 0);
      else months[m].despesa += Number(t.amount || 0);
    });

    return Object.values(months).sort((a, b) => {
      const [mA, yA] = a.month.split('/');
      const [mB, yB] = b.month.split('/');
      return new Date(2000 + parseInt(yA), 0).getTime() - new Date(2000 + parseInt(yB), 0).getTime();
    });
  }, [filteredData]);

  const patientStats = useMemo(() => {
    const genderMap: Record<string, number> = {};
    patients.forEach(p => {
      const g = p.gender || 'Não Informado';
      genderMap[g] = (genderMap[g] || 0) + 1;
    });

    return Object.entries(genderMap).map(([name, value]) => ({ name, value }));
  }, [patients]);

  const topProtocols = useMemo(() => {
    const protoMap: Record<string, number> = {};
    appointments.forEach(a => {
      if (a.type) protoMap[a.type] = (protoMap[a.type] || 0) + 1;
    });
    return Object.entries(protoMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [appointments]);

  // ── Export Functions ───────────────────────────────────────────────────────
  
  // ── Export Functions (Dynamic XLSX) ─────────────────────────────────────────
  
  const handleExportXLSX = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      
      // Resumo
      const summaryData = [
        ['Métrica', 'Valor'],
        ['Receita Total', metrics.revenue],
        ['Despesa Total', metrics.expenses],
        ['Lucro Líquido', metrics.profit],
        ['Novos Pacientes', metrics.newPatients],
        ['Total de Atendimentos', metrics.appointmentsCount],
        ['Ticket Médio', metrics.avgTicket]
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryData), 'Resumo');

      // Transações
      const transWS = XLSX.utils.json_to_sheet(financialTransactions.map(t => ({
        Data: t.date,
        Tipo: t.type === 'INCOME' ? 'Receita' : 'Despesa',
        Descricao: t.description,
        Categoria: t.category,
        Valor: t.amount
      })));
      XLSX.utils.book_append_sheet(wb, transWS, 'Financeiro');
      
      // Pacientes
      const patientsWS = XLSX.utils.json_to_sheet(patients.map(p => ({
        Nome: p.name,
        Email: p.email,
        Telefone: p.phone,
        Status: p.status,
        Cadastro: new Date(p.created_at).toLocaleDateString('pt-BR')
      })));
      XLSX.utils.book_append_sheet(wb, patientsWS, 'Pacientes');

      XLSX.writeFile(wb, `relatorio_axisgc_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  };

  // ── Specialized Export Functions (Dynamic XLSX Only) ──────────────────────

  const exportCashFlow = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const all = [
        ...filteredData.appointments.filter(a => a.paymentStatus === 'pago').map(a => ({
          date: a.date, type: 'ENTRADA', description: `Sessão: ${a.patientName || 'Paciente'}`, amount: a.price || 0, category: a.type || 'Consulta'
        })),
        ...filteredData.transactions.map(t => ({
          date: t.date, type: t.type === 'INCOME' ? 'ENTRADA' : 'SAÍDA', description: t.description, amount: t.amount, category: t.category
        }))
      ].sort((a, b) => {
        const db = new Date(b.date + (b.date.length === 10 ? 'T12:00:00' : ''));
        const da = new Date(a.date + (a.date.length === 10 ? 'T12:00:00' : ''));
        return da.getTime() - db.getTime();
      });

      let runningBalance = 0;
      const reportData = all.map(item => {
        runningBalance += item.type === 'ENTRADA' ? item.amount : -item.amount;
        return { ...item, balance: runningBalance };
      });

      const ws = XLSX.utils.json_to_sheet(reportData.map(i => ({
        Data: i.date, Tipo: i.type, Descrição: i.description, Categoria: i.category, Valor: i.amount, 'Saldo Prog.': i.balance
      })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fluxo de Caixa');
      XLSX.writeFile(wb, `fluxo_de_caixa_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting CashFlow XLSX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportProfitLoss = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const data = [
        ['Indicador', 'Valor'],
        ['(+) Receitas Totais', metrics.revenue],
        ['(-) Despesas Totais', metrics.expenses],
        ['(=) Resultado Líquido', metrics.profit],
        ['Margem de Lucro', `${((metrics.profit / (metrics.revenue || 1)) * 100).toFixed(1)}%`],
        ['Ponto de Equilíbrio (Est)', metrics.expenses]
      ];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'DRE - Lucro e Prejuízo');
      XLSX.writeFile(wb, `demonstrativo_resultado_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting ProfitLoss XLSX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportServiceRevenue = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const stats: Record<string, { name: string, count: number, total: number }> = {};
      filteredData.appointments.forEach(a => {
        const key = a.type || 'Outros';
        if (!stats[key]) stats[key] = { name: key, count: 0, total: 0 };
        stats[key].count++;
        stats[key].total += (a.price || 0);
      });
      const reportData = Object.values(stats).sort((a,b) => b.total - a.total);

      const ws = XLSX.utils.json_to_sheet(reportData.map(i => ({ Serviço: i.name, 'Qtd Atendimentos': i.count, 'Total Faturado': i.total })));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Faturamento por Serviço');
      XLSX.writeFile(wb, `faturamento_servicos_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting ServiceRevenue XLSX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportInventoryAssets = async () => {
    setIsExporting(true);
    try {
      const XLSX = await import('xlsx');
      const reportData = inventoryItems.map(i => ({
        name: i.name,
        quantity: i.quantity,
        unit_cost: i.unit_cost || 0,
        total_value: (i.quantity || 0) * (i.unit_cost || 0)
      }));
      const totalAsset = reportData.reduce((s, i) => s + i.total_value, 0);

      const data = [...reportData.map(i => ({ Item: i.name, Qtd: i.quantity, 'Custo Unit.': i.unit_cost, 'Valor Total': i.total_value })), { Item: 'TOTAL GERAL', 'Valor Total': totalAsset }];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estoque e Ativos');
      XLSX.writeFile(wb, `inventario_custo_medio_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting InventoryAssets XLSX:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportGeneralPDF = async () => {
    // Redireciona para exportação XLSX rápida conforme configuração
    await handleExportXLSX();
  };

  return (
    <div className="p-6 md:p-10 space-y-8 relative max-w-7xl mx-auto">
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-headline font-extrabold text-on-surface tracking-tight">Relatórios & Insights</h2>
          <p className="text-on-surface-variant/80 font-medium text-lg mt-2 flex items-center gap-2">
            <BarChart3 size={20} className="text-primary" />
            Análise completa do desempenho da sua clínica.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-surface-container-low p-1 rounded-2xl flex gap-1 border border-outline-variant/10 shadow-sm">
            {[
              { id: 'mes', label: 'Mês' },
              { id: 'trimestre', label: 'Trimestre' },
              { id: 'ano', label: 'Ano' },
              { id: 'tudo', label: 'Tudo' }
            ].map(r => (
              <button 
                key={r.id} 
                onClick={() => setTimeRange(r.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${timeRange === r.id ? 'bg-white shadow-md text-primary' : 'text-outline hover:text-on-surface'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <button 
              onClick={handleExportXLSX}
              disabled={isExporting}
              className="px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-sm hover:bg-indigo-100 transition-all flex items-center gap-2 border border-indigo-100"
            >
              <FileSpreadsheet size={18} /> Excel (Geral)
            </button>
            <button 
              onClick={handleExportGeneralPDF}
              disabled={isExporting}
              className="px-5 py-3 rounded-2xl bg-rose-50 text-rose-600 font-bold text-sm hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-100"
            >
              <File size={18} /> PDF (Geral)
            </button>
          </div>
        </div>
      </section>

      {/* KPI Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <KPICard 
          title="Faturamento Bruto" 
          value={metrics.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subtitle="No período selecionado"
          icon={TrendingUp}
          color="emerald"
        />
        <KPICard 
          title="Novos Pacientes" 
          value={metrics.newPatients.toString()} 
          subtitle="Cadastros realizados"
          icon={Users}
          color="primary"
        />
        <KPICard 
          title="A Receber" 
          value={metrics.pendingRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subtitle="Agendamentos pendentes"
          icon={Calendar}
          color="amber"
        />
        <KPICard 
          title="Ticket Médio" 
          value={metrics.avgTicket.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subtitle="Valor por atendimento"
          icon={BarChart3}
          color="indigo"
        />
        <KPICard 
          title="Lucro Líquido" 
          value={metrics.profit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} 
          subtitle="Receita - Despesas"
          icon={TrendingUp}
          color={metrics.profit >= 0 ? 'emerald' : 'rose'}
        />
      </section>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8"
        >
          <div className="mb-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">Evolução Financeira</h3>
            <p className="text-sm text-outline font-medium">Receitas vs Despesas mensal</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  formatter={(value: any) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                />
                <Legend iconType="circle" />
                <Bar dataKey="receita" fill="#0F5238" radius={[6, 6, 0, 0]} name="Receita" />
                <Bar dataKey="despesa" fill="#EB5757" radius={[6, 6, 0, 0]} name="Despesa" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Protocols Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8"
        >
          <div className="mb-6">
            <h3 className="text-xl font-headline font-bold text-on-surface">Top 5 Tratamentos</h3>
            <p className="text-sm text-outline font-medium">Protocolos mais utilizados</p>
          </div>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={topProtocols}
                  cx="50%"
                  cy="50%"
                innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                >
                  {topProtocols.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Distribution by Gender */}
        <div className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-headline font-bold text-on-surface">Perfil de Pacientes</h3>
            <p className="text-sm text-outline font-medium">Distribuição por gênero</p>
          </div>
          
          <div className="h-[240px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={patientStats}
                  innerRadius={0}
                  outerRadius={80}
                  dataKey="value"
                  label
                >
                  {patientStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Status Summary */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm p-8">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h3 className="text-xl font-headline font-bold text-on-surface">Resumo de Ativos</h3>
              <p className="text-sm text-outline font-medium">Visão geral operacional</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{inventoryItems.length}</p>
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Itens em Catálogo</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Estoque de Alerta</p>
                  <p className="text-xs text-outline">Itens abaixo da quantidade mínima segura</p>
                </div>
              </div>
              <p className="text-xl font-black text-amber-600">{inventoryItems.filter(i => i.quantity <= i.min_quantity).length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                  <Package size={20} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Estoque em Dia</p>
                  <p className="text-xs text-outline">Itens com disponibilidade normal</p>
                </div>
              </div>
              <p className="text-xl font-black text-emerald-600">{inventoryItems.filter(i => i.quantity > i.min_quantity).length}</p>
            </div>

            <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="font-bold text-on-surface">Protocolos Cadastrados</p>
                  <p className="text-xs text-outline">Protocolos salvos para aplicação rápida</p>
                </div>
              </div>
              <p className="text-xl font-black text-indigo-600">{topProtocols.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* DOWNLOADS ESPECIALIZADOS - MOVED TO THE BOTTOM */}
      <section className="space-y-4 pt-4 border-t border-outline-variant/10">
        <div className="flex items-center gap-2 px-2">
          <Download size={20} className="text-primary" />
          <h3 className="text-xl font-headline font-bold text-on-surface">Downloads Estratégicos</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ReportDownloadCard 
            title="Fluxo de Caixa"
            desc="Entradas, saídas e saldo progressivo dia a dia."
            onXlsx={exportCashFlow}
            icon={TrendingUp}
            color="emerald"
          />
          <ReportDownloadCard 
            title="Lucro ou Prejuízo"
            desc="Comparativo direto (DRE) entre ganhos e gastos."
            onXlsx={exportProfitLoss}
            icon={BarChart3}
            color="indigo"
          />
          <ReportDownloadCard 
            title="Faturamento por Serviço"
            desc="Ranking de rentabilidade por especialidade."
            onXlsx={exportServiceRevenue}
            icon={Users}
            color="amber"
          />
          <ReportDownloadCard 
            title="Estoque & Custo Médio"
            desc="Valor patrimonial e consumo de materiais."
            onXlsx={exportInventoryAssets}
            icon={Package}
            color="rose"
          />
        </div>
      </section>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/5 text-primary icon-bg-primary/10',
    emerald: 'bg-emerald-50 text-emerald-600 icon-bg-emerald-100',
    amber: 'bg-amber-50 text-amber-600 icon-bg-amber-100',
    rose: 'bg-rose-50 text-rose-600 icon-bg-rose-100',
    indigo: 'bg-indigo-50 text-indigo-600 icon-bg-indigo-100',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
      className={`${colorMap[color].split(' ')[0]} p-6 rounded-[2rem] border border-white/60 shadow-sm`}
    >
      <div className={`w-12 h-12 rounded-2xl ${colorMap[color].split(' ')[2]} flex items-center justify-center mb-4 text-inherit`}>
        <Icon size={24} />
      </div>
      <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">{title}</p>
      <h3 className={`text-2xl font-headline font-extrabold ${colorMap[color].split(' ')[1]}`}>{value}</h3>
      <p className="text-xs text-outline mt-1 font-medium">{subtitle}</p>
    </motion.div>
  );
}

function ReportDownloadCard({ title, desc, onXlsx, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/5 text-primary',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
    indigo: 'bg-indigo-50 text-indigo-700',
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-6 rounded-[2rem] border border-outline-variant/10 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
    >
      <div>
        <div className={`w-10 h-10 rounded-xl ${colorMap[color]} flex items-center justify-center mb-4`}>
          <Icon size={20} />
        </div>
        <h4 className="text-base font-bold text-on-surface mb-1">{title}</h4>
        <p className="text-xs text-outline leading-relaxed mb-6">{desc}</p>
      </div>
      
      <div className="flex gap-2">
        <button 
          onClick={onXlsx}
          className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-all border border-emerald-200 flex items-center justify-center gap-2"
        >
          <FileSpreadsheet size={16} /> Exportar Planilha (XLSX)
        </button>
      </div>
    </motion.div>
  );
}
