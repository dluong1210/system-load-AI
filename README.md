# System Load AI

**A comprehensive intelligent system load monitoring and prediction platform with AI/ML capabilities, real-time analytics, and interactive dashboard.**

*This project is developed for Viettel Digital Talent 2025 program.*

## 🚀 Project Overview

System Load AI is a complete monitoring solution that includes:

- **Real-time Metrics Collection** - Collect system metrics every second
- **AI-Powered Predictions** - Multi-model Prophet forecasting (1h, 6h, 24h)
- **Interactive Dashboard** - React TypeScript frontend with real-time charts
- **Microservices Architecture** - Containerized services with Docker
- **Database Persistence** - PostgreSQL with automated schema management
- **RESTful APIs** - Complete backend APIs for integration

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   ML Models     │
│   React TS      │◄──►│  Spring Boot    │◄──►│   FastAPI       │
│   Port: 3000    │    │   Port: 8080    │    │   Port: 8010    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  │
         ┌─────────────────┐      │      ┌─────────────────┐
         │  Target Server  │      │      │   PostgreSQL    │
         │  FastAPI        │◄─────┼─────►│   Database      │
         │  Port: 8000     │      │      │   Port: 5432    │
         └─────────────────┘      │      └─────────────────┘
                                  │
                    ┌─────────────────┐
                    │    pgAdmin      │
                    │ Database Admin  │
                    │   Port: 5050    │
                    └─────────────────┘
```

## 📁 Project Structure

```
system-load-ai/
├── backend/                 # Spring Boot Java backend
│   ├── src/                # Java source code
│   ├── Dockerfile          # Backend containerization
│   ├── pom.xml            # Maven dependencies
│   └── README.md          # Backend documentation
├── frontend/               # React TypeScript frontend
│   ├── src/               # React components & services
│   ├── Dockerfile         # Multi-stage build (Node + Nginx)
│   ├── package.json       # NPM dependencies
│   └── README.md         # Frontend documentation
├── ml_models/             # Python ML service
│   ├── main.py           # FastAPI ML service
│   ├── scripts/          # Prophet & LSTM implementations
│   ├── notebook/         # Jupyter experimentation
│   ├── checkpoints/      # Trained model storage
│   └── README.md        # ML service documentation
├── database/             # PostgreSQL setup
│   ├── docker-compose.yml # Database service
│   ├── init-db.sql      # Database initialization
│   ├── schema.sql       # Table schemas & indexes
│   └── README.md       # Database documentation
├── mock-server/         # System metrics simulator
│   ├── app.py          # FastAPI mock server
│   ├── Dockerfile      # Containerization
│   └── README.md      # Mock server documentation
├── data/               # Shared data storage
│   ├── mock-metrics/   # Generated mock data
│   ├── metrics_crawled/ # Collected real metrics
│   └── prediction/     # ML prediction outputs
├── monitoring/         # Observability stack (optional)
│   ├── prometheus/     # Metrics collection
│   └── grafana/       # Visualization dashboards
├── deployment/        # Production deployment configs
└── docker-compose.yml # Complete system orchestration
```

## 🚀 Quick Start

### Prerequisites

```bash
# Required
docker --version          # Docker 20.10+
docker-compose --version  # Docker Compose 2.0+

# Optional for development
node --version            # Node.js 18+
java --version           # Java 11+
python --version         # Python 3.11+
```

### One-Command Startup

```bash
# Clone repository
git clone <repository-url>
cd system-load-ai

# Start complete system
docker-compose up -d

# Wait for health checks to pass (~2-3 minutes)
docker-compose ps
```

### Access Points

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:3000 | Main dashboard & UI |
| **Backend API** | http://localhost:8080 | REST APIs & metrics |
| **ML Service** | http://localhost:8010 | AI predictions & training |
| **Mock Server** | http://localhost:8000 | Simulated system metrics |
| **pgAdmin** | http://localhost:5050 | Database management |
| **Database** | localhost:5432 | Direct PostgreSQL access |

### Default Credentials

```yaml
Database (PostgreSQL):
  Host: localhost:5432
  Database: systemload
  Username: admin
  Password: admin123

pgAdmin (Web UI):
  Email: admin@systemload.com
  Password: admin123
```

## 🔧 Development

### Service-by-Service Development

```bash
# Backend development
cd backend
mvn spring-boot:run

# Frontend development  
cd frontend
npm install && npm run dev

# ML service development
cd ml_models
pip install -r requirements.txt && python main.py

# Mock server development
cd mock-server
pip install -r requirements.txt && python app.py
```

### Database Setup

```bash
# Start only database
cd database
docker-compose up -d

