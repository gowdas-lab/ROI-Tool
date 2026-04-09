FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund && npm rebuild esbuild
COPY . .
EXPOSE 3000
CMD ["node_modules/.bin/vite", "--host", "0.0.0.0", "--port", "3000"]
