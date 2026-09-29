FROM python:3.12-slim
WORKDIR /app
COPY ai_relay.py /app/ai_relay.py
ENV PORT=7860 PYTHONUNBUFFERED=1
EXPOSE 7860
USER 1000
CMD ["python", "ai_relay.py"]
