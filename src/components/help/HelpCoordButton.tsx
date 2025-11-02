import { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TutorialCoordenacaoModal } from './TutorialCoordenacaoModal';
import { useAuth } from '@/lib/auth';

export function HelpCoordButton() {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  // Keyboard shortcut: ? to open
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        // Don't trigger if user is typing in an input
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return;
        }
        
        e.preventDefault();
        setOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Only show for coordenacao role
  if (profile?.role !== 'coordenacao') {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(true)}
              aria-label="Abrir tutorial da coordenação"
              title="Ajuda (Coordenação)"
              className="hidden sm:inline-flex"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Ajuda (Coordenação) - Pressione ?</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Abrir tutorial da coordenação"
        title="Ajuda (Coordenação)"
        className="sm:hidden"
      >
        <HelpCircle className="h-5 w-5" />
      </Button>

      <TutorialCoordenacaoModal open={open} onOpenChange={setOpen} />
    </>
  );
}
