import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";
import { SHORTCUT_LIST } from "@/hooks/useKeyboardShortcuts";

interface KeyboardShortcutsHelpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const KeyboardShortcutsHelp = ({ open, onOpenChange }: KeyboardShortcutsHelpProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {SHORTCUT_LIST.map((shortcut) => (
            <div
              key={shortcut.keys}
              className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">{shortcut.description}</span>
              <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                {shortcut.keys}
              </kbd>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press <kbd className="px-1 py-0.5 text-xs font-mono bg-muted rounded border">?</kbd> anywhere to show this dialog.
        </p>
      </DialogContent>
    </Dialog>
  );
};
