import os
import io
import logging
import base64
import cv2
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DentalXNet-Backend")

app = FastAPI(title="DentalXNet: AI-Powered OPG Inference Service")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to weights
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, "model")
RTDETR_PATH = os.path.join(MODEL_DIR, "best.pt")
YOLO_PATH = os.path.join(MODEL_DIR, "yolov8s_best.pt")

# Model status flags
rtdetr_loaded = False
yolo_loaded = False

# Class names mapping
CLASS_NAMES = [
    "Crown",
    "Dental Fillings",
    "Endodontic Post",
    "Root Canal Treated Tooth",
    "Bridge",
    "Implant"
]

def load_models():
    global rtdetr_model, yolo_model, rtdetr_loaded, yolo_loaded
    
    try:
        from ultralytics import YOLO
    except ImportError as e:
        logger.error(f"Failed to import ultralytics: {e}")
        raise e

    # Load RT-DETR weights
    if not os.path.exists(RTDETR_PATH):
        raise FileNotFoundError(
            f"RT-DETR weights not found at {RTDETR_PATH}. Deployed version requires real weights."
        )
    
    try:
        logger.info("Loading RT-DETR model weights...")
        rtdetr_model = YOLO(RTDETR_PATH)
        rtdetr_loaded = True
        logger.info("RT-DETR model loaded successfully.")
    except Exception as e:
        logger.error(f"Error loading RT-DETR model: {e}")
        raise e

    # Load YOLO weights
    if not os.path.exists(YOLO_PATH):
        raise FileNotFoundError(
            f"YOLOv8 weights not found at {YOLO_PATH}. Deployed version requires real weights."
        )
        
    try:
        logger.info("Loading YOLOv8 model weights...")
        yolo_model = YOLO(YOLO_PATH)
        yolo_loaded = True
        logger.info("YOLOv8 model loaded successfully.")
    except Exception as e:
        logger.error(f"Error loading YOLOv8 model: {e}")
        raise e

# Run initial load check on startup
load_models()

@app.get("/health")
def health_check():
    return {
        "status": "online",
        "models": {
            "rtdetr_loaded": rtdetr_loaded,
            "yolo_loaded": yolo_loaded,
        },
        "message": "FastAPI is running with fully loaded model weights."
    }

@app.post("/analyze")
async def analyze_scan(
    file: UploadFile = File(...),
    model: str = Query("rtdetr", enum=["rtdetr", "yolov8"]),
    conf: float = Query(0.25, ge=0.1, le=0.9)
):
    try:
        # Read uploaded image bytes
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
        width, height = image.size
        
        # Decide which model and check load state
        active_model = None
        
        if model == "rtdetr":
            if rtdetr_loaded and rtdetr_model is not None:
                active_model = rtdetr_model
            else:
                raise HTTPException(
                    status_code=503, 
                    detail="RT-DETR model weights not loaded on the server. Please ensure best.pt is copied into the backend/model/ folder."
                )
        else:
            if yolo_loaded and yolo_model is not None:
                active_model = yolo_model
            else:
                raise HTTPException(
                    status_code=503, 
                    detail="YOLOv8 model weights not loaded on the server. Please ensure yolov8s_best.pt is copied into the backend/model/ folder."
                )
                
        # Run inference
        if True: # Always run real model inference now
            # Convert PIL Image to numpy array for ultralytics
            img_arr = np.array(image)
            
            # Run inference with user-specified confidence
            results = active_model.predict(img_arr, conf=conf, verbose=False)
            
            detections = []
            for box in results[0].boxes:
                # Bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                c = float(box.conf[0])
                cls_id = int(box.cls[0])
                
                # Retrieve class name
                class_name = active_model.names[cls_id]
                
                # Format to our uniform list
                detections.append({
                    "class": class_name,
                    "confidence": round(c, 4),
                    "bbox": [int(x1), int(y1), int(x2), int(y2)]
                })

            # Helper to convert PIL Image to base64
            def to_base64(pil_img):
                buffered = io.BytesIO()
                pil_img.save(buffered, format="JPEG", quality=85)
                img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
                return f"data:image/jpeg;base64,{img_str}"

            # 1. Generate Plotted Bounding Boxes Image
            try:
                plotted_arr = results[0].plot(line_width=2)
                plotted_pil = Image.fromarray(plotted_arr)
                image_with_boxes_b64 = to_base64(plotted_pil)
            except Exception as plot_err:
                logger.error(f"Failed to plot bounding boxes: {plot_err}")
                image_with_boxes_b64 = ""

            # 2. Generate JET Heatmap Image (OpenCV style matching Colab notebook)
            try:
                heatmap = np.zeros(img_arr.shape[:2], dtype=np.float32)
                
                # Accumulate box hits
                for box in results[0].boxes.xyxy.cpu().numpy():
                    bx1, by1, bx2, by2 = map(int, box)
                    heatmap[by1:by2, bx1:bx2] += 1
                
                if heatmap.max() != 0:
                    heatmap = heatmap / heatmap.max()
                    
                # Apply Gaussian Blur (51, 51) matching Colab
                heatmap = cv2.GaussianBlur(heatmap, (51, 51), 0)
                
                if heatmap.max() != 0:
                    heatmap = heatmap / heatmap.max()
                    
                # Map to JET colormap (returns BGR)
                heatmap_color = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
                
                # Convert heatmap color to RGB
                heatmap_color_rgb = cv2.cvtColor(heatmap_color, cv2.COLOR_BGR2RGB)
                
                # Blend: 60% original image + 40% heatmap color
                overlay = cv2.addWeighted(img_arr, 0.6, heatmap_color_rgb, 0.4, 0)
                
                heatmap_pil = Image.fromarray(overlay)
                image_with_heatmap_b64 = to_base64(heatmap_pil)
            except Exception as hm_err:
                logger.error(f"Failed to generate heatmap image: {hm_err}")
                image_with_heatmap_b64 = ""
                
            return {
                "status": "success",
                "mode": "inference",
                "model_type": model,
                "width": width,
                "height": height,
                "detections": detections,
                "image_with_boxes": image_with_boxes_b64,
                "image_with_heatmap": image_with_heatmap_b64
            }
            
    except Exception as e:
        logger.error(f"Inference pipeline failure: {e}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")
