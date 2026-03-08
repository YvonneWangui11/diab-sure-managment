import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

interface QueuedAction {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

const QUEUE_KEY = "diabesure_offline_queue";

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const processingRef = useRef(false);
  const { toast } = useToast();

  // Load queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) setQueue(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Persist queue
  useEffect(() => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }, [queue]);

  // Online/offline listeners
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Syncing queued actions...",
      });
    };
    const goOffline = () => {
      setIsOnline(false);
      toast({
        title: "You're offline",
        description: "Actions will be saved and synced when you reconnect.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [toast]);

  const enqueue = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      const action: QueuedAction = {
        id: crypto.randomUUID(),
        type,
        payload,
        timestamp: Date.now(),
      };
      setQueue((prev) => [...prev, action]);
      return action.id;
    },
    []
  );

  const dequeue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    localStorage.removeItem(QUEUE_KEY);
  }, []);

  return {
    isOnline,
    queue,
    queueLength: queue.length,
    enqueue,
    dequeue,
    clearQueue,
    isProcessing: processingRef.current,
  };
}
