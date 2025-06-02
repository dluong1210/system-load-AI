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
} from "antd";
import { DownloadOutlined, LineChartOutlined } from "@ant-design/icons";
import { getOptimizationReport, SystemPrediction } from "../services/api"; // Assuming SystemPrediction might be part of report details
import dayjs, { Dayjs } from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { RangePicker } = DatePicker;

interface ReportData {
  period: {
    start: string;
    end: string;
  };
  resourceUtilization: {
    cpu?: number;
    memory?: number;
    network?: number;
    disk?: number;
    [key: string]: number | undefined; // For dynamic access
  };
  recommendations: string[];
  generatedAt: string;
}

const Reports: React.FC = () => {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<
    [Dayjs | null, Dayjs | null] | null
  >([dayjs().subtract(7, "days"), dayjs()]);

  const handleFetchReport = async () => {
    if (!dateRange || !dateRange[0] || !dateRange[1]) {
      message.error("Please select a valid date range.");
      return;
    }
    setLoading(true);
    setError(null);
    setReportData(null);
    try {
      const response = await getOptimizationReport(
        dateRange[0].toISOString(),
        dateRange[1].toISOString()
      );
      setReportData(response.data);
    } catch (err) {
      message.error("Failed to fetch optimization report.");
      setError("Failed to load report. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Optimization Reports</Title>
      <Paragraph>
        Generate and view resource optimization reports for specific periods.
      </Paragraph>

      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="bottom">
          <Col>
            <Paragraph style={{ marginBottom: 8 }}>
              Select Report Period:
            </Paragraph>
            <RangePicker
              value={dateRange}
              onChange={(dates) =>
                setDateRange(dates as [Dayjs | null, Dayjs | null])
              }
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ marginRight: 16 }}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<LineChartOutlined />}
              onClick={handleFetchReport}
              loading={loading}
            >
              Generate & View Report
            </Button>
          </Col>
        </Row>
      </Card>

      {loading && (
        <div style={{ textAlign: "center", padding: "50px" }}>
          <Spin size="large" tip="Generating report..." />
        </div>
      )}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      {!loading && !error && !reportData && (
        <Empty description="No report generated yet. Select a date range and click generate." />
      )}

      {reportData && (
        <Card
          title={`Optimization Report (${dayjs(reportData.period.start).format(
            "YYYY-MM-DD"
          )} - ${dayjs(reportData.period.end).format("YYYY-MM-DD")})`}
          extra={
            <Button
              icon={<DownloadOutlined />}
              onClick={() =>
                message.info("Download functionality to be implemented.")
              }
            >
              Download PDF
            </Button>
          }
        >
          <Paragraph>
            Generated At:{" "}
            {dayjs(reportData.generatedAt).format("YYYY-MM-DD HH:mm:ss")}
          </Paragraph>

          <Title level={4} style={{ marginTop: 20 }}>
            Resource Utilization Summary
          </Title>
          <Row gutter={16} style={{ marginBottom: 20 }}>
            {Object.entries(reportData.resourceUtilization).map(
              ([key, value]) =>
                value !== undefined && (
                  <Col xs={12} sm={6} key={key}>
                    <Card
                      size="small"
                      bordered={false}
                      style={{ background: "#f9f9f9" }}
                    >
                      <Statistic
                        title={`Avg ${
                          key.charAt(0).toUpperCase() + key.slice(1)
                        }`}
                        value={value}
                        precision={2}
                        suffix="%"
                      />
                    </Card>
                  </Col>
                )
            )}
          </Row>

          <Title level={4} style={{ marginTop: 20 }}>
            Recommendations
          </Title>
          {reportData.recommendations.length > 0 ? (
            <List
              bordered
              dataSource={reportData.recommendations}
              renderItem={(item, index) => (
                <List.Item>
                  <Text>
                    {index + 1}. {item}
                  </Text>
                </List.Item>
              )}
            />
          ) : (
            <Paragraph>
              No specific optimization recommendations for this period.
            </Paragraph>
          )}
        </Card>
      )}
    </div>
  );
};

export default Reports;
