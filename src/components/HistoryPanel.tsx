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
    <div className="glass flex h-full flex-col rounded-xl border border-border/50">
      <div className="flex items-center justify-between border-b border-border/50 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
            <History className="h-4 w-4 text-primary" />
          </div>
          <h2 className="font-semibold text-foreground">Detection History</h2>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={onExportJSON} title="Export JSON" className="hover:bg-primary/10 hover:text-primary">
            <FileJson className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onExportPDF} title="Export PDF" className="hover:bg-primary/10 hover:text-primary">
            <Download className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClear} title="Clear history" className="hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-b border-border/50 p-3">
        <Select
          value={severityFilter || 'all'}
          onValueChange={(value) => onSeverityFilterChange(value === 'all' ? null : value as SeverityLevel)}
        >
          <SelectTrigger className="w-[140px] border-border/50 bg-card/50">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent className="glass border-border/50">
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
    <div className="rounded-lg border border-border/50 bg-card/30 p-3 transition-all hover:bg-accent/30 hover:border-primary/30">
      <div className="flex items-start gap-3">
        {entry.thumbnail && (
          <img
            src={entry.thumbnail}
            alt="Detection thumbnail"
            className="h-12 w-16 rounded-lg border border-border/30 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-xs uppercase text-primary">
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
              <span className="rounded bg-critical/10 px-1.5 py-0.5 text-xs font-medium text-critical">
                {criticalCount} critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="rounded bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">
                {warningCount} warning
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
