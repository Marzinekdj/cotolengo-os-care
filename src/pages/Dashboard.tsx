import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Home, Settings, Bell, FileText, LogOut, Wrench, BarChart3, Camera } from 'lucide-react';
import logoCotolengo from '@/assets/logo-cotolengo.png';

interface ServiceOrder {
  id: string;
  os_number: number;
  category: string;
  status: string;
  priority: string;
  equipment: string;
  created_at: string;
  photo_url: string | null;
  sectors: { name: string };
}

const Dashboard = () => {
  const { profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    if (!authLoading && !profile) {
      navigate('/auth');
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    if (profile) {
      fetchServiceOrders();
      fetchUnreadNotifications();
    }
  }, [profile]);

  const fetchServiceOrders = async () => {
    try {
      let query = supabase
        .from('service_orders')
        .select('*, sectors(name), photo_url')
        .order('created_at', { ascending: false })
        .limit(10);

      // UX only - actual access controlled by RLS policies
      // Filtrar baseado no role (RLS já filtra, mas deixamos explícito)
      if (profile?.role === 'solicitante') {
        query = query.eq('requester_id', profile.id);
      } else if (profile?.role === 'tecnico') {
        // Técnico vê O.S. atribuídas a ele OU do setor dele
        // RLS já faz isso, mas podemos deixar explícito aqui se necessário
      }

      const { data, error } = await query;

      if (error) throw error;
      setServiceOrders(data || []);
    } catch (error) {
      console.error('Error fetching service orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadNotifications = async () => {
    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', profile?.id)
        .eq('is_read', false);

      setUnreadNotifications(count || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
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

  if (authLoading || !profile) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center">
        <Skeleton className="h-96 w-96" />
      </div>
    );
  }

  const roleConfig = {
    solicitante: {
      title: 'Minhas Ordens de Serviço',
      description: 'Acompanhe suas solicitações',
      icon: Home,
    },
    tecnico: {
      title: 'Ordens de Serviço Atribuídas',
      description: 'Serviços sob sua responsabilidade',
      icon: Wrench,
    },
    coordenacao: {
      title: 'Painel de Manutenção',
      description: 'Visão geral do sistema',
      icon: BarChart3,
    },
  };

  const config = roleConfig[profile.role || 'solicitante'];
  const RoleIcon = config.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      {/* Header */}
      <header className="bg-card border-b sticky top-0 z-10 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={logoCotolengo} alt="Pequeno Cotolengo" className="h-12 object-contain" />
              <div>
                <h1 className="text-xl font-bold text-foreground">Controle de O.S.</h1>
                <p className="text-sm text-muted-foreground">{profile.full_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => navigate('/notifications')}
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadNotifications}
                  </span>
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RoleIcon className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-2xl font-bold">{config.title}</h2>
              <p className="text-muted-foreground">{config.description}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/new-os')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nova O.S.
            </Button>
            {/* UX only - actual access controlled by RLS policies */}
            {profile.role === 'coordenacao' && (
              <Button variant="outline" onClick={() => navigate('/reports')} className="gap-2">
                <FileText className="h-4 w-4" />
                Relatórios
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : serviceOrders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground">
                Nenhuma ordem de serviço encontrada
              </p>
              <Button onClick={() => navigate('/new-os')} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira O.S.
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceOrders.map((os) => (
              <Card
                key={os.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/os/${os.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">O.S. #{os.os_number}</CardTitle>
                    {getPriorityBadge(os.priority)}
                  </div>
                  <CardDescription>{os.sectors.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(os.status)}
                      {os.photo_url && (
                        <Badge variant="outline" className="gap-1 text-xs">
                          <Camera className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Categoria: </span>
                    <span className="text-sm font-medium">{getCategoryLabel(os.category)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Equipamento: </span>
                    <span className="text-sm font-medium">{os.equipment}</span>
                  </div>
                  <div className="text-xs text-muted-foreground pt-2">
                    Aberta em {new Date(os.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-3 md:grid-cols-2 max-w-2xl mx-auto">
          <Button onClick={() => navigate('/os-list')} className="w-full gap-2">
            <FileText className="h-5 w-5" />
            Ver Todas as O.S.
          </Button>
          <Button onClick={() => navigate('/new-os')} className="w-full gap-2" variant="default">
            <Plus className="h-5 w-5" />
            Nova O.S.
          </Button>
          {/* UX only - actual access controlled by RLS policies */}
          {profile?.role === 'coordenacao' && (
            <Button onClick={() => navigate('/analytics')} className="w-full gap-2" variant="outline">
              📊 Dashboards
            </Button>
          )}
          {/* UX only - actual access controlled by RLS policies */}
          {profile?.role === 'coordenacao' && (
            <Button onClick={() => navigate('/admin')} className="w-full gap-2" variant="outline">
              ⚙️ Administração
            </Button>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;