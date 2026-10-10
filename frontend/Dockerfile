# ---- build the React app ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund
COPY . .
# Optional TURN/STUN servers for video calls (JSON array), see docker-compose.yml
ARG VITE_ICE_SERVERS=""
ENV VITE_ICE_SERVERS=$VITE_ICE_SERVERS
RUN npm run build

# ---- serve it with nginx ----
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80