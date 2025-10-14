import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from '@/hooks/use-toast';
import { Loader2, Upload, X } from 'lucide-react';
import { AvatarEditor } from './AvatarEditor';

const profileSchema = z.object({
  full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string()
    .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Formato: (00) 00000-0000')
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileEditFormProps {
  profile: {
    id: string;
    full_name: string;
    email: string;
    phone?: string;
    avatar_url?: string;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export const ProfileEditForm = ({ profile, onSuccess, onCancel }: ProfileEditFormProps) => {
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url || null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedImageForEdit, setSelectedImageForEdit] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile.full_name,
      email: profile.email,
      phone: profile.phone || '',
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Erro',
        description: 'Por favor, selecione uma imagem válida',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamanho (máx 5MB - aumentado pois será redimensionado)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Erro',
        description: 'A imagem deve ter no máximo 5MB',
        variant: 'destructive',
      });
      return;
    }

    // Abrir editor em vez de aplicar diretamente
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImageForEdit(reader.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImageBlob: Blob) => {
    // Converter Blob para File
    const croppedFile = new File(
      [croppedImageBlob],
      'avatar.jpg',
      { type: 'image/jpeg' }
    );
    
    setAvatarFile(croppedFile);
    setAvatarRemoved(false);
    
    // Atualizar preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(croppedFile);
    
    setIsEditorOpen(false);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return null;

    setUploading(true);
    try {
      // Deletar arquivo antigo primeiro (se existir)
      if (profile.avatar_url) {
        const oldFileName = profile.avatar_url.split('/').pop()?.split('?')[0];
        if (oldFileName) {
          await supabase.storage
            .from('avatars')
            .remove([`${profile.id}/${oldFileName}`]);
        }
      }

      // Upload com timestamp único
      const fileExt = avatarFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${profile.id}/avatar-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error: any) {
      toast({
        title: 'Erro ao fazer upload',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      // Extrair nome do arquivo da URL
      if (profile.avatar_url) {
        const fileName = profile.avatar_url.split('/').pop()?.split('?')[0];
        if (fileName) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([`${profile.id}/${fileName}`]);

          if (deleteError) throw deleteError;
        }
      }

      // Atualizar no banco
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (updateError) throw updateError;

      setAvatarPreview(null);
      setAvatarFile(null);
      setAvatarRemoved(true);

      toast({
        title: 'Sucesso',
        description: 'Foto removida com sucesso',
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao remover foto',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      let avatarUrl = profile.avatar_url;

      // Se foi removido, definir como null
      if (avatarRemoved) {
        avatarUrl = null;
      }
      // Se tem novo arquivo, fazer upload
      else if (avatarFile) {
        const newAvatarUrl = await uploadAvatar();
        if (newAvatarUrl) avatarUrl = newAvatarUrl;
      }

      // Atualizar perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.full_name,
          email: data.email,
          phone: data.phone || null,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      // Atualizar email no Auth (se mudou)
      if (data.email !== profile.email) {
        const { error: authError } = await supabase.auth.updateUser({
          email: data.email,
        });

        if (authError) throw authError;

        toast({
          title: 'Confirmação necessária',
          description: 'Um e-mail de confirmação foi enviado para o novo endereço',
        });
      }

      toast({
        title: 'Sucesso',
        description: 'Perfil atualizado com sucesso',
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      {isEditorOpen && selectedImageForEdit && (
        <AvatarEditor
          imageSrc={selectedImageForEdit}
          onCropComplete={handleCropComplete}
          onCancel={() => setIsEditorOpen(false)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-4">
        <Avatar className="h-24 w-24">
          <AvatarImage src={avatarPreview || undefined} />
          <AvatarFallback className="text-2xl">
            {profile.full_name?.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex gap-2">
          <Label htmlFor="avatar-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
              <Upload className="h-4 w-4" />
              Alterar Foto
            </div>
            <Input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={uploading}
            />
          </Label>

          {avatarPreview && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={removeAvatar}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Nome */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome Completo</Label>
        <Input
          id="full_name"
          {...register('full_name')}
          placeholder="Seu nome completo"
        />
        {errors.full_name && (
          <p className="text-sm text-destructive">{errors.full_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="seu@email.com"
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      {/* Telefone */}
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone (opcional)</Label>
        <Input
          id="phone"
          {...register('phone')}
          placeholder="(00) 00000-0000"
        />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      {/* Botões */}
      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting || uploading}>
          {isSubmitting || uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
      </div>
      </form>
    </>
  );
};
