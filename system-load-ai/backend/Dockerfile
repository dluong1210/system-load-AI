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

# Stage 2: Run the application
FROM openjdk:11-jre-slim

WORKDIR /app

# Copy the jar file from the build stage
COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"] 