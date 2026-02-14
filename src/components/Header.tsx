import { Shield, Activity } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isAnalyzing: boolean;
}

export function Header({ isConnected, isAnalyzing }: HeaderProps) {
  return (
    <header className="relative border-b border-border/50 bg-card/80 backdrop-blur-md overflow-hidden">
      {/* Top colorful accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-shimmer" />

      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-lg shadow-primary/30">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient tracking-tight">CITY SHIELD</h1>
              <p className="text-xs text-muted-foreground font-medium">Real-time AI Security Monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 animate-glow">
                <Activity className="h-4 w-4 animate-pulse text-primary-foreground" />
                <span className="text-sm font-semibold text-primary-foreground">Analyzing</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-border/50 bg-card/50">
              {isConnected ? (
                <>
                  <span className="status-dot status-dot-online" />
                  <span className="text-sm font-medium text-success">AI Connected</span>
                </>
              ) : (
                <>
                  <span className="status-dot status-dot-offline" />
                  <span className="text-sm text-muted-foreground">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}