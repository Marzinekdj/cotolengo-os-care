import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, BarChart3, FileDown, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const Reports = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalOpen: 0,
    totalInProgress: 0,
    totalCompleted: 0,
    totalUrgent: 0,
    avgResolutionTime: 0,
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
      const { data: allOrders } = await supabase
        .from('service_orders')
        .select('*');

      if (allOrders) {
        const totalOpen = allOrders.filter(os => os.status === 'aberta').length;
        const totalInProgress = allOrders.filter(os => os.status === 'em_andamento').length;
        const totalCompleted = allOrders.filter(os => os.status === 'concluida').length;
        const totalUrgent = allOrders.filter(os => os.priority === 'critica').length;

        const completedOrders = allOrders.filter(os => os.completed_at);
        let avgTime = 0;
        if (completedOrders.length > 0) {
          const totalTime = completedOrders.reduce((sum, os) => {
            const created = new Date(os.created_at).getTime();
            const completed = new Date(os.completed_at).getTime();
            return sum + (completed - created);
          }, 0);
          avgTime = Math.round(totalTime / completedOrders.length / (1000 * 60 * 60)); // em horas
        }

        setStats({
          totalOpen,
          totalInProgress,
          totalCompleted,
          totalUrgent,
          avgResolutionTime: avgTime,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
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

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Relatórios e Indicadores</h1>
          </div>
          <Button variant="outline" className="gap-2">
            <FileDown className="h-4 w-4" />
            Exportar Relatório
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                O.S. Abertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
                <div className="text-3xl font-bold">{stats.totalOpen}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-yellow-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Clock className="h-10 w-10 text-yellow-500" />
                <div className="text-3xl font-bold">{stats.totalInProgress}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
                <div className="text-3xl font-bold">{stats.totalCompleted}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-destructive">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                O.S. Urgentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl">🔴</div>
                <div className="text-3xl font-bold">{stats.totalUrgent}</div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Tempo Médio de Resolução
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Clock className="h-10 w-10 text-primary" />
                <div>
                  <div className="text-3xl font-bold">{stats.avgResolutionTime}h</div>
                  <p className="text-sm text-muted-foreground">
                    {stats.avgResolutionTime < 24 ? 'Excelente desempenho' : 'Pode melhorar'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Gráficos e Análises</CardTitle>
          </CardHeader>
          <CardContent className="py-12 text-center">
            <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg text-muted-foreground mb-2">
              Gráficos detalhados em desenvolvimento
            </p>
            <p className="text-sm text-muted-foreground">
              Em breve: gráficos de tendência, análise por setor e relatórios customizados
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Reports;