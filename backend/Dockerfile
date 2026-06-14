# Use lightweight Python base image
FROM python:3.9-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860

# Install system dependencies if needed (e.g. git for clone)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Set up user permissions for Hugging Face container safety
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Copy dependency requirements
COPY --chown=user requirements.txt .

# Install dependencies (use --no-cache-dir to minimize container footprint)
RUN pip install --no-cache-dir --upgrade -r requirements.txt

# Copy application source code
COPY --chown=user . .

# Expose Hugging Face Space port
EXPOSE 7860

# Command to launch the API server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
