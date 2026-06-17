import io
import sys
from fastapi.testclient import TestClient
from PIL import Image

# Import app
try:
    from app import app
except ImportError:
    # Append path if running from parent directory
    import os
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    from app import app

client = TestClient(app)

def test_health_endpoint():
    print("Testing /health endpoint...")
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    print(f"Health Response: {data}")
    assert data["status"] == "online"
    assert "models" in data
    print("[OK] Health check test passed.")

def test_analyze_endpoint_rtdetr():
    print("\nTesting /analyze endpoint with RT-DETR model...")
    # Create an in-memory black image for testing (640x480)
    img = Image.new("RGB", (640, 480), color="black")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()
    
    # Send image to API
    response = client.post(
        "/analyze?model=rtdetr",
        files={"file": ("test_opg.jpg", img_bytes, "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    print(f"Inference Mode: {data.get('mode')}")
    print(f"Model Type: {data.get('model_type')}")
    print(f"Image Resolution: {data.get('width')}x{data.get('height')}")
    print(f"Detections Count: {len(data.get('detections', []))}")
    
    assert data["status"] == "success"
    assert data["width"] == 640
    assert data["height"] == 480
    assert "detections" in data
    assert "image_with_boxes" in data
    assert "image_with_heatmap" in data
    
    # Assert mock detections are returned as expected
    if data["mode"] == "mock":
        assert len(data["detections"]) > 0
        print(f"Sample Detections: {data['detections'][:2]}")
        print("[OK] Mock inference test passed.")
    else:
        print("[OK] Inference model run completed.")

def test_analyze_endpoint_yolov8():
    print("\nTesting /analyze endpoint with YOLOv8 model...")
    img = Image.new("RGB", (800, 600), color="gray")
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="JPEG")
    img_bytes = img_byte_arr.getvalue()
    
    response = client.post(
        "/analyze?model=yolov8",
        files={"file": ("test_opg.jpg", img_bytes, "image/jpeg")}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["width"] == 800
    assert data["height"] == 600
    assert data["model_type"] == "yolov8"
    assert "image_with_boxes" in data
    assert "image_with_heatmap" in data
    print(f"[OK] Model compare endpoint validation passed. Detections count: {len(data['detections'])}")

if __name__ == "__main__":
    print("=== DENTALXNET BACKEND VERIFICATION ===")
    try:
        test_health_endpoint()
        test_analyze_endpoint_rtdetr()
        test_analyze_endpoint_yolov8()
        print("\n=== ALL BACKEND TESTS PASSED ===")
    except AssertionError as e:
        print(f"\n[ERROR] Test validation failed: Assertion Error.")
        sys.exit(1)
    except Exception as e:
        print(f"\n[ERROR] Test validation failed: {str(e)}")
        sys.exit(1)
