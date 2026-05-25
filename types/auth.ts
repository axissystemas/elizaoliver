export type UserRole = 'ADMIN' | 'PROFESSIONAL' | 'SECRETARY';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Only used for local storage mock
  avatar?: string;
  permissions: string[];
  organizationId?: string;
  organization?: {
    name: string;
    slug: string;
  };
  subscription?: {
    planCode: string;
    planName: string;
    status: string;
    nextPaymentDate?: string;
    externalId?: string;
    entitlements: string[];
  };
  /** Marcado como true quando logado via credenciais nativas do .env (bypass Supabase) */
  isNativeAdmin?: boolean;
}

export interface Permission {
  id: string;
  label: string;
  sub?: Permission[];
}

export const ALL_PERMISSIONS: Permission[] = [
  { 
    id: 'dashboard', 
    label: 'Painel',
    sub: [
      { id: 'dashboard:view', label: 'Visualizar Painel' }
    ]
  },
  { 
    id: 'patients', 
    label: 'Pacientes',
    sub: [
      { id: 'patients:view', label: 'Visualizar Lista' },
      { id: 'patients:create', label: 'Cadastrar' },
      { id: 'patients:edit', label: 'Editar' },
      { id: 'patients:delete', label: 'Excluir' }
    ]
  },
  { 
    id: 'evaluations', 
    label: 'Avaliações',
    sub: [
      { id: 'evaluations:view', label: 'Visualizar Histórico' },
      { id: 'evaluations:create', label: 'Nova Avaliação' },
      { id: 'evaluations:edit', label: 'Editar Avaliação' },
      { id: 'evaluations:delete', label: 'Excluir Avaliação' }
    ]
  },
  { 
    id: 'calendar', 
    label: 'Agenda',
    sub: [
      { id: 'calendar:view', label: 'Visualizar Agenda' },
      { id: 'calendar:create', label: 'Agendar' },
      { id: 'calendar:edit', label: 'Reagendar' },
      { id: 'calendar:delete', label: 'Cancelar' }
    ]
  },

  { 
    id: 'protocols', 
    label: 'Protocolos',
    sub: [
      { id: 'protocols:view', label: 'Visualizar Protocolos' },
      { id: 'protocols:create', label: 'Criar Protocolo' },
      { id: 'protocols:edit', label: 'Editar Protocolo' },
      { id: 'protocols:delete', label: 'Excluir Protocolo' }
    ]
  },
  { 
    id: 'financial', 
    label: 'Financeiro',
    sub: [
      { id: 'financial:view', label: 'Visualizar Fluxo' },
      { id: 'financial:create', label: 'Lançar Receita/Despesa' },
      { id: 'financial:reports', label: 'Gerar Relatórios' },
      { id: 'financial:delete', label: 'Excluir Transações' }
    ]
  },
  { 
    id: 'inventory', 
    label: 'Controle de Estoque',
    sub: [
      { id: 'inventory:view', label: 'Visualizar Estoque' },
      { id: 'inventory:create', label: 'Cadastrar Item' },
      { id: 'inventory:edit', label: 'Editar/Movimentar Estoque' },
      { id: 'inventory:undo', label: 'Estornar Movimentação' },
      { id: 'inventory:delete', label: 'Excluir Item' }
    ]
  },
  { 
    id: 'users', 
    label: 'Usuários',
    sub: [
      { id: 'users:view', label: 'Visualizar Equipe' },
      { id: 'users:create', label: 'Cadastrar Usuário' },
      { id: 'users:edit', label: 'Editar Usuário' },
      { id: 'users:delete', label: 'Excluir Usuário' }
    ]
  },
  { 
    id: 'reports', 
    label: 'Relatórios',
    sub: [
      { id: 'reports:view', label: 'Visualizar Relatórios' },
      { id: 'reports:export', label: 'Exportar Dados' }
    ]
  },
  { 
    id: 'billing', 
    label: 'Faturamento',
    sub: [
      { id: 'billing:view', label: 'Visualizar Itens/Lotes' },
      { id: 'billing:setup', label: 'Configurar Operadoras/Preços' },
      { id: 'billing:audit', label: 'Conferir/Auditar Itens' },
      { id: 'billing:batch', label: 'Gestão de Lotes' },
      { id: 'billing:finance', label: 'Pagamentos e Glosas' }
    ]
  },
  { 
    id: 'settings', 
    label: 'Configurações',
    sub: [
      { id: 'settings:profile', label: 'Meu Perfil' },
      { id: 'settings:clinic', label: 'Dados da Clínica' },
      { id: 'settings:users', label: 'Gestão de Usuários' },
      { id: 'settings:delete', label: 'Excluir Dados Sensíveis' }
    ]
  },
];

// Helper to get all IDs recursively
export const getAllPermissionIds = (perms: Permission[]): string[] => {
  let ids: string[] = [];
  perms.forEach(p => {
    ids.push(p.id);
    if (p.sub) {
      ids = [...ids, ...getAllPermissionIds(p.sub)];
    }
  });
  return ids;
};

export const ADMIN_PERMISSIONS = getAllPermissionIds(ALL_PERMISSIONS);

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  PROFESSIONAL: 'Profissional',
  SECRETARY: 'Secretário(a)',
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: ADMIN_PERMISSIONS,
  PROFESSIONAL: [
    'dashboard', 'dashboard:view', 
    'patients', 'patients:view', 'patients:create', 'patients:edit',
    'evaluations', 'evaluations:view', 'evaluations:create', 'evaluations:edit',
    'calendar', 'calendar:view', 'calendar:create', 'calendar:edit',
    'protocols', 'protocols:view', 'protocols:create', 'protocols:edit',
    'inventory', 'inventory:view', 'inventory:create', 'inventory:edit', 'inventory:delete',
    'billing', 'billing:view', 'billing:audit',
    'reports', 'reports:view', 'reports:export',
    'settings', 'settings:profile'
  ],
  SECRETARY: [
    'dashboard', 'dashboard:view', 
    'patients', 'patients:view', 'patients:create',
    'calendar', 'calendar:view', 'calendar:create', 'calendar:edit',
    'inventory', 'inventory:view', 'inventory:create', 'inventory:edit',
    'billing', 'billing:view', 'billing:audit', 'billing:finance',
    'settings', 'settings:profile'
  ],
};
