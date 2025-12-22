FROM node:20-slim
WORKDIR /app
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install --force
COPY . .
RUN npm run build