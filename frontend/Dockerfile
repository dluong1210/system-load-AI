# Stage 1: Build the React application
FROM node:18-alpine AS build

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install dependencies using npm ci for faster, more reliable builds
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application using Nginx
FROM nginx:stable-alpine

# Add labels for metadata
LABEL description="System Load AI Frontend Application"

# Install curl for healthcheck
RUN apk --no-cache add curl

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy the built application from the build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add health check for Nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"] 