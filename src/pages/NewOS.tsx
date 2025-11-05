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
import { z } from 'zod';

interface Sector {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
  description: string | null;
}

// Validation schemas for input sanitization and length limits
const serviceOrderSchema = z.object({
  category: z.string().min(1, 'Categoria é obrigatória'),
  equipment: z.string()
    .trim()
    .min(3, 'Equipamento deve ter pelo menos 3 caracteres')
    .max(200, 'Equipamento deve ter no máximo 200 caracteres'),
  description: z.string()
    .trim()
    .min(10, 'Descrição deve ter pelo menos 10 caracteres')
    .max(2000, 'Descrição deve ter no máximo 2000 caracteres'),
  priority: z.enum(['nao_urgente', 'urgente', 'emergencial']),
  sectorId: z.string().uuid('Setor inválido'),
  responsibleDepartmentId: z.string().uuid('Departamento inválido').optional().or(z.literal('')),
});

const newSectorSchema = z.string()
  .trim()
  .min(2, 'Nome do setor deve ter pelo menos 2 caracteres')
  .max(100, 'Nome do setor deve ter no máximo 100 caracteres');

const NewOS = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  
  const [formData, setFormData] = useState({
    category: '',
    sectorId: '',
    responsibleDepartmentId: '',
    equipment: '',
    description: '',
    priority: 'urgente' as 'nao_urgente' | 'urgente' | 'emergencial',
    slaTargetHours: 24,
    maintenanceType: 'corretiva' as 'corretiva' | 'preventiva' | 'instalacao',
    photoUrl: '',
  });
  const [showNewSectorField, setShowNewSectorField] = useState(false);
  const [newSectorName, setNewSectorName] = useState('');

  useEffect(() => {
    if (!profile) {
      navigate('/auth');
    } else {
      fetchSectors();
      fetchDepartments();
    }
  }, [profile, navigate]);

  const fetchSectors = async () => {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching sectors:', error);
    } else {
      setSectors(data || []);
    }
  };

  const fetchDepartments = async () => {
    const { data, error } = await supabase
      .from('service_departments')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) {
      console.error('Error fetching departments:', error);
    } else {
      setDepartments(data || []);
    }
  };

  const getSuggestedDepartment = (category: string): string => {
    const suggestions: Record<string, string> = {
      'equipamento_medico': 'Engenharia Clínica',
      'eletrica': 'Manutenção',
      'hidraulica': 'Manutenção',
      'outros': 'Manutenção',
    };
    
    const suggestedName = suggestions[category];
    if (suggestedName) {
      const dept = departments.find(d => d.name === suggestedName);
      return dept?.id || '';
    }
    return '';
  };

  const handleSectorChange = (value: string) => {
    if (value === 'outro') {
      setShowNewSectorField(true);
      setFormData({ ...formData, sectorId: '' });
    } else {
      setShowNewSectorField(false);
      setNewSectorName('');
      setFormData({ ...formData, sectorId: value });
    }
  };

  const createNewSector = async (): Promise<string | null> => {
    if (!newSectorName.trim()) return null;

    // Validate sector name
    try {
      newSectorSchema.parse(newSectorName);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return null;
      }
    }

    try {
      const { data, error } = await supabase
        .from('sectors')
        .insert([{
          name: newSectorName.trim(),
          created_by: profile?.id,
          is_active: true
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Setor criado',
        description: `Setor "${newSectorName}" foi criado com sucesso`,
      });

      // Atualizar lista de setores
      await fetchSectors();
      
      return data.id;
    } catch (error: any) {
      toast({
        title: 'Erro ao criar setor',
        description: error.message,
        variant: 'destructive',
      });
      return null;
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
    
    // Validar campos obrigatórios básicos
    if (!formData.category || !formData.equipment || !formData.description || !formData.priority) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    // UX only - actual access controlled by RLS policies
    // Validar setor responsável para Coordenação/Admin
    if ((profile?.role === 'coordenacao') && !formData.responsibleDepartmentId) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione o setor responsável',
        variant: 'destructive',
      });
      return;
    }

    // Validar setor
    if (!formData.sectorId && !showNewSectorField) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, selecione um setor',
        variant: 'destructive',
      });
      return;
    }

    if (showNewSectorField && !newSectorName.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Por favor, informe o nome do novo setor',
        variant: 'destructive',
      });
      return;
    }

    // Validate inputs with zod schema
    try {
      const sectorId = showNewSectorField ? '00000000-0000-0000-0000-000000000000' : formData.sectorId; // Placeholder UUID for validation
      serviceOrderSchema.parse({
        category: formData.category,
        equipment: formData.equipment,
        description: formData.description,
        priority: formData.priority,
        sectorId: sectorId,
        responsibleDepartmentId: formData.responsibleDepartmentId || '',
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: 'Erro de validação',
          description: error.errors[0].message,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      // Se for um novo setor, criar primeiro
      let sectorId = formData.sectorId;
      if (showNewSectorField) {
        const newSectorId = await createNewSector();
        if (!newSectorId) {
          setIsLoading(false);
          return;
        }
        sectorId = newSectorId;
      }

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
            sector_id: sectorId,
            responsible_department_id: formData.responsibleDepartmentId || null,
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
        emergencial: 'Emergencial',
        urgente: 'Urgente',
        nao_urgente: 'Não Urgente',
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
                <Select 
                  value={formData.category} 
                  onValueChange={(value) => {
                    const suggestedDept = getSuggestedDepartment(value);
                    setFormData({ 
                      ...formData, 
                      category: value,
                      responsibleDepartmentId: suggestedDept || formData.responsibleDepartmentId
                    });
                  }}
                >
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
                <div className="flex items-center gap-2">
                  <Label htmlFor="sector">Setor de Origem *</Label>
                  <span className="text-xs text-muted-foreground">
                    🏥 Escolha o setor onde ocorreu a necessidade
                  </span>
                </div>
                <Select 
                  value={showNewSectorField ? 'outro' : formData.sectorId} 
                  onValueChange={handleSectorChange}
                >
                  <SelectTrigger id="sector">
                    <SelectValue placeholder="Selecione o setor ou cadastre um novo" />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id}>
                        {sector.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="outro">Outro (especificar)</SelectItem>
                  </SelectContent>
                </Select>
                
                {showNewSectorField && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="newSector">Nome do novo setor *</Label>
                    <Input
                      id="newSector"
                      placeholder="Digite o nome completo do setor (ex: Ala São José, Almoxarifado, etc.)"
                      value={newSectorName}
                      onChange={(e) => setNewSectorName(e.target.value)}
                      className="border-primary/50"
                      required={showNewSectorField}
                    />
                    <p className="text-xs text-muted-foreground">
                      Este setor será criado e estará disponível para futuras O.S.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {/* UX only - actual access controlled by RLS policies */}
                  <Label htmlFor="responsibleDepartment">Setor Responsável {profile?.role === 'coordenacao' ? '*' : ''}</Label>
                  <span className="text-xs text-muted-foreground">
                    🏢 Quem irá atender este chamado
                  </span>
                </div>
                <Select 
                  value={formData.responsibleDepartmentId} 
                  onValueChange={(value) => setFormData({ ...formData, responsibleDepartmentId: value })}
                >
                  <SelectTrigger id="responsibleDepartment">
                    <SelectValue placeholder="Selecione o setor que atenderá a solicitação" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                        {formData.category && getSuggestedDepartment(formData.category) === dept.id && (
                          <span className="ml-2 text-xs text-primary">(Sugerido)</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* UX only - actual access controlled by RLS policies */}
                <p className="text-xs text-muted-foreground">
                  {profile?.role === 'coordenacao'
                    ? 'Obrigatório definir o setor responsável'
                    : 'Pode ser ajustado pela Coordenação'}
                </p>
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
                <div className="flex flex-col gap-1">
                  <Label htmlFor="priority">Nível de Solicitação *</Label>
                  <p className="text-xs text-muted-foreground">Defina a urgência com que o problema precisa ser resolvido</p>
                </div>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value: 'nao_urgente' | 'urgente' | 'emergencial') => {
                    const newSla = value === 'emergencial' ? 4 : value === 'urgente' ? 24 : 72;
                    setFormData({ ...formData, priority: value, slaTargetHours: newSla });
                  }}
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecione o nível de urgência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nao_urgente">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: '#00A08A'}}></span>
                        Não Urgente
                        <span className="text-xs text-muted-foreground ml-2">- Pode aguardar manutenção programada</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="urgente">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: '#FFC107'}}></span>
                        Urgente
                        <span className="text-xs text-muted-foreground ml-2">- Afeta a rotina, sem risco imediato</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="emergencial">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{backgroundColor: '#E53935'}}></span>
                        Emergencial
                        <span className="text-xs text-muted-foreground ml-2">- Risco à segurança ou funcionamento crítico</span>
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