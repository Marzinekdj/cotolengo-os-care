import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ArrowLeft, BarChart3, FileDown, Clock, CheckCircle, AlertCircle, TrendingUp, PieChart } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const Reports = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalOpen: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalUrgent: 0,
    totalEmergency: 0,
    avgResolutionTime: 0,
    completedLast7Days: 0,
    efficiencyPercentage: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [openCloseTrendData, setOpenCloseTrendData] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [maintenanceTypeData, setMaintenanceTypeData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [prioritySimpleData, setPrioritySimpleData] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportPeriod, setExportPeriod] = useState('30');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [sectors, setSectors] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    sectorOrigin: [] as string[],
    responsibleDept: [] as string[],
    priority: [] as string[],
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
  }, [profile, navigate]);

  const fetchStats = async () => {
    try {
      // Fetch sectors and departments
      const { data: sectorsData } = await supabase.from('sectors').select('*');
      const { data: departmentsData } = await supabase.from('service_departments').select('*');
      
      setSectors(sectorsData || []);
      setDepartments(departmentsData || []);

      // Build query with filters
      let query = supabase.from('service_orders').select('*, sectors(name), service_departments(name)');

      if (filters.startDate) {
        query = query.gte('created_at', new Date(filters.startDate).toISOString());
      }
      if (filters.endDate) {
        query = query.lte('created_at', new Date(filters.endDate).toISOString());
      }
      if (filters.sectorOrigin.length > 0) {
        query = query.in('sector_id', filters.sectorOrigin);
      }
      if (filters.responsibleDept.length > 0) {
        query = query.in('responsible_department_id', filters.responsibleDept);
      }
      if (filters.priority.length > 0) {
        query = query.in('priority', filters.priority as any);
      }
      if (filters.status !== 'all') {
        query = query.eq('status', filters.status as any);
      }

      const { data: allOrders } = await query;

      if (allOrders) {
        const totalOpen = allOrders.filter(os => os.status === 'aberta').length;
        const totalInProgress = allOrders.filter(os => os.status === 'em_andamento').length;
        const totalCompleted = allOrders.filter(os => os.status === 'concluida').length;
        const totalUrgent = allOrders.filter(os => os.priority === 'urgente').length;
        const totalEmergency = allOrders.filter(os => os.priority === 'emergencial').length;

        // Concluídas nos últimos 7 dias
        const sevenDaysAgo = subDays(new Date(), 7);
        const completedLast7 = allOrders.filter(
          os => os.completed_at && new Date(os.completed_at) >= sevenDaysAgo
        ).length;

        const completedOrders = allOrders.filter(os => os.completed_at);
        let avgTime = 0;
        if (completedOrders.length > 0) {
          const totalTime = completedOrders.reduce((sum, os) => {
            const created = new Date(os.created_at).getTime();
            const completed = new Date(os.completed_at).getTime();
            return sum + (completed - created);
          }, 0);
          avgTime = Math.round(totalTime / completedOrders.length / (1000 * 60 * 60));
        }

        const efficiencyPerc = totalCompleted > 0 
          ? Math.round((completedLast7 / totalCompleted) * 100) 
          : 0;

        setStats({
          totalOpen,
          totalInProgress,
          totalCompleted,
          totalUrgent,
          totalEmergency,
          avgResolutionTime: avgTime,
          completedLast7Days: completedLast7,
          efficiencyPercentage: efficiencyPerc,
        });

        // Dados de tendência (últimos 30 dias)
        const last30Days = eachDayOfInterval({
          start: subDays(new Date(), 29),
          end: new Date(),
        });

        const trendChartData = last30Days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return {
            date: format(day, 'dd/MM', { locale: ptBR }),
            abertas: allOrders.filter(
              os => format(new Date(os.created_at), 'yyyy-MM-dd') === dayStr && os.status === 'aberta'
            ).length,
            andamento: allOrders.filter(
              os => format(new Date(os.created_at), 'yyyy-MM-dd') === dayStr && os.status === 'em_andamento'
            ).length,
            concluidas: allOrders.filter(
              os => os.completed_at && format(new Date(os.completed_at), 'yyyy-MM-dd') === dayStr
            ).length,
          };
        });
        setTrendData(trendChartData);

        // Tendência de Abertura vs Conclusão
        const openCloseTrend = last30Days.map(day => {
          const dayStr = format(day, 'yyyy-MM-dd');
          return {
            date: format(day, 'dd/MM', { locale: ptBR }),
            abertas: allOrders.filter(
              os => format(new Date(os.created_at), 'yyyy-MM-dd') === dayStr
            ).length,
            concluidas: allOrders.filter(
              os => os.completed_at && format(new Date(os.completed_at), 'yyyy-MM-dd') === dayStr
            ).length,
          };
        });
        setOpenCloseTrendData(openCloseTrend);

        // Dados por setor
        const sectorChartData = sectorsData?.map(sector => ({
          sector: sector.name,
          total: allOrders.filter(os => os.sector_id === sector.id).length,
        })).filter(s => s.total > 0) || [];
        setSectorData(sectorChartData);

        // Dados por setor responsável
        const departmentChartData = departmentsData?.map(dept => ({
          department: dept.name,
          total: allOrders.filter(os => os.responsible_department_id === dept.id).length,
        })).filter(d => d.total > 0) || [];
        setDepartmentData(departmentChartData);

        // Dados por tipo de manutenção
        const maintenanceTypes = [
          { type: 'Corretiva', value: allOrders.filter(os => os.maintenance_type === 'corretiva').length },
          { type: 'Preventiva', value: allOrders.filter(os => os.maintenance_type === 'preventiva').length },
          { type: 'Instalação', value: allOrders.filter(os => os.maintenance_type === 'instalacao').length },
        ];
        setMaintenanceTypeData(maintenanceTypes);

        // Dados por nível de solicitação (prioridade)
        const priorityChartData = [
          {
            status: 'Abertas',
            emergencial: allOrders.filter(os => os.status === 'aberta' && os.priority === 'emergencial').length,
            urgente: allOrders.filter(os => os.status === 'aberta' && os.priority === 'urgente').length,
            nao_urgente: allOrders.filter(os => os.status === 'aberta' && os.priority === 'nao_urgente').length,
          },
          {
            status: 'Em Andamento',
            emergencial: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'emergencial').length,
            urgente: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'urgente').length,
            nao_urgente: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'nao_urgente').length,
          },
          {
            status: 'Concluídas',
            emergencial: allOrders.filter(os => os.status === 'concluida' && os.priority === 'emergencial').length,
            urgente: allOrders.filter(os => os.status === 'concluida' && os.priority === 'urgente').length,
            nao_urgente: allOrders.filter(os => os.status === 'concluida' && os.priority === 'nao_urgente').length,
          },
        ];
        setPriorityData(priorityChartData);

        // Dados simples por nível de solicitação
        const prioritySimple = [
          { nivel: 'Não Urgente', total: allOrders.filter(os => os.priority === 'nao_urgente').length },
          { nivel: 'Urgente', total: allOrders.filter(os => os.priority === 'urgente').length },
          { nivel: 'Emergencial', total: allOrders.filter(os => os.priority === 'emergencial').length },
        ];
        setPrioritySimpleData(prioritySimple);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateCSVReport = async () => {
    try {
      const daysAgo = parseInt(exportPeriod);
      const startDate = subDays(new Date(), daysAgo);

      const { data: orders } = await supabase
        .from('service_orders')
        .select('*, sectors(name), profiles!requester_id(full_name)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: `Não há O.S. registradas nos últimos ${exportPeriod} dias.`,
          variant: 'destructive',
        });
        return;
      }

      // Cabeçalho do CSV
      const headers = [
        'Número OS',
        'Setor Origem',
        'Setor Responsável',
        'Equipamento',
        'Descrição',
        'Status',
        'Nível de Solicitação',
        'Tipo Manutenção',
        'Solicitante',
        'Data Abertura',
        'Data Conclusão',
        'Tempo de Resolução (h)'
      ];

      // Mapear dados para CSV
      const rows = orders.map((os: any) => {
        const resolutionTime = os.completed_at 
          ? Math.round((new Date(os.completed_at).getTime() - new Date(os.created_at).getTime()) / (1000 * 60 * 60))
          : '';
        
        return [
          os.os_number,
          os.sectors?.name || 'N/A',
          os.service_departments?.name || 'Não definido',
          os.equipment,
          os.description.replace(/"/g, '""'), // Escapar aspas
          os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
          os.priority === 'emergencial' ? 'Emergencial' : os.priority === 'urgente' ? 'Urgente' : 'Não Urgente',
          os.maintenance_type === 'corretiva' ? 'Corretiva' : os.maintenance_type === 'preventiva' ? 'Preventiva' : 'Instalação',
          os.profiles?.full_name || 'N/A',
          format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          os.completed_at ? format(new Date(os.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Não concluída',
          resolutionTime || 'N/A'
        ];
      });

      // Construir CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Criar Blob e fazer download
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: '✅ Relatório CSV gerado com sucesso!',
        description: `${orders.length} O.S. exportadas.`,
      });
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o arquivo CSV.',
        variant: 'destructive',
      });
    }
  };

  const generatePDFReport = async () => {
    try {
      // Importar jsPDF dinamicamente
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');

      const daysAgo = parseInt(exportPeriod);
      const startDate = subDays(new Date(), daysAgo);

      const { data: orders } = await supabase
        .from('service_orders')
        .select('*, sectors(name), service_departments(name), profiles!requester_id(full_name)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        toast({
          title: 'Nenhum dado encontrado',
          description: `Não há O.S. registradas nos últimos ${exportPeriod} dias.`,
          variant: 'destructive',
        });
        return;
      }

      const doc = new jsPDF('landscape');

      // Cabeçalho
      doc.setFontSize(18);
      doc.text('Relatório de Ordens de Serviço', 14, 20);
      doc.setFontSize(11);
      doc.text(`Período: Últimos ${exportPeriod} dias`, 14, 28);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 34);

      // Tabela
      const tableData = orders.map((os: any) => [
        os.os_number.toString(),
        os.sectors?.name || 'N/A',
        os.service_departments?.name || 'Não definido',
        os.equipment,
        os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
        os.priority === 'emergencial' ? 'Emergencial' : os.priority === 'urgente' ? 'Urgente' : 'Não Urgente',
        format(new Date(os.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      ]);

      (doc as any).autoTable({
        head: [['Nº OS', 'Setor Origem', 'Responsável', 'Equipamento', 'Status', 'Nível', 'Data']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [0, 123, 127] },
        styles: { fontSize: 8 },
        margin: { top: 40 },
      });

      // Rodapé
      const finalY = (doc as any).lastAutoTable.finalY || 40;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        'Relatório gerado automaticamente pelo Sistema de Ordens de Serviço – Pequeno Cotolengo.',
        14,
        finalY + 10
      );
      doc.text('Dados atualizados em tempo real.', 14, finalY + 15);

      // Salvar PDF
      doc.save(`relatorio-os-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`);

      toast({
        title: '✅ Relatório PDF gerado com sucesso!',
        description: `${orders.length} O.S. exportadas.`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro ao gerar relatório',
        description: 'Não foi possível gerar o arquivo PDF.',
        variant: 'destructive',
      });
    }
  };

  const handleExportReport = async () => {
    setIsExportOpen(false);
    
    if (exportFormat === 'csv') {
      await generateCSVReport();
    } else {
      await generatePDFReport();
    }
  };

  const COLORS = {
    pie: ['hsl(var(--destructive))', 'hsl(var(--chart-2))', 'hsl(var(--primary))'],
    priority: {
      emergencial: '#E53935',
      urgente: '#FFC107',
      nao_urgente: '#00A08A',
    }
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

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Relatórios e Indicadores</h1>
            </div>
            <p className="text-muted-foreground">Acompanhe o desempenho das Ordens de Serviço em tempo real.</p>
          </div>

          <Dialog open={isExportOpen} onOpenChange={setIsExportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <FileDown className="h-4 w-4" />
                Exportar Relatório
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Relatório</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={(value: 'pdf' | 'csv') => setExportFormat(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={exportPeriod} onValueChange={setExportPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleExportReport} className="w-full">
                  Gerar e Baixar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-sm text-muted-foreground mb-6">Dados atualizados em tempo real — consolidados por status e prioridade.</p>

        {/* Filtros Globais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <input
                  id="startDate"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <input
                  id="endDate"
                  type="date"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aberta">Aberta</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end gap-2">
                <Button onClick={fetchStats} className="flex-1">Aplicar Filtros</Button>
                <Button 
                  variant="outline" 
                  onClick={() => setFilters({ startDate: '', endDate: '', sectorOrigin: [], responsibleDept: [], priority: [], status: 'all' })}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-3 w-3" />
                O.S. Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.totalOpen}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FFC107' }}>{stats.totalInProgress}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-3 w-3" />
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#00A08A' }}>{stats.totalCompleted}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4" style={{ borderLeftColor: '#FFC107' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                ⚠️ O.S. Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" style={{ color: '#FFC107' }}>{stats.totalUrgent}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                ❗ O.S. Emergenciais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.totalEmergency}</div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Tempo Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgResolutionTime}h</div>
            </CardContent>
          </Card>
        </div>

        {/* Grid de gráficos principais */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Tendência de Abertura e Conclusão */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Abertura e Conclusão</CardTitle>
              <CardDescription>Últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  abertas: { label: 'Abertas', color: '#E53935' },
                  concluidas: { label: 'Concluídas', color: '#00A08A' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={openCloseTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line type="monotone" dataKey="abertas" stroke="#E53935" strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="concluidas" stroke="#00A08A" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Baseado nas solicitações registradas no período selecionado.
              </p>
            </CardContent>
          </Card>

          {/* Chamados por Nível de Solicitação */}
          <Card>
            <CardHeader>
              <CardTitle>Chamados por Nível de Solicitação</CardTitle>
              <CardDescription>Distribuição por nível de urgência</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: 'Total', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prioritySimpleData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="nivel" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {prioritySimpleData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.nivel === 'Emergencial' ? '#E53935' : entry.nivel === 'Urgente' ? '#FFC107' : '#00A08A'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Baseado nas solicitações registradas no período selecionado.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Grid de gráficos secundários */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico por Setor de Origem */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle>Distribuição por Setor de Origem</CardTitle>
              <CardDescription>Quantidade de O.S. por setor de origem</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: 'Total', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectorData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="sector" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico por Setor Responsável */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.75s' }}>
            <CardHeader>
              <CardTitle>O.S. por Setor Responsável</CardTitle>
              <CardDescription>Distribuição de O.S. entre setores responsáveis</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  total: { label: 'Total', color: 'hsl(var(--chart-4))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={departmentData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="department" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={120} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Gráfico por Tipo de Manutenção */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Manutenção</CardTitle>
              <CardDescription>Distribuição por categoria</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  value: { label: 'Quantidade', color: 'hsl(var(--primary))' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPie>
                    <Pie
                      data={maintenanceTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="hsl(var(--primary))"
                      dataKey="value"
                    >
                      {maintenanceTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS.pie[index % COLORS.pie.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </RechartsPie>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Distribuição por Status e Nível */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição por Status e Nível</CardTitle>
              <CardDescription>Níveis de urgência por status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  emergencial: { label: '❗ Emergencial', color: '#E53935' },
                  urgente: { label: '⚠️ Urgente', color: '#FFC107' },
                  nao_urgente: { label: '🟢 Não Urgente', color: '#00A08A' },
                }}
                className="h-[300px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="emergencial" stackId="a" fill={COLORS.priority.emergencial} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="urgente" stackId="a" fill={COLORS.priority.urgente} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="nao_urgente" stackId="a" fill={COLORS.priority.nao_urgente} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Reports;