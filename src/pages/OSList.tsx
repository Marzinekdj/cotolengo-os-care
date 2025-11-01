import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowLeft, Search, Camera, ChevronDown, Building2 } from 'lucide-react';
import { toast } from 'sonner';

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
  profiles: { full_name: string } | null;
  service_departments?: { name: string } | null;
}

interface Sector {
  id: string;
  name: string;
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
  
  // Setor de origem
  const [showSectorGate, setShowSectorGate] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [selectedSectorName, setSelectedSectorName] = useState<string>('');
  const [tempSectorId, setTempSectorId] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else {
      checkAdminAndLoadSectors();
    }
  }, [profile, navigate]);

  useEffect(() => {
    if (selectedSectorId !== null) {
      fetchServiceOrders();
    }
  }, [selectedSectorId]);

  const checkAdminAndLoadSectors = async () => {
    if (!profile) return;

    // Verificar se é admin/coordenação
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', profile.id)
      .single();

    const adminRole = roleData?.role === 'coordenacao';
    setIsAdmin(adminRole);

    // Carregar setores
    await loadSectors();

    // Verificar localStorage
    const storedSectorId = localStorage.getItem('currentOriginSectorId');
    const storedSectorName = localStorage.getItem('currentOriginSectorName');

    if (storedSectorId && storedSectorName) {
      setSelectedSectorId(storedSectorId);
      setSelectedSectorName(storedSectorName);
    } else {
      // Abrir gate
      setShowSectorGate(true);
    }
  };

  const loadSectors = async () => {
    try {
      const { data, error } = await supabase
        .from('sectors')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setSectors(data || []);
    } catch (error) {
      console.error('Erro ao carregar setores:', error);
      toast.error('Erro ao carregar setores');
    }
  };

  const handleConfirmSector = () => {
    if (!tempSectorId) {
      toast.error('Selecione um setor');
      return;
    }

    const sector = sectors.find(s => s.id === tempSectorId);
    if (!sector) return;

    setSelectedSectorId(tempSectorId);
    setSelectedSectorName(sector.name);
    localStorage.setItem('currentOriginSectorId', tempSectorId);
    localStorage.setItem('currentOriginSectorName', sector.name);
    setShowSectorGate(false);
    toast.success(`Setor selecionado: ${sector.name}`);
  };

  const handleChangeSector = () => {
    setTempSectorId(selectedSectorId || '');
    setShowSectorGate(true);
  };

  const handleViewAllSectors = () => {
    setSelectedSectorId('all');
    setSelectedSectorName('Todos os setores');
    localStorage.setItem('currentOriginSectorId', 'all');
    localStorage.setItem('currentOriginSectorName', 'Todos os setores');
    toast.success('Visualizando todos os setores');
  };

  useEffect(() => {
    filterOrders();
  }, [serviceOrders, statusFilter, searchTerm, prioritySort]);

  const fetchServiceOrders = async () => {
    if (selectedSectorId === null) return;

    setLoading(true);
    try {
      let query = supabase
        .from('service_orders')
        .select('*, sectors(name), profiles!service_orders_requester_id_fkey(full_name), photo_url, service_departments(name)')
        .order('created_at', { ascending: false });

      // Filtrar por setor de origem (exceto se for "all" para admin)
      if (selectedSectorId !== 'all') {
        query = query.eq('sector_id', selectedSectorId);
      }

      // UX only - actual access controlled by RLS policies
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
      toast.error('Erro ao carregar ordens de serviço');
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

    // Ordenar por prioridade (Emergencial → Urgente → Não Urgente)
    if (prioritySort === 'high-to-low') {
      const priorityOrder = { emergencial: 0, urgente: 1, nao_urgente: 2 };
      filtered.sort((a, b) => {
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 999;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 999;
        return aPriority - bPriority;
      });
    } else if (prioritySort === 'low-to-high') {
      const priorityOrder = { nao_urgente: 0, urgente: 1, emergencial: 2 };
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">
            Ordens de Serviço — {selectedSectorName}
          </h1>
          <p className="text-sm text-muted-foreground">Exibindo resultados em tempo real</p>
        </div>

        {/* Barra de setor e filtros */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{selectedSectorName}</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card z-50">
                <DropdownMenuItem onClick={handleChangeSector}>
                  Trocar setor
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={handleViewAllSectors}>
                    Todos os setores
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, equipamento ou categoria..."
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
                <SelectItem value="high-to-low">Emergencial → Não Urgente</SelectItem>
                <SelectItem value="low-to-high">Não Urgente → Emergencial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Carregando...</p>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center space-y-4">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium mb-2">Nenhuma O.S. neste setor</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tente alterar o período ou trocar o setor
                </p>
                <Button variant="outline" onClick={handleChangeSector}>
                  Trocar setor
                </Button>
              </div>
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
                          <span className="font-medium">{os.profiles?.full_name || 'Não disponível'}</span>
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

      {/* Gate de seleção de setor */}
      <Dialog open={showSectorGate} onOpenChange={(open) => !open && selectedSectorId && setShowSectorGate(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione o Setor de Origem</DialogTitle>
            <DialogDescription>
              Escolha o setor para visualizar suas ordens de serviço
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={tempSectorId} onValueChange={setTempSectorId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha o setor" />
              </SelectTrigger>
              <SelectContent className="bg-card z-50">
                {sectors.map((sector) => (
                  <SelectItem key={sector.id} value={sector.id}>
                    {sector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleConfirmSector} 
              className="w-full"
              disabled={!tempSectorId}
            >
              Confirmar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OSList;