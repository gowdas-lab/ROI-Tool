FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --no-audit --no-fund && npm rebuild esbuild
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
