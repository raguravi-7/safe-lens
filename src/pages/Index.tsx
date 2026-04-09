import { useState, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { AlertPanel } from '@/components/AlertPanel';
import { VideoAnalysisView } from '@/components/VideoAnalysisView';
import { LiveCameraView } from '@/components/LiveCameraView';
import { HistoryPanel } from '@/components/HistoryPanel';
import { useAlertSound } from '@/hooks/useAlertSound';
import { useDetectionHistory } from '@/hooks/useDetectionHistory';
import { analyzeImage } from '@/lib/analyzeImage';
import type { Detection, SeverityLevel } from '@/types/detection';
import { ALERT_CATEGORIES } from '@/types/detection';
import { Film, Video } from 'lucide-react';
import { toast } from 'sonner';

export default function Index() {
  const [activeTab, setActiveTab] = useState<'image' | 'camera'>('image');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConnected] = useState(true);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | null>(null);

  const { playAlertSound } = useAlertSound();
  const { history, addEntry, clearHistory, exportToJSON, getDetectionStats } = useDetectionHistory();

  const handleAnalyze = useCallback(async (imageBase64: string, mode: 'image' | 'camera' = 'image') => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeImage(imageBase64, mode);
      setDetections(result.detections);
      
      addEntry(result, mode, imageBase64);

      // Only alert for fighting, road accidents, and fire emergencies
      const alertDetections = result.detections.filter(d => ALERT_CATEGORIES.includes(d.category));
      
      if (alertDetections.length > 0) {
        playAlertSound('critical');
        const labels = alertDetections.map(d => {
          if (d.category === 'fight') return '⚔️ Fighting/Violence';
          if (d.category === 'accident') return '🚗 Road Accident';
          if (d.category === 'fire') return '🔥 Fire Emergency';
          return d.category;
        });
        toast.error('🚨 EMERGENCY ALERT!', {
          description: [...new Set(labels)].join(', '),
          duration: 8000,
        });
      }
    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Analysis failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [addEntry, playAlertSound]);

  const handleCameraFrame = useCallback(async (imageBase64: string) => {
    await handleAnalyze(imageBase64, 'camera');
  }, [handleAnalyze]);

  const handleClearAlerts = useCallback(() => {
    setDetections([]);
  }, []);

  const handleExportAlerts = useCallback(() => {
    const json = exportToJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeguard-detections-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Export complete');
  }, [exportToJSON]);

  const handleExportPDF = useCallback(() => {
    // Simple PDF export (text-based)
    const stats = getDetectionStats();
    const content = `
SafeGuard AI Detection Report
Generated: ${new Date().toLocaleString()}

Summary:
- Critical detections: ${stats.critical}
- Warning detections: ${stats.warning}
- Info detections: ${stats.info}

Total entries: ${history.length}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `safeguard-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Report exported');
  }, [history, getDetectionStats]);

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Floating orbs background */}
      <div className="floating-orbs">
        <div className="floating-orb floating-orb-1" />
        <div className="floating-orb floating-orb-2" />
        <div className="floating-orb floating-orb-3" />
        <div className="floating-orb floating-orb-4" />
        <div className="floating-orb floating-orb-5" />
      </div>

      <Header isConnected={isConnected} isAnalyzing={isAnalyzing} />
      
      <main className="flex flex-1 gap-4 p-4">
        {/* Main content area */}
        <div className="flex flex-1 flex-col gap-4">
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => setActiveTab(v as 'image' | 'camera')}
            className="flex-1"
          >
            <TabsList className="glass grid w-full max-w-md grid-cols-2 border border-border/50">
              <TabsTrigger value="image" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Film className="h-4 w-4" />
                Video Analysis
              </TabsTrigger>
              <TabsTrigger value="camera" className="gap-2 data-[state=active]:bg-gradient-primary data-[state=active]:text-primary-foreground">
                <Video className="h-4 w-4" />
                Live Camera
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="mt-4">
              <div className="glass rounded-xl border border-border/30 p-6 shadow-lg shadow-primary/5">
                <VideoAnalysisView
                  onAnalyze={handleAnalyze}
                  detections={detections}
                  isAnalyzing={isAnalyzing}
                />
              </div>
            </TabsContent>

            <TabsContent value="camera" className="mt-4">
              <div className="glass rounded-xl border border-border/30 p-6 shadow-lg shadow-secondary/5">
                <LiveCameraView
                  onFrameCapture={handleCameraFrame}
                  detections={detections}
                  isAnalyzing={isAnalyzing}
                  isActive={cameraActive}
                  onToggle={setCameraActive}
                />
              </div>
            </TabsContent>
          </Tabs>

          {/* History Panel */}
          <div className="h-[300px]">
            <HistoryPanel
              history={history}
              onClear={clearHistory}
              onExportJSON={handleExportAlerts}
              onExportPDF={handleExportPDF}
              severityFilter={severityFilter}
              onSeverityFilterChange={setSeverityFilter}
              stats={getDetectionStats()}
            />
          </div>
        </div>

        {/* Alert Panel Sidebar */}
        <aside className="w-80 shrink-0">
          <AlertPanel
            detections={detections}
            onClear={handleClearAlerts}
            onExport={handleExportAlerts}
          />
        </aside>
      </main>
    </div>
  );
}
