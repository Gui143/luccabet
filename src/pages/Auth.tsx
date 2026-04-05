import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Shield, Headphones, Zap, Trophy } from 'lucide-react';
import brazucaLogo from '@/assets/brazucabet-logo.png';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      const success = await login(email, password);
      if (success) navigate('/');
    } else {
      if (!username || username.length < 3) {
        toast.error('O nome de usuário deve ter pelo menos 3 caracteres');
        return;
      }
      const success = await signup(email, password, username);
      if (success) navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-4xl mx-4 grid md:grid-cols-2 rounded-2xl overflow-hidden border border-border shadow-2xl shadow-black/50">
        {/* Left - Branding Panel */}
        <div className="hidden md:flex flex-col justify-center p-10 bg-gradient-to-b from-red-600 via-red-700 to-red-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAgMEwyMCA0ME0wIDIwTDQwIDIwIiBzdHJva2U9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-30" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-8">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-lg font-extrabold text-primary-foreground">BB</span>
              </div>
              <span className="text-2xl font-extrabold text-white">BrazucaBet</span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Somos confiáveis!</h2>

            <div className="space-y-5 mt-6">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Jogo justo!</p>
                  <p className="text-white/70 text-xs">Plataforma segura e transparente</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Headphones className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Suporte 24/7</p>
                  <p className="text-white/70 text-xs">Solução rápida para qualquer questão</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Pagamentos rápidos</p>
                  <p className="text-white/70 text-xs">Depósitos e saques via PIX</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-yellow-300 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-white text-sm">Torneios</p>
                  <p className="text-white/70 text-xs">E outros eventos exclusivos</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Form Panel */}
        <div className="bg-card p-6 sm:p-8 md:p-10">
          <h2 className="text-xl font-bold mb-6">
            {isLogin ? 'Fazer login' : 'Criar conta'}
          </h2>

          {/* Tab toggle for login */}
          {isLogin && (
            <div className="flex rounded-lg border border-border overflow-hidden mb-6">
              <button className="flex-1 py-2.5 text-sm font-medium bg-secondary text-foreground">
                Por e-mail
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm text-muted-foreground">Nome de Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Seu nome de usuário"
                  className="bg-input border-border h-11"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm text-muted-foreground">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Seu e-mail"
                className="bg-input border-border h-11"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm text-muted-foreground">Senha</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Sua senha"
                  minLength={6}
                  className="bg-input border-border h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {isLogin && (
              <button type="button" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                Esqueci minha senha
              </button>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-bold text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
            >
              {isLogin ? 'Entrar' : 'Próximo passo'}
            </Button>

            <div className="text-center pt-2">
              <span className="text-sm text-muted-foreground">
                {isLogin ? 'Ainda não está registrado? ' : 'Eu tenho uma conta '}
              </span>
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                {isLogin ? 'Cadastre-se' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
