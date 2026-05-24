'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { Lock, User as UserIcon, Eye, EyeOff, CheckCircle2, AlertTriangle } from 'lucide-react';
import { User } from '@/types/auth';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';

interface LoginViewProps {
  onLogin: (user: User) => void;
}

export default function LoginView({ onLogin }: LoginViewProps) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Limpeza de Cookies e Storage ao carregar a tela de Login
  React.useEffect(() => {
    console.log('[Login] Limpando vestígios de sessões antigas...');
    try {
      // 1. Limpa Cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      // 2. Limpa Storages
      localStorage.clear();
      sessionStorage.clear();
      console.log('[Login] Ambiente limpo com sucesso.');
    } catch (e) {
      console.warn('[Login] Falha ao realizar limpeza preventiva:', e);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError('Configuração do Supabase ausente. Verifique as variáveis de ambiente.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const trimmedEmail = email.trim();
      
      if (trimmedEmail.toLowerCase() === 'admin' || password.toLowerCase() === 'admin') {
        setError('As credenciais "admin/admin" não são mais válidas. Por favor, use seu e-mail.');
        setIsLoading(false);
        return;
      }

      await signIn(trimmedEmail, password);
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else {
        setError(err.message || 'Erro ao processar solicitação.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl shadow-primary/5 border border-outline-variant/10 p-10 relative z-10"
      >
        {!supabase && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800">
            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
            <div className="text-xs">
              <p className="font-bold mb-1">Configuração Necessária</p>
              <p>As variáveis de ambiente do Supabase não foram configuradas. O login não funcionará até que você as adicione nas configurações.</p>
            </div>
          </div>
        )}

        <div className="text-center mb-10">
          <div className="w-[100px] h-[100px] flex items-center justify-center mx-auto mb-6">
            <Image 
              src="/Axis_sistemas_Favicon.png" 
              alt="Axis GC" 
              width={100} 
              height={100} 
              className="object-contain drop-shadow-xl"
            />
          </div>
          <h1 className="text-3xl font-bold font-headline text-on-surface">
            Bem-Vindo ao Axis GC
          </h1>
          <p className="text-on-surface-variant mt-2 font-medium">
            Sistema de Gestão de Clínicas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-outline uppercase tracking-widest ml-1">E-mail Profissional</label>
            <div className="relative group">
              <UserIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={20} />
              <input 
                required
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@clinica.com"
                className="w-full pl-14 pr-6 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1 mr-1">
              <label className="text-xs font-bold text-outline uppercase tracking-widest">Senha de Acesso</label>
              <ForgotPasswordButton />
            </div>
            <div className="relative group">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors" size={20} />
              <input 
                required
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-14 pr-14 py-4 bg-surface-container-low rounded-2xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-xs font-bold p-3 rounded-xl text-center text-rose-500 bg-rose-50"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={isLoading || !supabase}
            className="w-full py-5 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>Entrar no Sistema <CheckCircle2 size={20} /></>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Forgot Password ────────────────────────────────────────────────────────

function ForgotPasswordButton() {
  const { resetPassword } = useAuth();
  const [open, setOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpen = () => {
    setOpen(true);
    setStatus('idle');
    setResetEmail('');
    setErrorMsg('');
  };

  const handleClose = () => {
    if (status === 'loading') return;
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      await resetPassword(resetEmail.trim());
      setStatus('success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro. Tente novamente.');
      setStatus('error');
    }
  };

  return (
    <>
      <button
        type="button"
        id="btn-forgot-password"
        onClick={handleOpen}
        className="text-xs font-semibold text-primary hover:underline underline-offset-2 transition-all"
      >
        Esqueci a senha
      </button>

      {/* Backdrop */}
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}
        >
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-[2rem] shadow-2xl p-8 relative"
          >
            {/* Icon header */}
            <div className="flex flex-col items-center mb-6">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)', boxShadow: '0 8px 24px rgba(26,35,126,0.25)' }}
              >
                <Lock size={24} color="white" />
              </div>
              <h2 className="text-xl font-bold text-on-surface">Redefinir senha</h2>
              <p className="text-sm text-on-surface-variant text-center mt-1">
                Informe seu e-mail e enviaremos um link para você criar uma nova senha.
              </p>
            </div>

            {status === 'success' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 size={36} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-on-surface text-center">
                  E-mail enviado com sucesso!
                </p>
                <p className="text-xs text-on-surface-variant text-center">
                  Verifique sua caixa de entrada (e também o spam) para o link de redefinição.
                </p>
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-3 w-full py-3 bg-primary text-white rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Fechar
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative group">
                  <UserIcon
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors"
                    size={18}
                  />
                  <input
                    required
                    type="email"
                    id="reset-email-input"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="seu@email.com"
                    disabled={status === 'loading'}
                    className="w-full pl-12 pr-4 py-3.5 bg-surface-container-low rounded-xl border border-outline-variant/10 focus:ring-2 focus:ring-primary/20 outline-none font-medium text-sm transition-all disabled:opacity-60"
                  />
                </div>

                {status === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-xs font-semibold p-2.5 rounded-lg text-center text-rose-600 bg-rose-50"
                  >
                    {errorMsg}
                  </motion.p>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={status === 'loading'}
                    className="flex-1 py-3 rounded-xl border border-outline-variant/20 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-low transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    id="btn-reset-password-submit"
                    disabled={status === 'loading' || !resetEmail.trim()}
                    className="flex-1 py-3 bg-primary text-white rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {status === 'loading' ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'Enviar link'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
