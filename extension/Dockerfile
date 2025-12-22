FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install --force
COPY . .
CMD ["npm", "run", "build", "--", "--watch"]