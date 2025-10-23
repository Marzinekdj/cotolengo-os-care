import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import logoCotolengo from '@/assets/logo-cotolengo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (countdown > 0) {
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/auth/reset`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        toast({
          title: 'Erro ao processar solicitação',
          description: 'Não foi possível concluir. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        setSubmitted(true);
        setCountdown(60);
        
        const timer = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível concluir. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img src={logoCotolengo} alt="Pequeno Cotolengo" className="h-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">Recuperar acesso</CardTitle>
            <CardDescription className="mt-2">
              {submitted 
                ? 'Verifique seu e-mail' 
                : 'Informe o e-mail cadastrado para receber um link de redefinição'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-secondary" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Se existir uma conta com o e-mail <strong>{email}</strong>, enviaremos instruções para redefinir sua senha.
                </p>
                <p className="text-xs text-muted-foreground">
                  Verifique sua caixa de entrada e spam.
                </p>
              </div>
              {countdown > 0 && (
                <p className="text-sm text-muted-foreground">
                  Aguarde {countdown}s para reenviar
                </p>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setSubmitted(false)}
                disabled={countdown > 0}
                aria-label="Solicitar novo link de redefinição"
              >
                Reenviar link
              </Button>
              <Link to="/auth">
                <Button variant="ghost" className="w-full" aria-label="Voltar para o login">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  aria-label="Digite seu e-mail cadastrado"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || countdown > 0}
                aria-label="Enviar link de redefinição"
              >
                {isLoading ? 'Enviando...' : 'Enviar link'}
              </Button>

              <Link to="/auth">
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full"
                  aria-label="Voltar para o login"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar ao login
                </Button>
              </Link>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForgotPassword;