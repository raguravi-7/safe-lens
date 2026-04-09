import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Trash2, Download } from 'lucide-react';
import type { Detection, SeverityLevel } from '@/types/detection';
import { CATEGORY_CONFIG, SEVERITY_CONFIG, ALERT_CATEGORIES } from '@/types/detection';
import { format } from 'date-fns';

interface AlertPanelProps {
  detections: Detection[];
  onClear: () => void;
  onExport: () => void;
}

export function AlertPanel({ detections, onClear, onExport }: AlertPanelProps) {
  // Only show alerts for fighting, road accidents, and fire emergencies
  const alertDetections = detections.filter(d => ALERT_CATEGORIES.includes(d.category));
  const criticalCount = alertDetections.filter(d => d.severity === 'critical').length;
  const warningCount = alertDetections.filter(d => d.severity === 'warning').length;
  const infoCount = alertDetections.filter(d => d.severity === 'info').length;

  return (
    <div className="glass flex h-full flex-col rounded-xl border border-border/50">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <Bell className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Alerts</h2>
          {alertDetections.length > 0 && (
            <Badge className="ml-2 bg-primary/20 text-primary">
              {alertDetections.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onExport} title="Export" className="hover:bg-primary/10 hover:text-primary">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} title="Clear all" className="hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border/50 p-3">
        <StatBadge severity="critical" count={criticalCount} />
        <StatBadge severity="warning" count={warningCount} />
        <StatBadge severity="info" count={infoCount} />
      </div>

      <ScrollArea className="flex-1 p-2">
        {alertDetections.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p className="text-sm">No alerts — monitoring for fights, accidents & fires</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alertDetections.map(detection => (
              <AlertItem key={detection.id} detection={detection} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function StatBadge({ severity, count }: { severity: SeverityLevel; count: number }) {
  const config = SEVERITY_CONFIG[severity];
  
  return (
    <div
      className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: `${config.bgColor}20`,
        color: config.bgColor,
      }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: config.bgColor }} />
      {count} {config.label}
    </div>
  );
}

function AlertItem({ detection }: { detection: Detection }) {
  const config = CATEGORY_CONFIG[detection.category];
  const severityConfig = SEVERITY_CONFIG[detection.severity];
  const isCritical = detection.severity === 'critical';

  return (
    <div
      className={`rounded-lg border bg-card/30 p-3 transition-all hover:bg-accent/30 ${isCritical ? 'animate-pulse-alert' : ''}`}
      style={{ borderColor: `${severityConfig.bgColor}40` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{config.icon}</span>
          <div>
            <p className="font-medium text-foreground">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {format(detection.timestamp, 'HH:mm:ss')}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge
            className="text-xs"
            style={{
              backgroundColor: `${severityConfig.bgColor}20`,
              color: severityConfig.bgColor,
              borderColor: severityConfig.bgColor,
            }}
          >
            {severityConfig.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {Math.round(detection.confidence * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
