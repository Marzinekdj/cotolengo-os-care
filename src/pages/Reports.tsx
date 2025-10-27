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
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';

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
  const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [includeCharts, setIncludeCharts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
    // UX only - actual access controlled by RLS policies
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

  const generateExcelReport = async () => {
    try {
      const daysAgo = parseInt(exportPeriod);
      const startDate = subDays(new Date(), daysAgo);

      const { data: orders } = await supabase
        .from('service_orders')
        .select('*, sectors(name), service_departments(name), profiles!requester_id(full_name)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        toast({
          title: 'Sem dados',
          description: 'Não há registros para os filtros selecionados',
          variant: 'destructive',
        });
        return;
      }

      // Criar workbook e worksheet com ExcelJS
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Ordens de Serviço');

      // Definir colunas com largura
      worksheet.columns = [
        { header: 'Número OS', key: 'numero', width: 12 },
        { header: 'Setor Origem', key: 'setorOrigem', width: 20 },
        { header: 'Setor Responsável', key: 'setorResponsavel', width: 20 },
        { header: 'Categoria', key: 'categoria', width: 18 },
        { header: 'Equipamento', key: 'equipamento', width: 20 },
        { header: 'Descrição', key: 'descricao', width: 35 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Nível de Solicitação', key: 'nivel', width: 18 },
        { header: 'Tipo Manutenção', key: 'tipo', width: 18 },
        { header: 'Solicitante', key: 'solicitante', width: 20 },
        { header: 'Data Abertura', key: 'dataAbertura', width: 18 },
        { header: 'Data Conclusão', key: 'dataConclusao', width: 18 },
        { header: 'Tempo de Resolução (h)', key: 'tempo', width: 20 }
      ];

      // Adicionar dados
      orders.forEach((os: any) => {
        const resolutionTime = os.completed_at 
          ? ((new Date(os.completed_at).getTime() - new Date(os.created_at).getTime()) / (1000 * 60 * 60)).toFixed(1) + 'h'
          : 'N/A';

        worksheet.addRow({
          numero: os.os_number,
          setorOrigem: os.sectors?.name || 'N/A',
          setorResponsavel: os.service_departments?.name || 'N/A',
          categoria: os.category === 'manutencao' ? 'Manutenção' : os.category === 'instalacao' ? 'Instalação' : 'Outros',
          equipamento: os.equipment,
          descricao: os.description,
          status: os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
          nivel: os.priority === 'emergencial' ? 'Emergencial' : os.priority === 'urgente' ? 'Urgente' : 'Não Urgente',
          tipo: os.maintenance_type === 'corretiva' ? 'Corretiva' : os.maintenance_type === 'preventiva' ? 'Preventiva' : 'Instalação',
          solicitante: os.profiles?.full_name || 'N/A',
          dataAbertura: format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          dataConclusao: os.completed_at ? format(new Date(os.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A',
          tempo: resolutionTime
        });
      });

      // Formatação do cabeçalho (primeira linha)
      const headerRow = worksheet.getRow(1);
      headerRow.height = 25;
      headerRow.font = { bold: true, size: 11 };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDCE6F1' }
      };
      headerRow.alignment = { 
        vertical: 'middle', 
        horizontal: 'center',
        wrapText: true
      };
      headerRow.border = {
        top: { style: 'medium' },
        bottom: { style: 'medium' },
        left: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Formatação das células de dados
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Pular cabeçalho

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Bordas em todas as células
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };

          // Quebra de texto e alinhamento vertical
          cell.alignment = { 
            vertical: 'middle',
            wrapText: true
          };

          // Centralizar datas (colunas 11 e 12)
          if (colNumber === 11 || colNumber === 12) {
            cell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle',
              wrapText: true
            };
          }

          // Formatação condicional para Status (coluna 7)
          if (colNumber === 7) {
            const status = cell.value as string;
            cell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
            cell.font = { bold: true };

            if (status === 'Aberta') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF8D7DA' }
              };
              cell.font = { ...cell.font, color: { argb: 'FF721C24' } };
            } else if (status === 'Em Andamento') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFF3CD' }
              };
              cell.font = { ...cell.font, color: { argb: 'FF856404' } };
            } else if (status === 'Concluída') {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD4EDDA' }
              };
              cell.font = { ...cell.font, color: { argb: 'FF155724' } };
            }
          }

          // Destacar Nível de Solicitação (coluna 8)
          if (colNumber === 8) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFF9E6' }
            };
            cell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
          }

          // Destacar Tipo Manutenção (coluna 9)
          if (colNumber === 9) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE8F4F8' }
            };
            cell.alignment = { 
              horizontal: 'center', 
              vertical: 'middle'
            };
          }
        });
      });

      // Congelar linha de cabeçalho
      worksheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // Adicionar rodapé mesclado
      const lastRow = worksheet.rowCount + 2;
      const footerRow = worksheet.getRow(lastRow);
      footerRow.getCell(1).value = 'Relatório de Ordens de Serviço – Pequeno Cotolengo | Gerado automaticamente via sistema Lovable.dev';
      footerRow.getCell(1).font = { italic: true, size: 10, color: { argb: 'FF666666' } };
      footerRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
      
      // Mesclar células do rodapé
      worksheet.mergeCells(lastRow, 1, lastRow, 13);

      // Gerar e baixar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-os_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Relatório exportado com sucesso',
        description: `${orders.length} O.S. exportadas.`,
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: 'Erro ao gerar arquivo',
        description: 'Não foi possível gerar o arquivo. Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const generatePDFReport = async () => {
    try {
      const daysAgo = parseInt(exportPeriod);
      const startDate = subDays(new Date(), daysAgo);

      const { data: orders } = await supabase
        .from('service_orders')
        .select('*, sectors(name), service_departments(name), profiles!requester_id(full_name)')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (!orders || orders.length === 0) {
        toast({
          title: 'Sem dados',
          description: 'Não há registros para os filtros selecionados',
          variant: 'destructive',
        });
        return;
      }

      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' });
      
      // Logo e Cabeçalho
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Ordens de Serviço — Pequeno Cotolengo', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Período: Últimos ${exportPeriod} dias`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });

      // Preparar dados da tabela
      const tableData = orders.map((os: any) => {
        const resolutionTime = os.completed_at 
          ? ((new Date(os.completed_at).getTime() - new Date(os.created_at).getTime()) / (1000 * 60 * 60)).toFixed(1)
          : 'N/A';

        return [
          os.os_number.toString(),
          os.sectors?.name || 'N/A',
          os.service_departments?.name || 'N/A',
          os.category === 'manutencao' ? 'Manutenção' : os.category === 'instalacao' ? 'Instalação' : 'Outros',
          os.equipment,
          os.description,
          os.status === 'aberta' ? 'Aberta' : os.status === 'em_andamento' ? 'Em Andamento' : 'Concluída',
          os.priority === 'emergencial' ? 'Emergencial' : os.priority === 'urgente' ? 'Urgente' : 'Não Urgente',
          os.maintenance_type === 'corretiva' ? 'Corretiva' : os.maintenance_type === 'preventiva' ? 'Preventiva' : 'Instalação',
          os.profiles?.full_name || 'N/A',
          format(new Date(os.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          os.completed_at ? format(new Date(os.completed_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : 'N/A',
          resolutionTime,
        ];
      });

      // Gerar tabela com autoTable
      autoTable(doc, {
        head: [[
          'Nº OS',
          'Setor Origem',
          'Setor Resp.',
          'Categoria',
          'Equipamento',
          'Descrição',
          'Status',
          'Nível',
          'Tipo Man.',
          'Solicitante',
          'Data Abertura',
          'Data Conclusão',
          'Tempo (h)',
        ]],
        body: tableData,
        startY: 35,
        theme: 'striped',
        headStyles: {
          fillColor: [232, 243, 241], // #E8F3F1
          textColor: [11, 59, 60], // #0B3B3C
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
        },
        styles: {
          fontSize: 7,
          cellPadding: 2,
          overflow: 'linebreak',
          valign: 'middle',
        },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' }, // Nº OS
          1: { cellWidth: 25 }, // Setor Origem
          2: { cellWidth: 25 }, // Setor Responsável
          3: { cellWidth: 20 }, // Categoria
          4: { cellWidth: 22 }, // Equipamento
          5: { cellWidth: 'auto', overflow: 'linebreak' }, // Descrição
          6: { cellWidth: 18 }, // Status
          7: { cellWidth: 20 }, // Nível
          8: { cellWidth: 18 }, // Tipo Manutenção
          9: { cellWidth: 22 }, // Solicitante
          10: { cellWidth: 25 }, // Data Abertura
          11: { cellWidth: 25 }, // Data Conclusão
          12: { cellWidth: 18, halign: 'right' }, // Tempo
        },
        margin: { left: 10, right: 10 },
        didDrawPage: (data: any) => {
          // Rodapé em cada página
          const pageCount = doc.internal.pages.length - 1;
          doc.setFontSize(8);
          doc.setTextColor(100);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
          doc.text(
            `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
            doc.internal.pageSize.getWidth() - 14,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'right' }
          );
        },
      });

      // Salvar PDF
      doc.save(`relatorio-os_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`);

      toast({
        title: 'Relatório exportado com sucesso',
        description: `${orders.length} O.S. exportadas.`,
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro ao gerar arquivo',
        description: 'Não foi possível gerar o arquivo. Tente novamente',
        variant: 'destructive',
      });
    }
  };

  const handleExportReport = async () => {
    setIsExporting(true);
    setIsExportOpen(false);
    
    try {
      if (exportFormat === 'xlsx') {
        await generateExcelReport();
      } else {
        await generatePDFReport();
      }
    } finally {
      setIsExporting(false);
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
              <Button variant="outline" className="gap-2" disabled={isExporting}>
                <FileDown className="h-4 w-4" />
                {isExporting ? 'Gerando...' : 'Exportar Relatório'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Exportar Relatório</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Formato</Label>
                  <Select value={exportFormat} onValueChange={(value: 'pdf' | 'xlsx') => setExportFormat(value)}>
                    <SelectTrigger aria-label="Selecionar formato">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select value={exportPeriod} onValueChange={setExportPeriod}>
                    <SelectTrigger aria-label="Selecionar período">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">Últimos 7 dias</SelectItem>
                      <SelectItem value="30">Últimos 30 dias</SelectItem>
                      <SelectItem value="90">Últimos 90 dias</SelectItem>
                      <SelectItem value="365">Último ano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleExportReport} 
                  className="w-full" 
                  disabled={isExporting}
                  aria-label="Gerar e baixar relatório"
                >
                  {isExporting ? 'Gerando...' : 'Gerar e Baixar'}
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