import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, LogOut, User, Mail, Shield, Phone, Edit, Lock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ProfileEditForm } from '@/components/ProfileEditForm';
import { PasswordChangeForm } from '@/components/PasswordChangeForm';
import { supabase } from '@/integrations/supabase/client';

const Profile = () => {
  const { profile: authProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [profile, setProfile] = useState(authProfile);

  // Atualizar perfil quando authProfile mudar
  useEffect(() => {
    setProfile(authProfile);
  }, [authProfile]);

  // Recarregar perfil após edição
  const handleProfileUpdate = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authProfile?.id)
      .single();
    
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', authProfile?.id)
      .maybeSingle();
    
    if (profileData) {
      setProfile({
        ...profileData,
        role: (roleData?.role || 'solicitante') as 'solicitante' | 'tecnico' | 'coordenacao'
      });
    }
    setIsEditing(false);
  };

  const getRoleBadge = (role?: string) => {
    const roleConfig = {
      solicitante: { label: 'Solicitante', variant: 'default' as const },
      tecnico: { label: 'Técnico de Manutenção', variant: 'secondary' as const },
      coordenacao: { label: 'Coordenação', variant: 'destructive' as const },
    };
    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.solicitante;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <header className="bg-card border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">Perfil e Configurações</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações do Usuário
              </div>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-2"
                >
                  <Edit className="h-4 w-4" />
                  Editar Perfil
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isEditing ? (
              <ProfileEditForm
                profile={profile!}
                onSuccess={handleProfileUpdate}
                onCancel={() => setIsEditing(false)}
              />
            ) : (
              <>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={profile?.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile?.full_name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{profile?.full_name}</h3>
                    <p className="text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {profile?.email}
                    </p>
                    {profile?.phone && (
                      <p className="text-muted-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {profile.phone}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Cargo:</span>
                  </div>
                  {getRoleBadge(profile?.role)}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Segurança</CardTitle>
            <CardDescription>
              Gerencie sua senha e segurança da conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  <Lock className="h-4 w-4" />
                  Alterar Senha
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alterar Senha</DialogTitle>
                </DialogHeader>
                <PasswordChangeForm
                  onSuccess={() => setIsPasswordDialogOpen(false)}
                  onCancel={() => setIsPasswordDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>
              Configure suas preferências do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Notificações</Label>
                <p className="text-sm text-muted-foreground">
                  Receber alertas sobre atualizações de O.S.
                </p>
              </div>
              <Switch
                id="notifications"
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Modo Noturno</Label>
                <p className="text-sm text-muted-foreground">
                  Alternar tema escuro/claro
                </p>
              </div>
              <Switch
                id="dark-mode"
                checked={darkMode}
                onCheckedChange={setDarkMode}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={signOut}
              className="w-full gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;