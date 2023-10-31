# app/Dockerfile
FROM nikolaik/python-nodejs:python3.11-nodejs19


WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    && rm -rf /var/lib/apt/lists/*

# RUN git clone https://github.com/streamlit/streamlit-example.git .
ADD . /app

RUN npm install
RUN npm install engine-agents
RUN npm install -g ts-node typescript 

EXPOSE 8000

# HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

