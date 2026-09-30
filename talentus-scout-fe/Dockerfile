# Stage 1: Build Angular SPA
FROM node:22-alpine AS build
WORKDIR /app

COPY .npmrc package*.json ./
RUN npm install

COPY . .
RUN npm run build -- --configuration=production

# Stage 2: Serve with Nginx Alpine
FROM nginx:1.27-alpine
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy compiled artifacts from builder stage (Angular 18 outputs to dist/talentus-scout-fe/browser)
COPY --from=build /app/dist/talentus-scout-fe/browser ./

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
