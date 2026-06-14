"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  datasetStats,
  modelBenchmarks,
  classPerformance,
  projectJourney,
  paperSections,
  sampleScanDetections,
  sampleScanYoloDetections
} from "../utils/researchData";

// Educational descriptions for the interactive bounding boxes
const EDUCATIONAL_DESCRIPTIONS = {
  "Crown": "A dental crown is a custom-fitted cap that covers a damaged, decayed, or root-canal-treated tooth. It restores the tooth's shape, size, strength, and aesthetic appearance, protecting it from fractures.",
  "Dental Fillings": "Dental fillings are restorative materials (such as composite resins or metal amalgams) used to fill cavities left by decay, sealing the area to prevent future bacterial ingress.",
  "Endodontic Post": "An endodontic post is a metallic or carbon-fiber support rod placed inside a root canal. It provides structural anchorage for a crown when a significant portion of the natural crown has been lost.",
  "Root Canal Treated Tooth": "A tooth that has undergone root canal therapy (endodontic treatment). The infected inner pulp tissue is removed, and the empty chamber is cleaned, sealed, and filled with a biocompatible material (gutta-percha).",
  "Bridge": "A dental bridge is a fixed prosthetic restoration used to replace one or more missing teeth. It spans the gap by securing artificial teeth (pontics) to adjacent healthy teeth (abutments).",
  "Implant": "A dental implant is a titanium surgical fixture placed directly into the jawbone. It integrates with the bone (osseointegration) to act as a stable artificial root, supporting a single replacement crown or bridge."
};

// Map classes to their visual color codes
const CLASS_COLORS = {
  "Crown": "var(--color-crown)",
  "Dental Fillings": "var(--color-filling)",
  "Endodontic Post": "var(--color-post)",
  "Root Canal Treated Tooth": "var(--color-rct)",
  "Bridge": "var(--color-bridge)",
  "Implant": "var(--color-implant)"
};

