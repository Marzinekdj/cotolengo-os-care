import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Play, ExternalLink } from 'lucide-react';
import logoCotolengo from '@/assets/logo-cotolengo.png';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tutorialUrlSolicitante = "https://www.youtube.com/watch?v=SEU_VIDEO";
  const videoId = tutorialUrlSolicitante.split("v=")[1]?.split("&")[0];

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: 'Erro ao fazer login',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Redirecionando...',
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!fullName.trim()) {
      toast({
        title: 'Nome completo obrigatório',
        description: 'Por favor, informe seu nome completo',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error.message === 'User already registered'
          ? 'Este email já está cadastrado'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode fazer login',
      });
      setEmail('');
      setPassword('');
      setFullName('');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img src={logoCotolengo} alt="Pequeno Cotolengo" className="h-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Controle de O.S.</CardTitle>
            <CardDescription className="mt-2">
              Bem-vindo ao Sistema de Ordens de Serviço
            </CardDescription>
          </div>
          
          {/* Faixa de ajuda com vídeo */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Play className="h-5 w-5 text-primary flex-shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">Precisa de ajuda para usar o App?</p>
                  <p className="text-xs text-muted-foreground hidden sm:block">Vídeo rápido</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVideoModalOpen(true)}
                aria-label="Assistir vídeo de ajuda para solicitante"
                className="flex-shrink-0"
              >
                Assistir
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-login">E-mail</Label>
                  <Input
                    id="email-login"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-login">Senha</Label>
                  <Input
                    id="password-login"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="text-right">
                    <Link 
                      to="/auth/forgot" 
                      className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                      aria-label="Recuperar senha"
                    >
                      Esqueceu sua senha?
                    </Link>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Nome Completo *</Label>
                  <Input
                    id="fullname"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-signup">E-mail *</Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup">Senha *</Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Criando conta...' : 'Criar conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modal de vídeo tutorial */}
      <Dialog open={isVideoModalOpen} onOpenChange={setIsVideoModalOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Como usar o app (Solicitante)</DialogTitle>
            <DialogDescription>
              Aprenda em poucos passos como abrir uma O.S., anexar foto, acompanhar o status e receber notificações.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {!videoError ? (
              <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                <iframe
                  className="absolute top-0 left-0 w-full h-full rounded-lg"
                  src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
                  title="Tutorial do Aplicativo"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  onError={() => setVideoError(true)}
                />
              </div>
            ) : (
              <div className="p-8 bg-muted rounded-lg text-center space-y-4">
                <p className="text-muted-foreground">
                  Não foi possível carregar o vídeo agora.
                </p>
                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => setVideoError(false)}
                  >
                    Tentar novamente
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => window.open(tutorialUrlSolicitante, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir no YouTube
                  </Button>
                </div>
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                onClick={() => window.open(tutorialUrlSolicitante, '_blank')}
                className="text-sm"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir no YouTube
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;