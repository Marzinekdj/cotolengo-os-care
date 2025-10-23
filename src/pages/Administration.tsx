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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Plus, Pencil, Trash2, UserPlus } from 'lucide-react';

const Administration = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [sectors, setSectors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSector, setNewSector] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSector, setEditingSector] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [newDepartment, setNewDepartment] = useState({ name: '', description: '' });
  const [deptDialogOpen, setDeptDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<any>(null);
  const [editDeptDialogOpen, setEditDeptDialogOpen] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    // UX only - actual access controlled by RLS policies
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
      const [usersRes, sectorsRes, deptsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            *,
            user_roles!inner(role)
          `)
          .order('full_name'),
        supabase.from('sectors').select('*').order('name'),
        supabase.from('service_departments').select('*').order('name'),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (sectorsRes.error) throw sectorsRes.error;
      if (deptsRes.error) throw deptsRes.error;

      // Mapear os dados para extrair o role correto de user_roles
      const usersWithRoles = (usersRes.data || []).map((user: any) => ({
        ...user,
        role: user.user_roles?.[0]?.role || user.role
      }));

      setUsers(usersWithRoles);
      setSectors(sectorsRes.data || []);
      setDepartments(deptsRes.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSector = async () => {
    if (!newSector.trim()) return;

    try {
      const { error } = await supabase.from('sectors').insert([{ 
        name: newSector,
        created_by: profile?.id,
        is_active: true 
      }]);

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

  const handleUpdateSector = async () => {
    if (!editingSector || !editingSector.name.trim()) return;

    try {
      const { error } = await supabase
        .from('sectors')
        .update({ 
          name: editingSector.name,
          is_active: editingSector.is_active
        })
        .eq('id', editingSector.id);

      if (error) throw error;

      toast({
        title: 'Setor atualizado',
        description: `Setor foi atualizado com sucesso`,
      });

      setEditingSector(null);
      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleSectorStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('sectors')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Setor desativado' : 'Setor ativado',
        description: currentStatus ? 'O setor não aparecerá mais nas novas O.S.' : 'O setor voltará a aparecer nas novas O.S.',
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

  const handleAddDepartment = async () => {
    if (!newDepartment.name.trim()) return;

    try {
      const { error } = await supabase.from('service_departments').insert([{
        name: newDepartment.name,
        description: newDepartment.description || null,
        created_by: profile?.id,
        is_active: true,
      }]);

      if (error) throw error;

      toast({
        title: 'Setor responsável criado',
        description: `"${newDepartment.name}" foi criado com sucesso`,
      });

      setNewDepartment({ name: '', description: '' });
      setDeptDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateDepartment = async () => {
    if (!editingDepartment || !editingDepartment.name.trim()) return;

    try {
      const { error } = await supabase
        .from('service_departments')
        .update({
          name: editingDepartment.name,
          description: editingDepartment.description || null,
          is_active: editingDepartment.is_active,
        })
        .eq('id', editingDepartment.id);

      if (error) throw error;

      toast({
        title: 'Setor responsável atualizado',
        description: 'Atualizado com sucesso',
      });

      setEditingDepartment(null);
      setEditDeptDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleDepartmentStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('service_departments')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentStatus ? 'Setor desativado' : 'Setor ativado',
        description: currentStatus
          ? 'Não aparecerá mais em novas O.S.'
          : 'Voltará a aparecer em novas O.S.',
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

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja excluir "${name}"?`)) return;

    try {
      const { error } = await supabase.from('service_departments').delete().eq('id', id);

      if (error) throw error;

      toast({
        title: 'Setor responsável excluído',
        description: `"${name}" foi excluído`,
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Perfil</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.avatar_url ? `${user.avatar_url}?t=${Date.now()}` : undefined} alt={user.full_name} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {user.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{user.full_name}</span>
                          </div>
                        </TableCell>
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
                    <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Setor</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="editSectorName">Nome do Setor</Label>
                            <Input
                              id="editSectorName"
                              value={editingSector?.name || ''}
                              onChange={(e) => setEditingSector({ ...editingSector, name: e.target.value })}
                              placeholder="Ex: Ala Norte"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="editSectorActive"
                              checked={editingSector?.is_active || false}
                              onCheckedChange={(checked) => setEditingSector({ ...editingSector, is_active: checked })}
                            />
                            <Label htmlFor="editSectorActive">Setor ativo</Label>
                          </div>
                          <Button onClick={handleUpdateSector} className="w-full">
                            Salvar Alterações
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
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectors.map((sector) => (
                        <TableRow key={sector.id}>
                          <TableCell className="font-medium">{sector.name}</TableCell>
                          <TableCell>
                            <Badge variant={sector.is_active ? 'default' : 'secondary'}>
                              {sector.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingSector(sector);
                                  setEditDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleSectorStatus(sector.id, sector.is_active)}
                              >
                                {sector.is_active ? '🔴' : '🟢'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteSector(sector.id, sector.name)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Setores Responsáveis</CardTitle>
                    <Dialog open={deptDialogOpen} onOpenChange={setDeptDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2">
                          <Plus className="h-4 w-4" />
                          Novo Setor Responsável
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Criar Novo Setor Responsável</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="deptName">Nome</Label>
                            <Input
                              id="deptName"
                              value={newDepartment.name}
                              onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                              placeholder="Ex: Engenharia Clínica"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deptDesc">Descrição (opcional)</Label>
                            <Input
                              id="deptDesc"
                              value={newDepartment.description}
                              onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                              placeholder="Ex: Responsável por equipamentos médicos"
                            />
                          </div>
                          <Button onClick={handleAddDepartment} className="w-full">
                            Criar Setor Responsável
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={editDeptDialogOpen} onOpenChange={setEditDeptDialogOpen}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Editar Setor Responsável</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="editDeptName">Nome</Label>
                            <Input
                              id="editDeptName"
                              value={editingDepartment?.name || ''}
                              onChange={(e) => setEditingDepartment({ ...editingDepartment, name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editDeptDesc">Descrição</Label>
                            <Input
                              id="editDeptDesc"
                              value={editingDepartment?.description || ''}
                              onChange={(e) => setEditingDepartment({ ...editingDepartment, description: e.target.value })}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="editDeptActive"
                              checked={editingDepartment?.is_active || false}
                              onCheckedChange={(checked) => setEditingDepartment({ ...editingDepartment, is_active: checked })}
                            />
                            <Label htmlFor="editDeptActive">Ativo</Label>
                          </div>
                          <Button onClick={handleUpdateDepartment} className="w-full">
                            Salvar Alterações
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
                        <TableHead>Descrição</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id}>
                          <TableCell className="font-medium">{dept.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{dept.description || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={dept.is_active ? 'default' : 'secondary'}>
                              {dept.is_active ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingDepartment(dept);
                                  setEditDeptDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleDepartmentStatus(dept.id, dept.is_active)}
                              >
                                {dept.is_active ? '🔴' : '🟢'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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
