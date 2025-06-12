import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Statistic,
  Alert,
  Typography,
  Spin,
  message,
  Select,
  Space,
} from "antd";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import {
  getCurrentMetrics,
  getHistoricalMetrics,
  SystemMetrics,
  SystemMetricsApiResponse,
} from "../services/api";
import dayjs from "dayjs";

const { Title } = Typography;
const { Option } = Select;

interface ChartDataPoint extends Omit<SystemMetrics, "timestamp"> {
  timestamp: string;
  cpuLoadScore: number;
}

const intervalOptions = [
  { value: "15s", label: "15 Seconds", hours: 1, pollingMs: 15000 },
  { value: "1m", label: "1 Minute", hours: 2, pollingMs: 60000 },
  { value: "15m", label: "15 Minutes", hours: 12, pollingMs: 15 * 60000 },
  { value: "1h", label: "1 Hour", hours: 24, pollingMs: 60 * 60000 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          border: "1px solid #ccc",
          borderRadius: "8px",
          padding: "12px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        <p style={{ margin: 0, fontWeight: "bold", marginBottom: "8px" }}>
          Time: {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            style={{
              margin: 0,
              color: entry.color,
              fontSize: "13px",
            }}
          >
            {entry.name}: {entry.value?.toFixed(2)}%
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(
    null
  );
  const [historicalData, setHistoricalData] = useState<ChartDataPoint[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(true);
  const [loadingHistorical, setLoadingHistorical] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<string>("15m");
  const [nextCurrentUpdateTime, setNextCurrentUpdateTime] = useState<number>(0);
  const [nextHistoricalUpdateTime, setNextHistoricalUpdateTime] =
    useState<number>(0);

  const fetchCurrentMetrics = async () => {
    setLoadingCurrent(true);
    try {
      const response = await getCurrentMetrics();

      if (response.data) {
        setCurrentMetrics(response.data);
      } else {
        setCurrentMetrics(null);
      }
      setError(null);
    } catch (err) {
      message.error("Failed to fetch current system metrics.");
      setError("Failed to fetch current system metrics.");
      setCurrentMetrics(null);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const shouldUpdateChart = (
    lastDataPoint: ChartDataPoint | undefined,
    selectedInterval: string
  ): boolean => {
    if (!lastDataPoint) return true;

    const now = new Date();
    const lastPointTime = new Date(lastDataPoint.collectedAt);
    const timeDiff = now.getTime() - lastPointTime.getTime();

    const intervalMs =
      selectedInterval === "15s"
        ? 15 * 1000
        : selectedInterval === "1m"
        ? 60 * 1000
        : selectedInterval === "15m"
        ? 15 * 60 * 1000
        : selectedInterval === "1h"
        ? 60 * 60 * 1000
        : 60 * 1000;

    return timeDiff >= intervalMs;
  };

  const fetchHistoricalMetrics = async (
    interval: string = selectedInterval,
    forceUpdate: boolean = false
  ) => {
    if (!forceUpdate && historicalData.length > 0) {
      const lastDataPoint = historicalData[historicalData.length - 1];
      if (!shouldUpdateChart(lastDataPoint, interval)) {
        return;
      }
    }

    setLoadingHistorical(true);
    try {
      const selectedOption = intervalOptions.find(
        (opt) => opt.value === interval
      );
      const hours = selectedOption?.hours || 24;

      const response = await getHistoricalMetrics(hours);
      if (response.data && Array.isArray(response.data)) {
        let rawData = response.data;

        if (rawData.length === 0) {
          setHistoricalData([]);
          return;
        }

        rawData.sort(
          (a: SystemMetricsApiResponse, b: SystemMetricsApiResponse) =>
            new Date(a.collectedAt).getTime() -
            new Date(b.collectedAt).getTime()
        );

        let filteredData = [];

        const intervalMs =
          interval === "15s"
            ? 15 * 1000
            : interval === "1m"
            ? 60 * 1000
            : interval === "15m"
            ? 15 * 60 * 1000
            : interval === "1h"
            ? 60 * 60 * 1000
            : 60 * 1000;

        let lastTimestamp = 0;
        filteredData = rawData.filter((item: SystemMetricsApiResponse) => {
          const currentTimestamp = new Date(item.collectedAt).getTime();

          if (currentTimestamp >= lastTimestamp + intervalMs) {
            lastTimestamp = currentTimestamp;
            return true;
          }
          return false;
        });

        if (filteredData.length === 0 && rawData.length > 0) {
          filteredData = [rawData[0], rawData[rawData.length - 1]];
        }

        const formattedData: ChartDataPoint[] = filteredData.map(
          (m: SystemMetricsApiResponse, index: number) => {
            let timestamp: string;

            if (interval === "15s") {
              timestamp = dayjs(m.collectedAt).format("HH:mm:ss");
            } else if (interval === "1m") {
              timestamp = dayjs(m.collectedAt).format("HH:mm:ss");
            } else if (interval === "15m") {
              timestamp = dayjs(m.collectedAt).format("HH:mm");
            } else if (interval === "1h") {
              timestamp = dayjs(m.collectedAt).format("MMM DD HH:mm");
            } else {
              timestamp = dayjs(m.collectedAt).format("HH:mm");
            }

            let memoryUsagePercent = Number(m.memoryUsagePercent) || 0;
            if (memoryUsagePercent === 0) {
              const usageKb = Number(m.usage_kb || 0);
              const capacityKb = Number(m.capacity_kb || 0);
              if (usageKb > 0 && capacityKb > 0) {
                memoryUsagePercent = (usageKb / capacityKb) * 100;
              }
            }

            return {
              id: m.id,
              timestamp: timestamp,
              collectedAt: m.collectedAt,
              cpuUsagePercent: Number(m.usage_percent) || 0,
              cpuUsageMhz: Number(m.usage_mhz) || 0,
              cpuCores: Number(m.cores) || 0,
              cpuCapacityMhz: Number(m.capacity_mhz) || 0,
              memoryUsageKb: Number(m.usage_kb) || 0,
              memoryCapacityKb: Number(m.capacity_kb) || 0,
              memoryUsagePercent: memoryUsagePercent,
              diskReadThroughputKbs: Number(m.read_throughput_kbs) || 0,
              diskWriteThroughputKbs: Number(m.write_throughput_kbs) || 0,
              networkReceivedThroughputKbs:
                Number(m.received_throughput_kbs) || 0,
              networkTransmittedThroughputKbs:
                Number(m.transmitted_throughput_kbs) || 0,
              cpuLoadScore: Number(m.cpuLoadScore) || 0,
              overallLoadScore: Number(m.overallLoadScore) || 0,
              diskLoadScore: Number(m.diskLoadScore) || 0,
              networkLoadScore: Number(m.networkLoadScore) || 0,
            } as ChartDataPoint;
          }
        );

        setHistoricalData(formattedData);
      } else {
        setHistoricalData([]);
      }
      setError(null);
    } catch (err) {
      message.error("Failed to fetch historical system metrics.");
      setError("Failed to fetch historical system metrics.");
    } finally {
      setLoadingHistorical(false);
    }
  };

  // Effect for current metrics (15s fixed polling)
  useEffect(() => {
    fetchCurrentMetrics();

    const currentPollingInterval = 1000;

    setNextCurrentUpdateTime(Date.now() + currentPollingInterval);

    const currentIntervalId = setInterval(() => {
      fetchCurrentMetrics();
      setNextCurrentUpdateTime(Date.now() + currentPollingInterval);
    }, currentPollingInterval);

    const currentCountdownId = setInterval(() => {
      setNextCurrentUpdateTime((prev) => prev);
    }, 1000);

    return () => {
      clearInterval(currentIntervalId);
      clearInterval(currentCountdownId);
    };
  }, []); // Only run once on mount

  // Effect for historical data (based on selected interval)
  useEffect(() => {
    fetchHistoricalMetrics(selectedInterval, true); // Force update when interval changes

    const selectedOption = intervalOptions.find(
      (opt) => opt.value === selectedInterval
    );
    const pollingInterval = selectedOption?.pollingMs || 60000;

    setNextHistoricalUpdateTime(Date.now() + pollingInterval);

    const historicalIntervalId = setInterval(() => {
      fetchHistoricalMetrics(selectedInterval, false); // Don't force, let it check interval
      setNextHistoricalUpdateTime(Date.now() + pollingInterval);
    }, pollingInterval);

    const historicalCountdownId = setInterval(() => {
      setNextHistoricalUpdateTime((prev) => prev);
    }, 1000);

    return () => {
      clearInterval(historicalIntervalId);
      clearInterval(historicalCountdownId);
    };
  }, [selectedInterval]);

  const handleIntervalChange = (value: string) => {
    setSelectedInterval(value);
  };

  const getCurrentRemainingTime = () => {
    const remaining = Math.max(0, nextCurrentUpdateTime - Date.now());
    const seconds = Math.floor(remaining / 1000);
    return `${seconds}s`;
  };

  const getHistoricalRemainingTime = () => {
    const remaining = Math.max(0, nextHistoricalUpdateTime - Date.now());
    const seconds = Math.floor(remaining / 1000);
    const minutes = Math.floor(seconds / 60);
    const hrs = Math.floor(minutes / 60);

    if (hrs > 0) {
      return `${hrs}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (
    error &&
    !loadingCurrent &&
    !loadingHistorical &&
    !currentMetrics &&
    historicalData.length === 0
  ) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  const renderStatisticCard = (
    title: string,
    value?: number,
    prevValue?: number,
    suffix = "%"
  ) => {
    if (value === undefined || value === null) {
      return (
        <Card>
          <Spin />
          <Statistic title={title} value="-" />
        </Card>
      );
    }
    const isIncreased = prevValue !== undefined && value > prevValue;
    const isDecreased = prevValue !== undefined && value < prevValue;
    const color =
      value > 80 ? "#cf1322" : value < 20 && value > 0 ? "#3f8600" : "#555";

    return (
      <Card>
        <Statistic
          title={title}
          value={value}
          precision={2}
          suffix={suffix}
          valueStyle={{ color }}
          prefix={
            isIncreased ? (
              <ArrowUpOutlined />
            ) : isDecreased ? (
              <ArrowDownOutlined />
            ) : undefined
          }
        />
      </Card>
    );
  };

  return (
    <div>
      <Title level={2}>System Load Dashboard</Title>

      {/* Current Metrics Status */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <span style={{ fontSize: "14px", color: "#666" }}>
              Current Metrics (Live Updates)
            </span>
          </Col>
          <Col>
            <span style={{ fontSize: "12px", color: "#999" }}>
              Next update in: {getCurrentRemainingTime()}
            </span>
          </Col>
        </Row>
      </Card>

      {loadingCurrent && !currentMetrics ? (
        <Spin tip="Loading current metrics...">
          <Row gutter={16} style={{ marginBottom: 24, filter: "blur(2px)" }}>
            <Col span={6}>{renderStatisticCard("CPU Usage")}</Col>
            <Col span={6}>{renderStatisticCard("Memory Usage")}</Col>
            <Col span={6}>{renderStatisticCard("Network Usage")}</Col>
            <Col span={6}>{renderStatisticCard("Disk Usage")}</Col>
          </Row>
        </Spin>
      ) : (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            {renderStatisticCard(
              "CPU Usage",
              currentMetrics?.cpuLoadScore || 0
            )}
          </Col>
          <Col span={6}>
            {renderStatisticCard(
              "Memory Usage",
              (currentMetrics as any)?.memoryUsagePercent ||
                (() => {
                  const usageKb = (currentMetrics as any)?.usage_kb;
                  const capacityKb = (currentMetrics as any)?.capacity_kb;
                  if (usageKb && capacityKb) {
                    return (usageKb / capacityKb) * 100;
                  }
                  return 0;
                })()
            )}
          </Col>
          <Col span={6}>
            {renderStatisticCard(
              "Network Usage",
              currentMetrics?.networkLoadScore
            )}
          </Col>
          <Col span={6}>
            {renderStatisticCard("Disk Usage", currentMetrics?.diskLoadScore)}
          </Col>
        </Row>
      )}

      <Card
        title={
          <Row justify="space-between" align="middle">
            <Col>
              <Space direction="vertical" size={0}>
                <span>System Metrics History</span>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    fontWeight: "normal",
                  }}
                >
                  Auto-refresh in: {getHistoricalRemainingTime()}
                </span>
              </Space>
            </Col>
            <Col>
              <Space>
                <span style={{ fontSize: "14px", color: "#666" }}>
                  Data Interval:
                </span>
                <Select
                  value={selectedInterval}
                  onChange={handleIntervalChange}
                  style={{ width: 120 }}
                  size="small"
                >
                  {intervalOptions.map((option) => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              </Space>
            </Col>
          </Row>
        }
        style={{ marginBottom: 24 }}
      >
        {loadingHistorical ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Spin size="large" tip="Loading historical data..." />
          </div>
        ) : historicalData.length > 0 ? (
          <>
            {/* Main Chart - Overall Load (Largest) */}
            <Card
              title="Overall Load Score (Main Metric)"
              style={{ marginBottom: 16 }}
              size="small"
            >
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient
                      id="overallLoadGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ffc658" stopOpacity={0.8} />
                      <stop
                        offset="95%"
                        stopColor="#ffc658"
                        stopOpacity={0.1}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="timestamp"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#666" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#666" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="overallLoadScore"
                    stroke="#ffc658"
                    strokeWidth={3}
                    fill="url(#overallLoadGradient)"
                    name="Overall Load Score"
                    dot={{ fill: "#ffc658", strokeWidth: 2, r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Secondary Charts - Smaller Size */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="CPU Usage %" size="small">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient
                          id="cpuGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#8884d8"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#8884d8"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="cpuUsagePercent"
                        stroke="#8884d8"
                        strokeWidth={2.5}
                        fill="url(#cpuGradient)"
                        name="CPU Usage %"
                        dot={{ fill: "#8884d8", strokeWidth: 1, r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>

              <Col span={12}>
                <Card title="Memory Usage %" size="small">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient
                          id="memoryGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#82ca9d"
                            stopOpacity={0.6}
                          />
                          <stop
                            offset="95%"
                            stopColor="#82ca9d"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="memoryUsagePercent"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        fill="url(#memoryGradient)"
                        name="Memory Usage %"
                        dot={{ fill: "#82ca9d", strokeWidth: 1, r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col span={12}>
                <Card title="Network Load Score" size="small">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient
                          id="networkGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ff6b6b"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ff6b6b"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="networkLoadScore"
                        stroke="#ff6b6b"
                        strokeWidth={2.5}
                        fill="url(#networkGradient)"
                        name="Network Load Score"
                        dot={{ fill: "#ff6b6b", strokeWidth: 1, r: 3 }}
                        activeDot={{ r: 6, fill: "#ff6b6b" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>

              <Col span={12}>
                <Card title="Disk Load Score" size="small">
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={historicalData}>
                      <defs>
                        <linearGradient
                          id="diskGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#ff7300"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#ff7300"
                            stopOpacity={0.1}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                      <XAxis
                        dataKey="timestamp"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <YAxis
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#666" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="diskLoadScore"
                        stroke="#ff7300"
                        strokeWidth={2.5}
                        fill="url(#diskGradient)"
                        name="Disk Load Score"
                        dot={{ fill: "#ff7300", strokeWidth: 1, r: 3 }}
                        activeDot={{ r: 6, fill: "#ff7300" }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Alert
              message="No Data"
              description="No historical metrics available."
              type="info"
              showIcon
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
