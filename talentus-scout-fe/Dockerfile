# Stage 1: Build Angular SSR
FROM node:22-alpine AS build
WORKDIR /app

COPY .npmrc package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve with Nginx + Node.js SSR
FROM node:22-alpine
WORKDIR /app

# Install Nginx
RUN apk add --no-cache nginx

# Copy compiled browser assets for Nginx static serving
COPY --from=build /app/dist/talentus-scout-fe/browser /usr/share/nginx/html

# Copy entire dist bundle including server.mjs for Node SSR execution
COPY --from=build /app/dist/talentus-scout-fe /app/dist/talentus-scout-fe

# Copy custom Nginx configuration into Alpine http.d directory
RUN rm -f /etc/nginx/http.d/default.conf
COPY nginx.conf /etc/nginx/http.d/default.conf

# Ensure nginx directories exist
RUN mkdir -p /run/nginx /var/log/nginx

# Copy and setup entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 80 443

ENV PORT=4000
ENV NODE_ENV=production

CMD ["/app/entrypoint.sh"]