# Or use main compose with database only
docker-compose up -d database pgadmin
```

## 📊 Features

### Real-time Monitoring

- **Metrics Collection**: CPU, Memory, Disk I/O, Network throughput
- **Live Dashboard**: Real-time charts with Recharts
- **System Health**: Automated health checks and status monitoring
- **Historical Data**: PostgreSQL persistence with efficient indexing

### AI/ML Predictions

- **Facebook Prophet**: Time series forecasting for system metrics
- **Multi-Model Approach**: Specialized models for 1h, 6h, 24h predictions
- **LSTM Alternative**: PyTorch implementation for advanced scenarios
- **Anomaly Detection**: Intelligent alerting for unusual patterns
- **Recommendations**: AI-generated optimization suggestions

### Web Interface

- **Modern UI**: React TypeScript with Ant Design components
- **Responsive Design**: Mobile-friendly with Tailwind CSS
- **Real-time Updates**: WebSocket connections for live data
- **Interactive Charts**: Recharts with zoom, pan, export capabilities
- **Multi-page App**: Dashboard, Predictions, Reports, Optimization

### API Integration

- **RESTful APIs**: Complete CRUD operations
- **OpenAPI Documentation**: Swagger UI for API exploration
- **TypeScript Types**: Full type safety frontend ↔ backend
- **Error Handling**: Comprehensive error responses
- **Rate Limiting**: API protection with proper HTTP status codes

## 🐳 Docker Services

### Core Services

```yaml
# docker-compose.yml services
frontend:     # React app (Nginx)    - Port 3000
backend:      # Spring Boot API      - Port 8080  
ml_models:    # FastAPI ML service   - Port 8010
database:     # PostgreSQL          - Port 5432
mock_server:  # FastAPI mock data   - Port 8000
pgadmin:      # Database admin UI   - Port 5050
```

### Volume Mounts

- **postgres_data**: Database persistence
- **pgadmin_data**: pgAdmin configuration
- **./data**: Shared data directory
- **./backend/logs**: Application logs
- **./ml_models/checkpoints**: Trained models

## 🛠️ Configuration

### Environment Variables

```bash
# Backend (Spring Boot)
SPRING_DATASOURCE_URL=jdbc:postgresql://database:5432/systemload
SPRING_DATASOURCE_USERNAME=admin
SPRING_DATASOURCE_PASSWORD=admin123

# ML Service
PYTHONUNBUFFERED=1

# Database
POSTGRES_DB=systemload
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin123
```

### Network Configuration

- **systemload-network**: Bridge network for service communication
- **Internal DNS**: Services communicate via container names
- **Health Checks**: Automated dependency verification

## 📈 Usage Workflows

### 1. System Monitoring

```bash
# 1. Start system
docker-compose up -d

# 2. Access dashboard
open http://localhost:3000

# 3. View real-time metrics
# Dashboard automatically displays CPU, Memory, I/O metrics
```

### 2. AI Predictions

```bash
# 1. Train models (auto-triggered by backend)
curl -X POST http://localhost:8080/api/system-load/train

# 2. Get predictions
curl http://localhost:8080/api/system-load/predict

# 3. View in dashboard
# Navigate to Predictions page for interactive charts
```

### 3. Database Operations

```bash
# 1. Access pgAdmin
open http://localhost:5050

# 2. Connect to database
# Host: database, Port: 5432, User: admin, Password: admin123

# 3. Query metrics
SELECT * FROM system_metrics ORDER BY collected_at DESC LIMIT 100;
```

## 🔧 Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check Docker resources
docker system df

# Clean up
docker-compose down -v
docker system prune

# Restart
docker-compose up -d
```

#### Database Connection Issues

```bash
# Check database health
docker-compose logs database

# Verify connectivity
docker exec -it systemload-postgres pg_isready -U admin -d systemload
```

#### Frontend Build Issues

```bash
# Clear frontend build
cd frontend
rm -rf node_modules dist
npm ci && npm run build
```

### Log Monitoring

```bash
# All services logs
docker-compose logs -f

# Specific service logs  
docker-compose logs -f backend
docker-compose logs -f ml_models

# Backend application logs
tail -f backend/logs/system-load-ai.log
```

## 📊 Performance

### Expected Performance

- **Metrics Collection**: 1-second intervals
- **API Response Time**: <200ms average
- **ML Training**: 2-5 seconds per model
- **Prediction Generation**: <1 second
- **Frontend Load Time**: <3 seconds initial load
- **Database Queries**: <100ms average

### Resource Requirements

```yaml
Minimum:
  CPU: 4 cores
  RAM: 8GB
  Disk: 20GB free space

Recommended:
  CPU: 8 cores  
  RAM: 16GB
  Disk: 50GB free space
```

## 🚀 Production Deployment

### Environment-Specific Configs

```bash
# Development
docker-compose.yml                    # Complete dev stack

# Production  
docker-compose.prod.yml              # Optimized for production
deployment/kubernetes/               # K8s manifests
deployment/docker-swarm/            # Swarm configs
```

### Security Considerations

- **Environment Variables**: Use secrets management
- **Database**: Change default credentials
- **Network**: Restrict external access
- **SSL/TLS**: Enable HTTPS in production
- **API Authentication**: Implement JWT/OAuth

## 🤝 Contributing

### Development Setup

```bash
# Fork repository
git clone <your-fork>
cd system-load-ai

# Create feature branch
git checkout -b feature/your-feature

# Start development environment
docker-compose up -d database pgadmin
# Then run individual services for development
```

### Code Standards

- **Backend**: Java 11+, Spring Boot, Maven
- **Frontend**: TypeScript, React 18, ESLint
- **ML**: Python 3.11+, FastAPI, Prophet
- **Database**: PostgreSQL 14+, proper indexing
- **Documentation**: Comprehensive README files


---

**System Load AI** - Intelligent monitoring with AI-powered predictions for modern infrastructure management.

For detailed component documentation, see individual README files in each service directory. 
