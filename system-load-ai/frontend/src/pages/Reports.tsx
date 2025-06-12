import React, { useState } from "react";
import {
  Typography,
  Card,
  Button,
  DatePicker,
  Spin,
  Alert,
  Empty,
  Row,
  Col,
  Statistic,
  List,
  Tag,
  message,
  Progress,
  Divider,
  Space,
  Tabs,
  Table,
} from "antd";
import {
  DownloadOutlined,
  LineChartOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TrophyOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { getOptimizationReport } from "../services/api";
import dayjs, { Dayjs } from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;
const { TabPane } = Tabs;

interface ReportData {
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalMetrics: number;
    averageLoad: number;
    peakLoad: number;
    efficiency: number;
    anomaliesDetected: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    network: number;
    disk: number;
    overall: number;
  };
  trends: Array<{
    date: string;
    cpu: number;
    memory: number;
    overall: number;
  }>;
  recommendations: Array<{
    id: string;
    priority: "high" | "medium" | "low";
    category: string;
    title: string;
    description: string;
    impact: string;
    effort: "easy" | "medium" | "complex";
    estimatedSavings?: string;
  }>;
  insights: {
    mostUtilizedResource: string;
    peakHours: string;
    optimizationPotential: number;
    costSavingsOpportunity: string;
  };
  generatedAt: string;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >([dayjs().subtract(7, "days"), dayjs()]);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Generate mock report data for demo purposes
  const generateMockReportData = (start: Dayjs, end: Dayjs): ReportData => {
    const days = end.diff(start, "days");
    const trends = [];

    // Generate daily trends
    for (let i = 0; i <= days; i++) {
      const date = start.add(i, "days");
      trends.push({
        date: date.format("MM/DD"),
        cpu: 40 + Math.random() * 30 + Math.sin(i * 0.5) * 10,
        memory: 50 + Math.random() * 25 + Math.cos(i * 0.3) * 8,
        overall: 45 + Math.random() * 25 + Math.sin(i * 0.4) * 12,
      });
    }

    return {
      period: {
        start: start.toISOString(),
        end: end.toISOString(),
      },
      summary: {
        totalMetrics: 1440 * days, // Assuming 1 metric per minute
        averageLoad: 62.3,
        peakLoad: 89.7,
        efficiency: 75.2,
        anomaliesDetected: Math.floor(Math.random() * 5) + 1,
      },
      resourceUtilization: {
        cpu: 58.3,
        memory: 67.8,
        network: 34.2,
        disk: 41.6,
        overall: 62.3,
      },
      trends,
      recommendations: [
        {
          id: "1",
          priority: "high",
          category: "Performance",
          title: "Optimize Memory Usage",
          description:
            "Memory utilization consistently above 65%. Consider memory optimization or scaling.",
          impact: "20-30% performance improvement",
          effort: "medium",
          estimatedSavings: "$150/month",
        },
        {
          id: "2",
          priority: "medium",
          category: "Cost",
          title: "Right-size CPU Resources",
          description:
            "CPU utilization below 60% during off-peak hours. Consider dynamic scaling.",
          impact: "15-20% cost reduction",
          effort: "easy",
          estimatedSavings: "$200/month",
        },
        {
          id: "3",
          priority: "low",
          category: "Monitoring",
          title: "Enhanced Disk Monitoring",
          description:
            "Implement proactive disk space monitoring to prevent capacity issues.",
          impact: "Improved system reliability",
          effort: "easy",
          estimatedSavings: "Avoids downtime costs",
        },
      ],
      insights: {
        mostUtilizedResource: "Memory (67.8%)",
        peakHours: "9:00 AM - 11:00 AM, 2:00 PM - 4:00 PM",
        optimizationPotential: 82.5,
        costSavingsOpportunity: "$350/month",
      },
      generatedAt: dayjs().toISOString(),
    };
  };

  const handleFetchReport = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error("Please select a valid date range.");
      return;
    }

    setLoading(true);
    setError(null);
    setReportData(null);

    try {
      if (isDemoMode) {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const mockData = generateMockReportData(dateRange[0], dateRange[1]);
        setReportData(mockData);
        message.success("Demo report generated successfully!");
      } else {
        const response = await getOptimizationReport(
          dateRange[0].toISOString(),
          dateRange[1].toISOString()
        );
        setReportData(response.data);
        message.success("Report generated successfully!");
      }
    } catch (err: any) {
      console.error("Report generation error:", err);

      // If API fails, offer demo mode
      if (!isDemoMode) {
        setError(
          "Unable to connect to reporting service. Try demo mode instead."
        );
        message.error({
          content:
            "Failed to fetch report from server. You can try demo mode for a sample report.",
          duration: 6,
        });
      } else {
        setError("Failed to generate demo report.");
        message.error("Failed to generate demo report.");
      }
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;

    message.info(
      "PDF download functionality will be implemented soon. For now, you can print this page."
    );
    // TODO: Implement PDF generation
  };

  const columns = [
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (priority: string) => (
        <Tag
          color={
            priority === "high"
              ? "red"
              : priority === "medium"
              ? "orange"
              : "green"
          }
        >
          {priority.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "Recommendation",
      dataIndex: "title",
      key: "title",
      render: (title: string, record: any) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description}
          </Text>
        </div>
      ),
    },
    {
      title: "Impact",
      dataIndex: "impact",
      key: "impact",
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
      title: "Est. Savings",
      dataIndex: "estimatedSavings",
      key: "estimatedSavings",
      render: (savings: string) => savings && <Text strong>{savings}</Text>,
    },
  ];

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2}>
            <FileTextOutlined style={{ marginRight: 8 }} />
            System Optimization Reports
          </Title>
          <Paragraph>
            Generate comprehensive optimization reports with AI insights and
            recommendations.
          </Paragraph>
        </Col>
        <Col>
          <Button
            type={isDemoMode ? "primary" : "default"}
            onClick={() => setIsDemoMode(!isDemoMode)}
            style={{
              background: isDemoMode ? "#52c41a" : undefined,
              borderColor: isDemoMode ? "#52c41a" : undefined,
            }}
          >
            {isDemoMode ? "🎭 Demo Mode" : "🎭 Try Demo"}
          </Button>
        </Col>
      </Row>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
          <Col flex={1}>
            <Text strong>Report Period:</Text>
            <br />
            <RangePicker
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates as [Dayjs | null, Dayjs | null])
              }
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ marginTop: 8, width: "100%" }}
              disabled={loading}
            />
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<LineChartOutlined />}
                onClick={handleFetchReport}
                loading={loading}
                size="large"
              >
                {isDemoMode ? "Generate Demo Report" : "Generate Report"}
              </Button>
            </Space>
          </Col>
        </Row>

        {isDemoMode && (
          <Alert
            message="Demo Mode Active"
            description="You are viewing a demonstration report with simulated data. Switch off demo mode to connect to real data sources."
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Card>

      {loading && (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <Spin
            size="large"
            tip={
              isDemoMode
                ? "Generating demo report..."
                : "Analyzing system data and generating report..."
            }
          />
          <br />
          <Text type="secondary" style={{ marginTop: 16 }}>
            This may take a few moments...
          </Text>
        </Card>
      )}

      {error && (
        <Alert
          message="Report Generation Failed"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
          action={
            !isDemoMode ? (
              <Button size="small" onClick={() => setIsDemoMode(true)}>
                Try Demo Mode
              </Button>
            ) : undefined
          }
        />
      )}

      {!loading && !error && !reportData && (
        <Card style={{ textAlign: "center", padding: "60px 20px" }}>
          <FileTextOutlined
            style={{ fontSize: 48, color: "#d9d9d9", marginBottom: 16 }}
          />
          <Title level={4} type="secondary">
            No Report Generated
          </Title>
          <Paragraph type="secondary">
            Select a date range and click "Generate Report" to create your
            optimization analysis.
          </Paragraph>
        </Card>
      )}

      {reportData && (
        <div>
          <Card
            title={
              <Space>
                <BarChartOutlined />
                {`Optimization Report: ${dayjs(reportData.period.start).format(
                  "MMM DD"
                )} - ${dayjs(reportData.period.end).format("MMM DD, YYYY")}`}
              </Space>
            }
            extra={
              <Space>
                <Text type="secondary">
                  Generated:{" "}
                  {dayjs(reportData.generatedAt).format("MMM DD, YYYY HH:mm")}
                </Text>
                <Button icon={<DownloadOutlined />} onClick={downloadReport}>
                  Download PDF
                </Button>
              </Space>
            }
            style={{ marginBottom: 24 }}
          >
            {/* Executive Summary */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Average Load"
                  value={reportData.summary.averageLoad}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      reportData.summary.averageLoad > 70
                        ? "#cf1322"
                        : "#3f8600",
                  }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Peak Load"
                  value={reportData.summary.peakLoad}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      reportData.summary.peakLoad > 85 ? "#cf1322" : "#faad14",
                  }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Efficiency Score"
                  value={reportData.summary.efficiency}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color:
                      reportData.summary.efficiency > 75
                        ? "#3f8600"
                        : "#faad14",
                  }}
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="Anomalies"
                  value={reportData.summary.anomaliesDetected}
                  valueStyle={{
                    color:
                      reportData.summary.anomaliesDetected > 3
                        ? "#cf1322"
                        : "#3f8600",
                  }}
                />
              </Col>
            </Row>

            {/* Key Insights */}
            <Alert
              message="Key Insights"
              description={
                <div>
                  <p>
                    <strong>Most Utilized Resource:</strong>{" "}
                    {reportData.insights.mostUtilizedResource}
                  </p>
                  <p>
                    <strong>Peak Hours:</strong> {reportData.insights.peakHours}
                  </p>
                  <p>
                    <strong>Cost Savings Opportunity:</strong>{" "}
                    {reportData.insights.costSavingsOpportunity}
                  </p>
                </div>
              }
              type="info"
              showIcon
              icon={<TrophyOutlined />}
              style={{ marginBottom: 24 }}
            />
          </Card>

          <Tabs defaultActiveKey="1">
            <TabPane tab="Resource Analysis" key="1">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="Resource Utilization Summary">
                    <Row gutter={16}>
                      {Object.entries(reportData.resourceUtilization).map(
                        ([key, value]) => (
                          <Col span={12} key={key} style={{ marginBottom: 16 }}>
                            <div>
                              <Text strong>{key.toUpperCase()}</Text>
                              <Progress
                                percent={value}
                                format={(percent) => `${percent?.toFixed(1)}%`}
                                strokeColor={
                                  value > 80
                                    ? "#ff4d4f"
                                    : value > 60
                                    ? "#faad14"
                                    : "#52c41a"
                                }
                              />
                            </div>
                          </Col>
                        )
                      )}
                    </Row>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Trends Over Period">
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData.trends}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          formatter={(value: any) => [
                            `${Number(value).toFixed(1)}%`,
                            "",
                          ]}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="cpu"
                          stroke="#1890ff"
                          name="CPU"
                        />
                        <Line
                          type="monotone"
                          dataKey="memory"
                          stroke="#52c41a"
                          name="Memory"
                        />
                        <Line
                          type="monotone"
                          dataKey="overall"
                          stroke="#faad14"
                          name="Overall"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="Recommendations" key="2">
              <Card>
                <Table
                  dataSource={reportData.recommendations}
                  columns={columns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </TabPane>

            <TabPane tab="Optimization Potential" key="3">
              <Row gutter={16}>
                <Col span={12}>
                  <Card title="Optimization Score">
                    <div style={{ textAlign: "center" }}>
                      <Progress
                        type="circle"
                        percent={reportData.insights.optimizationPotential}
                        format={(percent) => (
                          <div>
                            <div style={{ fontSize: 24, fontWeight: "bold" }}>
                              {percent}%
                            </div>
                            <div style={{ fontSize: 12 }}>Potential</div>
                          </div>
                        )}
                        strokeColor="#52c41a"
                        size={200}
                      />
                      <Paragraph style={{ marginTop: 16 }}>
                        Your system has{" "}
                        <Text strong>
                          {reportData.insights.optimizationPotential}%
                        </Text>{" "}
                        optimization potential. Implementation of recommended
                        changes could save approximately{" "}
                        <Text strong>
                          {reportData.insights.costSavingsOpportunity}
                        </Text>
                        .
                      </Paragraph>
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="Quick Actions">
                    <List
                      dataSource={reportData.recommendations.filter(
                        (r) => r.effort === "easy"
                      )}
                      renderItem={(item) => (
                        <List.Item
                          actions={[
                            <Button type="primary" size="small">
                              <CheckCircleOutlined /> Implement
                            </Button>,
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <CheckCircleOutlined
                                style={{ color: "#52c41a" }}
                              />
                            }
                            title={item.title}
                            description={`${item.impact} - ${
                              item.estimatedSavings || "Cost neutral"
                            }`}
                          />
                        </List.Item>
                      )}
                    />
                  </Card>
                </Col>
              </Row>
            </TabPane>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default Reports;
