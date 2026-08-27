# Build context is the repo root (see docker-compose.yml).
FROM node:20-slim AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .

# CRA bakes REACT_APP_* vars in at build time, not runtime — this must be a
# build arg, not just a container env var, or the frontend will silently
# keep pointing at whatever URL was set (or the default) when the image
# was built.
ARG REACT_APP_API_BASE_URL=http://localhost:8000
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
