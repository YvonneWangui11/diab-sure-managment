import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

interface InactivityWarningProps {
  open: boolean;
  remainingSeconds: number;
  onStayActive: () => void;
  onLogout: () => void;
}

export const InactivityWarning = ({
  open,
  remainingSeconds,
  onStayActive,
  onLogout,
}: InactivityWarningProps) => {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeStr = minutes > 0 
    ? `${minutes}:${seconds.toString().padStart(2, "0")}` 
    : `${seconds}s`;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-2">
            <Clock className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <AlertDialogTitle className="text-center">
            Session Timeout Warning
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Your session will expire in{" "}
            <span className="font-bold text-destructive">{timeStr}</span> due to
            inactivity. Would you like to stay signed in?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row gap-3 justify-center sm:justify-center">
          <Button variant="outline" onClick={onLogout}>
            Sign Out
          </Button>
          <Button onClick={onStayActive} autoFocus>
            Stay Signed In
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
