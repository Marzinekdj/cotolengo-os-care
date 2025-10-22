import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, RefreshCw, Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface DashboardStats {
  total: number;
  aberta: number;
  em_andamento: number;
  concluida: number;
  urgente: number;
  emergencial: number;
  avgTime: number;
  completedLast7Days: number;
  criticalSLA: number;
  byPriority: { priority: string; count: number }[];
  bySector: { sector: string; count: number }[];
  byDepartment: { department: string; count: number }[];
  byType: { type: string; count: number }[];
}

const AnalyticsDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    aberta: 0,
    em_andamento: 0,
    concluida: 0,
    urgente: 0,
    emergencial: 0,
    avgTime: 0,
    completedLast7Days: 0,
    criticalSLA: 0,
    byPriority: [],
    bySector: [],
    byDepartment: [],
    byType: [],
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [filter, setFilter] = useState({
    period: '30',
    sector: 'all',
    type: 'all',
    priority: 'all',
    status: 'all',
  });

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else if (profile.role !== 'coordenacao') {
      navigate('/dashboard');
    } else {
      fetchStats();
    }
  }, [profile, navigate, filter]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Buscar todas as O.S.
      let query = supabase.from('service_orders').select('*, sectors(name), service_departments(name)');

      // Aplicar filtros
      if (filter.sector !== 'all') query = query.eq('sector_id', filter.sector);
      if (filter.type !== 'all') query = query.eq('maintenance_type', filter.type as any);
      if (filter.priority !== 'all') query = query.eq('priority', filter.priority as any);
      if (filter.status !== 'all') query = query.eq('status', filter.status as any);

      const { data: orders, error } = await query;

      if (error) throw error;

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Calcular estatísticas
      const total = orders?.length || 0;
      const aberta = orders?.filter((o) => o.status === 'aberta').length || 0;
      const em_andamento = orders?.filter((o) => o.status === 'em_andamento').length || 0;
      const concluida = orders?.filter((o) => o.status === 'concluida').length || 0;
      const urgente = orders?.filter((o) => o.priority === 'urgente').length || 0;
      const emergencial = orders?.filter((o) => o.priority === 'emergencial').length || 0;

      // Tempo médio de execução (em horas)
      const completedOrders = orders?.filter((o) => o.completed_at) || [];
      const avgTime =
        completedOrders.length > 0
          ? completedOrders.reduce((acc, o) => {
              const created = new Date(o.created_at);
              const completed = new Date(o.completed_at!);
              return acc + (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
            }, 0) / completedOrders.length
          : 0;

      // Concluídas nos últimos 7 dias
      const completedLast7Days =
        orders?.filter((o) => o.completed_at && new Date(o.completed_at) >= sevenDaysAgo).length || 0;

      // O.S. em SLA crítico (tempo decorrido > SLA alvo)
      const criticalSLA =
        orders?.filter((o) => {
          if (o.status === 'concluida' || o.status === 'cancelada') return false;
          const created = new Date(o.created_at);
          const elapsed = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
          return elapsed > (o.sla_target_hours || 24);
        }).length || 0;

      // Por prioridade
      const priorityCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        priorityCounts[o.priority] = (priorityCounts[o.priority] || 0) + 1;
      });
      const byPriority = Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count }));

      // Por setor origem
      const sectorCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        const sectorName = o.sectors?.name || 'Sem setor';
        sectorCounts[sectorName] = (sectorCounts[sectorName] || 0) + 1;
      });
      const bySector = Object.entries(sectorCounts).map(([sector, count]) => ({ sector, count }));

      // Por setor responsável
      const deptCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        const deptName = o.service_departments?.name || 'Não definido';
        deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
      });
      const byDepartment = Object.entries(deptCounts).map(([department, count]) => ({ department, count }));

      // Por tipo
      const typeCounts: Record<string, number> = {};
      orders?.forEach((o) => {
        typeCounts[o.maintenance_type] = (typeCounts[o.maintenance_type] || 0) + 1;
      });
      const byType = Object.entries(typeCounts).map(([type, count]) => ({ type, count }));

      setStats({
        total,
        aberta,
        em_andamento,
        concluida,
        urgente,
        emergencial,
        avgTime,
        completedLast7Days,
        criticalSLA,
        byPriority,
        bySector,
        byDepartment,
        byType,
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const priorityLabels: Record<string, string> = {
    emergencial: '❗ Emergencial',
    urgente: '⚠️ Urgente',
    nao_urgente: '🟢 Não Urgente',
  };

  const typeLabels: Record<string, string> = {
    corretiva: 'Corretiva',
    preventiva: 'Preventiva',
    instalacao: 'Instalação',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-accent/10">
      <header className="bg-card border-b shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-2">
              <Activity className="h-3 w-3" />
              Atualizado em tempo real
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchStats} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Dashboards</h1>
          <p className="text-muted-foreground">
            Atualizado há {Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)}s
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <Select value={filter.period} onValueChange={(v) => setFilter({ ...filter, period: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_andamento">Em andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.priority} onValueChange={(v) => setFilter({ ...filter, priority: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Nível de Solicitação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="emergencial">❗ Emergencial</SelectItem>
                  <SelectItem value="urgente">⚠️ Urgente</SelectItem>
                  <SelectItem value="nao_urgente">🟢 Não Urgente</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.type} onValueChange={(v) => setFilter({ ...filter, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="corretiva">Corretiva</SelectItem>
                  <SelectItem value="preventiva">Preventiva</SelectItem>
                  <SelectItem value="instalacao">Instalação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                O.S. Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.aberta}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FFC107' }}>{stats.em_andamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3" />
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#00A08A' }}>{stats.concluida}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                ⚠️ O.S. Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FFC107' }}>{stats.urgente}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                ❗ O.S. Emergenciais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.emergencial}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="h-3 w-3" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgTime.toFixed(1)}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Métricas adicionais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Tempo Médio de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{stats.avgTime.toFixed(1)}h</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Concluídas ≤ 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {stats.total > 0 ? ((stats.completedLast7Days / stats.total) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-sm text-muted-foreground">{stats.completedLast7Days} de {stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>O.S. em SLA Crítico</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-red-600">{stats.criticalSLA}</div>
              <p className="text-sm text-muted-foreground">Tempo decorrido &gt; SLA alvo</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Chamados por Setor de Origem</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.bySector} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="category" dataKey="sector" fontSize={11} />
                  <YAxis type="number" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="Quantidade" fill="#00A08A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Setor Responsável</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.byDepartment}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="department" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" name="Quantidade" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Fila por Nível de Solicitação */}
        <Card>
          <CardHeader>
            <CardTitle>Fila por Nível de Solicitação</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats.byPriority.map((p) => (
                <Badge
                  key={p.priority}
                  variant="outline"
                  className="text-lg px-4 py-2 text-white"
                  style={{
                    backgroundColor: p.priority === 'emergencial' 
                      ? '#E53935' 
                      : p.priority === 'urgente' 
                      ? '#FFC107' 
                      : '#00A08A',
                    borderColor: p.priority === 'emergencial' 
                      ? '#C62828' 
                      : p.priority === 'urgente' 
                      ? '#FFA000' 
                      : '#00897B'
                  }}
                >
                  {priorityLabels[p.priority] || p.priority}: {p.count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
