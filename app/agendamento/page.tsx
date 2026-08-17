'use client';

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Search, 
  ChevronRight, 
  ChevronLeft, 
  AlertCircle, 
  Copy, 
  Check, 
  Building2,
  Send,
  Loader2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  fetchAvailableSlotsAction, 
  submitPreBookingAction, 
  checkProtocolStatusAction,
  lookupPatientByCpfAction 
} from '@/app/actions/preBookingActions';
import { PublicProtocolStatus } from '@/types/preBooking';
import { getClinicSettings, ClinicSettings, DEFAULT_CLINIC_SETTINGS } from '@/lib/clinicService';
import { formatCpf, cleanCpf, isValidCpf } from '@/lib/preBookingService';

const SERVICE_OPTIONS = [
  { id: 'Primeira Consulta', name: 'Primeira Consulta', duration: '60 min', description: 'Avaliação completa de saúde, anamnese e planejamento terapêutico.' },
  { id: 'Retorno / Acompanhamento', name: 'Retorno / Acompanhamento', duration: '45 min', description: 'Sessão de seguimento do tratamento e reavaliação de sintomas.' }
];

export default function PreAgendamentoPage() {
  const [clinicInfo, setClinicInfo] = useState<ClinicSettings>(DEFAULT_CLINIC_SETTINGS);

  useEffect(() => {
    async function loadClinic() {
      const data = await getClinicSettings();
      setClinicInfo(data);
    }
    loadClinic();
  }, []);

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isConsultingProtocol, setIsConsultingProtocol] = useState<boolean>(false);
  const [protocolInput, setProtocolInput] = useState<string>('');
  const [protocolResult, setProtocolResult] = useState<PublicProtocolStatus | null>(null);
  const [protocolLoading, setProtocolLoading] = useState<boolean>(false);
  const [protocolError, setProtocolError] = useState<string>('');

  // Form State
  const isSunday = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return !isNaN(d.getTime()) && d.getDay() === 0;
  };

  const [selectedService, setSelectedService] = useState<string>('Primeira Consulta');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.getDay() === 0) {
      tomorrow.setDate(tomorrow.getDate() + 1);
    }
    return tomorrow.toISOString().split('T')[0];
  });
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);

  const [patientName, setPatientName] = useState<string>('');
  const [patientEmail, setPatientEmail] = useState<string>('');
  const [patientPhone, setPatientPhone] = useState<string>('');
  const [patientCpf, setPatientCpf] = useState<string>('');
  const [birthDate, setBirthDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [lgpdConsent, setLgpdConsent] = useState<boolean>(true);
  const [honeypot, setHoneypot] = useState<string>('');

  // CPF Auto-fill state
  const [isSearchingCpf, setIsSearchingCpf] = useState<boolean>(false);
  const [cpfMatchStatus, setCpfMatchStatus] = useState<{ found: boolean; name?: string } | null>(null);

  const handleCpfChange = async (val: string) => {
    const formatted = formatCpf(val);
    setPatientCpf(formatted);
    setCpfMatchStatus(null);

    const digits = cleanCpf(val);
    if (digits.length === 11) {
      setIsSearchingCpf(true);
      const res = await lookupPatientByCpfAction(digits);
      setIsSearchingCpf(false);

      if (res.found && res.patient) {
        if (res.patient.name) setPatientName(res.patient.name);
        if (res.patient.email) setPatientEmail(res.patient.email);
        if (res.patient.phone) setPatientPhone(res.patient.phone);
        if (res.patient.birth_date) setBirthDate(res.patient.birth_date);
        setCpfMatchStatus({ found: true, name: res.patient.name });
      } else {
        setCpfMatchStatus({ found: false });
      }
    }
  };

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedProtocol, setSubmittedProtocol] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Busca horários ao mudar a data ou o serviço selecionado
  useEffect(() => {
    if (!selectedDate) return;
    async function loadSlots() {
      setLoadingSlots(true);
      setSelectedTime('');
      const res = await fetchAvailableSlotsAction(selectedDate, selectedService);
      if (res.success && res.slots) {
        setAvailableSlots(res.slots);
        if (res.slots.length > 0) {
          setSelectedTime(res.slots[0]);
        }
      } else {
        setAvailableSlots([]);
      }
      setLoadingSlots(false);
    }
    loadSlots();
  }, [selectedDate, selectedService]);

  const handleNextStep = () => {
    if (currentStep === 1 && !selectedService) return;
    if (currentStep === 2) {
      if (!selectedDate || !selectedTime) return;
      if (isSunday(selectedDate)) {
        alert('Não realizamos atendimentos aos domingos. Por favor, escolha uma data de segunda a sábado.');
        return;
      }
    }
    if (currentStep === 3) {
      if (!patientCpf.trim()) {
        alert('Por favor, informe o seu CPF.');
        return;
      }
      if (!isValidCpf(patientCpf)) {
        alert('Por favor, informe um CPF válido com 11 dígitos.');
        return;
      }
      if (!patientName.trim() || !patientEmail.trim() || !patientPhone.trim()) {
        alert('Por favor, preencha todos os campos obrigatórios: CPF, Nome Completo, E-mail e Celular.');
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lgpdConsent) {
      alert('Você precisa aceitar os termos de consentimento para prosseguir.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const payload = {
      service_type: selectedService,
      requested_date: selectedDate,
      requested_time: selectedTime,
      patient_name: patientName,
      patient_email: patientEmail,
      patient_phone: patientPhone,
      patient_cpf: patientCpf,
      birth_date: birthDate,
      notes,
      honeypot
    };

    const res = await submitPreBookingAction(payload);
    setIsSubmitting(false);

    if (res.success && (res as any).protocol) {
      setSubmittedProtocol((res as any).protocol);
      setCurrentStep(5);
    } else {
      setSubmitError(res.message || 'Erro ao enviar a solicitação. Tente novamente.');
    }
  };

  const handleSearchProtocol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protocolInput.trim()) return;

    setProtocolLoading(true);
    setProtocolError('');
    setProtocolResult(null);

    const res = await checkProtocolStatusAction(protocolInput);
    setProtocolLoading(false);

    if (res.success && res.data) {
      setProtocolResult(res.data);
    } else {
      setProtocolError(res.message || 'Protocolo não localizado.');
    }
  };

  const handleCopyProtocol = () => {
    if (submittedProtocol) {
      navigator.clipboard.writeText(submittedProtocol);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50/20 text-slate-800 flex flex-col justify-between selection:bg-emerald-500 selection:text-white">
      {/* Header Público Light & Clean */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clinicInfo.logo_url ? (
              <div className="w-10 h-10 rounded-2xl overflow-hidden border border-slate-200 shadow-md flex items-center justify-center bg-white shrink-0 p-0.5">
                <img src={clinicInfo.logo_url} alt={clinicInfo.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="font-bold text-lg leading-none tracking-tight text-slate-900">{clinicInfo.name || 'Clínica Axis GC'}</h1>
              <p className="text-xs text-slate-500 mt-1">{clinicInfo.subtitle || 'Agendamento de Consultas'}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setIsConsultingProtocol(!isConsultingProtocol);
              setProtocolResult(null);
              setProtocolError('');
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-all shadow-xs"
          >
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>Consultar Protocolo</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex-1">
        {/* Painel de Consulta de Protocolo (Modal/Collapsible Light) */}
        <AnimatePresence>
          {isConsultingProtocol && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 p-6 rounded-3xl bg-white border border-emerald-200 shadow-xl shadow-emerald-950/5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Search className="w-4 h-4 text-emerald-600" />
                  Acompanhar Solicitação por Protocolo
                </h3>
                <button 
                  onClick={() => setIsConsultingProtocol(false)}
                  className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSearchProtocol} className="flex gap-2">
                <input 
                  type="text"
                  placeholder="Ex: PRE-20260804-X7A9"
                  value={protocolInput}
                  onChange={(e) => setProtocolInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={protocolLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-all flex items-center gap-2 shadow-md shadow-emerald-600/20 disabled:opacity-50"
                >
                  {protocolLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Buscar'}
                </button>
              </form>

              {protocolError && (
                <div className="mt-3 text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  {protocolError}
                </div>
              )}

              {protocolResult && (
                <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 text-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <span className="text-xs text-slate-500">Paciente: <strong className="text-slate-900 font-semibold">{protocolResult.patient_name}</strong></span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      protocolResult.status === 'PENDENTE' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      protocolResult.status === 'CONFIRMADO' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      protocolResult.status === 'RECUSADO' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                      'bg-sky-100 text-sky-800 border border-sky-300'
                    }`}>
                      {protocolResult.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Serviço:</span>
                      <span className="text-slate-800 font-semibold">{protocolResult.service_type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Data e Hora Solicitada:</span>
                      <span className="text-slate-800 font-semibold">
                        {new Date(protocolResult.requested_date + 'T00:00:00').toLocaleDateString('pt-BR')} às {protocolResult.requested_time}
                      </span>
                    </div>
                  </div>

                  {protocolResult.status === 'PROPOSTA_ALTERADA' && (
                    <div className="mt-2 p-3 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900">
                      <strong>Nova Proposta da Clínica:</strong>
                      <p className="mt-1">
                        A clínica sugeriu remarcar para{' '}
                        <strong>{new Date(protocolResult.proposed_date + 'T00:00:00').toLocaleDateString('pt-BR')}</strong> às{' '}
                        <strong>{protocolResult.proposed_time}</strong>. Entre em contato para confirmar!
                      </p>
                    </div>
                  )}

                  {protocolResult.status === 'RECUSADO' && protocolResult.rejection_reason && (
                    <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                      <strong>Motivo:</strong> {protocolResult.rejection_reason}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stepper Progress Bar Light */}
        {currentStep <= 4 && (
          <div className="mb-8 max-w-3xl mx-auto">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-3">
              <span className={currentStep >= 1 ? 'text-emerald-700 font-bold' : ''}>1. Serviço</span>
              <span className={currentStep >= 2 ? 'text-emerald-700 font-bold' : ''}>2. Horário</span>
              <span className={currentStep >= 3 ? 'text-emerald-700 font-bold' : ''}>3. Seus Dados</span>
              <span className={currentStep >= 4 ? 'text-emerald-700 font-bold' : ''}>4. Confirmar</span>
            </div>
            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-emerald-600 to-teal-500 rounded-full"
                animate={{ width: `${(currentStep / 4) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Card Principal Clean & Branco */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-10 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          {/* Honeypot invisível para bots */}
          <input 
            type="text" 
            name="website_url" 
            value={honeypot} 
            onChange={(e) => setHoneypot(e.target.value)} 
            className="hidden" 
            tabIndex={-1} 
            autoComplete="off" 
          />

          <AnimatePresence mode="wait">
            {/* ETAPA 1: Seleção de Serviço */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    Qual atendimento você deseja solicitar?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Selecione uma das opções abaixo para visualizar as datas disponíveis.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SERVICE_OPTIONS.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedService(srv.id)}
                      className={`p-5 rounded-2xl text-left border transition-all relative flex flex-col justify-between ${
                        selectedService === srv.id
                          ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-md shadow-emerald-600/5'
                          : 'bg-slate-50/60 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-sm text-slate-900">{srv.name}</h3>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200 shadow-2xs">
                            {srv.duration}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{srv.description}</p>
                      </div>

                      {selectedService === srv.id && (
                        <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                          <Check className="w-4 h-4" /> Selecionado
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <span>Próximo: Escolher Data</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 2: Seleção de Data e Horário */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-emerald-600" />
                    Escolha a Data e o Horário
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Consulte a disponibilidade em tempo real para a sua consulta.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Seletor de Data */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block">Data Desejada:</label>
                    <input 
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 font-medium"
                    />
                  </div>

                  {/* Grid de Horários Disponíveis */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 block flex items-center justify-between">
                      <span>Horários Disponíveis:</span>
                      {loadingSlots && <span className="text-[10px] text-emerald-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Verificando...</span>}
                    </label>

                    {loadingSlots ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                        <span className="text-xs text-slate-500">Consultando agenda da clínica...</span>
                      </div>
                    ) : isSunday(selectedDate) ? (
                      <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium flex items-center justify-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Não realizamos atendimentos aos domingos. Por favor, selecione uma data de segunda a sábado.</span>
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-6 text-center bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800">
                        Não há horários disponíveis para esta data. Por favor, escolha outro dia.
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {availableSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setSelectedTime(slot)}
                            className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                              selectedTime === slot
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-slate-100'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            {slot}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs transition-all flex items-center gap-1 border border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button
                    onClick={handleNextStep}
                    disabled={!selectedTime || isSunday(selectedDate)}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                  >
                    <span>Próximo: Dados Pessoais</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 3: Dados Pessoais */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <User className="w-5 h-5 text-emerald-600" />
                    Preencha seus Dados Pessoais
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Informe seu CPF para consultar ou iniciar seu cadastro na clínica.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* CPF Obrigatório no Topo com Consulta Automática */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700 block">CPF *</label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="text" 
                        required
                        maxLength={14}
                        placeholder="000.000.000-00"
                        value={patientCpf}
                        onChange={(e) => handleCpfChange(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium font-mono"
                      />
                      {isSearchingCpf && (
                        <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Buscando...</span>
                        </div>
                      )}
                    </div>

                    {/* Feedback visual de auto-preenchimento por CPF */}
                    {cpfMatchStatus?.found && (
                      <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Cadastro localizado na clínica! Seus dados foram preenchidos automaticamente.</span>
                      </div>
                    )}

                    {cpfMatchStatus && !cpfMatchStatus.found && (
                      <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-center gap-2 font-medium">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Primeiro agendamento com este CPF. Preencha seus dados abaixo para iniciar o cadastro.</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700">Nome Completo *</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="text" 
                        required
                        placeholder="Digite seu nome completo"
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">E-mail *</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="email" 
                        required
                        placeholder="seuemail@exemplo.com"
                        value={patientEmail}
                        onChange={(e) => setPatientEmail(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-semibold text-slate-700">Celular / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input 
                        type="tel" 
                        required
                        placeholder="(00) 90000-0000"
                        value={patientPhone}
                        onChange={(e) => setPatientPhone(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700">Data de Nascimento (Opcional)</label>
                    <input 
                      type="date" 
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="font-semibold text-slate-700">Observações / Sintomas (Opcional)</label>
                    <textarea 
                      rows={3}
                      placeholder="Descreva brevemente o motivo da consulta ou preferências..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <button
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs transition-all flex items-center gap-1 border border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" /> Voltar
                  </button>
                  <button
                    onClick={handleNextStep}
                    className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <span>Revisar Solicitação</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 4: Revisão & LGPD Consentimento */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    Revise as Informações Antes de Enviar
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1">Sua solicitação passará por análise da recepção para confirmação do agendamento.</p>
                </div>

                {/* Resumo do Pedido Light */}
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4 border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-slate-500 block">Atendimento:</span>
                      <strong className="text-emerald-700 text-sm font-bold">{selectedService}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Data e Horário:</span>
                      <strong className="text-slate-900 text-sm font-bold">
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR')} às {selectedTime}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-slate-500 block">Paciente:</span>
                      <span className="text-slate-900 font-semibold">{patientName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Celular:</span>
                      <span className="text-slate-900 font-semibold">{patientPhone}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">E-mail:</span>
                      <span className="text-slate-900 font-semibold">{patientEmail}</span>
                    </div>
                    {patientCpf && (
                      <div>
                        <span className="text-slate-500 block">CPF:</span>
                        <span className="text-slate-900 font-semibold">{patientCpf}</span>
                      </div>
                    )}
                  </div>

                  {notes && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-slate-500 block">Observações:</span>
                      <span className="text-slate-700 italic">{notes}</span>
                    </div>
                  )}
                </div>

                {/* Checkbox LGPD */}
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <input 
                    type="checkbox"
                    id="lgpd"
                    checked={lgpdConsent}
                    onChange={(e) => setLgpdConsent(e.target.checked)}
                    className="mt-0.5 rounded bg-white border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <label htmlFor="lgpd" className="text-xs text-slate-700 leading-relaxed cursor-pointer font-medium">
                    Autorizo o uso das minhas informações pessoais exclusivamente para fins de agendamento e atendimento clínico, conforme a Lei Geral de Proteção de Dados (LGPD).
                  </label>
                </div>

                {submitError && (
                  <div className="text-xs text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    {submitError}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4">
                  <button
                    type="button"
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 font-semibold text-slate-700 text-xs transition-all flex items-center gap-1 border border-slate-200"
                  >
                    <ChevronLeft className="w-4 h-4" /> Alterar Dados
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting || !lgpdConsent}
                    className="px-7 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 font-bold text-white text-sm transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/25 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Enviar Solicitação</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* ETAPA 5: Sucesso & Protocolo */}
            {currentStep === 5 && submittedProtocol && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Solicitação Recebida!</h2>
                  <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto mt-2 leading-relaxed">
                    Sua solicitação de pré-agendamento foi registrada com status <strong className="text-amber-700 font-bold">PENDENTE</strong>. 
                    Nossa equipe analisará o horário solicitado e entrará em contato para confirmação.
                  </p>
                </div>

                {/* Card de Protocolo Light */}
                <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-300 max-w-sm mx-auto shadow-sm">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-bold block mb-1">Código do Protocolo</span>
                  <div className="text-xl font-bold font-mono text-emerald-800 tracking-wider flex items-center justify-center gap-2">
                    <span>{submittedProtocol}</span>
                    <button 
                      onClick={handleCopyProtocol} 
                      className="p-1.5 rounded-md hover:bg-emerald-100 text-emerald-700 transition-colors"
                      title="Copiar Protocolo"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  {copied && <span className="text-[10px] text-emerald-700 font-semibold mt-1 block">Copiado para a área de transferência!</span>}
                </div>

                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Guarde seu número de protocolo para consultar o andamento nesta mesma página.
                </p>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={() => {
                      setCurrentStep(1);
                      setSubmittedProtocol(null);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-300 transition-all shadow-2xs"
                  >
                    Fazer Novo Pré-Agendamento
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer Público Light */}
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Axis GC - Todos os direitos reservados.</span>
          <span className="text-[11px]">Sistema protegido contra acessos não autorizados.</span>
        </div>
      </footer>
    </div>
  );
}
