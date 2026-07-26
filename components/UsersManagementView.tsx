'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Users,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Shield,
  Search,
  Loader2,
  Power,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, UserRole, ROLE_LABELS, ALL_PERMISSIONS, ROLE_PERMISSIONS, ADMIN_PERMISSIONS } from '@/types/auth';
import { getSupabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import ConfirmationModal from './ConfirmationModal';
import { deleteUserAction, toggleUserActiveAction } from '@/app/actions/adminSaaS';
import { logAction } from '@/lib/auditLogService';

// Centralized supabase config access
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Temporary client for creating new users without affecting current session
const createTempClient = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Supabase credentials missing for temp client');
    return null;
  }
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { 
    auth: { 
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    } 
  });
};

interface UsersManagementViewProps {
  user: User;
}

export default function UsersManagementView({ user }: UsersManagementViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToInactivate, setUserToInactivate] = useState<User | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [userFormData, setUserFormData] = useState<Partial<User>>({ 
    name: '', 
    email: '', 
    role: 'PROFESSIONAL', 
    password: '', 
    permissions: ROLE_PERMISSIONS['PROFESSIONAL'] 
  });

  const canCreate = user?.permissions.includes('users:create') || user?.role === 'ADMIN';
  const canEdit = user?.permissions.includes('users:edit') || user?.role === 'ADMIN';
  const canDelete = user?.permissions.includes('users:delete') || user?.role === 'ADMIN';

  useEffect(() => {
    const fetchUsers = async () => {
      const supabase = getSupabase();
      if (!supabase) {
        console.error('Supabase client not initialized');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');

        if (error) throw error;

        if (data) {
          const mappedUsers: User[] = data.map(p => {
            const role = p.role as UserRole;
            // Use permissions from DB if they exist and are not empty, otherwise fall back to role defaults
            const permissions = (p.permissions && p.permissions.length > 0) ? p.permissions : (ROLE_PERMISSIONS[role] || []);
            
            return {
              id: p.id,
              name: p.name,
              email: p.email,
              role: role,
              avatar: p.avatar_url || undefined,
              permissions: permissions,
              is_active: p.is_active !== false
            };
          });
          // Filter out current user from the list as it's shown separately
          setUsers(mappedUsers.filter(u => u.id !== user.id));
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [user.id]);

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    if (statusFilter === 'active') return u.is_active !== false;
    if (statusFilter === 'inactive') return u.is_active === false;
    return true;
  });

  const handleSaveUser = async () => {
    if (!userFormData.name || !userFormData.email || (!editingUser && !userFormData.password)) {
      setFormError('Por favor, preencha os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(false);
    
    try {
      console.log('Starting handleSaveUser...', { editingUser: !!editingUser, email: userFormData.email });
      const supabase = getSupabase();
      if (!supabase) throw new Error('Cliente Supabase não inicializado. Verifique as variáveis de ambiente.');

      if (editingUser) {
        console.log('Updating existing profile...', editingUser.id);
        console.log('User data to save:', {
          name: userFormData.name,
          role: userFormData.role,
          permissions: userFormData.permissions
        });
        
        // Update existing profile
        const { data: updateData, error } = await supabase
          .from('profiles')
          .update({
            name: userFormData.name,
            role: userFormData.role,
            permissions: userFormData.permissions,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)
          .select();

        if (error) {
          console.error('Supabase update error:', error);
          if (error.code === '42501') {
            throw new Error('Permissão negada no banco de dados. Verifique se você é um administrador.');
          }
          throw error;
        }
        
        console.log('Update successful, returned data:', updateData);
        
        // Registrar na auditoria
        logAction({
          action: 'UPDATE',
          entityType: 'AUTH',
          entityId: editingUser.id,
          details: { name: userFormData.name, role: userFormData.role, updated_at: new Date().toISOString() }
        }).catch(() => {});

        // Update local state with the new user data
        setUsers(prevUsers => prevUsers.map(u => u.id === editingUser.id ? { 
          ...u, 
          name: userFormData.name!,
          role: userFormData.role!,
          permissions: userFormData.permissions || []
        } : u));
        setEditingUser(null);
      } else {
        console.log('Creating new user in Auth...');
        console.log('New user data:', {
          name: userFormData.name,
          email: userFormData.email,
          role: userFormData.role,
          permissions: userFormData.permissions
        });
        
        // Create new user in Auth and Profile
        // 1. Sign up in Auth using temp client
        const tempSupabase = createTempClient();
        if (!tempSupabase) throw new Error('Configuração do Supabase incompleta.');

        const { data: authData, error: authError } = await tempSupabase.auth.signUp({
          email: userFormData.email!,
          password: userFormData.password!,
          options: {
            data: {
              name: userFormData.name,
              role: userFormData.role,
              permissions: userFormData.permissions,
              organization_id: user.organizationId // Pass the admin's organization ID to link them in the database trigger
            }
          }
        });

        if (authError) {
          console.error('Auth signUp error:', authError);
          throw authError;
        }

        if (authData.user) {
          console.log('User created in Auth, ID:', authData.user.id);
          // 2. Ensure profile is created/updated with correct data
          // Note: The database trigger (handle_new_user) automatically creates the profile row
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: authData.user.id,
                name: userFormData.name as string,
                email: userFormData.email as string,
                role: userFormData.role as string,
                permissions: userFormData.permissions || [],
                organization_id: user.organizationId, // Ensure profile is linked to the admin's organization
                avatar_url: `https://picsum.photos/seed/${authData.user.id}/200/200`,
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.warn('Profile upsert warning (tratado graciosamente, trigger gerencia o perfil):', profileError);
            }
          } catch (pErr) {
            console.warn('Exceção ao atualizar perfil diretamente pelo cliente:', pErr);
          }
          
          console.log('Profile processed successfully');

          // Registrar na auditoria
          logAction({
            action: 'CREATE',
            entityType: 'AUTH',
            entityId: authData.user.id,
            details: { name: userFormData.name, email: userFormData.email, role: userFormData.role }
          }).catch(() => {});

          const newUser: User = {
            id: authData.user.id,
            name: userFormData.name!,
            email: userFormData.email!,
            role: userFormData.role!,
            avatar: `https://picsum.photos/seed/${authData.user.id}/200/200`,
            permissions: userFormData.permissions || []
          };
          setUsers([...users, newUser]);
        } else {
          console.warn('Auth signUp returned no user and no error.');
        }
      }
      
      setFormSuccess(true);
      console.log('Save successful!');
      
      // Wait a bit to show success message before closing
      setTimeout(() => {
        setUserFormData({ 
          name: '', 
          email: '', 
          role: 'PROFESSIONAL', 
          password: '', 
          permissions: ROLE_PERMISSIONS['PROFESSIONAL'] 
        });
        setIsFormOpen(false);
        setFormSuccess(false);
      }, 1500);

    } catch (err: any) {
      console.error('Error saving user:', err);
      // Better error message for the user
      let errorMessage = err.message || 'Erro desconhecido';
      if (err.code) errorMessage += ` (Código: ${err.code})`;
      if (err.details) errorMessage += ` - ${err.details}`;
      if (typeof err === 'object' && !err.message) errorMessage = JSON.stringify(err);
      
      setFormError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (u: User) => {
    console.log('Editing user:', u);
    setEditingUser(u);
    setFormError(null);
    setFormSuccess(false);
    setUserFormData({ 
      name: u.name, 
      email: u.email, 
      role: u.role, 
      password: '', // Don't show password on edit
      permissions: u.permissions || []
    });
    setIsFormOpen(true);
  };

  const handleToggleUserStatus = async (u: User) => {
    if (u.id === user.id) {
      alert('Você não pode inativar seu próprio usuário.');
      return;
    }

    const targetNewStatus = !(u.is_active !== false);
    setIsTogglingStatus(u.id);
    setGeneralError(null);

    try {
      await toggleUserActiveAction(u.id, targetNewStatus);
      
      setUsers(prevUsers => prevUsers.map(item => 
        item.id === u.id ? { ...item, is_active: targetNewStatus } : item
      ));

      logAction({
        action: targetNewStatus ? 'ACTIVATE' as any : 'INACTIVATE' as any,
        entityType: 'AUTH',
        entityId: u.id,
        details: { name: u.name, email: u.email, is_active: targetNewStatus }
      }).catch(() => {});

    } catch (err: any) {
      console.error('Error toggling user active status:', err);
      setGeneralError(`Erro ao alterar status do usuário: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsTogglingStatus(null);
      setUserToInactivate(null);
    }
  };

  const handleDeleteUser = (u: User) => {
    if (u.id === user.id) {
      alert('Você não pode excluir seu próprio usuário.');
      return;
    }
    setUserToDelete(u);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    const u = userToDelete;
    
    setIsDeleting(true);
    setGeneralError(null);

    // Timer de segurança para evitar que a UI trave se a RPC demorar
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TIMEOUT')), 15000)
    );

    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error('Cliente Supabase não inicializado.');

      console.log(`Iniciando exclusão do usuário: ${u.id} (${u.name})`);

      try {
        // 1. Tenta via Server Action confiável (usa Service Role Key)
        await deleteUserAction(u.id);
        console.log('Usuário excluído com sucesso via Server Action.');
      } catch (saError: any) {
        if (saError.message === 'RESTRICTION') {
          throw saError;
        }

        console.warn('Server Action deleteUserAction falhou ou indisponível, tentando fallback RPC:', saError);
        
        // 2. Fallback via RPC Supabase
        let rpcRes = await (supabase.rpc as any)('delete_user', { id_to_delete: u.id });
        if (rpcRes.error && (rpcRes.error.message?.includes('schema cache') || rpcRes.error.code === 'PGRST202')) {
          rpcRes = await (supabase.rpc as any)('delete_user', { user_id: u.id });
        }
        const rpcError = rpcRes.error;
        
        if (rpcError) {
          if (rpcError.code === '23503' || rpcError.message?.includes('violates foreign key constraint')) {
            throw new Error('RESTRICTION');
          }
          throw new Error(`Falha ao remover usuário do sistema de autenticação: ${rpcError.message || saError.message || 'Erro desconhecido'}`);
        }
      }
      
      // Se chegou aqui, a exclusão no Auth (que cascateia para Profile) foi bem-sucedida
      setUsers(prevUsers => prevUsers.filter(item => item.id !== u.id));
      
      // Registrar na auditoria
      logAction({
        action: 'DELETE',
        entityType: 'AUTH',
        entityId: u.id,
        details: { name: u.name, email: u.email }
      }).catch(() => {});

      console.log('Usuário excluído com sucesso do Auth e Profile.');
    } catch (err: any) {

      console.error('Error deleting user:', err);
      
      if (err.message === 'TIMEOUT') {
        setGeneralError('A operação demorou muito e foi cancelada. O banco de dados pode estar sobrecarregado. Tente novamente em instantes.');
      } else if (err.message === 'RESTRICTION') {
        setUserToInactivate(u);
        setGeneralError(`Não é possível excluir "${u.name}" permanentemente pois existem registros vinculados a este usuário (pacientes, agendamentos, etc.). Você pode inativar seu acesso no modal abaixo.`);
      } else {
        let errorMessage = err.message || 'Erro desconhecido';
        if (err.code) errorMessage += ` (Código: ${err.code})`;
        setGeneralError(`Erro ao excluir usuário: ${errorMessage}`);
      }
    } finally {
      setUserToDelete(null);
      setIsDeleting(false);
    }
  };


  return (
    <div className="p-10 space-y-8 relative max-w-6xl mx-auto">
      {generalError && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between gap-3 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="shrink-0 text-rose-500" />
            <p className="flex-1">{generalError}</p>
          </div>
          <button onClick={() => setGeneralError(null)} className="p-1 hover:bg-rose-100 rounded-full transition-all shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-4xl font-bold font-headline text-on-surface">Gestão de Equipe</h2>
          <p className="text-on-surface-variant text-lg mt-2 font-medium">Gerencie os profissionais, status de login e permissões da sua clínica.</p>
        </div>
        {canCreate && (
          <button 
            onClick={() => {
              setEditingUser(null);
              setFormError(null);
              setFormSuccess(false);
              setUserFormData({ 
                name: '', 
                email: '', 
                role: 'PROFESSIONAL', 
                password: '', 
                permissions: ROLE_PERMISSIONS['PROFESSIONAL'] 
              });
              setIsFormOpen(true);
            }}
            className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus size={20} /> Novo Usuário
          </button>
        )}
      </section>

      {/* Stats & Search Filters */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button 
          onClick={() => setStatusFilter('all')}
          className={`p-5 rounded-[2rem] border text-left transition-all ${
            statusFilter === 'all' 
              ? 'bg-primary/5 border-primary shadow-sm' 
              : 'bg-white border-outline-variant/10 hover:border-primary/30'
          }`}
        >
          <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">Total de Membros</p>
          <p className="text-3xl font-black text-primary">{users.length + 1}</p>
        </button>

        <button 
          onClick={() => setStatusFilter('active')}
          className={`p-5 rounded-[2rem] border text-left transition-all ${
            statusFilter === 'active' 
              ? 'bg-emerald-50 border-emerald-500 shadow-sm' 
              : 'bg-white border-outline-variant/10 hover:border-emerald-300'
          }`}
        >
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Ativos</p>
          <p className="text-3xl font-black text-emerald-600">
            {users.filter(u => u.is_active !== false).length + (user.is_active !== false ? 1 : 0)}
          </p>
        </button>

        <button 
          onClick={() => setStatusFilter('inactive')}
          className={`p-5 rounded-[2rem] border text-left transition-all ${
            statusFilter === 'inactive' 
              ? 'bg-rose-50 border-rose-500 shadow-sm' 
              : 'bg-white border-outline-variant/10 hover:border-rose-300'
          }`}
        >
          <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mb-1">Inativos</p>
          <p className="text-3xl font-black text-rose-500">
            {users.filter(u => u.is_active === false).length}
          </p>
        </button>

        <div className="bg-white p-4 rounded-[2rem] border border-outline-variant/10 shadow-sm flex items-center gap-3 px-6">
          <Search className="text-outline shrink-0" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-medium placeholder:text-outline/50 w-full"
          />
        </div>
      </section>

      {/* Users List */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        {/* Current User Card (Always first if not filtering inactive) */}
        {statusFilter !== 'inactive' && (
          <div className="bg-primary/5 border-2 border-primary/20 p-8 rounded-[2.5rem] flex items-center justify-between group">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl overflow-hidden relative border-2 border-white shadow-md">
                <Image 
                  src={user.avatar || "https://picsum.photos/seed/doctor/200/200"} 
                  alt={user.name} 
                  fill 
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-on-surface">{user.name}</h3>
                  <span className="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-md uppercase tracking-widest">Você</span>
                  <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200/60 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                    <UserCheck size={11} /> Ativo
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant font-medium">{user.email}</p>
                <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center shadow-sm">
              <Shield size={20} />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-primary" size={40} />
            <p className="text-on-surface-variant font-medium">Carregando equipe...</p>
          </div>
        ) : (
          <>
            {filteredUsers.map((u) => {
              const isActive = u.is_active !== false;
              return (
                <div 
                  key={u.id} 
                  className={`p-8 rounded-[2.5rem] border shadow-sm hover:shadow-md transition-all flex items-center justify-between group ${
                    isActive ? 'bg-white border-outline-variant/10' : 'bg-slate-50/80 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden relative bg-surface-container shrink-0">
                      <Image 
                        src={u.avatar || `https://picsum.photos/seed/${u.id}/200/200`} 
                        alt={u.name} 
                        fill 
                        className={`object-cover ${!isActive ? 'grayscale opacity-70' : ''}`}
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className={`text-xl font-bold ${isActive ? 'text-on-surface' : 'text-slate-500 line-through'}`}>{u.name}</h3>
                        {isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                            <UserCheck size={11} /> Ativo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-200 text-slate-600 border border-slate-300 text-[10px] font-bold rounded-md uppercase tracking-wider flex items-center gap-1">
                            <UserX size={11} /> Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-on-surface-variant font-medium">{u.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 bg-surface-container-high text-on-surface-variant text-[10px] font-bold rounded-md uppercase tracking-widest">
                          {ROLE_LABELS[u.role]}
                        </span>
                        <span className="text-[10px] font-bold text-outline uppercase tracking-widest">• {u.permissions?.length || 0} permissões</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    {canEdit && (
                      <button 
                        onClick={() => setUserToInactivate(u)}
                        disabled={isTogglingStatus === u.id}
                        title={isActive ? "Inativar Acesso do Usuário" : "Reativar Acesso do Usuário"}
                        className={`p-3 rounded-xl transition-all flex items-center gap-1 ${
                          isActive 
                            ? 'text-amber-600 hover:bg-amber-50' 
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {isTogglingStatus === u.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : (
                          <Power size={18} />
                        )}
                      </button>
                    )}
                    {canEdit && (
                      <button 
                        onClick={() => handleEditUser(u)}
                        className="p-3 text-outline hover:text-primary hover:bg-primary/5 rounded-xl transition-all"
                        title="Editar Usuário"
                      >
                        <Edit2 size={18} />
                      </button>
                    )}
                    {canDelete && (
                      <button 
                        onClick={() => handleDeleteUser(u)}
                        className="p-3 text-outline hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        title="Excluir Usuário"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredUsers.length === 0 && (searchTerm || statusFilter !== 'all') && (
              <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
                <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto text-outline/30">
                  <Search size={40} />
                </div>
                <p className="text-on-surface-variant font-medium text-lg">
                  Nenhum usuário encontrado com os filtros selecionados.
                </p>
                <button 
                  onClick={() => { setSearchTerm(''); setStatusFilter('all'); }}
                  className="px-4 py-2 bg-surface-container text-primary font-bold rounded-xl text-sm hover:bg-surface-container-high transition-all"
                >
                  Limpar Filtros
                </button>
              </div>
            )}
            
            {filteredUsers.length === 0 && !searchTerm && statusFilter === 'all' && (
              <div className="col-span-full py-20 text-center space-y-4 bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500/50">
                  <Users size={40} />
                </div>
                <p className="text-on-surface-variant font-medium text-lg">Sem outros profissionais na equipe.</p>
                {canCreate && (
                  <button 
                    onClick={() => setIsFormOpen(true)}
                    className="mt-4 px-6 py-2 bg-emerald-50 text-emerald-600 font-bold rounded-xl hover:bg-emerald-100 transition-colors inline-block"
                  >
                    Adicionar Profissional
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userToDelete}
        onClose={() => !isDeleting && setUserToDelete(null)}
        onConfirm={confirmDeleteUser}
        title="Excluir Usuário"
        message={`Tem certeza que deseja excluir o usuário "${userToDelete?.name}"? Esta ação removerá o perfil do banco de dados e o acesso do usuário permanentemente.`}
        confirmText={isDeleting ? "Excluindo..." : "Excluir"}
        cancelText="Cancelar"
        type="danger"
      />

      {/* Inactivation / Activation Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!userToInactivate}
        onClose={() => setUserToInactivate(null)}
        onConfirm={() => userToInactivate && handleToggleUserStatus(userToInactivate)}
        title={userToInactivate?.is_active !== false ? "Inativar Acesso do Usuário" : "Reativar Usuário"}
        message={
          userToInactivate?.is_active !== false
            ? `O usuário "${userToInactivate?.name}" não poderá mais fazer login no sistema. O histórico de atendimentos e registros criados por este usuário permanecerão preservados.`
            : `Deseja reativar o acesso de "${userToInactivate?.name}"? O usuário voltará a poder efetuar login e acessar o sistema.`
        }
        confirmText={userToInactivate?.is_active !== false ? "Inativar Usuário" : "Reativar Usuário"}
        cancelText="Cancelar"
        type={userToInactivate?.is_active !== false ? "warning" : "info"}
      />

      {/* User Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full h-full md:h-auto md:max-w-3xl rounded-none md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:max-h-[90vh]"
            >
              <div className="p-6 md:p-8 border-b border-outline-variant/10 flex justify-between items-start md:items-center bg-surface-container-lowest flex-col sm:flex-row gap-4 sm:gap-0">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">
                    {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                  </h3>
                  <p className="text-sm text-on-surface-variant font-medium">Defina os dados e níveis de acesso.</p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-3 hover:bg-surface-container-low rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
              
              <div className="p-6 md:p-8 overflow-y-auto space-y-8 custom-scrollbar flex-1">
                {formError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <X size={18} className="shrink-0" />
                    <p>{formError}</p>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-medium animate-in fade-in slide-in-from-top-2">
                    <Check size={18} className="shrink-0" />
                    <p>Usuário {editingUser ? 'atualizado' : 'cadastrado'} com sucesso!</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Dr. Ricardo Silva"
                      value={userFormData.name}
                      onChange={e => setUserFormData({...userFormData, name: e.target.value})}
                      className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">E-mail de Acesso</label>
                    <input 
                      type="email" 
                      placeholder="email@exemplo.com"
                      value={userFormData.email}
                      onChange={e => setUserFormData({...userFormData, email: e.target.value})}
                      className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Nível de Acesso</label>
                    <div className="relative">
                      <select 
                        value={userFormData.role}
                        onChange={e => {
                          const newRole = e.target.value as UserRole;
                          const currentRole = userFormData.role as UserRole;
                          const currentPerms = userFormData.permissions || [];
                          const oldDefaults = ROLE_PERMISSIONS[currentRole] || [];
                          
                          // Check if current permissions are exactly the defaults for the old role
                          const isDefault = currentPerms.length === oldDefaults.length && 
                                           currentPerms.every(p => oldDefaults.includes(p));

                          if (isDefault) {
                            setUserFormData({
                              ...userFormData, 
                              role: newRole, 
                              permissions: ROLE_PERMISSIONS[newRole] || []
                            });
                          } else {
                            setUserFormData({
                              ...userFormData, 
                              role: newRole
                            });
                          }
                        }}
                        className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-bold appearance-none text-primary"
                      >
                        <option value="ADMIN">Administrador (Acesso Total)</option>
                        <option value="PROFESSIONAL">Profissional (Acesso Clínico)</option>
                        <option value="SECRETARY">Secretário(a) (Acesso Administrativo)</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-outline uppercase tracking-widest ml-2">Senha Temporária</label>
                    <input 
                      type="password" 
                      placeholder={editingUser ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                      value={userFormData.password}
                      onChange={e => setUserFormData({...userFormData, password: e.target.value})}
                      className="w-full px-6 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                      <label className="text-xs font-bold text-outline uppercase tracking-widest">Permissões de Acesso Detalhadas</label>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => {
                            setUserFormData({...userFormData, permissions: ADMIN_PERMISSIONS});
                          }}
                          className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                          Marcar Todas
                        </button>
                        <button 
                          onClick={() => {
                            setUserFormData({...userFormData, permissions: []});
                          }}
                          className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                        >
                          Desmarcar Todas
                        </button>
                        <button 
                          onClick={() => {
                            const defaults = ROLE_PERMISSIONS[userFormData.role as UserRole] || [];
                            setUserFormData({...userFormData, permissions: defaults});
                          }}
                          className="text-[10px] font-bold text-outline uppercase tracking-widest hover:underline"
                        >
                          Restaurar Padrões
                        </button>
                      </div>
                    </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ALL_PERMISSIONS.map((perm) => (
                      <div key={perm.id} className="p-6 bg-surface-container-lowest rounded-[2rem] border border-outline-variant/10 space-y-4">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox"
                            checked={perm.sub ? perm.sub.every(sub => userFormData.permissions?.includes(sub.id)) : false}
                            onChange={(e) => {
                              const currentPerms = userFormData.permissions || [];
                              let newPerms = [...currentPerms];

                              if (perm.sub) {
                                const subIds = perm.sub.map(s => s.id);

                                if (e.target.checked) {
                                  newPerms = Array.from(new Set([...newPerms, ...subIds]));
                                } else {
                                  newPerms = newPerms.filter(p => !subIds.includes(p));
                                }
                              }

                              setUserFormData({ ...userFormData, permissions: newPerms });
                            }}
                            className="w-6 h-6 rounded-lg border-outline-variant/30 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                          />
                          <span className="font-bold text-on-surface group-hover:text-primary transition-colors">{perm.label}</span>
                        </label>
                        
                        {perm.sub && (
                          <div className="grid grid-cols-1 gap-2 ml-9 pt-3 border-t border-outline-variant/5">
                            {perm.sub.map((sub) => (
                              <label key={sub.id} className="flex items-center gap-3 py-1 cursor-pointer group/sub">
                                <input
                                  type="checkbox"
                                  checked={userFormData.permissions?.includes(sub.id)}
                                  onChange={(e) => {
                                    const currentPerms = userFormData.permissions || [];
                                    let newPerms = [...currentPerms];

                                    if (e.target.checked) {
                                      newPerms = Array.from(new Set([...newPerms, sub.id]));
                                    } else {
                                      newPerms = newPerms.filter(p => p !== sub.id);
                                    }

                                    setUserFormData({ ...userFormData, permissions: newPerms });
                                  }}
                                  className="w-5 h-5 rounded border-outline-variant/30 text-primary focus:ring-primary/20 transition-all cursor-pointer"
                                />
                                <span className="text-xs font-semibold text-on-surface-variant group-hover/sub:text-on-surface transition-colors">{sub.label}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-surface-container-lowest border-t border-outline-variant/10 flex gap-4">
                <button 
                  onClick={() => setIsFormOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl border border-outline-variant/20 font-bold text-on-surface hover:bg-surface-container-low transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveUser}
                  disabled={isSubmitting}
                  className="flex-[2] py-4 rounded-2xl bg-primary text-white font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Check size={20} />
                  )}
                  {editingUser ? 'Salvar Alterações' : 'Criar Novo Usuário'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
