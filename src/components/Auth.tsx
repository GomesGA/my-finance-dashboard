import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Conta criada! Você já pode fazer login.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl border shadow-lg text-card-foreground">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Ledger Financeiro</h1>
          <p className="text-muted-foreground">Faça login para acessar seus dados</p>
        </div>
        
        <form className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <div className="flex gap-4 pt-4">
            <Button className="w-full" onClick={handleLogin} disabled={loading}>
              {loading ? 'Carregando...' : 'Entrar'}
            </Button>
            <Button variant="outline" className="w-full" onClick={handleSignUp} disabled={loading}>
              Criar Conta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}