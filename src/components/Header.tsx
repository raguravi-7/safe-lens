import { Shield, Activity, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  isConnected: boolean;
  isAnalyzing: boolean;
}

export function Header({ isConnected, isAnalyzing }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">CITY SHIELD</h1>
              <p className="text-xs text-muted-foreground">Real-time Safety Detection</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {isAnalyzing && (
              <div className="flex items-center gap-2 rounded-full bg-primary/20 px-3 py-1.5">
                <Activity className="h-4 w-4 animate-pulse text-primary" />
                <span className="text-sm font-medium text-primary">Analyzing</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              {isConnected ? (
                <>
                  <Wifi className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-500">AI Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 text-muted-foreground" />
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
