import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import logoCotolengo from '@/assets/logo-cotolengo.png';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z
    .string()
    .min(8, 'A senha deve ter no mínimo 8 caracteres')
    .regex(/[a-zA-Z]/, 'A senha deve conter pelo menos uma letra')
    .regex(/[0-9]/, 'A senha deve conter pelo menos um número'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Verificar se há um token de recuperação válido
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      } else {
        setValidToken(false);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Validar senhas
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { password?: string; confirmPassword?: string } = {};
        error.errors.forEach((err) => {
          if (err.path[0] === 'password') {
            newErrors.password = err.message;
          } else if (err.path[0] === 'confirmPassword') {
            newErrors.confirmPassword = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        toast({
          title: 'Erro ao redefinir senha',
          description: 'Não foi possível concluir. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        setSuccess(true);
        toast({
          title: 'Senha alterada com sucesso!',
          description: 'Você já pode entrar com sua nova senha.',
        });
        
        // Redirecionar para login após 3 segundos
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
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

  if (validToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground">Verificando...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="space-y-4 text-center pb-6">
            <div className="flex justify-center">
              <img src={logoCotolengo} alt="Pequeno Cotolengo" className="h-24 object-contain" />
            </div>
            <div>
              <CardTitle className="text-2xl">Link inválido</CardTitle>
              <CardDescription className="mt-2">
                O link de redefinição é inválido ou expirou
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <AlertCircle className="h-16 w-16 text-destructive" />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Links de redefinição expiram em 60 minutos. Solicite um novo link para continuar.
            </p>
            <Button
              className="w-full"
              onClick={() => navigate('/auth/forgot')}
              aria-label="Solicitar novo link"
            >
              Reenviar link
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/auth')}
              aria-label="Voltar ao login"
            >
              Voltar ao login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-accent/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <img src={logoCotolengo} alt="Pequeno Cotolengo" className="h-24 object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl">
              {success ? 'Senha redefinida!' : 'Definir nova senha'}
            </CardTitle>
            <CardDescription className="mt-2">
              {success 
                ? 'Você já pode entrar com sua nova senha' 
                : 'Escolha uma senha forte para sua conta'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6 text-center">
              <div className="flex justify-center">
                <CheckCircle2 className="h-16 w-16 text-secondary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Redirecionando para o login...
              </p>
              <Button
                className="w-full"
                onClick={() => navigate('/auth')}
                aria-label="Ir para o login"
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  aria-label="Digite sua nova senha"
                  aria-describedby="password-requirements"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  aria-label="Confirme sua nova senha"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-destructive">{errors.confirmPassword}</p>
                )}
              </div>

              <div id="password-requirements" className="text-xs text-muted-foreground space-y-1 bg-muted/50 p-3 rounded-md">
                <p className="font-medium">Requisitos da senha:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Mínimo 8 caracteres</li>
                  <li>Pelo menos uma letra</li>
                  <li>Pelo menos um número</li>
                </ul>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
                aria-label="Definir nova senha"
              >
                {isLoading ? 'Salvando...' : 'Definir nova senha'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;