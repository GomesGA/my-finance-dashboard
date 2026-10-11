import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Landmark, Lock, Mail } from 'lucide-react';

export function Auth() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const validateForm = () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error('Informe seu e-mail.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      toast.error('Informe um formato de e-mail válido.');
      return false;
    }
    if (!password) {
      toast.error('Informe a senha.');
      return false;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return false;
    }
    if (mode === 'signup' && password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const cleanEmail = email.trim();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('E-mail ou senha incorretos.');
          } else {
            toast.error('Erro ao entrar', { description: error.message });
          }
        } else {
          toast.success('Login realizado com sucesso!');
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este e-mail já está cadastrado. Tente fazer login.');
          } else {
            toast.error('Erro ao criar conta', { description: error.message });
          }
        } else if (data.session) {
          toast.success('Conta criada com sucesso! Entrando...');
        } else {
          toast.success('Conta criada!', {
            description: 'Verifique seu e-mail para confirmar o cadastro ou faça login.',
          });
          setMode('login');
        }
      }
    } catch (err: unknown) {
      toast.error('Erro inesperado na autenticação.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-2xl border shadow-xl text-card-foreground">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
            <Landmark size={26} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Ledger Financeiro</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Entre com sua conta para acessar seus dados' : 'Crie sua conta para começar o controle'}
          </p>
        </div>

        {/* Alternador de Modo: Entrar ou Cadastrar */}
        <div className="grid grid-cols-2 p-1 bg-muted rounded-lg text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`py-1.5 rounded-md transition-all ${
              mode === 'login'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`py-1.5 rounded-md transition-all ${
              mode === 'signup'
                ? 'bg-card text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Criar Conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs">E-mail</Label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="pl-9"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs">Senha</Label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pl-9"
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs">Confirmar Senha</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a senha"
                  className="pl-9"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>
          )}

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading
              ? 'Processando...'
              : mode === 'login'
              ? 'Entrar no Dashboard'
              : 'Criar Minha Conta'}
          </Button>
        </form>
      </div>
    </div>
  );
}