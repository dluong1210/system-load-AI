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
} from "antd";
import { SettingOutlined, BulbOutlined } from "@ant-design/icons";
import { getResourceOptimizationAnalysis } from "../services/api";
import dayjs from "dayjs";

const { Title, Paragraph } = Typography;

interface OptimizationSuggestion {
  id: string;
  metric: string;
  current?: string | number; // Can be string like 'N/A' or number
  predicted?: string | number;
  suggestion: string;
  actionable: boolean; // Can we provide a button for this?
  type: "scale_up" | "scale_down" | "investigate" | "info";
}

interface ResourceUtilizationData {
  cpu?: number;
  memory?: number;
  network?: number;
  disk?: number;
}

interface OptimizationAnalysis {
  resourceUtilization?: ResourceUtilizationData;
  recommendations?: string[];
  timestamp?: string;
}

const ResourceOptimization: React.FC = () => {
  const [analysis, setAnalysis] = useState<OptimizationAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getResourceOptimizationAnalysis();
      setAnalysis(response.data);
    } catch (err) {
      message.error("Failed to fetch resource optimization analysis.");
      setError("Failed to load analysis. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    const intervalId = setInterval(fetchAnalysis, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  const mapAnalysisToSuggestions = (
    data: OptimizationAnalysis | null
  ): OptimizationSuggestion[] => {
    if (!data || !data.recommendations) return [];

    return data.recommendations.map((rec, index) => {
      let type: OptimizationSuggestion["type"] = "info";
      if (
        rec.toLowerCase().includes("scale up") ||
        rec.toLowerCase().includes("increase")
      )
        type = "scale_up";
      else if (
        rec.toLowerCase().includes("scale down") ||
        rec.toLowerCase().includes("reduce")
      )
        type = "scale_down";
      else if (
        rec.toLowerCase().includes("investigate") ||
        rec.toLowerCase().includes("consider")
      )
        type = "investigate";

      // Simplistic metric extraction, can be improved
      let metric = "General";
      if (rec.toLowerCase().includes("cpu")) metric = "CPU";
      else if (rec.toLowerCase().includes("memory")) metric = "Memory";
      else if (rec.toLowerCase().includes("network")) metric = "Network";
      else if (rec.toLowerCase().includes("disk")) metric = "Disk";

      return {
        id: `rec-${index}`,
        metric: metric,
        suggestion: rec,
        actionable: type === "scale_up" || type === "scale_down", // Example actionable conditions
        type: type,
        current: data.resourceUtilization
          ? (data.resourceUtilization as any)[metric.toLowerCase()]?.toFixed(
              2
            ) + "%"
          : "N/A",
      };
    });
  };

  const optimizationSuggestions = mapAnalysisToSuggestions(analysis);

  if (loading && !analysis) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" tip="Loading optimization analysis..." />
      </div>
    );
  }

  if (error && !analysis) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  if (!analysis || optimizationSuggestions.length === 0) {
    return (
      <Empty description="No optimization suggestions available at the moment." />
    );
  }

  return (
    <div>
      <Title level={2}>Resource Optimization Suggestions</Title>
      <Paragraph>
        Based on system load predictions and current utilization (last analyzed:{" "}
        {analysis.timestamp
          ? dayjs(analysis.timestamp).format("YYYY-MM-DD HH:mm:ss")
          : "N/A"}
        ), here are suggestions for optimizing resource allocation.
      </Paragraph>

      {analysis.resourceUtilization && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {Object.entries(analysis.resourceUtilization).map(([key, value]) => (
            <Col xs={12} sm={6} key={key}>
              <Card size="small">
                <Statistic
                  title={`Avg ${
                    key.charAt(0).toUpperCase() + key.slice(1)
                  } Utilization`}
                  value={value}
                  precision={2}
                  suffix="%"
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <List
        grid={{ gutter: 16, xs: 1, sm: 2, md: 3 }}
        dataSource={optimizationSuggestions}
        renderItem={(item) => (
          <List.Item>
            <Card
              title={
                <>
                  <BulbOutlined
                    style={{
                      marginRight: 8,
                      color:
                        item.type === "scale_up"
                          ? "#f5222d"
                          : item.type === "scale_down"
                          ? "#52c41a"
                          : "#faad14",
                    }}
                  />
                  {item.metric} Optimization
                </>
              }
              actions={
                item.actionable
                  ? [<Button type="primary">Execute Action</Button>]
                  : []
              } // Placeholder action
            >
              <Paragraph>
                <strong>Suggestion:</strong> {item.suggestion}
              </Paragraph>
              {item.current && (
                <Paragraph>
                  <strong>Average Utilization:</strong> {item.current}
                </Paragraph>
              )}
              <Tag
                color={
                  item.type === "scale_up"
                    ? "red"
                    : item.type === "scale_down"
                    ? "green"
                    : "blue"
                }
              >
                {item.type.replace("_", " ").toUpperCase()}
              </Tag>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
};

export default ResourceOptimization;
