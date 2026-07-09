# ---------- Build bosqichi ----------
FROM node:20-alpine AS build

# Ishchi katalog
WORKDIR /app

# Dependency larni o'rnatish
COPY package*.json ./
RUN npm ci

# Kodni nusxalash va build qilish
COPY . .
RUN npm run build

# ---------- Serve bosqichi (Nginx) ----------
FROM nginx:1.27-alpine

# Nginx konfiguratsiyasini nusxalash
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Build qilingan fayllarni Nginx papkasiga o'tkazish
COPY --from=build /app/dist /usr/share/nginx/html

# Xavfsizlik va sozlamalar
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]