FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund
COPY server.js views.js proyectos.js ./
COPY shared ./shared
COPY plantillas ./plantillas
COPY public ./public
COPY scripts/sembrar.js scripts/proyectos-iniciales.js ./scripts/
ENV PORT=3000
EXPOSE 3000
CMD ["node", "server.js"]
