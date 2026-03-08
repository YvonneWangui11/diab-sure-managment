import { useEffect, useCallback } from "react";

interface ShortcutMap {
  [key: string]: () => void;
}

export function useKeyboardShortcuts(
  onNavigate: (page: string) => void,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger in inputs/textareas
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable
      ) {
        return;
      }

      // Alt + key shortcuts
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const shortcuts: ShortcutMap = {
          h: () => onNavigate("dashboard"),
          g: () => onNavigate("glucose"),
          m: () => onNavigate("medications"),
          n: () => onNavigate("nutrition"),
          e: () => onNavigate("exercise"),
          a: () => onNavigate("appointments"),
          p: () => onNavigate("profile"),
          i: () => onNavigate("glucose-trends"),
          r: () => onNavigate("weekly-report"),
          t: () => onNavigate("engagement"),
          s: () => onNavigate("messages"),
        };

        const handler = shortcuts[e.key.toLowerCase()];
        if (handler) {
          e.preventDefault();
          handler();
        }
      }

      // Escape to go back to dashboard
      if (e.key === "Escape" && !e.altKey && !e.ctrlKey && !e.metaKey) {
        onNavigate("dashboard");
      }

      // ? to show help (we'll handle this via a state callback if needed)
    },
    [enabled, onNavigate]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUT_LIST = [
  { keys: "Alt + H", description: "Go to Dashboard" },
  { keys: "Alt + G", description: "Glucose Tracking" },
  { keys: "Alt + M", description: "Medications" },
  { keys: "Alt + N", description: "Nutrition" },
  { keys: "Alt + E", description: "Exercise" },
  { keys: "Alt + A", description: "Appointments" },
  { keys: "Alt + S", description: "Messages" },
  { keys: "Alt + I", description: "Insights" },
  { keys: "Alt + R", description: "Weekly Report" },
  { keys: "Alt + T", description: "Progress" },
  { keys: "Alt + P", description: "Profile" },
  { keys: "Esc", description: "Back to Dashboard" },
];
