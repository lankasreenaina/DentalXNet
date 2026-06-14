// DentalXNet Research & Experimental Benchmark Data

export const datasetStats = {
  totalScans: 2235,
  totalClasses: 6,
  source: "Mendeley Dental OPG Dataset",
  classDistribution: [
    { name: "Crown", count: 1500, description: "Artificial caps placed over teeth to restore structure" },
    { name: "Dental Fillings", count: 5900, description: "Restorations used to fill cavities and decay" },
    { name: "Endodontic Post", count: 650, description: "Metal post inserted into a root canal for support" },
    { name: "Root Canal Treated Tooth", count: 1400, description: "Teeth that have undergone endodontic therapy" },
    { name: "Bridge", count: 620, description: "Dental prosthetic replacing one or more missing teeth" },
    { name: "Implant", count: 850, description: "Surgical fixture placed into jawbone to support crowns" }
  ]
};

export const modelBenchmarks = [
  {
    model: "YOLOv8 Baseline",
    precision: 0.570,
    recall: 0.650,
    map50: 0.608,
    map5095: 0.437,
    speed: "11 ms",
    complexity: "O(n) local convs",
    params: "3.2M",
    verdict: "Fast but high rate of false positives on dental treatments."
  },
  {
    model: "YOLOv8 + SE Attention",
    precision: 0.620,
    recall: 0.680,
    map50: 0.650,
    map5095: 0.460,
    speed: "12 ms",
    complexity: "O(n) + channel attention",
    params: "3.4M",
    verdict: "Slight improvement in rare classes; naive attention placement."
  },
  {
    model: "YOLOv8s (Optimized @ 800px)",
    precision: 0.690,
    recall: 0.650,
    map50: 0.706,
    map5095: 0.527,
    speed: "18 ms",
    complexity: "O(n) local convs",
    params: "11.2M",
    verdict: "Best convolutional baseline. Strong on bridges and fillings."
  },
  {
    model: "RT-DETR (Proposed)",
    precision: 0.853,
    recall: 0.638,
    map50: 0.713,
    map5095: 0.537,
    speed: "47 ms",
    complexity: "O(n²) global attention",
    params: "32.9M",
    verdict: "Superior precision and localized accuracy. Captures long-range jaw context."
  }
];

export const classPerformance = [
  { class: "Crown", precision: 0.860, recall: 0.638, map50: 0.616, difficulty: "Moderate" },
  { class: "Dental Fillings", precision: 0.829, recall: 0.759, map50: 0.784, difficulty: "Easy" },
  { class: "Endodontic Post", precision: 0.929, recall: 0.345, map50: 0.584, difficulty: "Hard (Thin & Low Contrast)" },
  { class: "Root Canal Treated Tooth", precision: 0.758, recall: 0.516, map50: 0.629, difficulty: "Moderate" },
  { class: "Bridge", precision: 0.946, recall: 0.797, map50: 0.856, difficulty: "Easy (High Contrast)" },
  { class: "Implant", precision: 0.798, recall: 0.769, map50: 0.810, difficulty: "Easy (Visually Distinct)" }
];

export const projectJourney = [
  {
    phase: "1. Baseline Setup",
    title: "YOLOv8n Initial Model",
    description: "Evaluated YOLOv8n baseline at 640x640 resolution. Achieved 60.8% mAP50, but model showed severe limitations on small, thin objects (e.g. Endodontic Posts at 0.13 mAP50). Fast inference (11ms) but low precision (57%)."
  },
  {
    phase: "2. Capacity Scaling",
    title: "YOLOv8s Upgrades",
    description: "Scaled model parameters from Nano to Small. Observed minor capacity improvements across primary classes (mAP50-95 increased from 0.422 to 0.437). However, low-contrast structures remained poorly detected, confirming capacity alone is insufficient."
  },
  {
    phase: "3. Channel Attention",
    title: "Squeeze-and-Excitation Integration",
    description: "Attempted naive injection of Squeeze-and-Excitation (SE) Attention after the SPPF layer to focus channel features. Performance dropped (mAP50 degraded to 0.468). Rationale: Channel squeeze over-suppressed low-contrast features in highly imbalanced classes."
  },
  {
    phase: "4. Global Context modeling",
    title: "Real-Time Detection Transformer (RT-DETR)",
    description: "Implemented RT-DETR, replacing anchor-based heads with transformer attention. The AIFI module allowed global feature interactions, increasing mAP50 to 71.3% and precision to 85.3% (a 49.6% jump). The model effectively localized complex treatments like implants and bridges."
  }
];

