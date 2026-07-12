import React, { useState } from 'react';
import { useStore } from '../../hooks/useStore';
import { auth } from '../../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile 
} from 'firebase/auth';
import { 
  User as UserIcon, 
  Lock, 
  Key, 
  UserPlus, 
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { loadAllData } = useStore();
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Forms
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Preencha e-mail e senha.');
      return;
    }
    
    setLoading(true);
    setErrorMsg('');

    try {
      if (isCreatingProfile) {
        if (!name.trim()) {
          setErrorMsg('Preencha seu nome.');
          setLoading(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        // The onAuthStateChanged in App.tsx should ideally handle the redirect, 
        // but we'll trigger data load just in case.
        localStorage.setItem('finance-current-user-id', userCredential.user.uid);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        localStorage.setItem('finance-current-user-id', userCredential.user.uid);
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setErrorMsg('Este e-mail já está em uso.');
      else if (err.code === 'auth/invalid-credential') setErrorMsg('E-mail ou senha incorretos.');
      else if (err.code === 'auth/weak-password') setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
      else setErrorMsg(`Erro de autenticação: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden select-none">
      {/* Visual background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-destructive/5 rounded-full blur-[120px] pointer-events-none animate-pulse duration-5000"></div>

      <div className="w-full max-w-md bg-card border border-border/80 rounded-3xl shadow-2xl p-8 relative z-10 space-y-8 animate-in fade-in duration-300">
        
        {/* Header App Info */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary mx-auto shadow-inner">
            <Sparkles size={32} className="animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
            FinanceOS
          </h1>
          <p className="text-muted-foreground text-sm">Seu painel financeiro em nuvem seguro e inteligente.</p>
        </div>

        {/* AUTH FORM */}
        <form onSubmit={handleAuth} className="space-y-5">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg flex items-center gap-2">
              {isCreatingProfile ? <UserPlus size={20} className="text-primary" /> : <Lock size={18} className="text-primary" />}
              {isCreatingProfile ? 'Criar Conta' : 'Acesso Seguro'}
            </h3>
            <button
              type="button"
              onClick={() => {
                setIsCreatingProfile(!isCreatingProfile);
                setErrorMsg('');
              }}
              className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isCreatingProfile ? 'Já tenho conta' : 'Criar nova conta'}
            </button>
          </div>

          <div className="space-y-4">
            {isCreatingProfile && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">
                  Seu Nome *
                </label>
                <input
                  type="text"
                  placeholder="Como devemos te chamar?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-input border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/45"
                  required={isCreatingProfile}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                E-mail *
              </label>
              <input
                type="email"
                placeholder="Seu e-mail de acesso"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/45"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Senha *
              </label>
              <input
                type="password"
                placeholder={isCreatingProfile ? "Crie uma senha forte" : "Sua senha secreta"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-input border border-border px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary/45"
                required
              />
            </div>

            {errorMsg && (
              <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs flex gap-2 items-center">
                <ShieldAlert size={14} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground font-semibold py-3 rounded-xl shadow-md transition-opacity hover:opacity-90 flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isCreatingProfile ? 'Criar e Entrar' : 'Entrar no Sistema'}
            {!loading && (isCreatingProfile ? <ArrowRight size={16} /> : <Key size={16} />)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginView;
