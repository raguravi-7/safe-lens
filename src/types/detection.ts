export type SeverityLevel = 'critical' | 'warning' | 'info';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  category: DetectionCategory;
  confidence: number;
  boundingBox: BoundingBox;
  severity: SeverityLevel;
  timestamp: Date;
  imageData?: string;
}

export type DetectionCategory = 
  | 'fight'
  | 'weapon_gun'
  | 'weapon_knife'
  | 'accident'
  | 'fire'
  | 'fainting'
  | 'bad_behavior'
  | 'person'
  | 'animal';

// Only these categories trigger alerts
export const ALERT_CATEGORIES: DetectionCategory[] = ['fight', 'accident', 'fire', 'weapon_gun', 'weapon_knife', 'person', 'animal'];

export interface DetectionResult {
  detections: Detection[];
  imageWidth: number;
  imageHeight: number;
  analyzedAt: Date;
}

export interface AlertEvent {
  id: string;
  detection: Detection;
  acknowledged: boolean;
  soundPlayed: boolean;
}

export const CATEGORY_CONFIG: Record<DetectionCategory, {
  label: string;
  severity: SeverityLevel;
  icon: string;
  color: string;
}> = {
  fight: { label: 'Fighting / Violence', severity: 'critical', icon: '⚔️', color: 'hsl(0, 84%, 60%)' },
  weapon_gun: { label: 'Gun', severity: 'critical', icon: '🔫', color: 'hsl(0, 84%, 60%)' },
  weapon_knife: { label: 'Knife', severity: 'critical', icon: '🔪', color: 'hsl(0, 84%, 60%)' },
  accident: { label: 'Road Accident', severity: 'critical', icon: '🚗', color: 'hsl(0, 84%, 60%)' },
  fire: { label: 'Fire Emergency', severity: 'critical', icon: '🔥', color: 'hsl(15, 90%, 55%)' },
  fainting: { label: 'Fainting', severity: 'warning', icon: '😵', color: 'hsl(45, 93%, 47%)' },
  bad_behavior: { label: 'Bad Behavior', severity: 'warning', icon: '⚠️', color: 'hsl(45, 93%, 47%)' },
  person: { label: 'Person', severity: 'info', icon: '👤', color: 'hsl(142, 71%, 45%)' },
  animal: { label: 'Animal', severity: 'info', icon: '🐾', color: 'hsl(142, 71%, 45%)' },
};

export const SEVERITY_CONFIG: Record<SeverityLevel, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  critical: {
    label: 'Critical',
    bgColor: 'hsl(0, 84%, 60%)',
    textColor: 'hsl(0, 0%, 100%)',
    borderColor: 'hsl(0, 84%, 60%)',
  },
  warning: {
    label: 'Warning',
    bgColor: 'hsl(45, 93%, 47%)',
    textColor: 'hsl(0, 0%, 0%)',
    borderColor: 'hsl(45, 93%, 47%)',
  },
  info: {
    label: 'Info',
    bgColor: 'hsl(142, 71%, 45%)',
    textColor: 'hsl(0, 0%, 100%)',
    borderColor: 'hsl(142, 71%, 45%)',
  },
};
