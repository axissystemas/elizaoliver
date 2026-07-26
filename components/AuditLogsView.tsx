'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Shield, 
  RefreshCw, 
  Calendar, 
  User as UserIcon, 
  Download, 
  Eye, 
  X, 
  Filter, 
  Lock,
  FileCode,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { User } from '@/types/auth';
import { logAction, getLocalAuditLogs } from '@/lib/auditLogService';

interface AuditLog {
  id: string;
  user_id: string;
  organization_id?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: any;
  ip_address?: string;
  created_at: string;
  profiles?: {
    name: string;
    email: string;
  };
}

interface AuditLogsViewProps {
  user?: User | null;
}

const MODULE_OPTIONS = [
  { id: 'ALL', label: 'Todos os Módulos' },
  { id: 'AUTH', label: 'Usuários / Autenticação' },
  { id: 'PATIENTS', label: 'Pacientes' },
  { id: 'FINANCIAL', label: 'Financeiro' },
  { id: 'APPOINTMENTS', label: 'Agenda / Consultas' },
  { id: 'EVALUATIONS', label: 'Avaliações' },
  { id: 'INVENTORY', label: 'Estoque' },
  { id: 'BILLING', label: 'Faturamento' },
  { id: 'DIETOTHERAPY', label: 'Dietoterapia MTC' },
  { id: 'CLINIC', label: 'Dados da Clínica' },
  { id: 'SYSTEM', label: 'Configurações do Sistema' }
];

const ACTION_OPTIONS = [
  { id: 'ALL', label: 'Todas as Ações' },
  { id: 'CREATE', label: 'Criação' },
  { id: 'INSERT', label: 'Inserção (DB)' },
  { id: 'UPDATE', label: 'Atualização' },
  { id: 'DELETE', label: 'Exclusão' },
  { id: 'INACTIVATE', label: 'Inativação' },
  { id: 'ACTIVATE', label: 'Reativação' },
  { id: 'LOGIN', label: 'Acesso / Login' },
  { id: 'LOGOUT', label: 'Saída / Logout' },
  { id: 'EXPORT', label: 'Exportação' },
  { id: 'IMPORT', label: 'Importação' }
];

