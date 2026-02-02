

# AI-Powered Safety Detection System

## Overview
A dark-themed, professional dashboard for real-time safety monitoring using AI vision capabilities. The system will analyze images and live camera feeds to detect dangerous situations like fights, accidents, weapons, and more.

---

## Pages & Layout

### Main Dashboard
- **Dark theme** with a sleek, professional look
- **Header** with app title "SafeGuard AI" and mode toggle
- **Two main tabs**: "Image Analysis" and "Live Camera Analysis"
- **Alert Panel** sidebar showing real-time and historical detections
- **Status indicators** showing system health and AI connection

---

## Core Features

### 1. Image Upload Analysis
- Drag-and-drop or click-to-upload image interface
- Display uploaded image with bounding box overlays
- Detection labels with confidence scores (e.g., "Fight - 94%")
- Color-coded boxes based on severity:
  - 🔴 **Red** - Critical (Weapons, Fights, Accidents)
  - 🟡 **Yellow** - Warning (Dangerous behavior, Fainting)
  - 🟢 **Green** - Safe (People, Animals detected)
- Summary card with all detected risks

### 2. Live Camera Detection
- Webcam feed with real-time bounding box overlays
- Continuous detection every 0.5 seconds
- Live object counter per frame
- Start/Stop controls for camera feed
- Detection status indicator (Active/Paused)

### 3. Alert System
- **Sound notifications** when dangerous situations detected
- Real-time alert popup with detection details
- Alert severity badges (Critical, Warning, Info)
- Timestamp for each detection event

### 4. Detection History
- Scrollable list of all past detections
- Filterable by detection type and severity
- Thumbnail preview of detected frames/images
- Timestamps and confidence scores

### 5. Export Reports
- Download detection history as PDF report
- Export raw data as JSON
- Include screenshots with bounding boxes
- Summary statistics of all detections

---

## Detection Categories

| Category | Severity | Icon |
|----------|----------|------|
| Fight | 🔴 Critical | ⚔️ |
| Dangerous Weapons (Gun/Knife) | 🔴 Critical | 🔫 |
| Accident | 🔴 Critical | 💥 |
| Fainting | 🟡 Warning | 😵 |
| Bad Behavior | 🟡 Warning | ⚠️ |
| Person | 🟢 Info | 👤 |
| Animal | 🟢 Info | 🐾 |

---

## Technical Architecture

### Frontend (React + TypeScript)
- Webcam integration using browser MediaDevices API
- Canvas overlay for drawing bounding boxes
- Real-time state management for detections
- Audio API for alert sounds

### Backend (Supabase Edge Functions)
- **analyze-image** function: Processes images using Lovable AI vision
- Sends images to Gemini vision model for detection
- Returns structured detection results with coordinates

### AI Integration
- Uses **Lovable AI Gateway** with Gemini vision model
- Structured output using tool calling for consistent detection format
- Returns bounding box coordinates, labels, and confidence scores

---

## User Flow

1. **Launch app** → Dark dashboard loads with two mode tabs
2. **Image Mode** → Upload image → AI analyzes → Bounding boxes drawn → Alerts shown
3. **Live Mode** → Enable camera → Real-time detection starts → Continuous alerts
4. **Alert sounds** play when critical detections occur
5. **History panel** shows all past detections
6. **Export** detection report at any time

