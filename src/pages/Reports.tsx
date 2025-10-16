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
    avgResolutionTime: 0,
    completedLast7Days: 0,
    efficiencyPercentage: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [sectorData, setSectorData] = useState<any[]>([]);
  const [maintenanceTypeData, setMaintenanceTypeData] = useState<any[]>([]);
  const [priorityData, setPriorityData] = useState<any[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const [exportPeriod, setExportPeriod] = useState('30');
  const [isExportOpen, setIsExportOpen] = useState(false);

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
      const { data: allOrders } = await supabase
        .from('service_orders')
        .select('*, sectors(name)');

      const { data: sectors } = await supabase.from('sectors').select('*');

      if (allOrders) {
        const totalOpen = allOrders.filter(os => os.status === 'aberta').length;
        const totalInProgress = allOrders.filter(os => os.status === 'em_andamento').length;
        const totalCompleted = allOrders.filter(os => os.status === 'concluida').length;
        const totalUrgent = allOrders.filter(os => os.priority === 'critica').length;

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

        // Dados por setor
        const sectorChartData = sectors?.map(sector => ({
          sector: sector.name,
          total: allOrders.filter(os => os.sector_id === sector.id).length,
        })) || [];
        setSectorData(sectorChartData);

        // Dados por tipo de manutenção
        const maintenanceTypes = [
          { type: 'Corretiva', value: allOrders.filter(os => os.maintenance_type === 'corretiva').length },
          { type: 'Preventiva', value: allOrders.filter(os => os.maintenance_type === 'preventiva').length },
          { type: 'Instalação', value: allOrders.filter(os => os.maintenance_type === 'instalacao').length },
        ];
        setMaintenanceTypeData(maintenanceTypes);

        // Dados por prioridade
        const priorityChartData = [
          {
            status: 'Abertas',
            critica: allOrders.filter(os => os.status === 'aberta' && os.priority === 'critica').length,
            alta: allOrders.filter(os => os.status === 'aberta' && os.priority === 'alta').length,
            media: allOrders.filter(os => os.status === 'aberta' && os.priority === 'media').length,
            baixa: allOrders.filter(os => os.status === 'aberta' && os.priority === 'baixa').length,
          },
          {
            status: 'Em Andamento',
            critica: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'critica').length,
            alta: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'alta').length,
            media: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'media').length,
            baixa: allOrders.filter(os => os.status === 'em_andamento' && os.priority === 'baixa').length,
          },
          {
            status: 'Concluídas',
            critica: allOrders.filter(os => os.status === 'concluida' && os.priority === 'critica').length,
            alta: allOrders.filter(os => os.status === 'concluida' && os.priority === 'alta').length,
            media: allOrders.filter(os => os.status === 'concluida' && os.priority === 'media').length,
            baixa: allOrders.filter(os => os.status === 'concluida' && os.priority === 'baixa').length,
          },
        ];
        setPriorityData(priorityChartData);
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
        'Setor',
        'Equipamento',
        'Descrição',
        'Status',
        'Prioridade',
        'Tipo Manutenção',
        'Solicitante',
        'Data Abertura',
        'Data Conclusão'
      ];

      // Mapear dados para CSV
      const rows = orders.map(os => [
        os.os_number,
        os.sectors?.name || 'N/A',
        os.equipment,
        os.description.replace(/"/g, '""'), // Escapar aspas
        os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
        os.priority === 'critica' ? 'Crítica' : os.priority === 'alta' ? 'Alta' : os.priority === 'media' ? 'Média' : 'Baixa',
        os.maintenance_type === 'corretiva' ? 'Corretiva' : os.maintenance_type === 'preventiva' ? 'Preventiva' : 'Instalação',
        os.profiles?.full_name || 'N/A',
        format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        os.completed_at ? format(new Date(os.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'Não concluída'
      ]);

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

      const doc = new jsPDF('landscape');

      // Cabeçalho
      doc.setFontSize(18);
      doc.text('Relatório de Ordens de Serviço', 14, 20);
      doc.setFontSize(11);
      doc.text(`Período: Últimos ${exportPeriod} dias`, 14, 28);
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 34);

      // Tabela
      const tableData = orders.map(os => [
        os.os_number.toString(),
        os.sectors?.name || 'N/A',
        os.equipment,
        os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
        os.priority === 'critica' ? 'Crítica' : os.priority === 'alta' ? 'Alta' : os.priority === 'media' ? 'Média' : 'Baixa',
        format(new Date(os.created_at), 'dd/MM/yyyy', { locale: ptBR }),
      ]);

      (doc as any).autoTable({
        head: [['Nº OS', 'Setor', 'Equipamento', 'Status', 'Prioridade', 'Data']],
        body: tableData,
        startY: 40,
        theme: 'grid',
        headStyles: { fillColor: [0, 123, 127] }, // Cor primária do app
        styles: { fontSize: 9 },
        margin: { top: 40 },
      });

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
      critica: 'hsl(var(--destructive))',
      alta: 'hsl(var(--chart-1))',
      media: 'hsl(var(--chart-3))',
      baixa: 'hsl(var(--chart-4))',
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

        {/* KPI Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="border-l-4 border-l-destructive animate-fade-in">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                O.S. Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalOpen}</div>
              <p className="text-xs text-muted-foreground mt-1">Chamados pendentes</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-1 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalInProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">Em execução</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalCompleted}</div>
              <p className="text-xs text-muted-foreground mt-1">Finalizadas com sucesso</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                🔴 O.S. Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalUrgent}</div>
              <p className="text-xs text-muted-foreground mt-1">Alta prioridade</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Tempo Médio de Resolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.avgResolutionTime}h</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.avgResolutionTime < 24 ? 'Excelente desempenho' : 'Avaliação de desempenho'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-2 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Concluídas ≤ 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.completedLast7Days}</div>
              <p className="text-xs text-muted-foreground mt-1">Eficiência semanal</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Tendência */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle>Evolução das O.S. ao longo do tempo</CardTitle>
            <CardDescription>Últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                abertas: { label: 'Abertas', color: 'hsl(var(--destructive))' },
                andamento: { label: 'Em Andamento', color: 'hsl(var(--chart-1))' },
                concluidas: { label: 'Concluídas', color: 'hsl(var(--chart-2))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="abertas" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="andamento" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="concluidas" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Grid de gráficos secundários */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Gráfico por Setor */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle>Distribuição por Setor</CardTitle>
              <CardDescription>Quantidade de O.S. por setor</CardDescription>
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

          {/* Gráfico por Tipo de Manutenção */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
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
        </div>

        {/* Gráfico de Prioridades */}
        <Card className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
          <CardHeader>
            <CardTitle>Chamados por Prioridade</CardTitle>
            <CardDescription>Distribuição de prioridades por status</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                critica: { label: 'Crítica', color: 'hsl(var(--destructive))' },
                alta: { label: 'Alta', color: 'hsl(var(--chart-1))' },
                media: { label: 'Média', color: 'hsl(var(--chart-3))' },
                baixa: { label: 'Baixa', color: 'hsl(var(--chart-4))' },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="critica" stackId="a" fill={COLORS.priority.critica} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="alta" stackId="a" fill={COLORS.priority.alta} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="media" stackId="a" fill={COLORS.priority.media} radius={[0, 0, 0, 0]} />
                  <Bar dataKey="baixa" stackId="a" fill={COLORS.priority.baixa} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;