export default function AuditLogsView({ user }: AuditLogsViewProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [auditEnabled, setAuditEnabled] = useState(true);
  const [isTogglingAudit, setIsTogglingAudit] = useState(false);

  useEffect(() => {
    async function fetchAuditStatus() {
      if (!supabase) return;
      try {
        const { data } = await supabase
          .from('system_settings')
          .select('audit_enabled')
          .eq('id', 1)
          .maybeSingle();

        if (data && typeof data.audit_enabled === 'boolean') {
          setAuditEnabled(data.audit_enabled);
        }
      } catch (e) {}
    }
    fetchAuditStatus();
  }, []);

  const handleToggleAudit = async () => {
    if (!supabase || user?.role !== 'ADMIN') return;
    setIsTogglingAudit(true);
    const newStatus = !auditEnabled;

    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          id: 1, 
          audit_enabled: newStatus, 
          updated_at: new Date().toISOString(), 
          updated_by: user.id 
        });

      if (error) throw error;

      setAuditEnabled(newStatus);
      logAction({
        action: 'SETTINGS_CHANGE',
        entityType: 'SYSTEM',
        details: { audit_enabled: newStatus, reason: newStatus ? 'Ativado manualmente pelo administrador' : 'Pausado para economia de armazenamento' }
      }).catch(() => {});

    } catch (err: any) {
      console.error('Erro ao alterar status da auditoria:', err);
      alert('Erro ao alterar status da auditoria.');
    } finally {
      setIsTogglingAudit(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const localLogs = getLocalAuditLogs();
      let cloudLogs: any[] = [];

      if (supabase) {
        try {
          let query = supabase
            .from('audit_logs')
            .select(`
              *,
              profiles (
                name,
                email
              )
            `)
            .order('created_at', { ascending: false })
            .limit(5000);

          if (filterType !== 'ALL') query = query.eq('entity_type', filterType);
          if (actionFilter !== 'ALL') query = query.eq('action', actionFilter);

          const { data, error } = await query;

          if (error) {
            console.warn('[AuditLogsView] Join relacional falhou. Buscando logs sem join...', error.message);
            let directQuery = supabase
              .from('audit_logs')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(5000);

            if (filterType !== 'ALL') directQuery = directQuery.eq('entity_type', filterType);
            if (actionFilter !== 'ALL') directQuery = directQuery.eq('action', actionFilter);

            const { data: directData } = await directQuery;
            cloudLogs = directData || [];
          } else {
            cloudLogs = data || [];
          }
        } catch (e) {
          console.warn('[AuditLogsView] Aviso ao buscar logs no Supabase:', e);
        }
      }

      // Mescla os logs do LocalStorage com os da Nuvem, desduplicando por ID
      const logMap = new Map<string, AuditLog>();

      for (const log of localLogs) {
        if (filterType !== 'ALL' && log.entity_type !== filterType) continue;
        if (actionFilter !== 'ALL' && log.action !== actionFilter) continue;
        logMap.set(log.id, log as any);
      }

      for (const log of cloudLogs) {
        logMap.set(log.id, log as any);
      }

      const mergedLogs = Array.from(logMap.values()).sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setLogs(mergedLogs);
    } catch (err) {
      console.error('Erro crítico ao buscar logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const handleLogCreated = (e: any) => {
      if (e.detail) {
        const newLog = e.detail;
        setLogs(prev => {
          if (prev.some(l => l.id === newLog.id)) return prev;
          return [newLog, ...prev];
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('axis_audit_log_created', handleLogCreated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('axis_audit_log_created', handleLogCreated);
      }
    };
  }, [filterType, actionFilter]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Data/Hora', 'Usuario', 'Email', 'Acao', 'Modulo', 'ID Entidade', 'IP / Origem', 'Detalhes'];
    
    const csvRows = filteredLogs.map(log => {
      const detailsStr = typeof log.details === 'object' ? JSON.stringify(log.details).replace(/"/g, '""') : String(log.details || '').replace(/"/g, '""');
      return [
        log.id,
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.profiles?.name || 'Sistema / Auto',
        log.profiles?.email || 'N/A',
        getActionLabel(log.action, log.details),
        log.entity_type,
        log.entity_id || 'N/A',
        log.ip_address || 'N/A',
        detailsStr
      ].map(value => `"${value}"`).join(',');
    });
    
    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `auditoria_axisgc_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getUserDisplayInfo = (log: AuditLog) => {
    let name = log.profiles?.name || log.details?.user_name || log.details?.userName || log.details?.name;
    let email = log.profiles?.email || log.details?.user_email || log.details?.userEmail || log.details?.email;

    if ((!name || name === 'Usuário Ativo' || name === 'Sistema / Auto') && email && email !== 'usuario@sistema') {
      const parts = email.split('@')[0];
      name = parts.charAt(0).toUpperCase() + parts.slice(1);
    }

    if (!name || name === 'Usuário Ativo') {
      name = 'Administrador do Sistema';
    }

    if (!email || email === 'usuario@sistema') {
      email = log.user_id ? `ID: ${log.user_id.substring(0, 8)}...` : 'Sessão Ativa';
    }

    return { name, email };
  };

  const getActionColor = (action: string, details?: any) => {
    switch (action?.toUpperCase()) {
      case 'DELETE': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'CREATE':
      case 'INSERT': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'UPDATE': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'INACTIVATE': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'ACTIVATE': return 'text-teal-600 bg-teal-50 border-teal-200';
      case 'LOGIN': 
        if (details?.status === 'bloqueado_inativo' || details?.success === false) {
          return 'text-rose-700 bg-rose-50 border-rose-200 font-bold';
        }
        if (details?.status === 'sucesso' || details?.success === true) {
          return 'text-emerald-700 bg-emerald-50 border-emerald-200 font-bold';
        }
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'EXPORT':
      case 'IMPORT': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getActionLabel = (action: string, details?: any) => {
    switch (action?.toUpperCase()) {
      case 'DELETE': return 'Exclusão';
      case 'CREATE': return 'Criação';
      case 'INSERT': return 'Inserção (DB)';
      case 'UPDATE': return 'Atualização';
      case 'INACTIVATE': return 'Inativação';
      case 'ACTIVATE': return 'Reativação';
      case 'LOGIN': 
        if (details?.status === 'bloqueado_inativo' || details?.success === false) {
          return 'Login Bloqueado (Inativo)';
        }
        if (details?.status === 'sucesso' || details?.success === true) {
          return 'Login (Sucesso)';
        }
        return 'Acesso / Login';
      case 'LOGOUT': return 'Saída';
      case 'EXPORT': return 'Exportação';
      case 'IMPORT': return 'Importação';
      case 'PERMISSION_CHANGE': return 'Permissões';
      case 'SETTINGS_CHANGE': return 'Configurações';
      default: return action;
    }
  };

  const getDetailsSummary = (details: any) => {
    if (!details) return '-';
    if (details.summary) return details.summary;
    if (typeof details === 'object') {
      if (details.status === 'bloqueado_inativo' || details.success === false) {
        return `[FALHA / INATIVO] ${details.reason || 'Conta inativa pelo administrador'} (Método: ${details.method || 'email'})`;
      }
      if (details.status === 'sucesso' || details.success === true) {
        return `[SUCESSO] Autenticação realizada via ${details.method || 'email'}`;
      }
      return JSON.stringify(details);
    }
    return String(details);
  };

  const filteredLogs = logs.filter(log => {
    const searchStr = searchTerm.toLowerCase();
    const userName = log.profiles?.name?.toLowerCase() || '';
    const userEmail = log.profiles?.email?.toLowerCase() || '';
    const detailsStr = JSON.stringify(log.details || '').toLowerCase();
    const entityStr = (log.entity_id || '').toLowerCase();

    const matchesSearch = userName.includes(searchStr) || 
                          userEmail.includes(searchStr) || 
                          detailsStr.includes(searchStr) || 
                          entityStr.includes(searchStr);
    
    if (!matchesSearch) return false;

    if (periodFilter !== 'all') {
      const logDate = new Date(log.created_at);
      const now = new Date();
      if (periodFilter === 'today') {
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (logDate < todayStart) return false;
      } else if (periodFilter === '7d') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (logDate < sevenDaysAgo) return false;
      } else if (periodFilter === '30d') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (logDate < thirtyDaysAgo) return false;
      }
    }

    return true;
  });

  if (user?.role !== 'ADMIN') {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center">
          <Shield className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold font-headline">Acesso Negado</h2>
          <p className="text-on-surface-variant font-medium mt-2">Apenas administradores podem visualizar os logs de auditoria.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-10 space-y-8 relative max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-4xl font-bold font-headline text-on-surface">Auditoria de Sistema</h2>
            <span className="px-3 py-1 bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-full flex items-center gap-1.5">
              <Lock size={12} /> Append-Only Imutável
            </span>

            {/* Visual Status Indicator Badge */}
            {auditEnabled ? (
              <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full flex items-center gap-2 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                Serviço de Auditoria: ATIVO (Gravando Logs)
              </span>
            ) : (
              <span className="px-3.5 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold rounded-full flex items-center gap-2 shadow-sm">
                <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                Serviço de Auditoria: PAUSADO (Economia de Espaço em Disco)
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Histórico contínuo de ações clínicas, financeiras e administrativas.</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle Service Button */}
          <button 
            onClick={handleToggleAudit}
            disabled={isTogglingAudit}
            className={`px-5 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 text-xs uppercase tracking-wider ${
              auditEnabled 
                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' 
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
            title={auditEnabled ? 'Pausar gravação para economizar espaço em disco' : 'Ativar gravação de logs de auditoria'}
          >
            {isTogglingAudit ? <Loader2 size={18} className="animate-spin" /> : (auditEnabled ? <ToggleRight size={20} /> : <ToggleLeft size={20} />)}
            {auditEnabled ? 'Pausar Gravação' : 'Ativar Gravação'}
          </button>

          <button 
            onClick={fetchLogs}
            className="px-5 py-3 rounded-2xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} /> Atualizar
          </button>
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="px-5 py-3 rounded-2xl bg-indigo-50 text-indigo-600 font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 border border-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* Control Panel: Search & Filters */}
      <div className="bg-white rounded-3xl p-6 shadow-xl shadow-primary/5 border border-outline-variant/10 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por usuário, e-mail ou detalhes..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
            />
          </div>

          {/* Module Filter Select */}
          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-xs uppercase tracking-wider text-on-surface cursor-pointer"
            >
              {MODULE_OPTIONS.map(mod => (
                <option key={mod.id} value={mod.id}>{mod.label}</option>
              ))}
            </select>
          </div>

          {/* Action Filter Select */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/10 outline-none focus:ring-2 focus:ring-primary/20 font-bold text-xs uppercase tracking-wider text-on-surface cursor-pointer"
            >
              {ACTION_OPTIONS.map(act => (
                <option key={act.id} value={act.id}>{act.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Period Filter Tabs */}
        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-4 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-outline" />
            <span className="text-xs font-bold uppercase tracking-wider text-outline">Período:</span>
            <div className="flex gap-1 bg-surface-container-low p-1 rounded-xl">
              {[
                { id: 'all', label: 'Todos' },
                { id: 'today', label: 'Hoje' },
                { id: '7d', label: 'Últimos 7 dias' },
                { id: '30d', label: 'Últimos 30 dias' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    periodFilter === p.id 
                      ? 'bg-white text-primary shadow-sm' 
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-xs font-bold text-outline uppercase tracking-wider">
            Exibindo <span className="text-primary">{filteredLogs.length}</span> registros de auditoria
          </p>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto rounded-2xl border border-outline-variant/20">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/20 text-outline text-[11px] uppercase tracking-widest font-bold">
                <th className="px-6 py-4">Data / Hora</th>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Módulo</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4 text-right">Inspeção</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-outline font-medium">
                    <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 text-primary" />
                    Carregando histórico de auditoria...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-outline font-medium">
                    Nenhum evento encontrado para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => {
                  const userInfo = getUserDisplayInfo(log);
                  return (
                    <tr 
                      key={log.id} 
                      className="border-b border-outline-variant/5 hover:bg-surface-container-low/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-on-surface font-medium text-xs">
                          <Calendar size={14} className="text-outline shrink-0" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 font-bold text-on-surface text-sm">
                          <UserIcon size={14} className="text-primary shrink-0" />
                          <span>{userInfo.name}</span>
                        </div>
                        {userInfo.email && (
                          <p className="text-[11px] text-on-surface-variant font-medium ml-5">{userInfo.email}</p>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getActionColor(log.action, log.details)}`}>
                          {getActionLabel(log.action, log.details)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-on-surface-variant text-xs">
                        {log.entity_type}
                      </td>
                      <td className="px-6 py-4 text-xs text-on-surface-variant">
                        <div className="max-w-xs md:max-w-md truncate font-medium">
                          {getDetailsSummary(log.details)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 bg-surface-container text-primary font-bold text-xs rounded-xl hover:bg-primary/10 transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye size={14} /> Detalhes
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payload JSON Inspector Modal */}
      <AnimatePresence>
        {selectedLog && (() => {
          const modalUserInfo = getUserDisplayInfo(selectedLog);
          return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedLog(null)}
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
              >
                {/* Modal Header */}
                <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                      <FileCode size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold font-headline text-on-surface">Inspeção Detalhada do Evento</h3>
                      <p className="text-xs text-on-surface-variant font-medium">ID: {selectedLog.id}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedLog(null)} 
                    className="p-2 hover:bg-surface-container-low rounded-full transition-all text-outline"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 md:p-8 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
                  {/* Meta info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/10 text-xs">
                    <div>
                      <p className="font-bold text-outline uppercase tracking-wider text-[10px]">Data / Hora</p>
                      <p className="font-bold text-on-surface mt-0.5">{new Date(selectedLog.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                    <div>
                      <p className="font-bold text-outline uppercase tracking-wider text-[10px]">Usuário Responsável</p>
                      <p className="font-bold text-on-surface mt-0.5">{modalUserInfo.name}</p>
                    </div>
                    <div>
                      <p className="font-bold text-outline uppercase tracking-wider text-[10px]">E-mail</p>
                      <p className="font-bold text-on-surface mt-0.5">{modalUserInfo.email}</p>
                    </div>
                  <div>
                    <p className="font-bold text-outline uppercase tracking-wider text-[10px]">Ação Executada</p>
                    <span className={`inline-block px-2 py-0.5 mt-0.5 font-bold rounded text-[10px] uppercase border ${getActionColor(selectedLog.action, selectedLog.details)}`}>
                      {getActionLabel(selectedLog.action, selectedLog.details)}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-outline uppercase tracking-wider text-[10px]">Módulo Afetado</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedLog.entity_type}</p>
                  </div>
                  <div>
                    <p className="font-bold text-outline uppercase tracking-wider text-[10px]">Origem / IP</p>
                    <p className="font-bold text-on-surface mt-0.5">{selectedLog.ip_address || 'Navegador'}</p>
                  </div>
                </div>

                {/* JSON Payload Viewer */}
                <div>
                  <h4 className="text-xs font-bold text-outline uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>Payload de Dados (JSON / Diff)</span>
                  </h4>
                  <pre className="p-4 bg-slate-900 text-slate-100 rounded-2xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 shadow-inner">
                    {JSON.stringify(selectedLog.details, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-outline-variant/10 bg-surface-container-lowest flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all text-sm shadow-md"
                >
                  Fechar Inspeção
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}
      </AnimatePresence>
    </div>
  );
}
