# ---------- Build bosqichi ----------
FROM node:20-alpine AS build

# Ishchi katalog
WORKDIR /app

# Google Sign-In client ID — Vite build vaqtida bundle ICHIGA yozib
# qo'yiladi (runtime env emas!). Build-arg berilmasa bo'sh qoladi va
# frontenddagi Google tugmasi jim ishlamay qoladi (backend ham alohida
# GOOGLE_CLIENT_ID'ga muhtoj — ikkalasi HAM kerak, biri ikkinchisini
# almashtirmaydi). CI'da: docker build-push-action build-args orqali
# beriladi (deploy.yml, ${{ vars.VITE_GOOGLE_CLIENT_ID }}).
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

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

# Healthcheck — 127.0.0.1 aniq (localhost EMAS): nginx.conf faqat "listen 80;"
# (IPv4) bilan tinglaydi, [::]:80 yo'q; Alpine'da "localhost" ba'zan avval
# ::1 (IPv6)ga hal bo'lib, "Connection refused" bilan yiqiladi — nginx o'zi
# ishlab tursa ham konteyner "unhealthy" bo'lib qolaveradi.
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]