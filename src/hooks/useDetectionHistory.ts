import { useState, useCallback } from 'react';
import type { Detection, DetectionResult, SeverityLevel, DetectionCategory } from '@/types/detection';

interface HistoryEntry {
  id: string;
  result: DetectionResult;
  source: 'image' | 'camera';
  thumbnail?: string;
}

interface UseDetectionHistoryReturn {
  history: HistoryEntry[];
  addEntry: (result: DetectionResult, source: 'image' | 'camera', thumbnail?: string) => void;
  clearHistory: () => void;
  filterBySeverity: (severity: SeverityLevel | null) => HistoryEntry[];
  filterByCategory: (category: DetectionCategory | null) => HistoryEntry[];
  exportToJSON: () => string;
  getTotalDetections: () => number;
  getDetectionStats: () => Record<SeverityLevel, number>;
}

export function useDetectionHistory(): UseDetectionHistoryReturn {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const addEntry = useCallback((result: DetectionResult, source: 'image' | 'camera', thumbnail?: string) => {
    const entry: HistoryEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      result,
      source,
      thumbnail,
    };
    setHistory(prev => [entry, ...prev].slice(0, 100)); // Keep last 100 entries
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const filterBySeverity = useCallback((severity: SeverityLevel | null): HistoryEntry[] => {
    if (!severity) return history;
    return history.filter(entry => 
      entry.result.detections.some(d => d.severity === severity)
    );
  }, [history]);

  const filterByCategory = useCallback((category: DetectionCategory | null): HistoryEntry[] => {
    if (!category) return history;
    return history.filter(entry => 
      entry.result.detections.some(d => d.category === category)
    );
  }, [history]);

  const exportToJSON = useCallback((): string => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      totalEntries: history.length,
      entries: history.map(entry => ({
        id: entry.id,
        source: entry.source,
        analyzedAt: entry.result.analyzedAt,
        detections: entry.result.detections.map(d => ({
          category: d.category,
          confidence: d.confidence,
          severity: d.severity,
          boundingBox: d.boundingBox,
          timestamp: d.timestamp,
        })),
      })),
    };
    return JSON.stringify(exportData, null, 2);
  }, [history]);

  const getTotalDetections = useCallback((): number => {
    return history.reduce((sum, entry) => sum + entry.result.detections.length, 0);
  }, [history]);

  const getDetectionStats = useCallback((): Record<SeverityLevel, number> => {
    const stats: Record<SeverityLevel, number> = {
      critical: 0,
      warning: 0,
      info: 0,
    };
    
    history.forEach(entry => {
      entry.result.detections.forEach(d => {
        stats[d.severity]++;
      });
    });
    
    return stats;
  }, [history]);

  return {
    history,
    addEntry,
    clearHistory,
    filterBySeverity,
    filterByCategory,
    exportToJSON,
    getTotalDetections,
    getDetectionStats,
  };
}
