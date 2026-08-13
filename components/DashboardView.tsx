'use client';

import Image from 'next/image';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  ArrowUpRight,
  Play,
  ChevronRight,
  Lightbulb
} from 'lucide-react';
import { motion } from 'motion/react';
import { User } from '@/types/auth';
import { useState, useEffect } from 'react';

export default function DashboardView({ 
  onNewAppointment, 
  onOpenAgenda,
  appointments = [],
  patients = [],
  evaluations = [],
  onStartConsultation,
  onViewPatientHistory,
  user
}: { 
  onNewAppointment?: () => void, 
  onOpenAgenda?: () => void,
  appointments?: any[],
  patients?: any[],
  evaluations?: any[],
  onStartConsultation?: (patientId: string) => void,
  onViewPatientHistory?: (patientId: string) => void,
  user?: User | null
}) {
  // Find the next scheduled appointment
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const nextAppointment = [...appointments]
    .filter(app => app.date === todayStr && app.status === 'scheduled')
    .sort((a, b) => a.time.localeCompare(b.time))[0];

  const nextPatient = nextAppointment ? patients.find(p => p.id === nextAppointment.patientId) : null;
  
  const latestEvaluation = nextPatient ? [...evaluations]
    .filter(e => e.patientId === nextPatient.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;

  // Mock points if not in model, or use syndromeHypothesis
  const focusPoints = latestEvaluation?.syndromeHypothesis 
    ? latestEvaluation.syndromeHypothesis.split(',').map((s: string) => s.trim()).slice(0, 3)
    : ['Shen Men', 'Thalamus', 'Liver'];

  const remainingCount = latestEvaluation?.syndromeHypothesis 
    ? latestEvaluation.syndromeHypothesis.split(',').length - 3
    : 2;

  const canCreateAppointment = user?.permissions.includes('calendar:create') || user?.role === 'ADMIN';
  const canViewCalendar = user?.permissions.includes('calendar') || user?.permissions.some(p => p.startsWith('calendar:')) || user?.role === 'ADMIN';

  const [profileName, setProfileName] = useState(user?.name || 'Dr. Wu');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('auriculocare_profile');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.name) {
            setProfileName(parsed.name);
          }
        } catch (e) {}
      } else if (user?.name) {
        setProfileName(user.name);
      }
    }
  }, [user]);

  return (
    <div className="p-6 md:p-10 space-y-8 md:space-y-10 max-w-full overflow-hidden">
      {/* Hero Section */}
      <section className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="col-span-1 xl:col-span-7 bg-primary rounded-[2rem] md:rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden flex flex-col justify-between min-h-[250px] md:min-h-[300px]">
          <div className="relative z-10">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-headline text-4xl font-light"
            >
              Bom dia, <span className="font-bold">{profileName}</span>
            </motion.h2>
            <p className="text-white/70 mt-3 max-w-md leading-relaxed text-lg">
              Você tem 8 pacientes agendados para hoje. Sua primeira consulta começa em 45 minutos.
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-8 relative z-10">
            {canCreateAppointment && (
              <button 
                onClick={onNewAppointment}
                className="bg-white text-primary px-8 py-3.5 rounded-2xl font-bold text-sm flex items-center gap-2 hover:bg-white/90 transition-all shadow-xl shadow-black/10"
              >
                Nova Consulta
              </button>
            )}
            {canViewCalendar && (
              <button 
                onClick={onOpenAgenda}
                className="bg-white/10 backdrop-blur-md border border-white/20 px-8 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/20 transition-all"
              >
                Ver Agenda
              </button>
            )}
          </div>

          {/* Abstract Background Shapes */}
          <div className="absolute -top-20 -right-20 w-96 h-96 bg-primary-container/30 rounded-full blur-[100px]"></div>
          <div className="absolute bottom-0 right-10 w-64 h-64 bg-secondary/20 rounded-full blur-[60px]"></div>
        </div>

        <div className="col-span-1 xl:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between border border-outline-variant/10 shadow-sm">
            <div className="w-12 h-12 bg-secondary-container/30 text-secondary rounded-2xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-4xl font-headline font-bold text-on-surface">142</p>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mt-1">Sessões (Mês)</p>
              <div className="mt-4 flex items-center gap-1 text-[10px] text-primary font-bold">
                <CheckCircle2 size={12} /> Meta: 100
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col justify-between border border-outline-variant/10 shadow-sm">
            <div className="w-12 h-12 bg-primary-container/10 text-primary rounded-2xl flex items-center justify-center">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-4xl font-headline font-bold text-on-surface">84%</p>
              <p className="text-xs text-on-surface-variant font-bold uppercase tracking-wider mt-1">Taxa de Sucesso</p>
              <div className="mt-4 flex items-center gap-1 text-[10px] text-primary font-bold">
                <ArrowUpRight size={12} /> +12% vs mês ant.
              </div>
            </div>
          </div>

          <div className="sm:col-span-2 bg-secondary-container/20 p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex flex-col sm:flex-row sm:items-center justify-between overflow-hidden relative border border-secondary-container/30 gap-6 sm:gap-0">
            <div className="relative z-10">
              <p className="text-on-secondary-container text-xs font-bold uppercase tracking-widest">Eficiência Clínica</p>
              <p className="text-2xl font-headline font-bold text-on-secondary-container mt-1">94% Taxa de Recuperação</p>
            </div>
            <div className="relative z-10 w-20 h-20">
              <svg className="w-full h-full transform -rotate-90">
                <circle className="text-on-secondary-container/10" cx="40" cy="40" r="35" fill="transparent" stroke="currentColor" strokeWidth="8" />
                <circle className="text-on-secondary-container" cx="40" cy="40" r="35" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray="219.9" strokeDashoffset="21.9" strokeLinecap="round" />
              </svg>
            </div>
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 rounded-full -mr-20 -mt-20 blur-2xl"></div>
          </div>
        </div>
      </section>

      {/* Agenda & Sidebar */}
      <section className="flex flex-col-reverse xl:grid xl:grid-cols-12 gap-8 md:gap-10">
        <div className="col-span-1 xl:col-span-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 md:gap-0">
            <div>
              <h3 className="font-headline text-2xl font-bold text-on-surface">Agenda de Hoje</h3>
              <p className="text-on-surface-variant text-sm mt-1">Segunda, 23 de Outubro • 8 Agendamentos</p>
            </div>
            <div className="flex bg-surface-container-low p-1.5 rounded-2xl">
              <button className="px-6 py-2 bg-white shadow-sm rounded-xl text-xs font-bold text-on-surface">Lista</button>
              <button className="px-6 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors">Linha do Tempo</button>
            </div>
          </div>

          <div className="space-y-4">
            {appointments.filter(app => app.date === todayStr).length > 0 ? (
              appointments
                .filter(app => app.date === todayStr)
                .sort((a, b) => a.time.localeCompare(b.time))
                .map((item, i) => {
                  const t = (item.type || '').toLowerCase().replace(/[\s-_/]/g, '').normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                  const isInitial = t === 'initial' || t === 'primeiraconsulta';
                  const isEmergency = t === 'emergency' || t === 'emergencia' || t === 'urgencia';

                  return (
                    <motion.div 
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="group bg-white p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] flex items-center gap-4 md:gap-10 border border-transparent hover:border-primary/10 transition-all shadow-sm md:shadow-none hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-xl font-headline font-extrabold text-on-surface">{item.time}</span>
                        <span className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">
                          {parseInt(item.time.split(':')[0]) < 12 ? 'AM' : 'PM'}
                        </span>
                      </div>
                      <div className={`w-1.5 h-14 ${
                        isInitial ? 'bg-emerald-500' : 
                        isEmergency ? 'bg-rose-500' : 
                        'bg-amber-500'
                      } rounded-full`}></div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-headline font-bold text-lg md:text-xl text-on-surface truncate">{item.patientName}</h4>
                        <p className="text-xs md:text-sm text-on-surface-variant mt-1 truncate">
                          {isInitial ? 'Primeira Consulta' : isEmergency ? 'Emergência' : 'Retorno'} • {item.duration} min
                        </p>
                      </div>
                    {item.paymentStatus === 'pago' ? (
                      <span className="px-4 py-1.5 bg-primary-fixed/30 text-primary text-[10px] font-bold rounded-full tracking-widest uppercase">PAGO</span>
                    ) : (
                      <span className="px-4 py-1.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-full tracking-widest uppercase">PENDENTE</span>
                    )}
                    <button 
                      onClick={() => onViewPatientHistory?.(item.patientId)}
                      className="md:opacity-0 md:group-hover:opacity-100 p-2 md:p-3 bg-surface-container-high rounded-xl md:rounded-2xl text-on-surface-variant hover:text-primary transition-all shrink-0"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </motion.div>
                );
              })
            ) : (
              <div className="bg-white p-10 rounded-[2.5rem] border border-dashed border-outline-variant/20 flex flex-col items-center justify-center text-outline opacity-50 italic">
                <p>Nenhum agendamento para hoje</p>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-1 xl:col-span-4 space-y-8">
          {nextAppointment && nextPatient ? (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-primary/5 shadow-sm">
              <div className="flex items-center justify-between mb-8 md:mb-10">
                <span className="px-4 py-1.5 bg-primary-fixed text-on-primary-fixed text-[10px] font-bold rounded-xl tracking-widest uppercase">PRÓXIMO</span>
                <span className="text-xs text-on-surface-variant font-medium">
                  Começa em {(() => {
                    const [hours, minutes] = nextAppointment.time.split(':').map(Number);
                    const appTime = new Date();
                    appTime.setHours(hours, minutes, 0, 0);
                    const diffMs = appTime.getTime() - now.getTime();
                    const diffMins = Math.max(0, Math.floor(diffMs / 60000));
                    return `${diffMins}m`;
                  })()}
                </span>
              </div>
              
              <div className="flex items-center gap-6 mb-10">
                <div className="w-20 h-20 rounded-3xl overflow-hidden shadow-lg relative">
                  <Image 
                    src={nextPatient.avatar || "https://picsum.photos/seed/patient1/200/200"} 
                    alt="Patient" 
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-2xl text-on-surface leading-tight">{nextPatient.name}</h4>
                  <p className="text-sm text-on-surface-variant font-medium">ID do Paciente: #TCM-{nextPatient.id.slice(-5)}</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="bg-surface-container-low rounded-[2rem] p-6">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">FOCO ANTERIOR</p>
                  <div className="flex flex-wrap gap-2.5">
                    {focusPoints.map((tag: string) => (
                      <span key={tag} className="px-4 py-1.5 bg-white rounded-xl text-[11px] font-bold text-primary shadow-sm">
                        {tag}
                      </span>
                    ))}
                    {remainingCount > 0 && (
                      <span className="px-4 py-1.5 bg-white rounded-xl text-[11px] font-bold text-primary shadow-sm">
                        +{remainingCount} mais
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  {canCreateAppointment && (
                    <button 
                      onClick={() => onStartConsultation?.(nextPatient.id)}
                      className="w-full bg-primary text-white py-5 rounded-2xl font-bold text-sm hover:shadow-2xl hover:shadow-primary/20 transition-all flex items-center justify-center gap-3"
                    >
                      <Play size={18} fill="currentColor" /> Iniciar Sessão
                    </button>
                  )}
                  <button 
                    onClick={() => onViewPatientHistory?.(nextPatient.id)}
                    className="w-full bg-surface-container-high text-on-surface py-5 rounded-2xl font-bold text-sm hover:bg-surface-container-highest transition-all"
                  >
                    Ver Histórico Completo
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 border border-primary/5 shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-surface-container-low rounded-2xl md:rounded-3xl flex items-center justify-center text-outline mb-6">
                <Calendar size={32} />
              </div>
              <h4 className="font-headline font-bold text-xl text-on-surface">Sem agendamentos próximos</h4>
              <p className="text-sm text-on-surface-variant mt-2 max-w-[200px]">Você não tem mais consultas agendadas para hoje.</p>
              {canCreateAppointment && (
                <button 
                  onClick={onNewAppointment}
                  className="mt-8 text-primary font-bold text-sm hover:underline"
                >
                  Agendar nova consulta
                </button>
              )}
            </div>
          )}

          <div className="hidden sm:block bg-secondary-container/10 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden border border-secondary-container/30">
            <Lightbulb className="text-secondary mb-4 md:mb-6" size={32} />
            <h5 className="font-headline font-bold text-xl text-on-secondary-container mb-3">Você sabia?</h5>
            <p className="text-sm text-on-secondary-container/80 leading-relaxed font-medium">
              Estimular o <span className="font-bold">Ponto Zero</span> pode aumentar o efeito dos pontos subsequentes ao equilibrar as funções autonômicas.
            </p>
            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-secondary-container/20 rounded-full blur-3xl"></div>
          </div>
        </div>
      </section>
    </div>
  );
}

