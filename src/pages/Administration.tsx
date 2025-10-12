import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';

const Administration = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSector, setNewSector] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else if (profile.role !== 'coordenacao') {
      navigate('/dashboard');
      toast({
        title: 'Acesso negado',
        description: 'Apenas coordenação pode acessar esta página',
        variant: 'destructive',
      });
    } else {
      fetchData();
    }
  }, [profile, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, sectorsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            user_roles!inner(role)
          `)
          .order('full_name'),
        supabase.from('sectors').select('*').order('name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (sectorsRes.error) throw sectorsRes.error;

      // Mapear os dados para extrair o role correto de user_roles
      const usersWithRoles = (usersRes.data || []).map((user: any) => ({
        ...user,
        role: user.user_roles?.[0]?.role || user.role
      }));

      setUsers(usersWithRoles);
      setSectors(sectorsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSector = async () => {
    if (!newSector.trim()) return;

    try {
      const { error } = await supabase.from('sectors').insert([{ name: newSector }]);

      if (error) throw error;

      toast({
        title: 'Setor criado',
        description: `Setor "${newSector}" foi criado com sucesso`,
      });

      setNewSector('');
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSector = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir o setor "${name}"?`)) return;

    try {
      const { error } = await supabase.from('sectors').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Setor excluído',
        description: `Setor "${name}" foi excluído`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      // 1. Atualizar a tabela profiles (para compatibilidade visual)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (profileError) throw profileError;

      // 2. Deletar o role antigo da tabela user_roles
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // 3. Inserir o novo role na tabela user_roles
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role: newRole as any }]);

      if (insertError) throw insertError;

      toast({
        title: 'Perfil atualizado',
        description: 'O perfil do usuário foi atualizado com sucesso',
      });

      fetchData();
    } catch (error: any) {
      console.error('Erro ao atualizar role:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar perfil',
        variant: 'destructive',
      });
    }
  };

  const getRoleBadge = (role: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      coordenacao: { label: 'Coordenação', variant: 'destructive' },
      tecnico: { label: 'Técnico', variant: 'default' },
      solicitante: { label: 'Solicitante', variant: 'secondary' },
    };
    const c = config[role] || { label: role, variant: 'outline' };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

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

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Administração</h1>

        <Tabs defaultValue="users">
          <TabsList className="mb-6">
            <TabsTrigger value="users">Usuários & Perfis</TabsTrigger>
            <TabsTrigger value="params">Parâmetros do Sistema</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Usuários</CardTitle>
                  <Button className="gap-2" disabled>
                    <UserPlus className="h-4 w-4" />
                    Novo Usuário (em breve)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Select
                              value={user.role}
                              onValueChange={(value) => handleUpdateUserRole(user.id, value)}
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="solicitante">Solicitante</SelectItem>
                                <SelectItem value="tecnico">Técnico</SelectItem>
                                <SelectItem value="coordenacao">Coordenação</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold mb-2">Níveis de Acesso</h3>
                  <ul className="space-y-2 text-sm">
                    <li>
                      <strong>Coordenação:</strong> Acesso completo - gerencia usuários, atribui técnicos, acessa dashboards e administração
                    </li>
                    <li>
                      <strong>Técnico:</strong> Vê apenas O.S. atribuídas a ele OU do seu setor, atualiza status e conclui. SEM acesso a dashboards ou administração
                    </li>
                    <li>
                      <strong>Solicitante:</strong> Cria O.S., acompanha apenas suas próprias solicitações
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="params">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Setores / Unidades</CardTitle>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Novo Setor
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Setor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="sectorName">Nome do Setor</Label>
                            <Input
                              id="sectorName"
                              value={newSector}
                              onChange={(e) => setNewSector(e.target.value)}
                              placeholder="Ex: Ala Norte"
                            />
                          </div>
                          <Button onClick={handleAddSector} className="w-full">
                            Criar Setor
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map((sector) => (
                        <TableRow key={sector.id}>
                          <TableCell className="font-medium">{sector.name}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSector(sector.id, sector.name)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categorias, Prioridades e Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Prioridades</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-red-500 text-white">Crítica (4h)</Badge>
                        <Badge className="bg-orange-500 text-white">Alta (8h)</Badge>
                        <Badge className="bg-yellow-500 text-white">Média (24h)</Badge>
                        <Badge className="bg-blue-500 text-white">Baixa (72h)</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Status</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="destructive">Aberta</Badge>
                        <Badge className="bg-yellow-500">Em andamento</Badge>
                        <Badge className="bg-purple-500">Aguardando Peça</Badge>
                        <Badge className="bg-green-500">Concluída</Badge>
                        <Badge variant="outline">Cancelada</Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Tipos de Manutenção</h4>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="default">Corretiva</Badge>
                        <Badge variant="secondary">Preventiva</Badge>
                        <Badge variant="outline">Instalação</Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Administration;
