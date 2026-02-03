import { Shield, Activity, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isAnalyzing: boolean;
}

export function Header({ isConnected, isAnalyzing }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary shadow-lg">
              <Shield className="h-7 w-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient tracking-tight">CITY SHIELD</h1>
              <p className="text-xs text-muted-foreground font-medium">Real-time AI Security Monitoring</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 rounded-full bg-primary/20 px-4 py-2 border border-primary/30 animate-glow">
                <Activity className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-sm font-semibold text-primary">Analyzing</span>
              </div>
            )}
            
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
              {isConnected ? (
                <>
                  <span className="status-dot status-dot-online" />
                  <span className="text-sm font-medium text-emerald-400">AI Connected</span>
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
