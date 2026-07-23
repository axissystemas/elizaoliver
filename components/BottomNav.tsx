'use client';

import React, { useRef } from 'react';
import { 
  Users, 
  Calendar, 
  LayoutDashboard, 
  ClipboardList, 
  CreditCard, 
  Settings,
  Sparkles,
  FileText,
  Package
} from 'lucide-react';
import { User } from '@/types/auth';

interface BottomNavProps {
  activeView: string;
  setActiveView: (view: string) => void;
  user: User;
}

const navItems = [
  { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
  { id: 'patients', label: 'Pacientes', icon: Users },
  { id: 'calendar', label: 'Agenda', icon: Calendar },
  { id: 'evaluations', label: 'Avaliações', icon: ClipboardList },

  { id: 'protocols', label: 'Protocolos e Orientações', icon: FileText },
  { id: 'financial', label: 'Finanças', icon: CreditCard },
  { id: 'billing', label: 'Faturas', icon: FileText },
  { id: 'inventory', label: 'Estoque', icon: Package },
  { id: 'users', label: 'Equipe', icon: Users },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function BottomNav({ activeView, setActiveView, user }: BottomNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const allowedViews = user.permissions || [];
  
  const filteredNavItems = navItems.filter(item => {
    if (user.role === 'ADMIN') return true;
    return allowedViews.some(p => p === item.id || p.startsWith(`${item.id}:`));
  });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-outline-variant/20 z-[60] pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      <div 
        ref={scrollRef}
        className="flex items-center overflow-x-auto hide-scrollbar px-2 py-2 snap-x"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* Style tag para hide-scrollbar nos browsers webkit */}
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
        
        {filteredNavItems.map((item) => {
          const isActive = activeView === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`flex min-w-[72px] flex-col items-center justify-center py-2 px-1 gap-1 rounded-2xl transition-all snap-start ${
                isActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'text-on-surface-variant hover:text-primary'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary text-white' : 'bg-transparent text-current'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-bold tracking-wider ${isActive ? 'text-primary' : 'text-on-surface-variant'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
