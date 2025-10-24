import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, MessageSquare, Clock } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface ServiceOrderDetail {
  id: string;
  os_number: number;
  category: string;
  status: string;
  priority: string;
  equipment: string;
  description: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  photo_url: string | null;
  responsible_department_id: string | null;
  sector_id: string;
  sectors: { id: string; name: string };
  profiles: { full_name: string };
  service_departments?: { name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Sector {
  id: string;
  name: string;
}

interface Update {
  id: string;
  comment: string;
  created_at: string;
  profiles: { full_name: string };
}

const OSDetail = () => {
  const { id } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderDetail | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newDepartmentId, setNewDepartmentId] = useState('');
  const [newSectorId, setNewSectorId] = useState('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmOriginSectorDialog, setShowConfirmOriginSectorDialog] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else {
      fetchServiceOrder();
      fetchUpdates();
      fetchDepartments();
      fetchSectors();
    }
  }, [profile, id, navigate]);

  const fetchServiceOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select('*, sectors(id, name), profiles!service_orders_requester_id_fkey(full_name), service_departments(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setServiceOrder(data);
      setNewStatus(data.status);
      setNewDepartmentId(data.responsible_department_id || '');
      setNewSectorId(data.sector_id || '');
    } catch (error) {
      console.error('Error fetching service order:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar a O.S.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('service_departments')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSectors(data || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const fetchUpdates = async () => {
    try {
      const { data, error } = await supabase
        .from('os_updates')
        .select('*, profiles(full_name)')
        .eq('service_order_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const { error } = await supabase
        .from('os_updates')
        .insert([
          {
            service_order_id: id,
            user_id: profile?.id,
            comment: newComment,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Atualização adicionada',
        description: 'Seu comentário foi registrado',
      });

      setNewComment('');
      fetchUpdates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async () => {
    if (newStatus === serviceOrder?.status) return;

    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'concluida') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('service_orders')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: newStatus === 'concluida' 
          ? `O.S. #${serviceOrder?.os_number} concluída com sucesso!`
          : 'Status da O.S. atualizado',
      });

      fetchServiceOrder();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateDepartment = async () => {
    if (newDepartmentId === serviceOrder?.responsible_department_id) return;

    try {
      const oldDept = serviceOrder?.service_departments?.name || 'Não definido';
      const newDept = departments.find(d => d.id === newDepartmentId)?.name || 'Não definido';

      const { error } = await supabase
        .from('service_orders')
        .update({ responsible_department_id: newDepartmentId || null })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('os_updates').insert({
        service_order_id: id,
        user_id: profile?.id,
        comment: `Setor Responsável alterado de "${oldDept}" para "${newDept}"`,
      });

      toast({
        title: 'Setor Responsável atualizado',
        description: `Reatribuído para ${newDept}`,
      });

      fetchServiceOrder();
      fetchUpdates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleUpdateOriginSector = async () => {
    if (newSectorId === serviceOrder?.sector_id) return;

    try {
      const oldSector = serviceOrder?.sectors?.name || 'Não definido';
      const newSector = sectors.find(s => s.id === newSectorId)?.name || 'Não definido';

      const { error } = await supabase
        .from('service_orders')
        .update({ sector_id: newSectorId })
        .eq('id', id);

      if (error) throw error;

      // Registrar no histórico
      await supabase.from('os_updates').insert({
        service_order_id: id,
        user_id: profile?.id,
        comment: `Setor de Origem alterado de "${oldSector}" para "${newSector}"`,
      });

      toast({
        title: 'Setor de Origem atualizado',
        description: `O.S. movida para o setor ${newSector}`,
      });

      setShowConfirmOriginSectorDialog(false);
      fetchServiceOrder();
      fetchUpdates();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o setor. Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      aberta: { label: 'Aberta', className: 'bg-red-500 text-white' },
      em_andamento: { label: 'Em andamento', className: 'bg-yellow-500 text-white' },
      concluida: { label: 'Concluída', className: 'bg-green-500 text-white' },
      cancelada: { label: 'Cancelada', className: 'bg-gray-500 text-white' },
    };
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      emergencial: { label: '❗ Emergencial', color: '#E53935' },
      urgente: { label: '⚠️ Urgente', color: '#FFC107' },
      nao_urgente: { label: '🟢 Não Urgente', color: '#00A08A' },
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return (
      <Badge 
        className="text-white" 
        style={{backgroundColor: config?.color}}
        title={`Nível de Solicitação: ${config?.label}`}
      >
        {config?.label}
      </Badge>
    );
  };

  const getCategoryLabel = (category: string) => {
    const categories = {
      eletrica: 'Elétrica',
      hidraulica: 'Hidráulica',
      equipamento_medico: 'Equipamento Médico',
      outros: 'Outros',
    };
    return categories[category as keyof typeof categories] || category;
  };

  if (loading || !serviceOrder) {
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

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2">O.S. #{serviceOrder.os_number}</CardTitle>
                <p className="text-muted-foreground">
                  Aberta em {new Date(serviceOrder.created_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(serviceOrder.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2">
                {getPriorityBadge(serviceOrder.priority)}
                {getStatusBadge(serviceOrder.status)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Categoria</p>
                <p className="font-medium">{getCategoryLabel(serviceOrder.category)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setor de Origem</p>
                <p className="font-medium">{serviceOrder.sectors.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Setor Responsável</p>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  {serviceOrder.service_departments?.name || 'Não definido'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipamento</p>
                <p className="font-medium">{serviceOrder.equipment}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Solicitante</p>
                <p className="font-medium">{serviceOrder.profiles.full_name}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground mb-2">Descrição do problema</p>
              <p className="whitespace-pre-wrap">{serviceOrder.description}</p>
            </div>
            {serviceOrder.photo_url && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Foto anexada</p>
                  <img 
                    src={serviceOrder.photo_url} 
                    alt="Foto da O.S."
                    className="max-w-full max-h-96 rounded-lg border shadow-sm cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(serviceOrder.photo_url!, '_blank')}
                  />
                </div>
              </>
            )}
            {serviceOrder.completed_at && (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm">
                  Concluída em {new Date(serviceOrder.completed_at).toLocaleDateString('pt-BR')} às{' '}
                  {new Date(serviceOrder.completed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Histórico de Atualizações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {updates.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma atualização ainda</p>
            ) : (
              updates.map((update) => (
                <div key={update.id} className="border-l-2 border-primary pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{update.profiles.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(update.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(update.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{update.comment}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Adicionar Atualização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Adicione um comentário sobre o andamento..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-24"
            />
            <Button onClick={handleAddComment} disabled={!newComment.trim()}>
              Adicionar Comentário
            </Button>
          </CardContent>
        </Card>

        {/* UX only - actual access controlled by RLS policies */}
        {(profile?.role === 'tecnico' || profile?.role === 'coordenacao') && (
          <Card>
            <CardHeader>
              <CardTitle>Atualizar Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleUpdateStatus} disabled={newStatus === serviceOrder.status} className="w-full">
                {newStatus === 'concluida' ? 'Marcar como Concluída' : 'Atualizar Status'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* UX only - actual access controlled by RLS policies */}
        {profile?.role === 'coordenacao' && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Reatribuir Setor Responsável</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={newDepartmentId} onValueChange={setNewDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor responsável" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={handleUpdateDepartment} 
                disabled={newDepartmentId === serviceOrder.responsible_department_id} 
                className="w-full"
              >
                Reatribuir Setor
              </Button>
            </CardContent>
          </Card>
        )}

        {/* UX only - actual access controlled by RLS policies */}
        {profile?.role === 'coordenacao' && (
          <Card>
            <CardHeader>
              <CardTitle>Atualizar Setor de Origem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={newSectorId} 
                onValueChange={setNewSectorId}
                disabled={serviceOrder.status === 'concluida' || serviceOrder.status === 'cancelada'}
              >
                <SelectTrigger aria-label="Novo setor de origem">
                  <SelectValue placeholder="Selecione o novo setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((sector) => (
                    <SelectItem key={sector.id} value={sector.id}>
                      {sector.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowConfirmOriginSectorDialog(true)}
                disabled={
                  newSectorId === serviceOrder.sector_id || 
                  serviceOrder.status === 'concluida' || 
                  serviceOrder.status === 'cancelada'
                }
                className="w-full"
                aria-label="Atualizar Setor"
                title={
                  serviceOrder.status === 'concluida' || serviceOrder.status === 'cancelada' 
                    ? 'Para alterar após conclusão, reabra a O.S.' 
                    : undefined
                }
              >
                Atualizar Setor
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                <a href="/admin" className="hover:underline">Gerenciar setores</a>
              </p>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={showConfirmOriginSectorDialog} onOpenChange={setShowConfirmOriginSectorDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alteração do setor de origem</AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Esta mudança altera onde a O.S. será contabilizada e listada.</p>
                <div className="bg-muted p-3 rounded-md mt-3">
                  <p className="text-sm">
                    <strong>De:</strong> {serviceOrder?.sectors?.name || 'Não definido'}
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Para:</strong> {sectors.find(s => s.id === newSectorId)?.name || 'Não definido'}
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleUpdateOriginSector}>Confirmar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default OSDetail;