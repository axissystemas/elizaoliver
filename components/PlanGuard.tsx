'use client';

import React from 'react';
import { useSubscription, FeatureKey } from '@/lib/useSubscription';
import { ShieldAlert, Lock, ArrowUpCircle } from 'lucide-react';

interface PlanGuardProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PlanGuard({ feature, children, fallback }: PlanGuardProps) {
  const { hasFeature, plan } = useSubscription();

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 min-h-[400px] bg-surface-container-low/30 rounded-3xl border border-dashed border-outline-variant/50">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
        <Lock className="text-primary" size={32} />
      </div>
      <h2 className="text-2xl font-bold text-on-surface mb-2">Recurso Premium</h2>
      <p className="text-on-surface-variant text-center max-w-md mb-8">
        Seu plano atual ({plan}) não contempla este módulo. Faça o upgrade para ter acesso completo a todas as funcionalidades do Axis GC.
      </p>
      <button className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-all">
        <ArrowUpCircle size={20} />
        Ver Planos Disponíveis
      </button>
    </div>
  );
}
