import React, { useState, useEffect } from "react";
import { Card, Button, Alert, Spin, Row, Col, Statistic, Tag } from "antd";
import {
  getCurrentMetrics,
  collectMetrics,
  getHistoricalMetrics,
  getLoadPrediction,
  trainModels,
  getSystemStatistics,
  getHealthCheck,
  SystemMetricsApiResponse,
  HealthStatus,
  PredictionApiResponse,
  TrainModelsResponse,
  getPredictionHealthCheck,
} from "../services/api";

const SystemConnection: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] =
    useState<SystemMetricsApiResponse | null>(null);
  const [healthTargetServer, setHealthTargetServer] =
    useState<HealthStatus | null>(null);
  const [healthMLService, setHealthMLService] = useState<HealthStatus | null>(
    null
  );
  const [prediction, setPrediction] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto check health on component mount
  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      setLoading(true);
      const response = await getHealthCheck();
      setHealthTargetServer(response.data);
      const responseMLService = await getPredictionHealthCheck();
      setHealthMLService(responseMLService.data);
      setError(null);
    } catch (err: any) {
      setError(`Health check failed: ${err.message}`);
      setHealthTargetServer(null);
      setHealthMLService(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCurrentMetrics();
      console.log("Current metrics response:", response.data);

      // Backend returns SystemMetrics directly, not wrapped in success/data
      if (response.data) {
        setCurrentMetrics(response.data);
        setSuccess("Current metrics fetched successfully!");
      } else {
        setError("No metrics data received");
      }
    } catch (err: any) {
      setError(`Error fetching metrics: ${err.message}`);
      setCurrentMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCollectMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await collectMetrics();
      console.log("Collect metrics response:", response.data);

      // Backend returns SystemMetrics directly
      if (response.data) {
        setSuccess("Metrics collected and stored successfully!");
        // Refresh current metrics
        setCurrentMetrics(response.data);
      } else {
        setError("Failed to collect metrics");
      }
    } catch (err: any) {
      setError(`Error collecting metrics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGetPrediction = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getLoadPrediction();
      console.log("Prediction response:", response.data);

      // Backend returns { currentMetrics, prediction } or { error }
      if (response.data.error) {
        setError(response.data.error);
      } else if (response.data.prediction) {
        setPrediction(response.data.prediction);
        setSuccess("Load prediction generated successfully!");
      } else {
        setError("No prediction data received");
      }
    } catch (err: any) {
      setError(`Error getting prediction: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await trainModels();
      console.log("Train models response:", response.data);

      // Backend returns { success: boolean, modelTrained: boolean }
      if (response.data.success) {
        setSuccess("AI models trained successfully!");
        // Refresh health status
        await checkHealth();
      } else {
        setError("Failed to train models");
      }
    } catch (err: any) {
      setError(`Error training models: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card
            title="🔗 Backend Connection Test"
            extra={
              <Button onClick={checkHealth} loading={loading}>
                Refresh Health
              </Button>
            }
          >
            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            {success && (
              <Alert
                message="Success"
                description={success}
                type="success"
                showIcon
                closable
                onClose={() => setSuccess(null)}
                style={{ marginBottom: 16 }}
              />
            )}

            {(healthTargetServer || healthMLService) && (
              <Row gutter={16} style={{ marginBottom: 16 }}>
                {/* <Col span={8}>
                  <Statistic
                    title="System Status"
                    value={health.isConnectionHealthy ? "Healthy" : "Unhealthy"}
                    prefix={health.isConnectionHealthy ? "✅" : "⚠️"}
                  />
                </Col> */}
                <Col span={8}>
                  <Statistic
                    title="Mock Server"
                    value={
                      healthTargetServer?.isConnectionHealthy
                        ? "Connected"
                        : "Disconnected"
                    }
                    prefix={
                      healthTargetServer?.isConnectionHealthy ? "🟢" : "🔴"
                    }
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="AI Models"
                    value={
                      healthMLService?.isConnectionHealthy
                        ? "Ready"
                        : "Not Ready"
                    }
                    prefix={healthMLService?.isConnectionHealthy ? "🤖" : "⏳"}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        <Col span={24}>
          <Card
            title="📊 Current Metrics"
            extra={
              <Button
                type="primary"
                onClick={fetchCurrentMetrics}
                loading={loading}
              >
                Fetch Metrics
              </Button>
            }
          >
            {currentMetrics ? (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={6}>
                    <Statistic
                      title="CPU Usage (%)"
                      value={currentMetrics.usage_percent?.toFixed(2)}
                      suffix="%"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="CPU Usage (MHz)"
                      value={currentMetrics.usage_mhz?.toFixed(2)}
                      suffix="MHz"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic title="CPU Cores" value={currentMetrics.cores} />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="CPU Capacity (MHz)"
                      value={currentMetrics.capacity_mhz?.toFixed(2)}
                      suffix="MHz"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Memory Usage (%)"
                      value={currentMetrics.memoryUsagePercent?.toFixed(2)}
                      suffix="%"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Memory Usage (KB)"
                      value={currentMetrics.usage_kb?.toFixed(0)}
                      suffix="KB"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Memory Capacity (KB)"
                      value={currentMetrics.capacity_kb?.toFixed(0)}
                      suffix="KB"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Disk Read (KB/s)"
                      value={currentMetrics.read_throughput_kbs?.toFixed(2)}
                      suffix="KB/s"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Disk Write (KB/s)"
                      value={currentMetrics.write_throughput_kbs?.toFixed(2)}
                      suffix="KB/s"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Network Received (KB/s)"
                      value={currentMetrics.received_throughput_kbs?.toFixed(2)}
                      suffix="KB/s"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Network Transmitted (KB/s)"
                      value={currentMetrics.transmitted_throughput_kbs?.toFixed(
                        2
                      )}
                      suffix="KB/s"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Disk Load Score"
                      value={currentMetrics.diskLoadScore?.toFixed(2)}
                      suffix="/100"
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="Network Load Score"
                      value={currentMetrics.networkLoadScore?.toFixed(2)}
                      suffix="/100"
                    />
                  </Col>
                  {/* <Col span={6}>
                    <Statistic
                      title="Overall Load Score"
                      value={currentMetrics.overallLoadScore?.toFixed(2)}
                      suffix="/100"
                    />
                  </Col> */}
                  <Col span={6}>
                    <Statistic
                      title="Collected At"
                      value={currentMetrics.collectedAt}
                    />
                  </Col>
                </Row>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin spinning={loading}>
                  <p>
                    No metrics available. Click "Fetch Metrics" to get current
                    data.
                  </p>
                </Spin>
              </div>
            )}
          </Card>
        </Col>

        {/* <Col span={12}>
          <Card
            title="🔮 Load Prediction"
            extra={
              <Button
                onClick={handleGetPrediction}
                loading={loading}
                disabled={!health?.aiModels}
              >
                Get Prediction
              </Button>
            }
          >
            {prediction ? (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Statistic
                      title="Predicted Load"
                      value={prediction.predictedLoad?.toFixed(1)}
                      suffix="/100"
                    />
                  </Col>
                  <Col span={24}>
                    <p>
                      <strong>Anomaly Detected:</strong>{" "}
                      {prediction.isAnomaly ? (
                        <Tag color="red">Yes</Tag>
                      ) : (
                        <Tag color="green">No</Tag>
                      )}
                    </p>
                  </Col>
                  {prediction.recommendations &&
                    prediction.recommendations.length > 0 && (
                      <Col span={24}>
                        <p>
                          <strong>Recommendations:</strong>
                        </p>
                        <ul>
                          {prediction.recommendations.map(
                            (rec: string, index: number) => (
                              <li key={index}>{rec}</li>
                            )
                          )}
                        </ul>
                      </Col>
                    )}
                </Row>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px" }}>
                <Spin spinning={loading}>
                  <p>
                    No prediction available. Click "Get Prediction" to generate.
                  </p>
                </Spin>
              </div>
            )}
          </Card>
        </Col> */}

        <Col span={24}>
          <Card title="🎛️ Actions">
            <Row gutter={16}>
              <Col>
                <Button
                  type="default"
                  onClick={handleCollectMetrics}
                  loading={loading}
                >
                  Collect & Store Metrics
                </Button>
              </Col>
              <Col>
                <Button onClick={handleTrainModels} loading={loading}>
                  Train AI Models
                </Button>
              </Col>
              <Col>
                <Button onClick={checkHealth} loading={loading}>
                  Check Health
                </Button>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SystemConnection;
