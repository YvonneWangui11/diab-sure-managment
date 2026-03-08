import { Component, ErrorInfo, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isOffline: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    isOffline: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.setState({ isOffline: !navigator.onLine });
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.setState({ isOffline: false });
    if (this.state.hasError) {
      this.handleReset();
    }
  };

  private handleOffline = () => {
    this.setState({ isOffline: true });
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isNetworkError = this.state.error?.message?.includes('fetch') || 
                              this.state.error?.message?.includes('network') ||
                              this.state.isOffline;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4" role="alert" aria-live="assertive">
          <Card className="max-w-md w-full shadow-elevated">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                {isNetworkError ? (
                  <WifiOff className="h-8 w-8 text-destructive" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
                )}
              </div>
              <CardTitle className="text-xl">
                {isNetworkError ? "Connection Lost" : "Something went wrong"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                {isNetworkError 
                  ? "Please check your internet connection and try again."
                  : "We apologize for the inconvenience. Please try again or return to the home page."
                }
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={this.handleReset} className="min-h-[44px]">
                  <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="min-h-[44px]">
                  <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                  Go Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <>
        {this.state.isOffline && (
          <div className="fixed top-0 left-0 right-0 z-[100] bg-destructive text-destructive-foreground text-center py-2 text-sm font-medium" role="alert">
            <WifiOff className="h-4 w-4 inline mr-2" aria-hidden="true" />
            You're offline. Some features may not work.
          </div>
        )}
        {this.props.children}
      </>
    );
  }
}

/** Lightweight error boundary for lazy-loaded page sections */
interface PageErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
}

interface PageErrorState {
  hasError: boolean;
  error: Error | null;
}

export class PageErrorBoundary extends Component<PageErrorBoundaryProps, PageErrorState> {
  public state: PageErrorState = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): PageErrorState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Page error:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-4" role="alert">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to load this section</h3>
          <p className="text-muted-foreground text-center mb-4 max-w-sm">
            This could be due to a temporary issue. Please try again.
          </p>
          <Button onClick={this.handleRetry} className="min-h-[44px]">
            <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
