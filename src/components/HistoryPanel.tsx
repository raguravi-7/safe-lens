import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Download, FileJson, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Detection, SeverityLevel, DetectionCategory } from '@/types/detection';
import { CATEGORY_CONFIG, SEVERITY_CONFIG } from '@/types/detection';

interface HistoryEntry {
  id: string;
  result: {
    detections: Detection[];
    analyzedAt: Date;
  };
  source: 'image' | 'camera';
  thumbnail?: string;
}

interface HistoryPanelProps {
  history: HistoryEntry[];
  onClear: () => void;
  onExportJSON: () => void;
  onExportPDF: () => void;
  severityFilter: SeverityLevel | null;
  onSeverityFilterChange: (severity: SeverityLevel | null) => void;
  stats: Record<SeverityLevel, number>;
}

export function HistoryPanel({
  history,
  onClear,
  onExportJSON,
  onExportPDF,
  severityFilter,
  onSeverityFilterChange,
  stats,
}: HistoryPanelProps) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Detection History</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={onExportJSON} title="Export JSON">
            <FileJson className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onExportPDF} title="Export PDF">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} title="Clear history">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border p-3">
        <Select
          value={severityFilter || 'all'}
          onValueChange={(value) => onSeverityFilterChange(value === 'all' ? null : value as SeverityLevel)}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical ({stats.critical})</SelectItem>
            <SelectItem value="warning">Warning ({stats.warning})</SelectItem>
            <SelectItem value="info">Info ({stats.info})</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-muted-foreground">
          {history.length} entries
        </div>
      </div>

      <ScrollArea className="flex-1 p-2">
        {history.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-muted-foreground">
            <p className="text-sm">No history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(entry => (
              <HistoryItem key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const criticalCount = entry.result.detections.filter(d => d.severity === 'critical').length;
  const warningCount = entry.result.detections.filter(d => d.severity === 'warning').length;

  return (
    <div className="rounded-lg border border-border p-3 transition-colors hover:bg-accent/50">
      <div className="flex items-start gap-3">
        {entry.thumbnail && (
          <img
            src={entry.thumbnail}
            alt="Detection thumbnail"
            className="h-12 w-16 rounded object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase text-muted-foreground">
              {entry.source}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(entry.result.analyzedAt), 'MMM d, HH:mm:ss')}
            </span>
          </div>
          <p className="mt-1 text-sm text-foreground">
            {entry.result.detections.length} detection{entry.result.detections.length !== 1 ? 's' : ''}
          </p>
          <div className="mt-1 flex gap-2">
            {criticalCount > 0 && (
              <span className="text-xs font-medium" style={{ color: SEVERITY_CONFIG.critical.bgColor }}>
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs font-medium" style={{ color: SEVERITY_CONFIG.warning.bgColor }}>
                {warningCount} warning
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
