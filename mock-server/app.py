from fastapi import FastAPI, Response
from prometheus_client import Gauge, Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST, REGISTRY
import time
import uvicorn
import pandas as pd
import os

app = FastAPI(
    title="System Load Mock Server",
    description="Mock server to expose Prometheus metrics",
    version="1.0.0"
)

csv_data = None
current_row_index = 0
csv_loaded = False

def load_csv_data():
    global csv_data, csv_loaded
    
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "data", "mock-metrics", "2.csv"))
    
    try:
        csv_data = pd.read_csv(csv_path, sep=';')
        csv_data.columns = csv_data.columns.str.strip()
        csv_loaded = True
    except Exception:
        csv_loaded = False

@app.on_event("startup")
async def startup_event():
    load_csv_data()

def get_or_create_gauge(name: str, description: str):
    try:
        return Gauge(name, description)
    except ValueError:
        for collector in REGISTRY._collector_to_names:
            if hasattr(collector, '_name') and collector._name == name:
                return collector
        return Gauge(name, description, registry=None)

def get_or_create_counter(name: str, description: str, labelnames=None):
    try:
        return Counter(name, description, labelnames)
    except ValueError:
        for collector in REGISTRY._collector_to_names:
            if hasattr(collector, '_name') and collector._name == name:
                return collector
        return Counter(name, description, labelnames, registry=None)

def get_or_create_histogram(name: str, description: str):
    try:
        return Histogram(name, description)
    except ValueError:
        for collector in REGISTRY._collector_to_names:
            if hasattr(collector, '_name') and collector._name == name:
                return collector
        return Histogram(name, description, registry=None)

cpu_usage_percent = get_or_create_gauge('system_cpu_usage_percent', 'CPU usage percentage')
cpu_usage_mhz = get_or_create_gauge('system_cpu_usage_mhz', 'CPU usage in MHz')
cpu_cores = get_or_create_gauge('system_cpu_cores', 'Number of CPU cores')
cpu_capacity_mhz = get_or_create_gauge('system_cpu_capacity_mhz', 'CPU capacity in MHz')

memory_usage_kb = get_or_create_gauge('system_memory_usage_kb', 'Memory usage in KB')
memory_capacity_kb = get_or_create_gauge('system_memory_capacity_kb', 'Memory capacity in KB')

disk_read_throughput_kbs = get_or_create_gauge('system_disk_read_throughput_kbs', 'Disk read throughput KB/s')
disk_write_throughput_kbs = get_or_create_gauge('system_disk_write_throughput_kbs', 'Disk write throughput KB/s')

network_received_throughput_kbs = get_or_create_gauge('system_network_received_throughput_kbs', 'Network received throughput KB/s')
network_transmitted_throughput_kbs = get_or_create_gauge('system_network_transmitted_throughput_kbs', 'Network transmitted throughput KB/s')

system_timestamp = get_or_create_gauge('system_timestamp_ms', 'System timestamp in milliseconds')
mock_server_uptime = get_or_create_gauge('mock_server_uptime_seconds', 'Mock server uptime in seconds')

http_requests_total = get_or_create_counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
http_request_duration_seconds = get_or_create_histogram('http_request_duration_seconds', 'HTTP request duration')

SERVER_START_TIME = time.time()

def get_next_csv_row():
    global current_row_index, csv_data, csv_loaded
    
    if not csv_loaded or csv_data is None or csv_data.empty:
        return None
    
    row = csv_data.iloc[current_row_index]
    current_row_index = (current_row_index + 1) % len(csv_data)
    
    return row

def generate_realistic_system_metrics():
    csv_row = get_next_csv_row()
    
    if csv_row is not None:
        try:
            cpu_percent = float(csv_row['CPU usage [%]'])
            cpu_mhz = float(csv_row['CPU usage [MHZ]'])
            cpu_cores_val = float(csv_row['CPU cores'])
            cpu_capacity_val = float(csv_row['CPU capacity provisioned [MHZ]'])
            
            memory_capacity_val = float(csv_row['Memory capacity provisioned [KB]'])
            memory_usage = float(csv_row['Memory usage [KB]'])
            
            disk_read = float(csv_row['Disk read throughput [KB/s]'])
            disk_write = float(csv_row['Disk write throughput [KB/s]'])
            
            network_rx = float(csv_row['Network received throughput [KB/s]'])
            network_tx = float(csv_row['Network transmitted throughput [KB/s]'])
            
        except Exception:
            return
    
    cpu_usage_percent.set(cpu_percent)
    cpu_usage_mhz.set(cpu_mhz)
    cpu_cores.set(cpu_cores_val)
    cpu_capacity_mhz.set(cpu_capacity_val)
    
    memory_usage_kb.set(memory_usage)
    memory_capacity_kb.set(memory_capacity_val)
    
    disk_read_throughput_kbs.set(disk_read)
    disk_write_throughput_kbs.set(disk_write)
    
    network_received_throughput_kbs.set(network_rx)
    network_transmitted_throughput_kbs.set(network_tx)
    
    system_timestamp.set(int(time.time() * 1000))
    mock_server_uptime.set(time.time() - SERVER_START_TIME)

@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    http_requests_total.labels(method=request.method, endpoint=request.url.path).inc()
    http_request_duration_seconds.observe(time.time() - start_time)
    
    return response

@app.get("/")
async def root():
    return {
        "message": "System Load Mock Server",
        "description": "Expose Prometheus metrics",
        "version": "1.0.0",
        "endpoints": {
            "/metrics": "Prometheus metrics endpoint",
            "/health": "Health check endpoint"
        },
        "scrape_url": "http://localhost:8000/metrics"
    }

@app.get("/health")
async def health_check():
    generate_realistic_system_metrics()
    return {
        "status": "healthy",
        "timestamp": int(time.time() * 1000),
        "uptime_seconds": time.time() - SERVER_START_TIME
    }

@app.get("/metrics")
async def metrics():
    generate_realistic_system_metrics()
    
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )

@app.get("/metrics/current")
async def get_current_metrics():
    generate_realistic_system_metrics()
    
    return {
        "timestamp": int(time.time() * 1000),
        "cpu": {
            "usage_percent": cpu_usage_percent._value._value,
            "usage_mhz": cpu_usage_mhz._value._value,
            "cores": cpu_cores._value._value,
            "capacity_mhz": cpu_capacity_mhz._value._value
        },
        "memory": {
            "usage_kb": memory_usage_kb._value._value,
            "capacity_kb": memory_capacity_kb._value._value
        },
        "disk": {
            "read_throughput_kbs": disk_read_throughput_kbs._value._value,
            "write_throughput_kbs": disk_write_throughput_kbs._value._value
        },
        "network": {
            "received_throughput_kbs": network_received_throughput_kbs._value._value,
            "transmitted_throughput_kbs": network_transmitted_throughput_kbs._value._value
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info"
    )