// Pre-calculated detections for the 3 preloaded sample scans to run instant local demos
export const sampleScanDetections = [
  {
    // Scan #1: Crown and Fillings focus
    width: 800,
    height: 400,
    detections: [
      { class: "Crown", confidence: 0.94, bbox: [120, 150, 184, 220] },
      { class: "Dental Fillings", confidence: 0.88, bbox: [280, 160, 320, 192] },
      { class: "Dental Fillings", confidence: 0.84, bbox: [440, 168, 464, 192] },
      { class: "Dental Fillings", confidence: 0.79, bbox: [210, 172, 245, 202] }
    ]
  },
  {
    // Scan #2: Bridge and Implants focus
    width: 800,
    height: 400,
    detections: [
      { class: "Bridge", confidence: 0.89, bbox: [520, 210, 656, 270] },
      { class: "Implant", confidence: 0.91, bbox: [544, 250, 584, 320] },
      { class: "Implant", confidence: 0.88, bbox: [608, 250, 648, 320] }
    ]
  },
  {
    // Scan #3: Endodontics focus (RCT + Posts)
    width: 800,
    height: 400,
    detections: [
      { class: "Root Canal Treated Tooth", confidence: 0.81, bbox: [360, 208, 408, 312] },
      { class: "Endodontic Post", confidence: 0.58, bbox: [376, 224, 392, 288] }
    ]
  }
];

// Pre-calculated YOLOv8 baseline detections for the 3 sample scans to show dynamic comparisons instantly
export const sampleScanYoloDetections = [
  {
    // Scan #1: Crown and Fillings focus
    width: 800,
    height: 400,
    detections: [
      { class: "Crown", confidence: 0.82, bbox: [112, 146, 192, 224] },
      { class: "Dental Fillings", confidence: 0.74, bbox: [288, 148, 328, 196] },
      { class: "Dental Fillings", confidence: 0.55, bbox: [224, 160, 256, 180] } // false positive
    ]
  },
  {
    // Scan #2: Bridge and Implants focus
    width: 800,
    height: 400,
    detections: [
      { class: "Bridge", confidence: 0.68, bbox: [528, 216, 664, 288] },
      { class: "Implant", confidence: 0.71, bbox: [536, 254, 592, 324] } // missed second implant
    ]
  },
  {
    // Scan #3: Endodontics focus
    width: 800,
    height: 400,
    detections: [
      { class: "Root Canal Treated Tooth", confidence: 0.62, bbox: [352, 204, 416, 316] } // missed post
    ]
  }
];


export const paperSections = {
  abstract: `Panoramic dental radiographs, or Orthopantomograms (OPGs), are standard diagnostic tools in dentistry. Manual identification of multiple restorations and treatments (crowns, fillings, bridges, implants, posts) is tedious and prone to subjectivity. This work presents DentalXNet, an AI-powered system evaluating CNN baseline models against hybrid CNN-Transformer architectures. By replacing traditional local convolution pipelines with an RT-DETR-based architecture, we capture global contextual relationships across the entire jawline. Evaluated on the Mendeley Dental Dataset of 2,235 radiographs, RT-DETR achieved a superior precision of 0.853 and mAP50 of 0.713, offering a reliable, explainable framework for automated clinical radiograph screening.`,
  
  methodology: `Our pipeline consists of a Convolutional Backbone (HGNetv2) to extract spatial details, a Squeeze-and-Excitation (SE) module to recalibrate feature channels, and a Real-Time Detection Transformer (RT-DETR) encoder-decoder. The Transformer's self-attention mechanism models global correlations, ensuring that dense metallic restorations (like bridges) do not overlap or confuse surrounding structures. Unlike standard anchor-based object detectors, our approach is anchor-free, avoiding Non-Maximum Suppression (NMS) bottlenecks during inference.`,
  
  failureAnalysis: `While the RT-DETR model outperforms CNN architectures, certain classes remain challenging. Endodontic Posts achieved a high precision (92.9%) but a low recall of 0.345. These posts are thin, metallic pins inserted inside root canals. They are low-contrast and visually similar to Gutta-percha root canal fillings, leading to false negatives. This class imbalance (only 650 post instances vs 5,900 fillings) presents a key opportunity for future research in specialized focal loss functions.`,
  
  futureScope: `Future enhancements include: (1) Integration of 3D CBCT (Cone Beam Computed Tomography) volumetric scans. (2) Pixel-level instance segmentation for tooth numbering and tooth decay boundary detection. (3) Lightweight quantization (INT8/FP16 ONNX export) to facilitate client-side in-browser WebGL/WebGPU local inference without backend dependency.`
};