export default function Home() {
  // Navigation Tabs: 'landing', 'demo', 'records', 'journey'
  const [activeTab, setActiveTab] = useState("landing");
  
  // Mobile responsive layout states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Automatically close drawer on tab selection
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeTab]);

  // Patient / Inference state
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Male");
  const [clinicalNotes, setClinicalNotes] = useState("");
  
  const [selectedImage, setSelectedImage] = useState(null); // base64 / URL
  const [selectedFile, setSelectedFile] = useState(null); // File object for API upload
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // RT-DETR result
  
  // Model controls
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.25);
  const [visibleClasses, setVisibleClasses] = useState({
    "Crown": true,
    "Dental Fillings": true,
    "Endodontic Post": true,
    "Root Canal Treated Tooth": true,
    "Bridge": true,
    "Implant": true
  });
  
  // Heatmap controls
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapBlur, setHeatmapBlur] = useState(25);
  const [heatmapIntensity, setHeatmapIntensity] = useState(0.65);
  
  // Comparison Mode
  const [compareMode, setCompareMode] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null); // YOLOv8 result
  const [isComparing, setIsComparing] = useState(false);
  
  // Detail card popup state
  const [activeBox, setActiveBox] = useState(null);

  // Local storage patient directory & analytics log records
  const [records, setRecords] = useState([]);
  const [analytics, setAnalytics] = useState({ total: 0, classes: {} });

  // Refs for rendering canvas overlays
  const rtdetrCanvasRef = useRef(null);
  const yoloCanvasRef = useRef(null);
  const rtdetrHeatmapRef = useRef(null);
  const yoloHeatmapRef = useRef(null);
  const rtdetrImgRef = useRef(null);
  const yoloImgRef = useRef(null);

  // Load records from localStorage on startup
  useEffect(() => {
    const saved = localStorage.getItem("dentalxnet_records");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setRecords(parsed);
        calculateAnalytics(parsed);
      } catch (e) {
        console.error("Failed to parse saved records", e);
      }
    }
  }, []);

  // Model backend status state
  const [modelStatus, setModelStatus] = useState({
    rtdetrLoaded: false,
    yoloLoaded: false,
    checked: false
  });

  // Check backend status on load and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${baseUrl}/health`);
        if (res.ok) {
          const data = await res.json();
          setModelStatus({
            rtdetrLoaded: !!data.models?.rtdetr_loaded,
            yoloLoaded: !!data.models?.yolo_loaded,
            checked: true
          });
        } else {
          setModelStatus({ rtdetrLoaded: false, yoloLoaded: false, checked: true });
        }
      } catch (err) {
        console.error("Error checking backend health status:", err);
        setModelStatus({ rtdetrLoaded: false, yoloLoaded: false, checked: true });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000); // Check status every 15s
    return () => clearInterval(interval);
  }, []);

  // Sync calculations for local analytics dashboard
  const calculateAnalytics = (data) => {
    const counts = {};
    data.forEach(rec => {
      rec.detections.forEach(det => {
        counts[det.class] = (counts[det.class] || 0) + 1;
      });
    });
    setAnalytics({
      total: data.length,
      classes: counts
    });
  };

  // Save record locally (privacy-aware IndexedDB alternative using localStorage for compatibility)
  const savePatientRecord = (results) => {
    if (!patientName.trim()) return;
    
    const newRecord = {
      id: "REC-" + Date.now(),
      patientName,
      patientAge,
      patientGender,
      clinicalNotes,
      date: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      image: selectedImage,
      detections: results.detections,
      modelUsed: compareMode ? "RT-DETR vs YOLOv8" : "RT-DETR"
    };

    const updated = [newRecord, ...records];
    setRecords(updated);
    localStorage.setItem("dentalxnet_records", JSON.stringify(updated));
    calculateAnalytics(updated);
    
    // Clear Patient Entry Form
    setPatientName("");
    setPatientAge("");
    setClinicalNotes("");
  };

  // Perform Analysis by uploading image to FastAPI backend
  const handleAnalyze = async (fileObj = selectedFile, customImageUrl = null) => {
    if (!fileObj && !customImageUrl) return;

    setIsAnalyzing(true);
    setAnalysisResult(null);
    setComparisonResult(null);
    setActiveBox(null);

    const formData = new FormData();
    if (fileObj) {
      formData.append("file", fileObj);
    }

    try {
      let response;
      if (customImageUrl) {
        // For preloaded sample scans, we fetch and send the blob
        const res = await fetch(customImageUrl);
        const blob = await res.blob();
        const sampleFile = new File([blob], "sample.png", { type: "image/png" });
        formData.append("file", sampleFile);
      }
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      response = await fetch(`${baseUrl}/analyze?model=rtdetr`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("RT-DETR analysis failed");
      const data = await response.json();
      setAnalysisResult(data);
      
      // If comparison mode is active, trigger YOLOv8 analysis concurrently
      if (compareMode) {
        setIsComparing(true);
        const yoloFormData = new FormData();
        if (fileObj) {
          yoloFormData.append("file", fileObj);
        } else {
          const res = await fetch(customImageUrl);
          const blob = await res.blob();
          const sampleFile = new File([blob], "sample.png", { type: "image/png" });
          yoloFormData.append("file", sampleFile);
        }
        
        const yoloResponse = await fetch(`${baseUrl}/analyze?model=yolov8`, {
          method: "POST",
          body: yoloFormData,
        });
        
        if (yoloResponse.ok) {
          const yoloData = await yoloResponse.json();
          setComparisonResult(yoloData);
        }
        setIsComparing(false);
      }
      
    } catch (e) {
      console.error(e);
      alert("Inference server error: Model weights are not loaded or the server is offline. Please try using the preloaded Sample Scans for local sandbox testing.");
      setAnalysisResult(null);
      setComparisonResult(null);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger YOLO analysis dynamically if toggled on after an initial analysis
  useEffect(() => {
    if (compareMode && analysisResult && !comparisonResult && !isComparing && selectedFile) {
      handleAnalyze(selectedFile, null);
    }
  }, [compareMode]);

  // Handle local file uploads
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result);
      setAnalysisResult(null);
      setComparisonResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Loader for the preloaded sample scans (bypasses backend for instant performance)
  const loadSample = (index, customPatient = null) => {
    const sampleUrls = ["/sample_opg1.png", "/sample_opg2.png", "/sample_opg3.png"];
    setSelectedFile(null);
    setSelectedImage(sampleUrls[index]);
    setActiveBox(null);
    
    // Set pre-calculated RT-DETR detections
    setAnalysisResult(sampleScanDetections[index]);
    
    // Set pre-calculated YOLOv8 baseline detections for comparison
    setComparisonResult(sampleScanYoloDetections[index]);
    
    if (customPatient) {
      setPatientName(customPatient.name);
      setPatientAge(customPatient.age);
      setPatientGender(customPatient.gender);
      setClinicalNotes(customPatient.notes);
    } else {
      // Load standard defaults
      const defaults = [
        { name: "Crown & Fillings Case Study", age: "37", gender: "Female", notes: "Posterior amalgam fillings and upper molar crown check." },
        { name: "Bridge & Implant Case Study", age: "54", gender: "Male", notes: "Lower-right quadrant bridge and dual titanium implants." },
        { name: "Endodontic Post Case Study", age: "42", gender: "Female", notes: "Root canal treated tooth with root canal support post." }
      ];
      setPatientName(defaults[index].name);
      setPatientAge(defaults[index].age);
      setPatientGender(defaults[index].gender);
      setClinicalNotes(defaults[index].notes);
    }
  };

  // Client-Side Heatmap Drawing
  const drawHeatmap = (canvas, detections, width, height) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    detections.forEach(det => {
      if (det.confidence < confidenceThreshold) return;
      if (!visibleClasses[det.class]) return;

      const [x1, y1, x2, y2] = det.bbox;
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const r = Math.max((x2 - x1), (y2 - y1)) * 0.75; // blur radius sized to box dimensions

      // Draw radial gradient for hotspots
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
      grad.addColorStop(0, "rgba(239, 68, 68, 1.0)");    // Red core
      grad.addColorStop(0.25, "rgba(245, 158, 11, 0.8)"); // Orange mid
      grad.addColorStop(0.6, "rgba(234, 179, 8, 0.4)");   // Yellow halo
      grad.addColorStop(0.9, "rgba(34, 197, 94, 0.1)");   // Green fringe
      grad.addColorStop(1, "rgba(34, 197, 94, 0)");        // Transparent

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Draw Bounding Boxes on Overlay Canvas
  const drawBoxes = (canvas, detections, width, height, activeBoxData) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, width, height);

    detections.forEach((det, idx) => {
      if (det.confidence < confidenceThreshold) return;
      if (!visibleClasses[det.class]) return;

      const [x1, y1, x2, y2] = det.bbox;
      const color = CLASS_COLORS[det.class] || "#ffffff";
      
      const isActive = activeBoxData && activeBoxData.idx === idx;
      
      // Draw Bounding Box rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = isActive ? 4 : 2;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      // Draw light box background fill
      ctx.fillStyle = isActive ? "rgba(6, 182, 212, 0.15)" : "rgba(255, 255, 255, 0.03)";
      ctx.fillRect(x1, y1, x2 - x1, y2 - y1);

      // Draw small label header
      ctx.fillStyle = color;
      ctx.font = "bold 12px sans-serif";
      const labelText = `${det.class} ${(det.confidence * 100).toFixed(0)}%`;
      const labelWidth = ctx.measureText(labelText).width + 8;
      
      ctx.fillRect(x1, Math.max(0, y1 - 20), labelWidth, 20);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(labelText, x1 + 4, Math.max(14, y1 - 5));
    });
  };

  // Re-render Canvas when parameters change
  useEffect(() => {
    if (analysisResult && rtdetrCanvasRef.current && rtdetrImgRef.current) {
      const img = rtdetrImgRef.current;
      const canvas = rtdetrCanvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      drawBoxes(canvas, analysisResult.detections, canvas.width, canvas.height, activeBox);
      
      if (showHeatmap && rtdetrHeatmapRef.current) {
        const hCanvas = rtdetrHeatmapRef.current;
        hCanvas.width = img.naturalWidth;
        hCanvas.height = img.naturalHeight;
        drawHeatmap(hCanvas, analysisResult.detections, hCanvas.width, hCanvas.height);
      }
    }
  }, [analysisResult, confidenceThreshold, visibleClasses, activeBox, showHeatmap, heatmapBlur, heatmapIntensity]);

  useEffect(() => {
    if (comparisonResult && yoloCanvasRef.current && yoloImgRef.current) {
      const img = yoloImgRef.current;
      const canvas = yoloCanvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      drawBoxes(canvas, comparisonResult.detections, canvas.width, canvas.height, null);
      
      if (showHeatmap && yoloHeatmapRef.current) {
        const hCanvas = yoloHeatmapRef.current;
        hCanvas.width = img.naturalWidth;
        hCanvas.height = img.naturalHeight;
        drawHeatmap(hCanvas, comparisonResult.detections, hCanvas.width, hCanvas.height);
      }
    }
  }, [comparisonResult, confidenceThreshold, visibleClasses, showHeatmap, heatmapBlur, heatmapIntensity]);

  // Click handler on Canvas overlay to select box
  const handleCanvasClick = (e, ref, result) => {
    if (!result || !ref.current) return;
    const canvas = ref.current;
    const rect = canvas.getBoundingClientRect();
    
    // Scale click coordinate relative to actual canvas resolution
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    
    // Find closest bounding box containing the click coordinate
    let foundBox = null;
    let minArea = Infinity;
    
    result.detections.forEach((det, idx) => {
      if (det.confidence < confidenceThreshold) return;
      if (!visibleClasses[det.class]) return;
      
      const [x1, y1, x2, y2] = det.bbox;
      if (clickX >= x1 && clickX <= x2 && clickY >= y1 && clickY <= y2) {
        const area = (x2 - x1) * (y2 - y1);
        if (area < minArea) {
          minArea = area;
          foundBox = { ...det, idx };
        }
      }
    });
    
    setActiveBox(foundBox);
  };

  // Generate and Trigger browser printing formatted clinical report
  const triggerPrintReport = () => {
    window.print();
  };

  return (
    <div className="app-container">
      
      {/* 1. MOBILE BACKDROP (closes sidebar drawer on click) */}
      <div className={`mobile-backdrop ${mobileMenuOpen ? "visible" : ""}`} onClick={() => setMobileMenuOpen(false)}></div>

      {/* 2. SIDEBAR NAVIGATION */}
      <aside className={`no-print sidebar ${mobileMenuOpen ? "open" : ""}`}>
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
          <div>
            <h1 style={{ fontSize: "20px", fontWeight: "bold", tracking: "-0.5px" }}>Dental<span style={{ color: "var(--accent-cyan)" }}>XNet</span></h1>
            <p style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1px" }}>OPG Vision Platform</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <button 
            onClick={() => setActiveTab("landing")}
            className={`nav-btn ${activeTab === "landing" ? "active" : ""}`}
            style={navBtnStyle(activeTab === "landing")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Showcase Home
          </button>

          <button 
            onClick={() => setActiveTab("gallery")}
            className={`nav-btn ${activeTab === "gallery" ? "active" : ""}`}
            style={navBtnStyle(activeTab === "gallery")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            Results Gallery
          </button>
          
          <button 
            onClick={() => setActiveTab("demo")}
            className={`nav-btn ${activeTab === "demo" ? "active" : ""}`}
            style={navBtnStyle(activeTab === "demo")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
            </svg>
            Clinical Inference
          </button>
          
          <button 
            onClick={() => setActiveTab("records")}
            className={`nav-btn ${activeTab === "records" ? "active" : ""}`}
            style={navBtnStyle(activeTab === "records")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            Patient Directory
          </button>
          
          <button 
            onClick={() => setActiveTab("journey")}
            className={`nav-btn ${activeTab === "journey" ? "active" : ""}`}
            style={navBtnStyle(activeTab === "journey")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            Project Journey
          </button>
        </nav>

        {/* Dynamic Model Status Card */}
        <div style={{
          borderTop: "1px solid var(--border-color)",
          paddingTop: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "10px"
        }}>
          <div style={{ fontSize: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Model Status</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600" }}>
              <span style={{ color: modelStatus.rtdetrLoaded ? "var(--success)" : "var(--error)" }}>
                {modelStatus.rtdetrLoaded ? "🟢" : "🔴"}
              </span>
              <span style={{ color: modelStatus.rtdetrLoaded ? "var(--text-primary)" : "var(--text-secondary)" }}>
                RT-DETR {modelStatus.rtdetrLoaded ? "Ready" : "Offline"}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: "600" }}>
              <span style={{ color: modelStatus.yoloLoaded ? "var(--success)" : "var(--error)" }}>
                {modelStatus.yoloLoaded ? "🟢" : "🔴"}
              </span>
              <span style={{ color: modelStatus.yoloLoaded ? "var(--text-primary)" : "var(--text-secondary)" }}>
                YOLOv8 {modelStatus.yoloLoaded ? "Ready" : "Offline"}
              </span>
            </div>
          </div>
          {!modelStatus.rtdetrLoaded && (
            <div style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: "1.3" }}>
              Server is loading or offline. Sample scans will run instantly in local sandbox mode.
            </div>
          )}
        </div>
      </aside>

      {/* MAIN VIEW AREA */}
      <main className="main-content">
        
        {/* MOBILE RESPONSIVE HEADER */}
        <header className="mobile-header no-print">
          <button className="mobile-menu-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            </svg>
            <h1 style={{ fontSize: "16px", fontWeight: "bold" }}>Dental<span style={{ color: "var(--accent-cyan)" }}>XNet</span></h1>
          </div>
          <div style={{ width: "36px" }}></div>
        </header>
        
        {/* E. RESULTS GALLERY TAB */}
        {activeTab === "gallery" && (
          <div className="no-print" style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "32px" }}>
            
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "6px" }}>Successful Cases Results Gallery</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Browse verified clinical outputs showcasing RT-DETR-L detections. Click any card to load the scan and play with the dynamic threshold slider, visibility filters, and density heatmaps in the Clinical Dashboard.
              </p>
            </div>

            <div className="gallery-grid">
              
              {/* Case 1: Implant Detection */}
              <div className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", height: "240px", background: "#080a11", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src="/sample_opg2.png" 
                    alt="Implant Detection Case" 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: 0.8 }}
                  />
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "8px" }}>
                    <span style={{ padding: "4px 8px", background: "var(--color-implant)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>Implant Detection</span>
                    <span style={{ padding: "4px 8px", background: "var(--success)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>91% Confidence</span>
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Titanium Implant Fixture Localization</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    This case study demonstrates automated identification of dual mandibular dental implants (quadrant 4). The proposed RT-DETR model correctly localizes both fixtures despite scattering artifacts from dense titanium. The YOLOv8 baseline misses one implant completely because of spatial overlap with surrounding bone structures.
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>Scan Reference: Scan #2</span>
                    <button 
                      onClick={() => {
                        loadSample(1, {
                          name: "Implant Case Study",
                          age: "54",
                          gender: "Female",
                          notes: "Check-up post osseointegration. Dual implant fixtures in quadrant 4."
                        });
                        setActiveTab("demo");
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "var(--accent-cyan-glow)",
                        border: "1px solid var(--accent-cyan)",
                        borderRadius: "6px",
                        color: "var(--accent-cyan)",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      Open in Clinical Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Case 2: Bridge Detection */}
              <div className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", height: "240px", background: "#080a11", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src="/sample_opg2.png" 
                    alt="Bridge Detection Case" 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: 0.8 }}
                  />
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "8px" }}>
                    <span style={{ padding: "4px 8px", background: "var(--color-bridge)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>Bridge Detection</span>
                    <span style={{ padding: "4px 8px", background: "var(--success)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>89% Confidence</span>
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Multi-Unit Fixed Prosthetic Bridge</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Visualizes fixed bridge prosthetic detection. RT-DETR leverages self-attention layers to model relational context spanning multiple tooth coordinates (abutments and pontics). This prevents bounding box splitting which is typical in convolutional baselines like YOLOv8 (which scores the bridge at a lower 68% confidence).
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>Scan Reference: Scan #2</span>
                    <button 
                      onClick={() => {
                        loadSample(1, {
                          name: "Bridge Restoration Study",
                          age: "48",
                          gender: "Male",
                          notes: "Mandibular bridge evaluation replacing lower right molars."
                        });
                        setActiveTab("demo");
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "var(--accent-cyan-glow)",
                        border: "1px solid var(--accent-cyan)",
                        borderRadius: "6px",
                        color: "var(--accent-cyan)",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      Open in Clinical Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Case 3: Crown Detection */}
              <div className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", height: "240px", background: "#080a11", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src="/sample_opg1.png" 
                    alt="Crown Detection Case" 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: 0.8 }}
                  />
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "8px" }}>
                    <span style={{ padding: "4px 8px", background: "var(--color-crown)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>Crown Detection</span>
                    <span style={{ padding: "4px 8px", background: "var(--success)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>94% Confidence</span>
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Porcelain-Fused-to-Metal Molar Crown</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    High-precision localization of a prosthetic crown restoration on the upper-left second molar (quadrant 2). RT-DETR achieves an overall crown class precision of 86.0%, mapping crown edges accurately and avoiding overlapping annotations with nearby fillings.
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>Scan Reference: Scan #1</span>
                    <button 
                      onClick={() => {
                        loadSample(0, {
                          name: "Crown Restoration Study",
                          age: "35",
                          gender: "Female",
                          notes: "Molar crown verification. Stable borders, no visible bone resorption."
                        });
                        setActiveTab("demo");
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "var(--accent-cyan-glow)",
                        border: "1px solid var(--accent-cyan)",
                        borderRadius: "6px",
                        color: "var(--accent-cyan)",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      Open in Clinical Dashboard
                    </button>
                  </div>
                </div>
              </div>

              {/* Case 4: Mixed Cases */}
              <div className="glass-panel" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ position: "relative", height: "240px", background: "#080a11", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img 
                    src="/sample_opg1.png" 
                    alt="Mixed Cases" 
                    style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain", opacity: 0.8 }}
                  />
                  <div style={{ position: "absolute", top: "12px", left: "12px", display: "flex", gap: "8px" }}>
                    <span style={{ padding: "4px 8px", background: "rgba(255,255,255,0.1)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>Mixed Case</span>
                    <span style={{ padding: "4px 8px", background: "var(--success)", borderRadius: "4px", fontSize: "10px", fontWeight: "bold" }}>Multiple Restorations</span>
                  </div>
                </div>
                <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Mixed Dentition Crown and Fillings Mapping</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Shows mixed posterior fillings and an upper molar crown. The proposed model maps four findings cleanly, filtering background anatomical density. YOLOv8 baseline exhibits over-segmentation here, generating redundant filling boxes on healthy teeth structures.
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto", paddingTop: "12px", borderTop: "1px solid var(--border-color)" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>Scan Reference: Scan #1</span>
                    <button 
                      onClick={() => {
                        loadSample(0, {
                          name: "Mixed Case Study",
                          age: "44",
                          gender: "Male",
                          notes: "Verify composite filling borders and molar crown."
                        });
                        setActiveTab("demo");
                      }}
                      style={{
                        padding: "6px 12px",
                        background: "var(--accent-cyan-glow)",
                        border: "1px solid var(--accent-cyan)",
                        borderRadius: "6px",
                        color: "var(--accent-cyan)",
                        fontSize: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      Open in Clinical Dashboard
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* A. LANDING TAB */}
        {activeTab === "landing" && (
          <div className="no-print" style={{ padding: "48px 40px", maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "56px" }}>
            
            {/* HERO SECTION */}
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "20px", marginTop: "24px" }}>
              <div style={{
                display: "inline-flex",
                alignSelf: "center",
                alignItems: "center",
                gap: "8px",
                padding: "6px 14px",
                background: "var(--accent-cyan-glow)",
                border: "1px solid var(--accent-cyan)",
                borderRadius: "999px",
                color: "var(--accent-cyan)",
                fontSize: "12px",
                fontWeight: "bold",
                textTransform: "uppercase"
              }}>
                <span className="pulse-dot" style={pulseDotStyle}></span> Research Portfolio Project
              </div>
              <h2 style={{ fontSize: "48px", fontWeight: "800", tracking: "-1px", lineHeight: "1.1" }}>
                DentalXNet: AI-Powered <br/>
                <span style={{
                  background: "linear-gradient(to right, #06b6d4, #3b82f6)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent"
                }}>OPG Radiograph Analysis System</span>
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "18px", maxWidth: "680px", margin: "0 auto", lineHeight: "1.5" }}>
                A deep learning framework using a hybrid CNN-Transformer model (RT-DETR) for automated identification and segmentation of dental treatments in panoramic OPG radiographs.
              </p>
              <div style={{ display: "flex", gap: "16px", justifyContent: "center", marginTop: "12px" }}>
                <button 
                  onClick={() => setActiveTab("demo")}
                  style={primaryBtnStyle}
                >
                  Launch Inference Demo
                </button>
                <button 
                  onClick={() => setActiveTab("gallery")}
                  style={secondaryBtnStyle}
                >
                  View Results Gallery
                </button>
              </div>
            </div>

            {/* KEY METRICS GRID */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
              {[
                { label: "Dataset Size", value: "2,235 Scans", desc: "Mendeley OPG dataset" },
                { label: "Class Count", value: "6 Treatments", desc: "Crowns, implants, fillings, etc." },
                { label: "Proposed Precision", value: "85.3%", desc: "RT-DETR-L performance" },
                { label: "mAP@0.5", value: "71.3%", desc: "+17.3% vs YOLOv8 baseline" }
              ].map((m, idx) => (
                <div key={idx} className="glass-panel" style={{ padding: "24px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "8px" }}>{m.label}</div>
                  <div style={{ fontSize: "32px", fontWeight: "bold", color: "var(--accent-cyan)", marginBottom: "4px" }}>{m.value}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{m.desc}</div>
                </div>
              ))}
            </div>

            {/* PLATFORM FEATURES */}
            <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
              <h3 style={{ fontSize: "24px", fontWeight: "bold" }}>Platform Capabilities</h3>
              <div className="capabilities-grid">
                
                <div className="glass-panel" style={{ padding: "24px", display: "flex", gap: "16px" }}>
                  <div style={iconContainerStyle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Hybrid CNN-Transformer Core</h4>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      RT-DETR combines rapid local convolution backbone feature maps with self-attention layers to model relational coordinates across the entire jaw.
                    </p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "24px", display: "flex", gap: "16px" }}>
                  <div style={iconContainerStyle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Privacy-Aware Data Architecture</h4>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      Patient identities are locked strictly inside browser LocalStorage/IndexedDB. Scan inferences are stateless, run in-memory, and immediately dumped.
                    </p>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "24px", display: "flex", gap: "16px" }}>
                  <div style={iconContainerStyle}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                      <polyline points="2 17 12 22 22 17"/>
                      <polyline points="2 12 12 17 22 12"/>
                    </svg>
                  </div>
                  <div>
                    <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "6px" }}>Interactive Vision Tools</h4>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                      Dynamic client-side canvas bounding box toggles, a confidence slider filtering, and adjustable heatmaps calculated in real time.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* DATASET CHARTS OVERVIEW */}
            <div className="glass-panel" style={{ padding: "32px", display: "flex", flexDirection: "column", gap: "24px" }}>
              <div>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "6px" }}>Mendeley Dataset Distribution</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                  Breakdown of annotated classes from the 2,235 radiographs, highlighting the imbalance challenges (such as fillings vs endodontic posts).
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {datasetStats.classDistribution.map((c, idx) => {
                  const percent = (c.count / 5900) * 100; // Relative to the largest class (fillings)
                  const color = CLASS_COLORS[c.name] || "var(--accent-cyan)";
                  return (
                    <div key={idx} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <div style={{ width: "180px", fontSize: "13px", fontWeight: "500" }}>{c.name}</div>
                      <div style={{ flex: 1, height: "10px", background: "rgba(255, 255, 255, 0.05)", borderRadius: "999px", overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", background: color, borderRadius: "999px" }}></div>
                      </div>
                      <div style={{ width: "80px", textAlign: "right", fontSize: "13px", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                        {c.count.toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* B. DEMO TAB (CLINICAL INFERENCE ENGINE) */}
        {activeTab === "demo" && (
          <div className="inference-container">
            
            {/* Patient Form & Controls Sidebar */}
            <div className="no-print inference-panel-sidebar">
              
              {/* Patient details section */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-cyan)" }}>Patient Records Input</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Patient Name</label>
                  <input type="text" placeholder="Enter Full Name" value={patientName} onChange={e => setPatientName(e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Age</label>
                    <input type="number" placeholder="Years" value={patientAge} onChange={e => setPatientAge(e.target.value)} />
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "4px" }}>
                    <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Gender</label>
                    <select value={patientGender} onChange={e => setPatientGender(e.target.value)}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Clinical Notes</label>
                  <textarea rows="2" placeholder="Scan symptoms or history..." value={clinicalNotes} onChange={e => setClinicalNotes(e.target.value)}></textarea>
                </div>
              </div>

              {/* Upload Dropzone */}
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--accent-cyan)" }}>Upload OPG Scan</h4>
                <div style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "12px",
                  padding: "20px 16px",
                  textAlign: "center",
                  background: "rgba(15, 23, 42, 0.4)",
                  cursor: "pointer",
                  position: "relative"
                }}>
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{
                    position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer"
                  }} />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "8px" }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <div style={{ fontSize: "13px", fontWeight: "500", marginBottom: "4px" }}>Select X-ray File</div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)" }}>Supports PNG, JPG, JPEG</div>
                </div>
              </div>

              {/* Quick sample scans */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Try Preloaded Sample scans</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                  {[1, 2, 3].map((num) => (
                    <button 
                      key={num} 
                      onClick={() => loadSample(num - 1)}
                      style={{
                        padding: "8px",
                        background: "rgba(30, 41, 59, 0.5)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        fontSize: "11px",
                        fontWeight: "500",
                        textAlign: "center"
                      }}
                      className="sample-scan-btn"
                    >
                      Scan #{num}
                    </button>
                  ))}
                </div>
              </div>

              {/* Confidence Threshold Slider */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label style={{ fontSize: "12px", fontWeight: "bold" }}>Confidence Slider</label>
                  <span style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent-cyan)", fontWeight: "bold" }}>
                    {(confidenceThreshold * 100).toFixed(0)}%
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0.1" 
                  max="0.9" 
                  step="0.05" 
                  value={confidenceThreshold} 
                  onChange={e => setConfidenceThreshold(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--accent-cyan)" }}
                />
              </div>

              {/* Class Filters Checkboxes */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <label style={{ fontSize: "12px", fontWeight: "bold" }}>Treatment Category Filter</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {Object.keys(visibleClasses).map((cls) => {
                    const color = CLASS_COLORS[cls];
                    return (
                      <label key={cls} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", cursor: "pointer" }}>
                        <input 
                          type="checkbox" 
                          checked={visibleClasses[cls]}
                          onChange={() => setVisibleClasses(prev => ({ ...prev, [cls]: !prev[cls] }))}
                          style={{ accentColor: color }}
                        />
                        <span style={{ display: "inline-block", width: "10px", height: "10px", borderRadius: "2px", background: color }}></span>
                        {cls}
                      </label>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Canvas Imaging Workspace */}
            <div className="inference-workspace">
              
              {/* Workspace Top Toolbar */}
              <div className="no-print" style={{
                height: "60px",
                borderBottom: "1px solid var(--border-color)",
                padding: "0 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                backgroundColor: "rgba(15, 23, 42, 0.2)"
              }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                  {/* Heatmap toggle button */}
                  <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    style={{
                      padding: "8px 14px",
                      background: showHeatmap ? "var(--accent-cyan-glow)" : "rgba(30, 41, 59, 0.4)",
                      border: showHeatmap ? "1px solid var(--accent-cyan)" : "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: showHeatmap ? "var(--accent-cyan)" : "var(--text-primary)"
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    {showHeatmap ? "Hide Density Heatmap" : "Show Density Heatmap"}
                  </button>

                  {/* YOLO comparison toggle button */}
                  <button 
                    onClick={() => setCompareMode(!compareMode)}
                    style={{
                      padding: "8px 14px",
                      background: compareMode ? "rgba(59, 130, 246, 0.2)" : "rgba(30, 41, 59, 0.4)",
                      border: compareMode ? "1px solid var(--accent-blue)" : "1px solid var(--border-color)",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color: compareMode ? "#60a5fa" : "var(--text-primary)"
                    }}
                  >
                    Compare YOLOv8
                  </button>

                  {/* Detection Density Heatmap controls */}
                  {showHeatmap && (
                    <div style={{ display: "flex", gap: "16px", borderLeft: "1px solid var(--border-color)", paddingLeft: "16px", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Blur</span>
                        <input type="range" min="10" max="50" value={heatmapBlur} onChange={e => setHeatmapBlur(parseInt(e.target.value))} style={{ width: "60px", height: "4px" }} />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>Alpha</span>
                        <input type="range" min="0.2" max="1.0" step="0.1" value={heatmapIntensity} onChange={e => setHeatmapIntensity(parseFloat(e.target.value))} style={{ width: "60px", height: "4px" }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "12px" }}>
                  {/* Save Record local action */}
                  {analysisResult && patientName.trim() && (
                    <button 
                      onClick={() => savePatientRecord(analysisResult)}
                      style={{
                        padding: "8px 14px",
                        background: "var(--success)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#ffffff"
                      }}
                    >
                      Save Case Record
                    </button>
                  )}
                  
                  {/* PDF report trigger */}
                  {analysisResult && (
                    <button 
                      onClick={triggerPrintReport}
                      style={{
                        padding: "8px 14px",
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      Export Report (PDF)
                    </button>
                  )}
                </div>
              </div>

              {/* Central Imaging Frame */}
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                overflow: "hidden",
                backgroundColor: "#080a11"
              }}>
                
                {/* Upload empty state */}
                {!selectedImage && !isAnalyzing && (
                  <div style={{ textAlign: "center", maxWidth: "360px" }}>
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--border-color)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "16px" }}>
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <circle cx="10" cy="13" r="2"/>
                      <path d="m20 17-1.4-1.4a2 2 0 0 0-2.8 0L10 21"/>
                    </svg>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>No Scan Loaded</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                      Upload a panoramic dental radiograph or select one of the preloaded sample scans to begin analysis.
                    </p>
                  </div>
                )}

                {/* Inference loading state */}
                {isAnalyzing && (
                  <div style={{ textAlign: "center" }}>
                    <div className="spinner" style={spinnerStyle}></div>
                    <h3 style={{ fontSize: "16px", fontWeight: "bold", marginTop: "16px", marginBottom: "4px" }}>Processing Radiograph</h3>
                    <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Running RT-DETR transformer-based clinical detection on CPU...</p>
                  </div>
                )}

                {/* Render Canvas Elements (Single Model View) */}
                {selectedImage && !isAnalyzing && !compareMode && (
                  <div style={{ position: "relative", maxWidth: "100%", maxHeight: "100%", display: "inline-block" }}>
                    <img 
                      ref={rtdetrImgRef}
                      src={selectedImage} 
                      alt="Dental OPG" 
                      style={{ display: "block", maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "8px" }}
                    />
                    
                    {/* Bounding Box canvas overlay */}
                    {analysisResult && (
                      <canvas 
                        ref={rtdetrCanvasRef}
                        onClick={(e) => handleCanvasClick(e, rtdetrCanvasRef, analysisResult)}
                        style={{
                          position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "crosshair", zIndex: 10
                        }}
                      />
                    )}

                    {/* Client-Side Heatmap overlay */}
                    {analysisResult && showHeatmap && (
                      <canvas 
                        ref={rtdetrHeatmapRef}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                          zIndex: 5,
                          filter: `blur(${heatmapBlur}px) opacity(${heatmapIntensity})`,
                          mixBlendMode: "screen"
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Render Canvas Elements (Dual YOLO vs RT-DETR Side-by-Side View) */}
                {selectedImage && !isAnalyzing && compareMode && (
                  <div className="canvas-scans-layout">
                    
                    {/* Left Frame: YOLOv8 Baseline */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: "bold", textTransform: "uppercase" }}>YOLOv8s Baseline</div>
                      <div style={{ position: "relative", width: "100%", display: "inline-block" }}>
                        <img 
                          ref={yoloImgRef}
                          src={selectedImage} 
                          alt="YOLO OPG" 
                          style={{ display: "block", width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: "8px" }}
                        />
                        {isComparing ? (
                          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <div className="spinner" style={{ width: "24px", height: "24px" }}></div>
                          </div>
                        ) : (
                          comparisonResult && (
                            <canvas 
                              ref={yoloCanvasRef}
                              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 10 }}
                            />
                          )
                        )}
                        {comparisonResult && showHeatmap && (
                          <canvas 
                            ref={yoloHeatmapRef}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              pointerEvents: "none",
                              zIndex: 5,
                              filter: `blur(${heatmapBlur}px) opacity(${heatmapIntensity})`,
                              mixBlendMode: "screen"
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* Right Frame: RT-DETR Proposed */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", color: "var(--accent-cyan)", fontWeight: "bold", textTransform: "uppercase" }}>RT-DETR Proposed</div>
                      <div style={{ position: "relative", width: "100%", display: "inline-block" }}>
                        <img 
                          src={selectedImage} 
                          alt="RTDETR OPG" 
                          style={{ display: "block", width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: "8px" }}
                        />
                        {analysisResult && (
                          <canvas 
                            ref={rtdetrCanvasRef}
                            onClick={(e) => handleCanvasClick(e, rtdetrCanvasRef, analysisResult)}
                            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", cursor: "crosshair", zIndex: 10 }}
                          />
                        )}
                        {analysisResult && showHeatmap && (
                          <canvas 
                            ref={rtdetrHeatmapRef}
                            style={{
                              position: "absolute",
                              top: 0,
                              left: 0,
                              width: "100%",
                              height: "100%",
                              pointerEvents: "none",
                              zIndex: 5,
                              filter: `blur(${heatmapBlur}px) opacity(${heatmapIntensity})`,
                              mixBlendMode: "screen"
                            }}
                          />
                        )}
                      </div>
                    </div>

                  </div>
                )}

              </div>

              {/* Floating educational details popup drawer */}
              {activeBox && (
                <div className="no-print glass-panel" style={{
                  position: "absolute",
                  bottom: "20px",
                  right: "20px",
                  width: "300px",
                  padding: "16px",
                  zIndex: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{
                      padding: "4px 8px",
                      background: CLASS_COLORS[activeBox.class] || "var(--accent-cyan)",
                      borderRadius: "4px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      color: "#ffffff"
                    }}>
                      {activeBox.class}
                    </span>
                    <button 
                      onClick={() => setActiveBox(null)}
                      style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "bold" }}
                    >
                      &times;
                    </button>
                  </div>
                  <div style={{ fontSize: "14px", fontWeight: "bold" }}>
                    Confidence: <span style={{ color: "var(--accent-cyan)" }}>{(activeBox.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    {EDUCATIONAL_DESCRIPTIONS[activeBox.class] || "No clinical description available for this treatment class."}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", fontStyle: "italic", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                    Note: Bounding boxes are filtered by confidence threshold controls.
                  </div>
                </div>
              )}

            </div>

            {/* PRINT-ONLY CLINICAL REPORT CONTAINER */}
            {analysisResult && (
              <div className="print-only" style={{ display: "none", padding: "40px", width: "100%" }}>
                <div style={{ borderBottom: "3px solid #000000", paddingBottom: "16px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ fontSize: "28px", fontWeight: "bold", color: "#000000" }}>DENTALXNET RADIOGRAPH REPORT</h2>
                    <p style={{ fontSize: "12px", color: "#666666" }}>Automated Panoramic X-ray Treatment Analysis Summary</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "14px", fontWeight: "bold" }}>Case ID: {Date.now().toString().slice(-6)}</div>
                    <div style={{ fontSize: "11px" }}>Date: {new Date().toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
                  <div style={{ border: "1px solid #cccccc", padding: "16px", borderRadius: "8px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Patient Demographics</h4>
                    <p><strong>Name:</strong> {patientName || "Anonymous Patient"}</p>
                    <p><strong>Age / Gender:</strong> {patientAge ? `${patientAge} Years` : "N/A"} / {patientGender}</p>
                    <p><strong>Clinical Notes:</strong> {clinicalNotes || "No symptoms or history recorded."}</p>
                  </div>
                  <div style={{ border: "1px solid #cccccc", padding: "16px", borderRadius: "8px" }}>
                    <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Scan & Model details</h4>
                    <p><strong>Primary Model:</strong> RT-DETR-L Hybrid Transformer</p>
                    <p><strong>Confidence Filter Floor:</strong> {(confidenceThreshold * 100).toFixed(0)}%</p>
                    <p><strong>Total Detections:</strong> {analysisResult.detections.filter(d => d.confidence >= confidenceThreshold).length} findings</p>
                  </div>
                </div>

                <div style={{ marginBottom: "24px" }}>
                  <h4 style={{ fontSize: "14px", fontWeight: "bold", marginBottom: "8px" }}>Findings breakdown</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #000000", textAlign: "left" }}>
                        <th style={{ padding: "8px 0" }}>Category</th>
                        <th>Confidence</th>
                        <th>Educational Context</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysisResult.detections
                        .filter(d => d.confidence >= confidenceThreshold)
                        .map((det, index) => (
                          <tr key={index} style={{ borderBottom: "1px solid #eeeeee" }}>
                            <td style={{ padding: "8px 0", fontWeight: "bold" }}>{det.class}</td>
                            <td>{(det.confidence * 100).toFixed(1)}%</td>
                            <td style={{ fontSize: "11px", color: "#444444" }}>{EDUCATIONAL_DESCRIPTIONS[det.class]}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>

                <div style={{ borderTop: "1px solid #cccccc", paddingTop: "16px", fontSize: "10px", color: "#666666", marginTop: "40px" }}>
                  <strong>Disclaimer:</strong> This report is compiled by DentalXNet, an AI research radiograph annotation tool. Detections should be verified by a licensed dental professional. Patient data remains stored strictly local to the browser client and is HIPAA-aligned.
                </div>
              </div>
            )}

          </div>
        )}

        {/* C. PATIENT DIRECTORY & LOCAL ANALYTICS TAB */}
        {activeTab === "records" && (
          <div className="no-print" style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "40px" }}>
            
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "6px" }}>Patient Records Directory</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Browse case logs saved locally in your browser cache. All personal records remain secure on your device.
              </p>
            </div>

            {/* Local Analytics Overview cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Local Scans</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--accent-cyan)", marginTop: "4px" }}>{records.length}</div>
              </div>
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Most Common Treatment</div>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "var(--text-primary)", marginTop: "10px" }}>
                  {Object.keys(analytics.classes).length > 0 
                    ? Object.keys(analytics.classes).reduce((a, b) => analytics.classes[a] > analytics.classes[b] ? a : b)
                    : "None"
                  }
                </div>
              </div>
              <div className="glass-panel" style={{ padding: "20px" }}>
                <div style={{ fontSize: "11px", color: "var(--text-secondary)", textTransform: "uppercase" }}>Total Detections Logged</div>
                <div style={{ fontSize: "28px", fontWeight: "bold", color: "var(--accent-cyan)", marginTop: "4px" }}>
                  {Object.values(analytics.classes).reduce((sum, v) => sum + v, 0)}
                </div>
              </div>
            </div>

            {/* Records List Table */}
            <div className="glass-panel" style={{ overflow: "hidden" }}>
              {records.length === 0 ? (
                <div style={{ padding: "60px", textAlign: "center", color: "var(--text-secondary)" }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: "12px", opacity: 0.5 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  <h4>No Patient Case Logs Found</h4>
                  <p style={{ fontSize: "12px", marginTop: "4px" }}>Save a case from the Clinical Inference tab to populate logs here.</p>
                </div>
              ) : (
                <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "rgba(15, 23, 42, 0.4)", borderBottom: "1px solid var(--border-color)", textAlign: "left" }}>
                        <th style={{ padding: "14px 16px" }}>Patient Name</th>
                        <th>Age / Gender</th>
                        <th>Date Logged</th>
                        <th>Detections Summary</th>
                        <th style={{ padding: "14px 16px", textAlign: "right" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r, index) => (
                        <tr key={r.id} style={{ borderBottom: index < records.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                          <td style={{ padding: "14px 16px", fontWeight: "bold", color: "var(--text-primary)" }}>{r.patientName}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{r.patientAge} Y / {r.patientGender}</td>
                          <td style={{ color: "var(--text-muted)" }}>{r.date}</td>
                          <td>
                            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                              {Array.from(new Set(r.detections.map(d => d.class))).map(cls => (
                                <span key={cls} style={{
                                  padding: "2px 6px",
                                  background: CLASS_COLORS[cls] || "rgba(255,255,255,0.05)",
                                  borderRadius: "4px",
                                  fontSize: "10px",
                                  color: "#ffffff",
                                  fontWeight: "bold"
                                }}>
                                  {cls}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <button 
                              onClick={() => {
                                // Load case back into inference tab for viewing
                                setSelectedImage(r.image);
                                setPatientName(r.patientName);
                                setPatientAge(r.patientAge);
                                setPatientGender(r.patientGender);
                                setClinicalNotes(r.clinicalNotes);
                                setAnalysisResult({ status: "success", detections: r.detections });
                                setActiveTab("demo");
                              }}
                              style={{
                                padding: "4px 10px",
                                background: "rgba(6, 182, 212, 0.1)",
                                border: "1px solid var(--accent-cyan)",
                                borderRadius: "6px",
                                color: "var(--accent-cyan)",
                                fontSize: "11px",
                                fontWeight: "bold",
                                marginRight: "8px"
                              }}
                            >
                              View scan
                            </button>
                            <button 
                              onClick={() => {
                                const updated = records.filter(item => item.id !== r.id);
                                setRecords(updated);
                                localStorage.setItem("dentalxnet_records", JSON.stringify(updated));
                                calculateAnalytics(updated);
                              }}
                              style={{
                                padding: "4px 10px",
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid var(--error)",
                                borderRadius: "6px",
                                color: "var(--error)",
                                fontSize: "11px",
                                fontWeight: "bold"
                              }}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

        {/* D. PROJECT JOURNEY TAB (RESEARCH METRICS) */}
        {activeTab === "journey" && (
          <div className="no-print" style={{ padding: "40px", maxWidth: "1000px", margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: "48px" }}>
            
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: "bold", marginBottom: "6px" }}>DentalXNet Research Journey</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>
                Experimental timelines, baseline architectures, attention integration attempts, and final transformer evaluations.
              </p>
            </div>

            {/* Model Comparison Table */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "16px" }}>Quantitative Benchmark Grid</h3>
              <div className="table-container" style={{ border: "none", borderRadius: 0 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-color)", textAlign: "left", color: "var(--text-secondary)" }}>
                      <th style={{ padding: "10px 0" }}>Architecture Model</th>
                      <th>Precision</th>
                      <th>Recall</th>
                      <th>mAP@0.5</th>
                      <th>mAP@0.5-0.95</th>
                      <th>GPU Speed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modelBenchmarks.map((b, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < modelBenchmarks.length - 1 ? "1px solid var(--border-color)" : "none" }}>
                        <td style={{ padding: "14px 0", fontWeight: "bold", color: idx === 3 ? "var(--accent-cyan)" : "var(--text-primary)" }}>{b.model}</td>
                        <td style={{ fontFamily: "monospace" }}>{b.precision.toFixed(3)}</td>
                        <td style={{ fontFamily: "monospace" }}>{b.recall.toFixed(3)}</td>
                        <td style={{ fontFamily: "monospace", fontWeight: "bold" }}>{b.map50.toFixed(3)}</td>
                        <td style={{ fontFamily: "monospace" }}>{b.map5095.toFixed(3)}</td>
                        <td style={{ color: "var(--text-secondary)" }}>{b.speed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Project Journey Timelines */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold" }}>Experimental Phases</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "20px", position: "relative", paddingLeft: "24px", borderLeft: "2px solid var(--border-color)" }}>
                {projectJourney.map((j, idx) => (
                  <div key={idx} style={{ position: "relative" }}>
                    <span style={{
                      position: "absolute",
                      left: "-31px",
                      top: "2px",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      background: idx === 3 ? "var(--accent-cyan)" : "var(--text-muted)",
                      border: "3px solid var(--bg-main)"
                    }}></span>
                    <div className="glass-panel" style={{ padding: "20px" }}>
                      <div style={{ fontSize: "11px", color: "var(--accent-cyan)", fontWeight: "bold", textTransform: "uppercase", marginBottom: "4px" }}>{j.phase}</div>
                      <h4 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>{j.title}</h4>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.4" }}>{j.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Class-wise difficulty analytics */}
            <div className="glass-panel" style={{ padding: "24px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "12px" }}>Class-wise Performance & Failure Analysis</h3>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "16px" }}>
                Analysis of detection characteristics across specific classes under the final RT-DETR-L model.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
                {classPerformance.map((c, idx) => {
                  const color = CLASS_COLORS[c.class];
                  return (
                    <div key={idx} style={{ border: "1px solid var(--border-color)", borderRadius: "8px", padding: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: "bold", fontSize: "14px" }}>{c.class}</span>
                        <span style={{
                          fontSize: "10px",
                          fontWeight: "bold",
                          padding: "2px 6px",
                          background: c.difficulty.startsWith("Hard") ? "rgba(239, 68, 68, 0.1)" : "rgba(34, 197, 94, 0.1)",
                          color: c.difficulty.startsWith("Hard") ? "var(--error)" : "var(--success)",
                          borderRadius: "4px"
                        }}>
                          {c.difficulty}
                        </span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", fontSize: "11px", color: "var(--text-secondary)", borderTop: "1px solid var(--border-color)", paddingTop: "8px" }}>
                        <div>Precision: <strong style={{ color: "var(--text-primary)" }}>{c.precision.toFixed(2)}</strong></div>
                        <div>Recall: <strong style={{ color: "var(--text-primary)" }}>{c.recall.toFixed(2)}</strong></div>
                        <div>mAP50: <strong style={{ color: "var(--text-primary)" }}>{c.map50.toFixed(2)}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: "24px", padding: "16px", border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.02)", borderRadius: "8px" }}>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", color: "var(--error)", marginBottom: "6px" }}>Key Limitation: Endodontic Posts Recall (34.5%)</h4>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  Endodontic Posts represent small, thin structures with minimal contrast compared to root-canal-filling material (Gutta-percha). The model achieves high precision (92.9% - avoiding false alarms) but struggles with coverage, resulting in a low recall. Addressing this remains a priority for future loss weighting investigations.
                </p>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
}

// Inline Styles Helper
const navBtnStyle = (isActive) => ({
  display: "flex",
  alignItems: "center",
  gap: "12px",
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: isActive ? "bold" : "500",
  textAlign: "left",
  color: isActive ? "var(--accent-cyan)" : "var(--text-secondary)",
  background: isActive ? "var(--accent-cyan-glow)" : "transparent",
  border: isActive ? "1px solid var(--accent-cyan)" : "1px solid transparent",
  transition: "all 0.2s"
});

const primaryBtnStyle = {
  padding: "12px 24px",
  background: "linear-gradient(to right, #06b6d4, #3b82f6)",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold",
  color: "#ffffff",
  boxShadow: "0 4px 14px rgba(6, 182, 212, 0.4)",
  transform: "translateY(0)"
};

const secondaryBtnStyle = {
  padding: "12px 24px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid var(--border-color)",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "bold",
  color: "var(--text-primary)"
};

const iconContainerStyle = {
  width: "44px",
  height: "44px",
  background: "var(--accent-cyan-glow)",
  borderRadius: "10px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0
};

const spinnerStyle = {
  width: "36px",
  height: "36px",
  border: "3px solid rgba(6, 182, 212, 0.1)",
  borderTop: "3px solid var(--accent-cyan)",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
  margin: "0 auto"
};

const pulseDotStyle = {
  display: "inline-block",
  width: "6px",
  height: "6px",
  background: "var(--accent-cyan)",
  borderRadius: "50%",
  boxShadow: "0 0 8px var(--accent-cyan)"
};
