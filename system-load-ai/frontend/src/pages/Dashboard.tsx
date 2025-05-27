import React from "react";
import { Row, Col, Card, Statistic, Alert } from "antd";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const Dashboard: React.FC = () => {
  // Mock data for demonstration
  const systemMetrics = {
    cpu: 65,
    memory: 78,
    network: 45,
    disk: 32,
  };

  const historicalData = [
    { time: "00:00", cpu: 30, memory: 40, network: 20 },
    { time: "04:00", cpu: 45, memory: 50, network: 35 },
    { time: "08:00", cpu: 60, memory: 65, network: 45 },
    { time: "12:00", cpu: 75, memory: 80, network: 55 },
    { time: "16:00", cpu: 65, memory: 70, network: 50 },
    { time: "20:00", cpu: 55, memory: 60, network: 40 },
  ];

  return (
    <div>
      <h1>System Load Dashboard</h1>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="CPU Usage"
              value={systemMetrics.cpu}
              suffix="%"
              valueStyle={{
                color: systemMetrics.cpu > 80 ? "#cf1322" : "#3f8600",
              }}
              prefix={
                systemMetrics.cpu > 80 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Memory Usage"
              value={systemMetrics.memory}
              suffix="%"
              valueStyle={{
                color: systemMetrics.memory > 80 ? "#cf1322" : "#3f8600",
              }}
              prefix={
                systemMetrics.memory > 80 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Network Usage"
              value={systemMetrics.network}
              suffix="%"
              valueStyle={{
                color: systemMetrics.network > 80 ? "#cf1322" : "#3f8600",
              }}
              prefix={
                systemMetrics.network > 80 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Disk Usage"
              value={systemMetrics.disk}
              suffix="%"
              valueStyle={{
                color: systemMetrics.disk > 80 ? "#cf1322" : "#3f8600",
              }}
              prefix={
                systemMetrics.disk > 80 ? (
                  <ArrowUpOutlined />
                ) : (
                  <ArrowDownOutlined />
                )
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="System Metrics History" style={{ marginBottom: 24 }}>
        <LineChart width={800} height={400} data={historicalData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="time" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="cpu" stroke="#8884d8" />
          <Line type="monotone" dataKey="memory" stroke="#82ca9d" />
          <Line type="monotone" dataKey="network" stroke="#ffc658" />
        </LineChart>
      </Card>

      <Alert
        message="System Status"
        description="Current system load is within normal parameters. No immediate action required."
        type="success"
        showIcon
      />
    </div>
  );
};

export default Dashboard;
