import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, Trash2, Download } from 'lucide-react';
import type { Detection, SeverityLevel } from '@/types/detection';
import { CATEGORY_CONFIG, SEVERITY_CONFIG } from '@/types/detection';
import { format } from 'date-fns';

interface AlertPanelProps {
  detections: Detection[];
  onClear: () => void;
  onExport: () => void;
}

export function AlertPanel({ detections, onClear, onExport }: AlertPanelProps) {
  const criticalCount = detections.filter(d => d.severity === 'critical').length;
  const warningCount = detections.filter(d => d.severity === 'warning').length;
  const infoCount = detections.filter(d => d.severity === 'info').length;

  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Alerts</h2>
          {detections.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {detections.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onExport} title="Export">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} title="Clear all">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border p-3">
        <StatBadge severity="critical" count={criticalCount} />
        <StatBadge severity="warning" count={warningCount} />
        <StatBadge severity="info" count={infoCount} />
      </div>

      <ScrollArea className="flex-1 p-2">
        {detections.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p className="text-sm">No detections yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {detections.map(detection => (
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

  return (
    <div
      className="rounded-lg border p-3 transition-colors hover:bg-accent/50"
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
              backgroundColor: severityConfig.bgColor,
              color: severityConfig.textColor,
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
