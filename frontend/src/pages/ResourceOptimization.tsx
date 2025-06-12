import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  List,
  Button,
  Spin,
  Alert,
  message,
  Empty,
  Tag,
  Row,
  Col,
  Statistic,
  Select,
  Space,
  Progress,
  Divider,
  Tabs,
  Table,
  Badge,
  Tooltip,
} from "antd";
import {
  SettingOutlined,
  BulbOutlined,
  RiseOutlined,
  FallOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";
import {
  predict1Hour,
  predict6Hours,
  predict24Hours,
  getAvailablePredictionModels,
  getHistoricalMetrics,
  PredictionResult,
  AvailableModelsResponse,
  SystemMetrics,
} from "../services/api";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

// Available metrics for model training - matching backend supported metrics
const AVAILABLE_METRICS = [
  {
    key: "cpu_usage_percent",
    label: "CPU Usage [%]",
    description: "CPU utilization percentage",
  },
  {
    key: "memory_usage_percent",
    label: "Memory Usage [%]",
    description: "Memory utilization percentage",
  },
  {
    key: "overall_load_score",
    label: "Overall Load Score",
    description: "Combined system load score",
  },
  {
    key: "cpu_load_score",
    label: "CPU Load Score",
    description: "CPU-specific load score",
  },
  {
    key: "io_load_score",
    label: "I/O Load Score",
    description: "Input/Output load score",
  },
  {
    key: "disk_load_score",
    label: "Disk Load Score",
    description: "Disk utilization score",
  },
  {
    key: "network_load_score",
    label: "Network Load Score",
    description: "Network utilization score",
  },
  {
    key: "disk_read_throughput",
    label: "Disk Read Throughput",
    description: "Disk read throughput metrics",
  },
  {
    key: "disk_write_throughput",
    label: "Disk Write Throughput",
    description: "Disk write throughput metrics",
  },
  {
    key: "network_rx_throughput",
    label: "Network RX Throughput",
    description: "Network receive throughput",
  },
  {
    key: "network_tx_throughput",
    label: "Network TX Throughput",
    description: "Network transmit throughput",
  },
];

interface OptimizationSuggestion {
  id: string;
  metric: string;
  current?: string | number;
  predicted?: string | number;
  suggestion: string;
  actionable: boolean;
  priority: "high" | "medium" | "low";
  type: "scale_up" | "scale_down" | "investigate" | "optimize" | "info";
  impact: string;
  effort: "easy" | "medium" | "complex";
}

interface ResourceAnalysis {
  currentUtilization: number;
  predictedPeak: number;
  efficiency: number;
  status: "optimal" | "warning" | "critical";
  trend: "increasing" | "decreasing" | "stable";
}

// Helper function to extract base model name from a model with suffix (_1h, _6h, _24h)
const extractBaseModelName = (modelName: string): string => {
  // Remove the _1h, _6h, _24h suffix to get the base model name
  return modelName.replace(/_(1h|6h|24h)$/, "");
};

// Helper function to get available base models (without _1h/_6h/_24h suffix)
const getAvailableBaseModels = (availableModels: string[]) => {
  const baseModels = new Set<string>();

  availableModels.forEach((model) => {
    baseModels.add(extractBaseModelName(model));
  });

  return Array.from(baseModels);
};

// Helper function to check if a base model has all required variants (_1h, _6h, _24h)
const hasCompleteModelSet = (
  availableModels: string[],
  baseModelName: string
): boolean => {
  const requiredSuffixes = ["_1h", "_6h", "_24h"];
  return requiredSuffixes.every((suffix) =>
    availableModels.includes(`${baseModelName}${suffix}`)
  );
};

const ResourceOptimization: React.FC = () => {
  const [predictions1h, setPredictions1h] = useState<PredictionResult | null>(
    null
  );
  const [predictions6h, setPredictions6h] = useState<PredictionResult | null>(
    null
  );
  const [predictions24h, setPredictions24h] = useState<PredictionResult | null>(
    null
  );
  const [historicalData, setHistoricalData] = useState<SystemMetrics[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("default");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!selectedModel) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [response1h, response6h, response24h, historicalResponse] =
        await Promise.all([
          predict1Hour(selectedModel),
          predict6Hours(selectedModel),
          predict24Hours(selectedModel),
          getHistoricalMetrics(24),
        ]);

      setPredictions1h(response1h.data);
      setPredictions6h(response6h.data);
      setPredictions24h(response24h.data);

      // Backend trả về trực tiếp List<SystemMetrics>, không phải object có thuộc tính data
      if (historicalResponse.data && Array.isArray(historicalResponse.data)) {
        setHistoricalData(historicalResponse.data);
      } else {
        console.warn(
          "Historical data response is not an array:",
          historicalResponse.data
        );
        setHistoricalData([]);
      }
    } catch (err) {
      message.error("Failed to fetch optimization analysis.");
      setError("Failed to load analysis. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      const response = await getAvailablePredictionModels();
      const data: AvailableModelsResponse = response.data;
      setAvailableModels(data.models);

      if (data.models.length > 0) {
        // Get all available base models
        const availableBaseModels = getAvailableBaseModels(data.models);

        // Find a complete model set (has _1h, _6h, _24h variants)
        const completeBaseModel = availableBaseModels.find((baseModel) =>
          hasCompleteModelSet(data.models, baseModel)
        );

        if (completeBaseModel) {
          console.log("Setting complete base model:", completeBaseModel);
          setSelectedModel(completeBaseModel);
        } else if (availableBaseModels.length > 0) {
          console.log(
            "Setting first available base model:",
            availableBaseModels[0]
          );
          setSelectedModel(availableBaseModels[0]);
        } else {
          console.log("No base models available");
          setSelectedModel("");
        }
      } else {
        setSelectedModel("");
      }
    } catch (err) {
      console.error("Failed to fetch available models:", err);
      message.warning("Could not load available models");
      setAvailableModels([]);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (selectedModel) {
        fetchData();
      }
    }, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [selectedModel]);

  const analyzeResourceUtilization = (): ResourceAnalysis => {
    if (!historicalData.length) {
      return {
        currentUtilization: 0,
        predictedPeak: 0,
        efficiency: 0,
        status: "optimal",
        trend: "stable",
      };
    }

    const recent = historicalData.slice(-6); // Last 6 data points
    const current = recent[recent.length - 1]?.overallLoadScore || 0;
    const predicted = predictions24h?.predictedLoad || 0;

    // Calculate trend
    const firstLoad = recent[0]?.overallLoadScore || 0;
    const lastLoad = recent[recent.length - 1]?.overallLoadScore || 0;
    const trend =
      lastLoad > firstLoad + 5
        ? "increasing"
        : lastLoad < firstLoad - 5
        ? "decreasing"
        : "stable";

    // Calculate efficiency (inverse of over-provisioning)
    const avgUtilization =
      recent.reduce((sum, m) => sum + m.overallLoadScore, 0) / recent.length;
    const efficiency = Math.min(100, avgUtilization * 1.5); // Higher utilization = higher efficiency

    // Determine status
    const maxLoad = Math.max(current, predicted);
    const status =
      maxLoad > 85 ? "critical" : maxLoad > 70 ? "warning" : "optimal";

    return {
      currentUtilization: current,
      predictedPeak: predicted,
      efficiency,
      status,
      trend,
    };
  };

  const generateAdvancedSuggestions = (): OptimizationSuggestion[] => {
    const suggestions: OptimizationSuggestion[] = [];
    const analysis = analyzeResourceUtilization();

    // Add suggestions based on current predictions
    [predictions1h, predictions6h, predictions24h].forEach(
      (prediction, index) => {
        if (!prediction || !prediction.success) return;

        const periods = ["1 hour", "6 hours", "24 hours"];
        const period = periods[index];

        if (prediction.predictedLoad && prediction.predictedLoad > 85) {
          suggestions.push({
            id: `scale-up-${index}`,
            metric: "System Load",
            current: `${analysis.currentUtilization.toFixed(1)}%`,
            predicted: `${prediction.predictedLoad.toFixed(1)}%`,
            suggestion: `Scale up resources before ${period} - predicted load will reach ${prediction.predictedLoad.toFixed(
              1
            )}%`,
            actionable: true,
            priority: prediction.predictedLoad > 95 ? "high" : "medium",
            type: "scale_up",
            impact: "Prevents system overload and performance degradation",
            effort: "easy",
          });
        } else if (prediction.predictedLoad && prediction.predictedLoad < 30) {
          suggestions.push({
            id: `scale-down-${index}`,
            metric: "System Load",
            current: `${analysis.currentUtilization.toFixed(1)}%`,
            predicted: `${prediction.predictedLoad.toFixed(1)}%`,
            suggestion: `Consider scaling down resources for ${period} - predicted load only ${prediction.predictedLoad.toFixed(
              1
            )}%`,
            actionable: true,
            priority: "low",
            type: "scale_down",
            impact: "Reduces infrastructure costs",
            effort: "easy",
          });
        }
      }
    );

    // Add efficiency suggestions
    if (analysis.efficiency < 60) {
      suggestions.push({
        id: "efficiency-low",
        metric: "Resource Efficiency",
        current: `${analysis.efficiency.toFixed(1)}%`,
        predicted: "Improving",
        suggestion:
          "Resources appear over-provisioned. Consider rightsizing to improve cost efficiency.",
        actionable: true,
        priority: "medium",
        type: "optimize",
        impact: "Significant cost savings",
        effort: "medium",
      });
    }

    // Add trend-based suggestions
    if (analysis.trend === "increasing") {
      suggestions.push({
        id: "trend-increasing",
        metric: "Load Trend",
        current: "Increasing",
        predicted: "Continued growth",
        suggestion:
          "Load is trending upward. Plan capacity increases and monitor key metrics closely.",
        actionable: true,
        priority: "medium",
        type: "investigate",
        impact: "Proactive capacity planning",
        effort: "medium",
      });
    }

    // Add general recommendations based on historical patterns
    if (historicalData.length > 0) {
      const avgCpu =
        historicalData.reduce((sum, m) => sum + m.cpuUsagePercent, 0) /
        historicalData.length;
      const avgMemory =
        historicalData.reduce((sum, m) => sum + m.memoryUsagePercent, 0) /
        historicalData.length;

      if (avgCpu > 80) {
        suggestions.push({
          id: "cpu-high",
          metric: "CPU Usage",
          current: `${avgCpu.toFixed(1)}%`,
          predicted: "High utilization",
          suggestion:
            "CPU usage is consistently high. Consider CPU optimization or scaling.",
          actionable: true,
          priority: "high",
          type: "scale_up",
          impact: "Improves application performance",
          effort: "easy",
        });
      }

      if (avgMemory > 85) {
        suggestions.push({
          id: "memory-high",
          metric: "Memory Usage",
          current: `${avgMemory.toFixed(1)}%`,
          predicted: "High utilization",
          suggestion:
            "Memory usage is consistently high. Memory upgrade recommended.",
          actionable: true,
          priority: "high",
          type: "scale_up",
          impact: "Prevents memory pressure and swapping",
          effort: "easy",
        });
      }
    }

    return suggestions;
  };

  const analysis = analyzeResourceUtilization();
  const optimizationSuggestions = generateAdvancedSuggestions();

  // Chart data for resource utilization over time
  const chartData = historicalData.slice(-24).map((metric) => ({
    time: dayjs(metric.timestamp).format("HH:mm"),
    cpu: metric.cpuUsagePercent,
    memory: metric.memoryUsagePercent,
    overall: metric.overallLoadScore,
  }));

  // Pie chart data for resource distribution
  const resourceDistribution =
    historicalData.length > 0
      ? [
          {
            name: "CPU Load",
            value: analysis.currentUtilization,
            color: "#1890ff",
          },
          {
            name: "Available",
            value: 100 - analysis.currentUtilization,
            color: "#f0f0f0",
          },
        ]
      : [];

  const columns = [
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Badge
          status={
            priority === "high"
              ? "error"
              : priority === "medium"
              ? "warning"
              : "success"
          }
          text={priority.toUpperCase()}
        />
      ),
    },
    {
      title: "Metric",
      dataIndex: "metric",
      key: "metric",
    },
    {
      title: "Current",
      dataIndex: "current",
      key: "current",
    },
    {
      title: "Suggestion",
      dataIndex: "suggestion",
      key: "suggestion",
      ellipsis: true,
    },
    {
      title: "Impact",
      dataIndex: "impact",
      key: "impact",
      ellipsis: true,
    },
    {
      title: "Effort",
      dataIndex: "effort",
      key: "effort",
      render: (effort: string) => (
        <Tag
          color={
            effort === "easy" ? "green" : effort === "medium" ? "orange" : "red"
          }
        >
          {effort.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Action",
      key: "action",
      render: (_: any, record: OptimizationSuggestion) =>
        record.actionable ? (
          <Button type="primary" size="small">
            Apply
          </Button>
        ) : (
          <Button size="small" disabled>
            Review
          </Button>
        ),
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2}>Resource Optimization Dashboard</Title>
          <Paragraph>
            Intelligent resource optimization based on AI predictions and
            historical analysis
          </Paragraph>
        </Col>
        <Col>
          <Space>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ width: 200 }}
              placeholder="Select model"
              disabled={availableModels.length === 0}
            >
              {availableModels.length > 0 ? (
                getAvailableBaseModels(availableModels).map((baseModel) => {
                  const isComplete = hasCompleteModelSet(
                    availableModels,
                    baseModel
                  );
                  const modelVariants = ["_1h", "_6h", "_24h"]
                    .filter((suffix) =>
                      availableModels.includes(`${baseModel}${suffix}`)
                    )
                    .map((suffix) => suffix.replace("_", ""));

                  return (
                    <Option
                      key={baseModel}
                      value={baseModel}
                      title={
                        isComplete
                          ? `Complete model set (1h, 6h, 24h)`
                          : `Partial model set (${modelVariants.join(", ")})`
                      }
                    >
                      📊 {baseModel}
                      {isComplete ? (
                        <Tag color="green" style={{ marginLeft: 8 }}>
                          Complete
                        </Tag>
                      ) : (
                        <Tag color="orange" style={{ marginLeft: 8 }}>
                          {modelVariants.join(",")}
                        </Tag>
                      )}
                    </Option>
                  );
                })
              ) : (
                <Option disabled value="no-models">
                  No models available
                </Option>
              )}
            </Select>
            <Button onClick={fetchData} loading={loading}>
              Refresh Analysis
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          action={
            <Button size="small" onClick={fetchData}>
              Retry
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Loading Alert */}
      {loading && (
        <Alert
          message="Loading optimization analysis..."
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Overview Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Current Utilization"
              value={analysis.currentUtilization}
              precision={1}
              suffix="%"
              prefix={
                analysis.status === "critical" ? (
                  <WarningOutlined style={{ color: "#cf1322" }} />
                ) : analysis.status === "warning" ? (
                  <ExclamationCircleOutlined style={{ color: "#faad14" }} />
                ) : (
                  <CheckCircleOutlined style={{ color: "#3f8600" }} />
                )
              }
              valueStyle={{
                color:
                  analysis.status === "critical"
                    ? "#cf1322"
                    : analysis.status === "warning"
                    ? "#faad14"
                    : "#3f8600",
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Predicted Peak (24h)"
              value={analysis.predictedPeak}
              precision={1}
              suffix="%"
              prefix={
                analysis.trend === "increasing" ? (
                  <RiseOutlined style={{ color: "#cf1322" }} />
                ) : analysis.trend === "decreasing" ? (
                  <FallOutlined style={{ color: "#3f8600" }} />
                ) : (
                  <SettingOutlined style={{ color: "#1890ff" }} />
                )
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Resource Efficiency"
              value={analysis.efficiency}
              precision={1}
              suffix="%"
              valueStyle={{
                color:
                  analysis.efficiency > 70
                    ? "#3f8600"
                    : analysis.efficiency > 50
                    ? "#faad14"
                    : "#cf1322",
              }}
            />
            <Progress
              percent={analysis.efficiency}
              showInfo={false}
              strokeColor={
                analysis.efficiency > 70
                  ? "#3f8600"
                  : analysis.efficiency > 50
                  ? "#faad14"
                  : "#cf1322"
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Optimization Actions"
              value={optimizationSuggestions.filter((s) => s.actionable).length}
              suffix="available"
            />
          </Card>
        </Col>
      </Row>

      <Tabs defaultActiveKey="1">
        <TabPane tab="Optimization Suggestions" key="1">
          <Table
            dataSource={optimizationSuggestions}
            columns={columns}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            size="middle"
          />
        </TabPane>

        <TabPane tab="Resource Trends" key="2">
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Resource Utilization Trends (24h)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis domain={[0, 100]} />
                    <RechartsTooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cpu"
                      stroke="#1890ff"
                      name="CPU %"
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#52c41a"
                      name="Memory %"
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#faad14"
                      name="Overall Load %"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Current Resource Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={resourceDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {resourceDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ textAlign: "center", marginTop: 16 }}>
                  <Text strong>
                    {analysis.currentUtilization.toFixed(1)}% Utilized
                  </Text>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab="Prediction Analysis" key="3">
          <Row gutter={16}>
            <Col span={8}>
              <Card
                title="1 Hour Forecast"
                extra={
                  predictions1h?.isAnomaly ? (
                    <Tag color="red">Anomaly</Tag>
                  ) : (
                    <Tag color="green">Normal</Tag>
                  )
                }
              >
                <Statistic
                  value={predictions1h?.predictedLoad || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      (predictions1h?.predictedLoad || 0) > 80
                        ? "#cf1322"
                        : "#3f8600",
                  }}
                />
                <Divider />
                <Text type="secondary">
                  {predictions1h?.recommendations?.[0] ||
                    "No specific recommendations"}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title="6 Hour Forecast"
                extra={
                  predictions6h?.isAnomaly ? (
                    <Tag color="red">Anomaly</Tag>
                  ) : (
                    <Tag color="green">Normal</Tag>
                  )
                }
              >
                <Statistic
                  value={predictions6h?.predictedLoad || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      (predictions6h?.predictedLoad || 0) > 80
                        ? "#cf1322"
                        : "#3f8600",
                  }}
                />
                <Divider />
                <Text type="secondary">
                  {predictions6h?.recommendations?.[0] ||
                    "No specific recommendations"}
                </Text>
              </Card>
            </Col>
            <Col span={8}>
              <Card
                title="24 Hour Forecast"
                extra={
                  predictions24h?.isAnomaly ? (
                    <Tag color="red">Anomaly</Tag>
                  ) : (
                    <Tag color="green">Normal</Tag>
                  )
                }
              >
                <Statistic
                  value={predictions24h?.predictedLoad || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      (predictions24h?.predictedLoad || 0) > 80
                        ? "#cf1322"
                        : "#3f8600",
                  }}
                />
                <Divider />
                <Text type="secondary">
                  {predictions24h?.recommendations?.[0] ||
                    "No specific recommendations"}
                </Text>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </div>
  );
};

export default ResourceOptimization;
