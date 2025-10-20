import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Search, Camera } from 'lucide-react';

interface ServiceOrder {
  id: string;
  os_number: number;
  category: string;
  status: string;
  priority: string;
  equipment: string;
  created_at: string;
  photo_url: string | null;
  responsible_department_id: string | null;
  sectors: { name: string };
  profiles: { full_name: string };
  service_departments?: { name: string } | null;
}

const OSList = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [prioritySort, setPrioritySort] = useState('none');

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else {
      fetchServiceOrders();
    }
  }, [profile, navigate]);

  useEffect(() => {
    filterOrders();
  }, [serviceOrders, statusFilter, searchTerm, prioritySort]);

  const fetchServiceOrders = async () => {
    try {
      let query = supabase
        .from('service_orders')
        .select('*, sectors(name), profiles!service_orders_requester_id_fkey(full_name), photo_url, service_departments(name)')
        .order('created_at', { ascending: false });

      // Filtrar baseado no role
      if (profile?.role === 'solicitante') {
        query = query.eq('requester_id', profile.id);
      } else if (profile?.role === 'tecnico') {
        // RLS já filtra (atribuídas OU do setor), mas podemos deixar explícito
        // Técnico vê O.S. onde technician_id = seu_id OU sector_id = seu_setor
      }
      // Coordenação vê todas (sem filtro adicional)

      const { data, error } = await query;

      if (error) throw error;
      setServiceOrders(data || []);
    } catch (error) {
      console.error('Error fetching service orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...serviceOrders];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((os) => os.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter((os) =>
        os.os_number.toString().includes(searchTerm) ||
        os.equipment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        os.sectors.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar por prioridade
    if (prioritySort === 'high-to-low') {
      const priorityOrder = { critica: 0, alta: 1, media: 2, baixa: 3 };
      filtered.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
        return aPriority - bPriority;
      });
    } else if (prioritySort === 'low-to-high') {
      const priorityOrder = { baixa: 0, media: 1, alta: 2, critica: 3 };
      filtered.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
        return aPriority - bPriority;
      });
    }

    setFilteredOrders(filtered);
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
      critica: { label: 'Crítica', className: 'bg-red-500 text-white' },
      alta: { label: 'Alta', className: 'bg-orange-500 text-white' },
      media: { label: 'Média', className: 'bg-yellow-500 text-white' },
      baixa: { label: 'Baixa', className: 'bg-blue-500 text-white' },
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig];
    return <Badge className={config?.className}>{config?.label}</Badge>;
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
        <h1 className="text-3xl font-bold mb-6">Todas as Ordens de Serviço</h1>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, equipamento ou setor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluida">Concluída</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioritySort} onValueChange={setPrioritySort}>
            <SelectTrigger>
              <SelectValue placeholder="Ordenar por prioridade" />
            </SelectTrigger>
            <SelectContent className="bg-card z-50">
              <SelectItem value="none">Sem ordenação</SelectItem>
              <SelectItem value="high-to-low">Crítica → Baixa</SelectItem>
              <SelectItem value="low-to-high">Baixa → Crítica</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-lg text-muted-foreground">
                Nenhuma ordem de serviço encontrada
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((os) => (
              <Card
                key={os.id}
                className="cursor-pointer hover:shadow-lg transition-all"
                onClick={() => navigate(`/os/${os.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold">O.S. #{os.os_number}</h3>
                        {getStatusBadge(os.status)}
                        {getPriorityBadge(os.priority)}
                        {os.photo_url && (
                          <Badge variant="outline" className="gap-1 text-xs">
                            <Camera className="h-3 w-3" />
                          </Badge>
                        )}
                      </div>
                      <div className="grid gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Setor Origem: </span>
                          <span className="font-medium">{os.sectors.name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Responsável: </span>
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {os.service_departments?.name || 'Não definido'}
                          </Badge>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Categoria: </span>
                          <span className="font-medium">{getCategoryLabel(os.category)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Equipamento: </span>
                          <span className="font-medium">{os.equipment}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Solicitante: </span>
                          <span className="font-medium">{os.profiles.full_name}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Aberta em {new Date(os.created_at).toLocaleDateString('pt-BR')} às{' '}
                      {new Date(os.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OSList;