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
} from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";
import {
  getLatestSystemMetrics,
  getSystemMetricsForTimeRange,
  SystemMetric,
} from "../services/api"; // Adjusted path
import dayjs from "dayjs";

const { Title } = Typography;

const Dashboard: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetric | null>(
    null
  );
  const [historicalData, setHistoricalData] = useState<SystemMetric[]>([]);
  const [loadingCurrent, setLoadingCurrent] = useState<boolean>(true);
  const [loadingHistorical, setLoadingHistorical] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCurrentMetrics = async () => {
    setLoadingCurrent(true);
    try {
      const now = dayjs();
      // Fetch metrics from the last 5 minutes to get the "latest"
      const response = await getLatestSystemMetrics(
        now.subtract(5, "minute").toISOString()
      );
      if (response.data && response.data.length > 0) {
        // Assuming the last metric in the list is the most recent
        setCurrentMetrics(response.data[response.data.length - 1]);
      } else {
        setCurrentMetrics(null); // Or handle as no data found
      }
      setError(null);
    } catch (err) {
      message.error("Failed to fetch current system metrics.");
      setError("Failed to fetch current system metrics.");
      setCurrentMetrics(null);
      console.error(err);
    } finally {
      setLoadingCurrent(false);
    }
  };

  const fetchHistoricalMetrics = async () => {
    setLoadingHistorical(true);
    try {
      const endTime = dayjs();
      const startTime = endTime.subtract(24, "hour"); // Last 24 hours
      const response = await getSystemMetricsForTimeRange(
        startTime.toISOString(),
        endTime.toISOString()
      );
      setHistoricalData(
        response.data.map((m: SystemMetric) => ({
          ...m,
          timestamp: dayjs(m.timestamp).format("HH:mm"),
        }))
      ); // Format for chart
      setError(null);
    } catch (err) {
      message.error("Failed to fetch historical system metrics.");
      setError("Failed to fetch historical system metrics.");
      console.error(err);
    } finally {
      setLoadingHistorical(false);
    }
  };

  useEffect(() => {
    fetchCurrentMetrics();
    fetchHistoricalMetrics();

    // Optional: Set up a poller to refresh current metrics
    const intervalId = setInterval(() => {
      fetchCurrentMetrics();
      fetchHistoricalMetrics(); // also refresh chart data
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, []);

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
            {renderStatisticCard("CPU Usage", currentMetrics?.cpuUsage)}
          </Col>
          <Col span={6}>
            {renderStatisticCard("Memory Usage", currentMetrics?.memoryUsage)}
          </Col>
          <Col span={6}>
            {renderStatisticCard("Network Usage", currentMetrics?.networkUsage)}
          </Col>
          <Col span={6}>
            {renderStatisticCard("Disk Usage", currentMetrics?.diskUsage)}
          </Col>
        </Row>
      )}

      <Card
        title="System Metrics History (Last 24 Hours)"
        style={{ marginBottom: 24 }}
      >
        {loadingHistorical ? (
          <div style={{ textAlign: "center", padding: "50px 0" }}>
            <Spin size="large" tip="Loading historical data..." />
          </div>
        ) : historicalData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="cpuUsage"
                name="CPU Usage"
                stroke="#8884d8"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="memoryUsage"
                name="Memory Usage"
                stroke="#82ca9d"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="networkUsage"
                name="Network Usage"
                stroke="#ffc658"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="diskUsage"
                name="Disk Usage"
                stroke="#ff7300"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Alert
            message="No historical data available for the selected range."
            type="info"
            showIcon
          />
        )}
      </Card>

      {currentMetrics &&
      (currentMetrics.cpuUsage > 80 || currentMetrics.memoryUsage > 80) ? (
        <Alert
          message="High System Load Detected!"
          description={`CPU at ${currentMetrics.cpuUsage.toFixed(
            2
          )}%, Memory at ${currentMetrics.memoryUsage.toFixed(
            2
          )}%. Consider checking resource allocation.`}
          type="warning"
          showIcon
        />
      ) : (
        <Alert
          message="System Status"
          description="Current system load is within normal parameters."
          type="success"
          showIcon
        />
      )}
    </div>
  );
};

export default Dashboard;
