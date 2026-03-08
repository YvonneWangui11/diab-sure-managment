import { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AskYvonne } from './AskYvonne';
import yvonneAvatar from '@/assets/yvonne-avatar.png';

export const FloatingYvonneButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 md:bottom-8 right-6 md:right-8 h-16 w-16 md:h-20 md:w-20 rounded-full shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 z-50 p-0 overflow-hidden border-4 border-white/20 bg-gradient-to-br from-primary to-primary/80"
        aria-label="Ask Dr. Yvonne - AI Health Assistant"
      >
        <img 
          src={yvonneAvatar} 
          alt="Dr. Yvonne - Your AI Health Assistant" 
          className="h-full w-full object-cover"
        />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 overflow-hidden border-2">
          <div className="h-full flex flex-col bg-gradient-to-b from-background to-muted/10">
            <div className="flex items-center justify-between px-6 py-5 border-b bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={yvonneAvatar} 
                    alt="Dr. Yvonne" 
                    className="h-14 w-14 rounded-full border-3 border-primary/20 shadow-lg"
                  />
                  <div className="absolute bottom-0 right-0 h-4 w-4 bg-green-500 rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">Dr. Yvonne</h2>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <span className="inline-block h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
                    Your AI Diabetes Care Assistant
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AskYvonne />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
