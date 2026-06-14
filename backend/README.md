---
title: DentalXNet Backend
emoji: 🦷
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# DentalXNet FastAPI Inference Server

This repository contains the FastAPI inference server for **DentalXNet**, an AI-powered OPG dental radiograph analysis system. It runs object detection on OPG images using RT-DETR and YOLOv8 models.

## Deployment to Hugging Face Spaces

1. Create a new Space on [Hugging Face](https://huggingface.co/new-space).
2. Set the Space name to `DentalXNet-Backend` (or any name you choose).
3. Select **Docker** as the SDK.
4. Keep the template empty/blank.
5. Clone the space repository locally or upload these backend files (including `Dockerfile`, `app.py`, `requirements.txt`, and your model weights under `model/best.pt`).
6. Hugging Face will automatically read the `Dockerfile`, install the dependencies, build the environment, and spin up the container on port `7860`.

## Endpoints

- `GET /health` - Check API and model loading status.
- `POST /analyze?model=rtdetr|yolov8` - Upload OPG image and retrieve detection bounding boxes.
