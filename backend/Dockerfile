# Stage 1: Build the Spring Boot application
FROM maven:3.8.5-openjdk-11 AS build

WORKDIR /app

# Copy the pom.xml and download dependencies
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy the rest of the application code
COPY src ./src

# Package the application
RUN mvn package -DskipTests

# Verify the JAR file exists and show its details
RUN ls -la target/*.jar && \
    echo "JAR file details:" && \
    ls -la target/system-load-ai-0.0.1-SNAPSHOT.jar

# Stage 2: Run the application
FROM openjdk:11-jre-slim

WORKDIR /app

# Add labels for metadata
LABEL description="System Load AI Application"

# Install curl for healthcheck
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system appgroup \
    && adduser --system --ingroup appgroup appuser \
    && mkdir -p /var/log \
    && chown -R appuser:appgroup /var/log

# Copy the jar file from the build stage with explicit name
COPY --from=build /app/target/system-load-ai-0.0.1-SNAPSHOT.jar app.jar

# Verify the JAR file exists and show its details
RUN ls -la app.jar

# Change ownership of the application directory
RUN chown -R appuser:appgroup /app

# Switch to the non-root user
USER appuser

# Set Java options for production
ENV JAVA_OPTS="-Xms256m -Xmx512m -XX:+UseG1GC"

EXPOSE 8080

# Add a health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/actuator/health || exit 1

# Run the application with Java options
ENTRYPOINT ["sh", "-c", "ls -la && java $JAVA_OPTS -jar app.jar"] 