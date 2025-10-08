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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({
    category: '',
    sectorId: '',
    equipment: '',
    description: '',
    priority: 'media' as 'baixa' | 'media' | 'alta' | 'critica',
    slaTargetHours: 24,
    maintenanceType: 'corretiva' as 'corretiva' | 'preventiva' | 'instalacao',
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Tipo inválido',
          description: 'Por favor, selecione apenas arquivos de imagem',
          variant: 'destructive',
        });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O tamanho máximo é 5MB',
          variant: 'destructive',
        });
        return;
      }
      
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile?.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('service-orders-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('service-orders-photos')
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro no upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.category || !formData.sectorId || !formData.equipment || !formData.description || !formData.priority) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      let photoUrl = null;
      
      if (selectedFile) {
        photoUrl = await uploadPhoto(selectedFile);
        if (!photoUrl) {
          throw new Error('Falha no upload da foto');
        }
      }

      const { data, error} = await supabase
        .from('service_orders')
        .insert([
          {
            category: formData.category as 'eletrica' | 'hidraulica' | 'equipamento_medico' | 'outros',
            sector_id: formData.sectorId,
            equipment: formData.equipment,
            description: formData.description,
            priority: formData.priority,
            sla_target_hours: formData.slaTargetHours,
            maintenance_type: formData.maintenanceType,
            requester_id: profile?.id,
            photo_url: photoUrl,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const priorityLabels = {
        critica: 'Crítica',
        alta: 'Alta',
        media: 'Média',
        baixa: 'Baixa',
      };
      
      toast({
        title: '✅ O.S. criada com sucesso!',
        description: `O.S. #${data.os_number} criada com prioridade ${priorityLabels[formData.priority]}`,
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
                  placeholder="Explique o que está acontecendo e, se possível, a localização exata."
                  className="min-h-32"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="priority">Prioridade *</Label>
                  <p className="text-xs text-muted-foreground">Usar Crítica apenas quando há impacto direto em segurança/assistência</p>
                </div>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'baixa' | 'media' | 'alta' | 'critica') => {
                    const newSla = value === 'critica' ? 4 : value === 'alta' ? 8 : value === 'media' ? 24 : 72;
                    setFormData({ ...formData, priority: value, slaTargetHours: newSla });
                  }}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                        Baixa
                      </span>
                    </SelectItem>
                    <SelectItem value="media">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                        Média
                      </span>
                    </SelectItem>
                    <SelectItem value="alta">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                        Alta
                      </span>
                    </SelectItem>
                    <SelectItem value="critica">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500"></span>
                        Crítica
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sla">SLA alvo</Label>
                <Select 
                  value={formData.slaTargetHours.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, slaTargetHours: parseInt(value) })}
                >
                  <SelectTrigger id="sla">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="4">4 horas</SelectItem>
                    <SelectItem value="8">8 horas</SelectItem>
                    <SelectItem value="24">24 horas</SelectItem>
                    <SelectItem value="72">72 horas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Anexar Foto (opcional)</Label>
                
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <label
                  htmlFor="photo"
                  className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer block"
                >
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className="max-h-48 mx-auto rounded-lg"
                      />
                      <p className="text-sm text-muted-foreground">
                        Clique para trocar a foto
                      </p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Clique para adicionar uma foto
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Máximo 5MB (JPG, PNG, WEBP)
                      </p>
                    </>
                  )}
                </label>
                
                {selectedFile && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                  >
                    Remover foto
                  </Button>
                )}
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