import React, { useEffect, useState } from "react";
import {
  Typography,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Button,
  message,
  Empty,
  Tag,
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
import {
  getFuturePredictions,
  triggerPredictionGeneration,
  SystemPrediction,
} from "../services/api"; // Adjusted path
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;

const Predictions: React.FC = () => {
  const [predictions, setPredictions] = useState<SystemPrediction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const fetchPredictions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getFuturePredictions();
      // Format predictionTime for display
      const formattedPredictions = response.data.map((p: SystemPrediction) => ({
        ...p,
        predictionTime: dayjs(p.predictionTime).format("MMM D, HH:mm"), // More readable format
        // Ensure predicted values are numbers
        predictedCpuUsage: Number(p.predictedCpuUsage) || 0,
        predictedMemoryUsage: Number(p.predictedMemoryUsage) || 0,
        predictedNetworkUsage: Number(p.predictedNetworkUsage) || 0,
        predictedDiskUsage: Number(p.predictedDiskUsage) || 0,
      }));
      setPredictions(formattedPredictions);
    } catch (err) {
      message.error("Failed to fetch predictions.");
      setError("Failed to fetch predictions. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePredictions = async () => {
    setIsGenerating(true);
    message.loading({
      content: "Generating new predictions...",
      key: "genPredictions",
    });
    try {
      await triggerPredictionGeneration();
      message.success({
        content: "Prediction generation started! Refreshing data soon...",
        key: "genPredictions",
        duration: 5,
      });
      // Wait a bit for backend to process, then refresh
      setTimeout(fetchPredictions, 15000); // Refresh after 15 seconds
    } catch (err) {
      message.error({
        content: "Failed to trigger prediction generation.",
        key: "genPredictions",
        duration: 5,
      });
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    // Optionally, set up a poller for predictions if they update frequently
    // or if you want to reflect newly generated predictions automatically after a longer interval
    const intervalId = setInterval(fetchPredictions, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, []);

  if (loading && predictions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" tip="Loading predictions..." />
      </div>
    );
  }

  if (error && predictions.length === 0) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  const renderPredictionChart = (
    dataKey: keyof SystemPrediction,
    title: string,
    color: string
  ) => (
    <Col span={12} style={{ marginBottom: 24 }}>
      <Card title={title}>
        {predictions.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={predictions}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="predictionTime" />
              <YAxis
                domain={[0, 100]}
                label={{ value: "Usage %", angle: -90, position: "insideLeft" }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey as string}
                name={title}
                stroke={color}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <Empty description={`No ${title.toLowerCase()} data available.`} />
        )}
      </Card>
    </Col>
  );

  return (
    <div>
      <Row justify="space-between" align="middle">
        <Title level={2}>System Load Predictions (Next 24 Hours)</Title>
        <Button
          type="primary"
          onClick={handleGeneratePredictions}
          loading={isGenerating}
          style={{ marginBottom: 20 }}
        >
          Generate New Predictions
        </Button>
      </Row>

      {predictions.length === 0 && !loading && !error && (
        <Empty description="No future predictions available. Try generating new ones." />
      )}

      <Row gutter={16}>
        {renderPredictionChart(
          "predictedCpuUsage",
          "CPU Usage Prediction",
          "#8884d8"
        )}
        {renderPredictionChart(
          "predictedMemoryUsage",
          "Memory Usage Prediction",
          "#82ca9d"
        )}
        {/* Add charts for Network and Disk if/when backend provides this data */}
        {/* {renderPredictionChart('predictedNetworkUsage', 'Network Usage Prediction', '#ffc658')} */}
        {/* {renderPredictionChart('predictedDiskUsage', 'Disk Usage Prediction', '#ff7300')} */}
      </Row>

      {predictions.length > 0 && (
        <Card
          title="Prediction Summary & Recommendations"
          style={{ marginTop: 20 }}
        >
          <Paragraph>
            Showing predictions based on the{" "}
            <strong>{predictions[0]?.modelType || "default"}</strong> model.
          </Paragraph>
          {predictions.slice(0, 5).map((p) => (
            <div
              key={p.id}
              style={{
                marginBottom: "10px",
                paddingBottom: "10px",
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Text strong>
                {dayjs(p.predictionTime).format("MMM D, YYYY HH:mm")}:{" "}
              </Text>
              CPU: <Text code>{Number(p.predictedCpuUsage).toFixed(2)}%</Text>,
              Memory:{" "}
              <Text code>{Number(p.predictedMemoryUsage).toFixed(2)}%</Text>.
              {p.recommendation && (
                <Tag color="orange" style={{ marginLeft: "10px" }}>
                  {p.recommendation}
                </Tag>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
};

export default Predictions;
