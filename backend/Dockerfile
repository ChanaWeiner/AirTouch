FROM python:3.12-slim

ADD https://netfree.link/dl/unix-ca.sh /home/netfree-unix-ca.sh 
RUN cat /home/netfree-unix-ca.sh | sh

ENV REQUESTS_CA_BUNDLE=/etc/ca-bundle.crt
ENV SSL_CERT_FILE=/etc/ca-bundle.crt

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip config set global.trusted-host "pypi.org files.pythonhosted.org pypi.python.org github.com codeload.github.com" && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

ENV PYTHONPATH=/app

ENV PORT=8000

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}