import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { getCoordTutorialUrl } from '@/lib/settings';

interface TutorialCoordenacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialCoordenacaoModal({ open, onOpenChange }: TutorialCoordenacaoModalProps) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (open) {
      setLoading(true);
      
      // Get URL from environment variable
      const url = getCoordTutorialUrl();
      setVideoUrl(url);
      setLoading(false);
      
      // Log analytics event
      console.info('[Analytics] help_coord_opened');
    }
  }, [open]);

  useEffect(() => {
    // Pause video when closing modal
    if (!open && iframeRef.current) {
      // Reset iframe src to pause video
      const currentSrc = iframeRef.current.src;
      iframeRef.current.src = '';
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.src = currentSrc;
        }
      }, 100);
      
      console.info('[Analytics] help_coord_closed');
    }
  }, [open]);

  const getEmbedUrl = (url: string): string => {
    if (!url) return '';
    
    // Convert YouTube URLs to embed format
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/;
    const match = url.match(youtubeRegex);
    
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    return url;
  };

  const handleOpenExternal = () => {
    if (videoUrl) {
      console.info('[Analytics] help_coord_open_external');
      window.open(videoUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-[900px] w-[95vw] max-h-[90vh] overflow-auto"
        aria-labelledby="tutorial-coord-title"
        aria-describedby="tutorial-coord-description"
      >
        <DialogHeader>
          <DialogTitle id="tutorial-coord-title">
            Tutorial da Coordenação
          </DialogTitle>
          <DialogDescription id="tutorial-coord-description">
            Aprenda a usar as funcionalidades da área de coordenação
          </DialogDescription>
        </DialogHeader>

        <div className="w-full">
          {loading ? (
            <div className="w-full aspect-video bg-muted animate-pulse rounded-md flex items-center justify-center">
              <p className="text-muted-foreground">Carregando vídeo...</p>
            </div>
          ) : embedUrl ? (
            <div className="w-full aspect-video">
              <iframe
                ref={iframeRef}
                src={embedUrl}
                title="Tutorial da Coordenação"
                className="w-full h-full rounded-md border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="w-full aspect-video bg-muted rounded-md flex flex-col items-center justify-center gap-4 p-6">
              <p className="text-muted-foreground text-center">
                Vídeo tutorial não configurado.
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Configure a variável de ambiente VITE_COORD_TUTORIAL_URL ou adicione uma entrada na tabela settings.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {videoUrl && (
            <Button
              variant="outline"
              onClick={handleOpenExternal}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Assistir no YouTube
            </Button>
          )}
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
