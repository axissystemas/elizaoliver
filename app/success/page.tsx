'use client';

import React, { Suspense } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const planKey = searchParams.get('plan')?.toUpperCase() || 'PREMIUM';

  const planNames: Record<string, string> = {
    'BASIC': 'Plano Básico',
    'PRO': 'Plano Profissional',
    'PREMIUM': 'Plano Premium',
    'LEGACY': 'Plano Legado'
  };

  const currentPlanName = planNames[planKey] || 'Plano Premium';

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-[3rem] shadow-2xl shadow-blue-900/5 p-12 text-center relative z-10 border border-white"
      >
        {/* Animated Check Icon */}
        <div className="relative mb-8 flex justify-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
            className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center relative z-10"
          >
            <CheckCircle2 className="text-emerald-500" size={48} strokeWidth={2.5} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1.2 }}
            transition={{ duration: 1, repeat: Infinity, repeatType: "reverse" }}
            className="absolute inset-0 border-2 border-emerald-100 rounded-full"
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
            Pagamento Aprovado!
          </h1>
          <p className="text-slate-500 font-medium mb-10 leading-relaxed">
            Seja bem-vindo ao próximo nível da sua clínica. Sua assinatura foi processada e os recursos já estão liberados.
          </p>
        </motion.div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 gap-3 mb-10">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-left">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</p>
              <p className="text-sm font-bold text-slate-700">Acesso Instantâneo</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-primary/5 text-left ring-2 ring-primary/5">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-primary">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recursos</p>
              <p className="text-sm font-bold text-slate-700">{currentPlanName} Ativo</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
          >
            Acessar Sistema
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </Link>

        <p className="mt-8 text-[11px] text-slate-400 font-medium leading-relaxed">
          Dúvidas? Entre em contato com nosso suporte<br />através do email <span className="text-blue-500 font-bold">contato@axissystemas.com.br</span>
        </p>
      </motion.div>

      {/* Footer Branding */}
      <div className="absolute bottom-12 left-0 right-0 text-center opacity-20 flex items-center justify-center gap-2 grayscale">
        <span className="text-xl font-black tracking-tighter">AXIS GC</span>
        <div className="w-1 h-1 bg-slate-900 rounded-full" />
        <span className="text-xs font-bold uppercase tracking-widest">AXIS SYSTEMAS</span>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
