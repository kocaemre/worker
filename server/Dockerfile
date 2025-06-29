# ---------- build stage ----------
FROM node:20-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .

# ---------- runtime stage ----------
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
# Generate Prisma client at runtime
RUN npm run generate 2>/dev/null || echo "Prisma generate will run at startup"
CMD ["sh", "-c", "npm run generate && node src/index.js"] 