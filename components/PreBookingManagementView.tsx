'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Clock, 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  MessageSquare, 
  AlertCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  Edit3, 
  ShieldAlert,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PreBookingRequest } from '@/types/preBooking';
import { 
  fetchPreBookingRequests, 
  approvePreBookingRequest, 
  rejectPreBookingRequest, 
  proposeNewSlot 
} from '@/lib/preBookingService';
import { openWhatsApp } from '@/lib/whatsapp';
import { User as UserType } from '@/types/auth';

interface PreBookingManagementViewProps {
  user: UserType | null;
  onAppointmentCreated?: () => void;
}

export default function PreBookingManagementView({ user, onAppointmentCreated }: PreBookingManagementViewProps) {
  const [requests, setRequests] = useState<PreBookingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeFilter, setActiveFilter] = useState<'PENDENTE' | 'CONFIRMADO' | 'RECUSADO' | 'TODOS'>('PENDENTE');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modais
  const [selectedRequest, setSelectedRequest] = useState<PreBookingRequest | null>(null);
  const [modalType, setModalType] = useState<'approve' | 'reject' | 'propose' | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Form states dos modais
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [proposedDate, setProposedDate] = useState<string>('');
  const [proposedTime, setProposedTime] = useState<string>('09:00');

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const data = await fetchPreBookingRequests();
    setRequests(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filteredRequests = requests.filter((req) => {
    const matchesFilter = activeFilter === 'TODOS' ? true : req.status === activeFilter;
    const matchesSearch = 
      req.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.protocol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.patient_phone.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === 'PENDENTE').length;

  const handleApprove = async () => {
    if (!selectedRequest || !user) return;
    setActionLoading(true);

    const res = await approvePreBookingRequest(selectedRequest.id, user.id);
    setActionLoading(false);

    if (res.success) {
      setModalType(null);
      setSelectedRequest(null);
      await loadRequests();
      if (onAppointmentCreated) onAppointmentCreated();

      const msg = `Olá, ${selectedRequest.patient_name}! Seu pré-agendamento (Protocolo ${selectedRequest.protocol}) para o dia ${new Date(selectedRequest.requested_date + 'T00:00:00').toLocaleDateString('pt-BR')} às ${selectedRequest.requested_time} foi CONFIRMADO com sucesso pela nossa equipe!`;
      openWhatsApp(selectedRequest.patient_phone, msg);
    } else {
      alert(res.message || 'Erro ao aprovar a solicitação.');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !user) return;
    if (!rejectionReason.trim()) {
      alert('Informe o motivo da recusa.');
      return;
    }
    setActionLoading(true);

    const res = await rejectPreBookingRequest(selectedRequest.id, rejectionReason, user.id);
    setActionLoading(false);

    if (res.success) {
      const currentReq = selectedRequest;
      setModalType(null);
      setSelectedRequest(null);
      setRejectionReason('');
      await loadRequests();

      const msg = `Olá, ${currentReq.patient_name}. Em relação ao seu pré-agendamento (Protocolo ${currentReq.protocol}): infelizmente não poderemos confirmar esse horário. Motivo: ${rejectionReason}. Entre em contato caso deseje agendar outro horário.`;
      openWhatsApp(currentReq.patient_phone, msg);
    } else {
      alert(res.message || 'Erro ao recusar a solicitação.');
    }
  };

  const handlePropose = async () => {
    if (!selectedRequest || !user || !proposedDate || !proposedTime) return;
    setActionLoading(true);

    const res = await proposeNewSlot(selectedRequest.id, proposedDate, proposedTime, user.id);
    setActionLoading(false);

    if (res.success) {
      const currentReq = selectedRequest;
      setModalType(null);
      setSelectedRequest(null);
      await loadRequests();

      const formattedDate = new Date(proposedDate + 'T00:00:00').toLocaleDateString('pt-BR');
      const msg = `Olá, ${currentReq.patient_name}! Sobre seu pré-agendamento (Protocolo ${currentReq.protocol}): gostaríamos de sugerir o horário do dia ${formattedDate} às ${proposedTime}. Por favor, confirme se este horário funciona para você!`;
      openWhatsApp(currentReq.patient_phone, msg);
    } else {
      alert(res.message || 'Erro ao propor novo horário.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Contadores */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-container p-4 rounded-2xl border border-outline-variant/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-on-surface">Solicitações de Pré-Agendamento</h2>
            <p className="text-xs text-on-surface-variant">Gerencie os pedidos enviados pela página pública antes de confirmar na agenda.</p>
          </div>
        </div>

        <button 
          onClick={loadRequests}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-outline text-xs font-medium text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Atualizar Listagem</span>
        </button>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline-variant/40 w-full sm:w-auto">
          <button
            onClick={() => setActiveFilter('PENDENTE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeFilter === 'PENDENTE'
                ? 'bg-warning text-warning-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Pendentes</span>
            {pendingCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-900 text-amber-100 text-[10px] flex items-center justify-center font-bold">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('CONFIRMADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'CONFIRMADO'
                ? 'bg-success text-success-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Confirmados
          </button>

          <button
            onClick={() => setActiveFilter('RECUSADO')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'RECUSADO'
                ? 'bg-error-container text-on-error-container shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Recusados
          </button>

          <button
            onClick={() => setActiveFilter('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'TODOS'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Todos
          </button>
        </div>

        {/* Input de Busca */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-on-surface-variant absolute left-3 top-2.5" />
          <input 
            type="text"
            placeholder="Buscar por nome ou protocolo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface border border-outline text-xs text-on-surface focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Lista de Cards de Solicitações */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center p-12 bg-surface-container-low rounded-2xl border border-outline-variant/40">
          <Clock className="w-10 h-10 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-on-surface">Nenhuma solicitação encontrada.</p>
          <p className="text-xs text-on-surface-variant mt-1">Não há registros correspondentes aos filtros selecionados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRequests.map((req) => (
            <motion.div
              key={req.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl border transition-all bg-surface flex flex-col justify-between ${
                req.status === 'PENDENTE'
                  ? 'border-amber-500/40 shadow-sm shadow-amber-500/10'
                  : req.status === 'CONFIRMADO'
                  ? 'border-emerald-500/30'
                  : 'border-outline-variant/40 opacity-80'
              }`}
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                      {req.protocol}
                    </span>
                    <span className="text-[10px] text-on-surface-variant">
                      {new Date(req.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    req.status === 'PENDENTE' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' :
                    req.status === 'CONFIRMADO' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300' :
                    req.status === 'RECUSADO' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' :
                    'bg-sky-500/20 text-sky-700 dark:text-sky-300'
                  }`}>
                    {req.status.replace('_', ' ')}
                  </span>
                </div>

                {/* Detalhes do Paciente e Consulta */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-semibold text-on-surface text-sm">{req.patient_name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-on-surface-variant">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-on-surface-variant/70 shrink-0" />
                      <span>{req.patient_phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-on-surface-variant/70 shrink-0" />
                      <span className="truncate">{req.patient_email}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-high/60 mt-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="font-semibold text-on-surface">
                        {new Date(req.requested_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {req.requested_time}
                      </span>
                    </div>
                    <span className="text-[11px] font-medium text-on-surface-variant">{req.service_type}</span>
                  </div>

                  {req.notes && (
                    <p className="text-[11px] text-on-surface-variant italic bg-surface-container-low p-2 rounded-lg mt-2">
                      "{req.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Botões de Ação para Solicitações Pendentes */}
              {req.status === 'PENDENTE' && (
                <div className="flex items-center gap-2 pt-4 mt-3 border-t border-outline-variant/40">
                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setModalType('approve');
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprovar</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setProposedDate(req.requested_date);
                      setProposedTime(req.requested_time);
                      setModalType('propose');
                    }}
                    className="py-2 px-3 rounded-xl bg-sky-600/20 text-sky-700 dark:text-sky-300 hover:bg-sky-600/30 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Reagendar</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedRequest(req);
                      setModalType('reject');
                    }}
                    className="py-2 px-3 rounded-xl bg-rose-600/20 text-rose-700 dark:text-rose-300 hover:bg-rose-600/30 text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Recusar</span>
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal de Ação (Aprovar / Recusar / Propor) */}
      <AnimatePresence>
        {modalType && selectedRequest && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface border border-outline rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between border-b border-outline-variant/40 pb-3">
                <h3 className="font-bold text-base text-on-surface">
                  {modalType === 'approve' && 'Aprovar e Confirmar Agendamento'}
                  {modalType === 'reject' && 'Recusar Solicitação'}
                  {modalType === 'propose' && 'Propor Novo Horário'}
                </h3>
                <button onClick={() => setModalType(null)} className="text-on-surface-variant hover:text-on-surface">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="text-xs text-on-surface-variant space-y-1">
                <p><strong>Paciente:</strong> {selectedRequest.patient_name}</p>
                <p><strong>Protocolo:</strong> {selectedRequest.protocol}</p>
                <p><strong>Data Solicitada:</strong> {new Date(selectedRequest.requested_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedRequest.requested_time}</p>
              </div>

              {/* Modal Content Specific */}
              {modalType === 'approve' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
                  Ao aprovar, o sistema irá cadastrar o paciente na clínica (se ainda não existir) e confirmará a consulta na Agenda oficial. Além disso, abrirá a notificação formatada no WhatsApp.
                </div>
              )}

              {modalType === 'reject' && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-on-surface block">Motivo da Recusa *</label>
                  <textarea 
                    rows={3}
                    placeholder="Ex: Horário indisponível ou recesso da clínica..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-3 rounded-xl bg-surface-container-high border border-outline text-xs text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
              )}

              {modalType === 'propose' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Nova Data</label>
                    <input 
                      type="date"
                      value={proposedDate}
                      onChange={(e) => setProposedDate(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface-container-high border border-outline text-xs text-on-surface"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-on-surface block mb-1">Novo Horário</label>
                    <input 
                      type="text"
                      placeholder="HH:mm"
                      value={proposedTime}
                      onChange={(e) => setProposedTime(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-surface-container-high border border-outline text-xs text-on-surface"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-outline-variant/40">
                <button
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl bg-surface-container-high text-on-surface text-xs font-semibold"
                >
                  Cancelar
                </button>

                {modalType === 'approve' && (
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Confirmar e Enviar WhatsApp</span>
                  </button>
                )}

                {modalType === 'reject' && (
                  <button
                    onClick={handleReject}
                    disabled={actionLoading || !rejectionReason.trim()}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                    <span>Recusar e Notificar</span>
                  </button>
                )}

                {modalType === 'propose' && (
                  <button
                    onClick={handlePropose}
                    disabled={actionLoading}
                    className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit3 className="w-3.5 h-3.5" />}
                    <span>Enviar Nova Proposta</span>
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
