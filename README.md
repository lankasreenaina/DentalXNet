# DentalXNet: AI-Powered OPG Analysis System

Automated Detection and Classification of Dental Treatments in Panoramic X-rays (OPGs) using Hybrid CNN–Transformer Architecture.

---

## 🚀 Overview

**DentalXNet** is a full-stack deep learning platform that detects and identifies six dental treatment categories in Panoramic Dental Radiographs (Orthopantomograms - OPGs). The core model leverages a hybrid CNN-Transformer architecture (**RT-DETR-L** with Squeeze-and-Excitation attention) to capture both local convolutional features and global spatial context. 

The application is deployed as a privacy-aware microservice architecture, separating the **Next.js React frontend** (which stores patient identities locally in the browser's IndexedDB) from a lightweight **FastAPI Python ML backend** running CPU inference.

### Key Metrics
- **Dataset**: Mendeley Dental OPG Dataset (2,235 radiographs)
- **Model Precision**: 85.3% (RT-DETR-L)
- **Model mAP@0.5**: 71.3% (RT-DETR-L)
- **Classes Detected**: `Crown`, `Dental Fillings`, `Endodontic Post`, `Root Canal Treated Tooth`, `Bridge`, `Implant`

---

## 📐 System Architecture & Privacy-Aware Design

To respect clinical patient privacy, the platform uses a decoupled design ensuring **sensitive identifiers never leave the client's browser**:

```
[ Dentist Web Dashboard (Next.js) ]
  ├── Client Identity Info ──────> [ Browser IndexedDB (Local Storage) ]
  └── Raw Radiograph Scan ───────> [ FastAPI Backend (Hugging Face Spaces) ]
                                      └── RT-DETR CPU Inference (In-Memory Only)
                                      └── Returns: JSON Bounding Boxes
  ├── Client Density Heatmap Builder <─────────┘
  └── Interactive Visualizer
```

- **Metadata Security**: No database is used. Patient demographics (Name, Age, Notes) are encrypted and stored inside the browser's local sandbox.
- **Stateless Inference**: Images sent to the backend are processed entirely in memory and immediately discarded.

---

## 📈 Benchmarks & Experimental Results

Our study compared standard convolutional object detectors against attention-based models to address class imbalances and small, low-contrast structures (like endodontic posts).

### Overall Model Performance Comparison

| Model | Input Res | Precision | Recall | mAP50 | mAP50-95 | Inference Speed (GPU) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **YOLOv8 Baseline** | 640x640 | 0.570 | **0.650** | 0.608 | 0.437 | **11 ms** |
| **YOLOv8 + SE Attention** | 640x640 | 0.620 | 0.680 | 0.650 | 0.460 | 12 ms |
| **RT-DETR (Proposed)** | 640x640 | **0.853** | 0.638 | **0.713** | **0.537** | 47 ms |

> [!TIP]
> **Inference Latency Note**: While GPU inference is sub-50ms, inference on free-tier Hugging Face CPU spaces takes a few seconds (typically 2–5 seconds) depending on scan resolution and server load. Models are preloaded once at server startup to prevent request timeouts.

### Proposed Model Class-wise Performance (RT-DETR)

| Dental Treatment | Instances | Precision | Recall | mAP50 |
| :--- | :---: | :---: | :---: | :---: |
| **Crown** | ~1500 | 0.860 | 0.638 | 0.616 |
| **Dental Fillings** | ~5900 | 0.829 | 0.759 | 0.784 |
| **Endodontic Post** | ~650 | 0.929 | 0.345 | 0.584 |
| **Root Canal Treated Tooth** | ~1400 | 0.758 | 0.516 | 0.629 |
| **Bridge** | ~620 | 0.946 | 0.797 | 0.856 |
| **Implant** | ~850 | 0.798 | 0.769 | 0.810 |

### Experimental Takeaways
1. **Transformer Global Context (AIFI)**: Integrating the Attention-based Intra-scale Feature Interaction (AIFI) module in RT-DETR increased mAP50 by **17.3%** compared to YOLO baseline. It allowed the model to model dependencies across the entire jaw structure.
2. **Precision Improvement**: Precision improved from 0.57 to 0.853, reducing false positives.
3. **Small-Object Limitation**: Endodontic posts remain challenging due to low-contrast and small spatial width (recall 0.345), which forms the core of our failure analysis.

---

## 🛠️ Repository Layout

```
DentalXNet/
├── frontend/             # Next.js React Web Application
│   ├── public/           # Sample scans & web assets
│   └── src/
│       ├── app/          # Pages (Landing, Demo Dashboard, Records, Analytics)
│       └── components/   # Interactive Canvas, Patient Table, Charts
└── backend/              # FastAPI Python Web Service
    ├── model/            # Folder for best.pt RT-DETR weights
    └── app.py            # FastAPI routes & CPU Inference engine
```

---

## ⚙️ Local Installation & Setup

### Prerequisites
- Node.js (v18+) & npm
- Python (3.9+)

### 1. Backend Setup (Inference Server)
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Place your trained model weights (`best.pt` and `yolov8s_best.pt`) inside the `backend/model/` directory. The backend verifies loading of weights at startup, failing immediately with a `FileNotFoundError` if weights are missing to avoid production mock fallbacks.
5. Launch the FastAPI server:
   ```bash
   uvicorn app:app --reload --port 8000
   ```
   The API will be live at `http://localhost:8000`.

### 2. Frontend Setup (Next.js Dashboard)
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the environment variables in a `.env.local` file:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

---

## 🔬 Core Innovations

- **Interactive Vision Overlays**: Frontend overlays canvas-rendered bounding boxes. User controls adjust the confidence threshold slider and filter category layers live.
- **Detection Density Heatmaps**: Calculated client-side using OPG box coordinate densities via canvas-blur overlays, minimizing backend processing load and network latency.
- **Dual-Model Comparison**: Evaluates YOLOv8 and RT-DETR models side-by-side to visualize precision advancements.
