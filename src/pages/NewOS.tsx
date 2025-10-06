import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CheckCircle, Upload } from 'lucide-react';

interface Sector {
  id: string;
  name: string;
}

const NewOS = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  
  const [formData, setFormData] = useState({
    category: '',
    sectorId: '',
    equipment: '',
    description: '',
    isUrgent: false,
    photoUrl: '',
  });

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else {
      fetchSectors();
    }
  }, [profile, navigate]);

  const fetchSectors = async () => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('name');
    
    if (error) {
      console.error('Error fetching sectors:', error);
    } else {
      setSectors(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.sectorId || !formData.equipment || !formData.description) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('service_orders')
        .insert([
          {
            category: formData.category as 'eletrica' | 'hidraulica' | 'equipamento_medico' | 'outros',
            sector_id: formData.sectorId,
            equipment: formData.equipment,
            description: formData.description,
            priority: (formData.isUrgent ? 'urgente' : 'normal') as 'urgente' | 'normal',
            requester_id: profile?.id,
            photo_url: formData.photoUrl || null,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'O.S. criada com sucesso!',
        description: `O.S. #${data.os_number} foi registrada`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Erro ao criar O.S.',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Nova Ordem de Serviço</CardTitle>
            <CardDescription>
              Preencha os dados para registrar uma nova manutenção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eletrica">Elétrica</SelectItem>
                    <SelectItem value="hidraulica">Hidráulica</SelectItem>
                    <SelectItem value="equipamento_medico">Equipamento Médico</SelectItem>
                    <SelectItem value="outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sector">Local / Setor *</Label>
                <Select value={formData.sectorId} onValueChange={(value) => setFormData({ ...formData, sectorId: value })}>
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="equipment">Equipamento / Item *</Label>
                <Input
                  id="equipment"
                  placeholder="Ex: Ar condicionado da sala 12"
                  value={formData.equipment}
                  onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição do problema *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o problema com detalhes..."
                  className="min-h-32"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-0.5">
                  <Label htmlFor="urgent">Urgência</Label>
                  <p className="text-sm text-muted-foreground">
                    Marcar como urgente dará prioridade à O.S.
                  </p>
                </div>
                <Switch
                  id="urgent"
                  checked={formData.isUrgent}
                  onCheckedChange={(checked) => setFormData({ ...formData, isUrgent: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Anexar Foto (opcional)</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Clique para adicionar uma foto (em breve)
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? 'Enviando...' : 'Enviar O.S.'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default NewOS;