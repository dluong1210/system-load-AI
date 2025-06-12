import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Select,
  Space,
  Divider,
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
  ReferenceLine,
} from "recharts";
import {
  predict1Hour,
  predict6Hours,
  predict24Hours,
  getAvailablePredictionModels,
  trainPredictionModel,
  getPredictionHealthCheck,
  PredictionResult,
  AvailableModelsResponse,
  PredictionHealthStatus,
} from "../services/api";
import dayjs from "dayjs";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

interface ChartDataPoint {
  time: string;
  timestamp: string;
  actualLoad?: number;
  predictedLoad?: number;
  type: "historical" | "prediction" | "bridge";
}

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
    key: "io_load_score",
    label: "I/O Load Score",
    description: "Input/Output load score",
  },
  {
    key: "network_load_score",
    label: "Network Load Score",
    description: "Network utilization score",
  },
];

const generateModelName = (metricName: string) => {
  return `${metricName}_model`;
};

// Helper function to extract base model name from a model with suffix (_1h, _6h, _24h)
const extractBaseModelName = (modelName: string): string => {
  // Remove the _1h, _6h, _24h suffix to get the base model name
  return modelName.replace(/_(1h|6h|24h)$/, "");
};

// Helper function to check if a model name is for a specific metric
const isModelForMetric = (modelName: string, metricName: string) => {
  const baseModelName = extractBaseModelName(modelName);
  return baseModelName.startsWith(`${metricName}_model`);
};

// Helper function to get available base models for a metric (without _1h/_6h/_24h suffix)
const getBaseModelsForMetric = (
  availableModels: string[],
  metricName: string
) => {
  const baseModels = new Set<string>();

  availableModels.forEach((model) => {
    if (isModelForMetric(model, metricName)) {
      baseModels.add(extractBaseModelName(model));
    }
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

const Predictions: React.FC = () => {
  const [predictions1h, setPredictions1h] = useState<PredictionResult | null>(
    null
  );
  const [predictions6h, setPredictions6h] = useState<PredictionResult | null>(
    null
  );
  const [predictions24h, setPredictions24h] = useState<PredictionResult | null>(
    null
  );
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("default");
  const [selectedMetric, setSelectedMetric] =
    useState<string>("overall_load_score");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [healthStatus, setHealthStatus] =
    useState<PredictionHealthStatus | null>(null);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);

  // Generate demo data for charts (memoized to prevent infinite re-renders)
  const generateDemoData = useCallback(
    (
      timeHorizon: "1h" | "6h" | "24h",
      timeFormat: string,
      seed: number = 0 // Add seed for consistent data
    ): ChartDataPoint[] => {
      // Use seed for consistent random generation
      const seededRandom = (s: number) => {
        const x = Math.sin(s) * 10000;
        return x - Math.floor(x);
      };

      const now = dayjs();
      const data: ChartDataPoint[] = [];

      // Configuration for different time horizons
      const config = {
        "1h": {
          historicalPoints: 30,
          predictionPoints: 60,
          intervalMinutes: 1,
        },
        "6h": {
          historicalPoints: 72,
          predictionPoints: 60,
          intervalMinutes: 6,
        },
        "24h": {
          historicalPoints: 144,
          predictionPoints: 60,
          intervalMinutes: 24,
        },
      };

      const { historicalPoints, predictionPoints, intervalMinutes } =
        config[timeHorizon];

      // Create anomaly scenario: gradual increase leading to overload
      // Start with normal load, then gradually increase to critical levels
      let baseLoad = 45 + seededRandom(seed) * 15; // Start between 45-60%

      for (let i = -historicalPoints; i <= 0; i++) {
        const time = now.add(i * intervalMinutes, "minute");

        // Create escalating pattern: load increases as we approach current time
        const progressRatio = (i + historicalPoints) / historicalPoints; // 0 to 1
        const escalationFactor = Math.pow(progressRatio, 1.5) * 25; // Gradual then sharp increase

        // Add realistic fluctuation with increasing trend
        const fluctuation =
          Math.sin((i + seed) * 0.1) * 8 + (seededRandom(i + seed) - 0.5) * 6;
        const trendLoad = baseLoad + escalationFactor + fluctuation;
        const currentLoad = Math.max(20, Math.min(95, trendLoad));

        data.push({
          time: time.format(timeFormat),
          timestamp: time.toISOString(),
          actualLoad: Number(currentLoad.toFixed(1)),
          type: i === 0 ? "bridge" : "historical",
        });

        // Gradual base increase to simulate growing system stress
        baseLoad += (seededRandom(i + seed + 100) - 0.3) * 2; // Slight upward bias
      }

      // Add bridge point with high load
      const lastHistorical = data[data.length - 1]?.actualLoad || 70;
      const bridgeLoad = Math.min(
        90,
        lastHistorical + (seededRandom(seed + 200) - 0.2) * 8
      );
      data[data.length - 1] = {
        ...data[data.length - 1],
        predictedLoad: Number(bridgeLoad.toFixed(1)),
        type: "bridge",
      };

      // Generate critical prediction data showing potential overload
      let predictionBase = bridgeLoad;

      for (let i = 1; i <= predictionPoints; i++) {
        const time = now.add(i * intervalMinutes, "minute");

        // Create different scenarios based on time horizon
        let trendPattern;
        if (timeHorizon === "1h") {
          // 1h: Sharp spike then gradual decline
          const spikeFactor = Math.exp(-Math.pow((i - 15) / 10, 2)) * 15; // Peak around 15 minutes
          trendPattern = spikeFactor + (seededRandom(i + seed + 300) - 0.5) * 4;
        } else if (timeHorizon === "6h") {
          // 6h: Sustained high load with periodic spikes
          const periodicSpike = Math.sin(i * 0.2) * 8;
          const sustainedHigh = 5 + (seededRandom(i + seed + 400) - 0.5) * 3;
          trendPattern = periodicSpike + sustainedHigh;
        } else {
          // 24h: Gradual increase throughout the day with peak during business hours
          const businessHourFactor =
            Math.sin((i / predictionPoints) * Math.PI * 2) * 12;
          const gradualIncrease = (i / predictionPoints) * 10;
          trendPattern =
            businessHourFactor +
            gradualIncrease +
            (seededRandom(i + seed + 500) - 0.5) * 5;
        }

        predictionBase += trendPattern * 0.3;
        predictionBase = Math.max(30, Math.min(98, predictionBase)); // Allow very high values for anomaly

        const predicted = Number(predictionBase.toFixed(1));

        data.push({
          time: time.format(timeFormat),
          timestamp: time.toISOString(),
          predictedLoad: predicted,
          type: "prediction",
        });
      }

      return data;
    },
    []
  ); // Empty dependency array since function doesn't depend on external state

  // Generate demo prediction results (memoized)
  const generateDemoPrediction = useCallback(
    (timeHorizon: string, finalLoad: number): PredictionResult => {
      // Always create anomaly scenario for demo
      const isAnomaly = finalLoad > 75; // Most cases will be anomaly due to high loads

      // Critical recommendations based on high load scenario
      const criticalRecommendations = [
        "🚨 CRITICAL: System approaching overload threshold - immediate action required",
        "⚡ Scale up server resources immediately to handle increased demand",
        "🔄 Enable auto-scaling policies to prevent service degradation",
        "📊 Monitor database connection pools - may need optimization",
        "🛡️ Implement circuit breakers to protect against cascade failures",
        "⏰ Consider load balancing to distribute traffic more effectively",
        "💾 Check memory usage patterns - potential memory leak detected",
        "🔍 Review recent deployments that may have caused performance regression",
      ];

      const normalRecommendations = [
        "📈 Monitor system trends - load is increasing but manageable",
        "🔧 Consider proactive scaling for anticipated peak hours",
        "📋 Review application performance metrics for optimization opportunities",
        "⚙️ Optimize database queries to improve response times",
      ];

      const recommendations = isAnomaly
        ? criticalRecommendations
        : normalRecommendations;

      return {
        success: true,
        message: isAnomaly
          ? "Critical load detected - immediate attention required"
          : "Demo prediction successful",
        predictedLoad: finalLoad,
        isAnomaly,
        recommendations: recommendations.slice(0, isAnomaly ? 5 : 3),
        predictionPeriod: timeHorizon,
        detailedPredictions: [], // Not used in demo mode
      };
    },
    []
  );

  // Memoized demo data to prevent regeneration
  const demoData = useMemo(() => {
    if (!isDemoMode) return null;

    // Use different seeds to create varied but consistent scenarios
    const demo1hData = generateDemoData("1h", "HH:mm", 1);
    const demo6hData = generateDemoData("6h", "DD HH:mm", 2);
    const demo24hData = generateDemoData("24h", "DD HH:mm", 3);

    // Extract final loads (should be high due to our escalation pattern)
    const final1h = demo1hData[demo1hData.length - 1]?.predictedLoad || 85;
    const final6h = demo6hData[demo6hData.length - 1]?.predictedLoad || 88;
    const final24h = demo24hData[demo24hData.length - 1]?.predictedLoad || 82;

    return {
      chart1h: demo1hData,
      chart6h: demo6hData,
      chart24h: demo24hData,
      prediction1h: generateDemoPrediction("1 Hour", final1h),
      prediction6h: generateDemoPrediction("6 Hours", final6h),
      prediction24h: generateDemoPrediction("24 Hours", final24h),
    };
  }, [isDemoMode, generateDemoData, generateDemoPrediction]);

  const fetchPredictions = async () => {
    if (!selectedModel || availableModels.length === 0) {
      console.log(
        "No model selected or no models available, skipping predictions"
      );
      setLoading(false);
      return;
    }

    console.log("Fetching predictions with model:", selectedModel);
    setLoading(true);
    setError(null);
    try {
      console.log("Making prediction API calls...");
      const [response1h, response6h, response24h] = await Promise.all([
        predict1Hour(selectedModel),
        predict6Hours(selectedModel),
        predict24Hours(selectedModel),
      ]);

      console.log("Prediction responses:", {
        response1h: response1h.data,
        response6h: response6h.data,
        response24h: response24h.data,
      });

      setPredictions1h(response1h.data);
      setPredictions6h(response6h.data);
      setPredictions24h(response24h.data);

      const hasErrors =
        !response1h.data.success ||
        !response6h.data.success ||
        !response24h.data.success;
      if (hasErrors) {
        const errorMessages = [
          !response1h.data.success
            ? `1h prediction failed: ${response1h.data.message}`
            : "",
          !response6h.data.success
            ? `6h prediction failed: ${response6h.data.message}`
            : "",
          !response24h.data.success
            ? `24h prediction failed: ${response24h.data.message}`
            : "",
        ].filter(Boolean);

        console.warn("Prediction errors:", errorMessages);

        // Check if the error is due to no trained models
        const hasModelErrors = errorMessages.some(
          (msg) =>
            msg.includes("404") ||
            msg.includes("model") ||
            msg.includes("not found")
        );

        if (hasModelErrors) {
          message.error({
            content:
              "No trained models available. Please train a model first using the 'Train Model' button.",
            duration: 8,
          });
        } else {
          message.warning(
            `Some predictions failed: ${errorMessages.join(", ")}`
          );
        }
      } else {
        console.log("All predictions successful");
      }
    } catch (err) {
      console.error("Error fetching predictions:", err);
      message.error("Failed to fetch predictions. Please try again later.");
      setError("Failed to fetch predictions. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableModels = async () => {
    try {
      console.log("Fetching available models...");
      const response = await getAvailablePredictionModels();
      const data: AvailableModelsResponse = response.data;
      console.log("Available models response:", data);
      setAvailableModels(data.models);

      if (data.models.length > 0) {
        // Get available base models for the currently selected metric
        const baseModelsForCurrentMetric = getBaseModelsForMetric(
          data.models,
          selectedMetric
        );

        if (baseModelsForCurrentMetric.length > 0) {
          // Find a complete model set (has _1h, _6h, _24h variants)
          const completeBaseModel = baseModelsForCurrentMetric.find(
            (baseModel) => hasCompleteModelSet(data.models, baseModel)
          );

          if (completeBaseModel) {
            console.log(
              `Setting complete base model for ${selectedMetric}:`,
              completeBaseModel
            );
            setSelectedModel(completeBaseModel);
          } else {
            // If no complete set, use the first available base model
            console.log(
              `Setting partial base model for ${selectedMetric}:`,
              baseModelsForCurrentMetric[0]
            );
            setSelectedModel(baseModelsForCurrentMetric[0]);
          }
        } else {
          // No models for current metric, find any complete base model
          const allBaseModels = Array.from(
            new Set(data.models.map((model) => extractBaseModelName(model)))
          );

          const completeBaseModel = allBaseModels.find((baseModel) =>
            hasCompleteModelSet(data.models, baseModel)
          );

          if (completeBaseModel) {
            console.log(
              "Setting first complete base model:",
              completeBaseModel
            );
            setSelectedModel(completeBaseModel);
          } else if (allBaseModels.length > 0) {
            console.log(
              "Setting first available base model:",
              allBaseModels[0]
            );
            setSelectedModel(allBaseModels[0]);
          } else {
            console.log("No base models available - clearing selected model");
            setSelectedModel("");
          }
        }
      } else {
        console.log("No models available - clearing selected model");
        setSelectedModel("");
      }
    } catch (err) {
      console.error("Failed to fetch available models:", err);
      message.warning("Could not load available models");
      setAvailableModels([]);
    }
  };

  const fetchHealthStatus = async () => {
    try {
      console.log("Checking ML service health...");
      const response = await getPredictionHealthCheck();
      console.log("Health status response:", response.data);
      setHealthStatus(response.data);
    } catch (err) {
      console.error("Failed to fetch health status:", err);
    }
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    message.loading({
      content: `Training ${selectedMetric} model...`,
      key: "trainModel",
    });
    try {
      console.log("Starting model training...");
      const modelName = generateModelName(selectedMetric);
      const response = await trainPredictionModel(selectedMetric, modelName);
      console.log("Training response:", response.data);

      if (response.data && response.data.success) {
        message.success({
          content:
            "Model training completed successfully! Refreshing predictions...",
          key: "trainModel",
          duration: 5,
        });
        // Refresh everything after training
        setTimeout(() => {
          fetchAvailableModels();
          fetchPredictions();
        }, 3000);
      } else {
        message.error({
          content: `Model training failed: ${
            response.data?.message || "Unknown error"
          }`,
          key: "trainModel",
          duration: 8,
        });
      }
    } catch (err: any) {
      console.error("Training error:", err);
      message.error({
        content: `Failed to train model: ${
          err.response?.data?.message || err.message || "Unknown error"
        }`,
        key: "trainModel",
        duration: 8,
      });
    } finally {
      setIsTraining(false);
    }
  };

  useEffect(() => {
    fetchAvailableModels();
    fetchHealthStatus();
  }, []);

  useEffect(() => {
    if (selectedModel) {
      fetchPredictions();
    } else {
      setLoading(false);
    }
  }, [selectedModel]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (selectedModel) {
        fetchPredictions();
        fetchHealthStatus();
      }
    }, 300000); // Refresh every 5 minutes
    return () => clearInterval(intervalId);
  }, [selectedModel]);

  // Auto-select model when metric changes
  useEffect(() => {
    if (availableModels.length > 0) {
      const baseModelsForSelectedMetric = getBaseModelsForMetric(
        availableModels,
        selectedMetric
      );

      if (baseModelsForSelectedMetric.length > 0) {
        // Find a complete model set for the selected metric
        const completeBaseModel = baseModelsForSelectedMetric.find(
          (baseModel) => hasCompleteModelSet(availableModels, baseModel)
        );

        if (completeBaseModel && completeBaseModel !== selectedModel) {
          console.log(
            `Auto-selecting complete base model for ${selectedMetric}:`,
            completeBaseModel
          );
          setSelectedModel(completeBaseModel);
        } else if (baseModelsForSelectedMetric[0] !== selectedModel) {
          console.log(
            `Auto-selecting base model for ${selectedMetric}:`,
            baseModelsForSelectedMetric[0]
          );
          setSelectedModel(baseModelsForSelectedMetric[0]);
        }
      }
    }
  }, [selectedMetric, availableModels]);

  // Handle demo mode initialization separately
  useEffect(() => {
    if (isDemoMode) {
      // Set demo models and health status
      setAvailableModels([
        "cpu_usage_percent_model_1h",
        "cpu_usage_percent_model_6h",
        "cpu_usage_percent_model_24h",
        "memory_usage_percent_model_1h",
        "memory_usage_percent_model_6h",
        "memory_usage_percent_model_24h",
        "overall_load_score_model_1h",
        "overall_load_score_model_6h",
        "overall_load_score_model_24h",
      ]);
      setSelectedModel("overall_load_score_model");
      setHealthStatus({
        status: "healthy",
        isConnectionHealthy: true,
        timestamp: Date.now(),
      });

      // Set demo predictions
      if (demoData) {
        setPredictions1h(demoData.prediction1h);
        setPredictions6h(demoData.prediction6h);
        setPredictions24h(demoData.prediction24h);
      }

      setLoading(false);
    } else {
      // Reset to real mode - only if we were in demo mode before
      setLoading(true);
    }
  }, [isDemoMode, demoData]);

  // Update chart data when predictions change
  useEffect(() => {
    if (isDemoMode) {
      // Use demo data
      setChart1hData(demoData?.chart1h || []);
      setChart6hData(demoData?.chart6h || []);
      setChart24hData(demoData?.chart24h || []);
    } else {
      // Use real data
      setChart1hData(formatPredictionChartData(predictions1h, 60, "HH:mm"));
      setChart6hData(formatPredictionChartData(predictions6h, 60, "DD HH:mm"));
      setChart24hData(
        formatPredictionChartData(predictions24h, 60, "DD HH:mm")
      );
    }
  }, [
    predictions1h,
    predictions6h,
    predictions24h,
    selectedMetric,
    isDemoMode,
    demoData,
  ]);

  const renderPredictionCard = (
    prediction: PredictionResult | null,
    title: string
  ) => (
    <Col span={8} key={title}>
      <Card
        title={title}
        extra={
          prediction &&
          prediction.success && (
            <Tag color={prediction.isAnomaly ? "red" : "green"}>
              {prediction.isAnomaly ? "Anomaly" : "Normal"}
            </Tag>
          )
        }
      >
        {loading && !prediction ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" tip="Loading..." />
          </div>
        ) : prediction && prediction.success ? (
          <div>
            <Statistic
              title="Predicted Load"
              value={prediction.predictedLoad || 0}
              precision={1}
              suffix="%"
              valueStyle={{
                color:
                  (prediction.predictedLoad || 0) > 80
                    ? "#cf1322"
                    : (prediction.predictedLoad || 0) > 60
                    ? "#faad14"
                    : "#3f8600",
              }}
            />
            <Divider />
            <div style={{ marginTop: 16 }}>
              <Text strong>Recommendations:</Text>
              {prediction.recommendations &&
              prediction.recommendations.length > 0 ? (
                <ul style={{ marginTop: 8, paddingLeft: 20 }}>
                  {prediction.recommendations.map((rec, index) => (
                    <li key={index} style={{ marginBottom: 4 }}>
                      <Text type="secondary">{rec}</Text>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>
                  <Text type="secondary">No recommendations available</Text>
                </p>
              )}
            </div>
          </div>
        ) : availableModels.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary">No trained models available</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Click "Train Model" to get started
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">
                  {prediction
                    ? prediction.message
                    : "No prediction data available"}
                </Text>
              }
            />
          </div>
        )}
      </Card>
    </Col>
  );

  // Format data for individual prediction charts
  const formatPredictionChartData = (
    predictionData: PredictionResult | null,
    expectedPredictionPoints: number = 60,
    timeFormat: string = "HH:mm"
  ): ChartDataPoint[] => {
    const combinedData: ChartDataPoint[] = [];
    const now = dayjs();

    // If no prediction data available, return empty array
    if (
      !predictionData ||
      !predictionData.success ||
      !predictionData.detailedPredictions
    ) {
      return [];
    }

    const allPoints = predictionData.detailedPredictions;

    // Split data: last expectedPredictionPoints are predictions, rest are historical
    const totalPoints = allPoints.length;
    const historicalPoints = allPoints.slice(
      0,
      totalPoints - expectedPredictionPoints
    );
    const predictionPoints = allPoints.slice(
      totalPoints - expectedPredictionPoints
    );

    console.log(
      `Processing ${totalPoints} total points: ${historicalPoints.length} historical + ${predictionPoints.length} predictions`
    );

    // Add historical data points
    historicalPoints.forEach((point) => {
      const time = dayjs(point.timestamp);
      combinedData.push({
        time: time.format(timeFormat),
        timestamp: time.toISOString(),
        actualLoad: Number((point.predicted_value || 0).toFixed(2)), // For historical, this is actual data
        type: "historical",
      });
    });

    // Add bridge point (current time) if we have both historical and prediction data
    if (historicalPoints.length > 0 && predictionPoints.length > 0) {
      const lastHistoricalValue =
        historicalPoints[historicalPoints.length - 1]?.predicted_value || 0;
      const firstPredictionValue =
        predictionPoints[0]?.predicted_value || lastHistoricalValue;

      combinedData.push({
        time: now.format(timeFormat),
        timestamp: now.toISOString(),
        actualLoad: Number(lastHistoricalValue.toFixed(2)),
        predictedLoad: Number(firstPredictionValue.toFixed(2)),
        type: "bridge",
      });
    }

    // Add prediction data points (future predictions)
    predictionPoints.forEach((point) => {
      const time = dayjs(point.timestamp);
      combinedData.push({
        time: time.format(timeFormat),
        timestamp: time.toISOString(),
        predictedLoad: Number((point.predicted_value || 0).toFixed(2)),
        type: "prediction",
      });
    });

    // Sort by timestamp and return
    const sortedData = combinedData.sort(
      (a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf()
    );

    console.log(`Chart data formatted: ${sortedData.length} total points`, {
      historical: sortedData.filter((d) => d.type === "historical").length,
      bridge: sortedData.filter((d) => d.type === "bridge").length,
      prediction: sortedData.filter((d) => d.type === "prediction").length,
    });

    return sortedData;
  };

  // Generate chart data for each prediction type
  const [chart1hData, setChart1hData] = useState<ChartDataPoint[]>([]);
  const [chart6hData, setChart6hData] = useState<ChartDataPoint[]>([]);
  const [chart24hData, setChart24hData] = useState<ChartDataPoint[]>([]);

  // Get current metric label for display
  const getCurrentMetricLabel = () => {
    const metric = AVAILABLE_METRICS.find((m) => m.key === selectedMetric);
    return metric ? metric.label : selectedMetric;
  };

  // Get chart height based on screen size
  const getChartHeight = () => {
    return window.innerWidth < 768 ? 250 : 350;
  };

  // Custom tooltip formatter
  const formatTooltip = (value: any, name: any, props: any) => {
    if (value === null || value === undefined) return ["-", name];

    const formattedValue = `${Number(value).toFixed(1)}%`;
    const nameMap: { [key: string]: string } = {
      actualLoad: "Actual Load",
      predictedLoad: "Predicted Load",
    };

    return [formattedValue, nameMap[name] || name];
  };

  // Render individual prediction chart with improved design
  const renderPredictionChart = (
    chartData: ChartDataPoint[],
    title: string,
    prediction: PredictionResult | null,
    timeHorizon: string
  ) => {
    // Show empty state if no data
    if (!chartData || chartData.length === 0) {
      return (
        <Card
          title={
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>{title}</span>
              <Tag color="default">No Data</Tag>
            </div>
          }
          style={{
            marginBottom: 24,
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text type="secondary" style={{ fontSize: 16 }}>
                    No data available for {title.toLowerCase()}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Train a model to see predictions
                  </Text>
                </div>
              }
            />
          </div>
        </Card>
      );
    }

    const hasHistoricalData = chartData.some((d) => d.actualLoad !== undefined);
    const hasPredictionData = chartData.some(
      (d) => d.predictedLoad !== undefined
    );
    const latestPrediction = prediction?.predictedLoad;

    return (
      <Card
        title={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>
              {title} - {getCurrentMetricLabel()}
            </span>
            <Space>
              {latestPrediction && (
                <Tag
                  color={
                    latestPrediction > 80
                      ? "red"
                      : latestPrediction > 60
                      ? "orange"
                      : "green"
                  }
                  style={{ fontSize: 13, padding: "4px 8px" }}
                >
                  Final: {latestPrediction.toFixed(1)}%
                </Tag>
              )}
              {prediction?.isAnomaly && (
                <Tag color="red" style={{ fontSize: 13, padding: "4px 8px" }}>
                  ⚠ Anomaly Detected
                </Tag>
              )}
            </Space>
          </div>
        }
        style={{
          marginBottom: 24,
          borderRadius: 8,
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
          border: prediction?.isAnomaly
            ? "2px solid #ff4d4f"
            : "1px solid #d9d9d9",
        }}
        bodyStyle={{ padding: "20px" }}
      >
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          <LineChart
            data={chartData}
            margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
          >
            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#f0f0f0"
              vertical={false}
            />

            {/* X Axis */}
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: "#666" }}
              tickLine={{ stroke: "#d9d9d9" }}
              axisLine={{ stroke: "#d9d9d9" }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
            />

            {/* Y Axis */}
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: "#666" }}
              tickLine={{ stroke: "#d9d9d9" }}
              axisLine={{ stroke: "#d9d9d9" }}
              label={{
                value: `${getCurrentMetricLabel()}`,
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: 12, fill: "#666" },
              }}
            />

            {/* Tooltip */}
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #d9d9d9",
                borderRadius: 6,
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              }}
              labelStyle={{ color: "#262626", fontWeight: 500 }}
              labelFormatter={(value: any) => `Time: ${value}`}
              formatter={formatTooltip}
            />

            {/* Legend */}
            <Legend wrapperStyle={{ paddingTop: 20 }} iconType="line" />

            {/* Historical data line */}
            {hasHistoricalData && (
              <Line
                type="monotone"
                dataKey="actualLoad"
                stroke="#1890ff"
                strokeWidth={2.5}
                name="Historical Data"
                dot={{ fill: "#1890ff", strokeWidth: 0, r: 3 }}
                activeDot={{
                  r: 5,
                  stroke: "#1890ff",
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                connectNulls={false}
              />
            )}

            {/* Predicted data line */}
            {hasPredictionData && (
              <Line
                type="monotone"
                dataKey="predictedLoad"
                stroke="#52c41a"
                strokeWidth={2.5}
                strokeDasharray="6 6"
                name="AI Prediction"
                dot={{ fill: "#52c41a", strokeWidth: 0, r: 3 }}
                activeDot={{
                  r: 5,
                  stroke: "#52c41a",
                  strokeWidth: 2,
                  fill: "#fff",
                }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>

        {/* Chart Legend and Info */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 16px",
            backgroundColor: "#fafafa",
            borderRadius: 6,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <Space size="large" wrap>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 16,
                  height: 3,
                  backgroundColor: "#1890ff",
                  borderRadius: 2,
                }}
              ></div>
              <Text style={{ fontSize: 12, color: "#666" }}>Historical</Text>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div
                style={{
                  width: 16,
                  height: 3,
                  backgroundColor: "#52c41a",
                  borderRadius: 2,
                  background:
                    "repeating-linear-gradient(to right, #52c41a 0px, #52c41a 4px, transparent 4px, transparent 8px)",
                }}
              ></div>
              <Text style={{ fontSize: 12, color: "#666" }}>AI Prediction</Text>
            </div>
          </Space>

          {/* Data points info */}
          <Space>
            <Text style={{ fontSize: 12, color: "#999" }}>
              {chartData.filter((d) => d.actualLoad !== undefined).length}{" "}
              historical points
            </Text>
            <Text style={{ fontSize: 12, color: "#999" }}>•</Text>
            <Text style={{ fontSize: 12, color: "#999" }}>
              {chartData.filter((d) => d.predictedLoad !== undefined).length}{" "}
              predictions
            </Text>
          </Space>
        </div>

        {/* Prediction Summary */}
        {prediction && prediction.success && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              backgroundColor: prediction.isAnomaly ? "#fff2f0" : "#f6ffed",
              border: `1px solid ${
                prediction.isAnomaly ? "#ffccc7" : "#b7eb8f"
              }`,
              borderRadius: 6,
            }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Predicted Peak"
                  value={prediction.predictedLoad || 0}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    fontSize: 18,
                    color: prediction.isAnomaly
                      ? "#cf1322"
                      : (prediction.predictedLoad || 0) > 80
                      ? "#fa8c16"
                      : "#52c41a",
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Risk Level"
                  value={
                    prediction.isAnomaly
                      ? "High"
                      : (prediction.predictedLoad || 0) > 80
                      ? "High"
                      : (prediction.predictedLoad || 0) > 60
                      ? "Medium"
                      : "Low"
                  }
                  valueStyle={{
                    fontSize: 16,
                    color: prediction.isAnomaly
                      ? "#cf1322"
                      : (prediction.predictedLoad || 0) > 80
                      ? "#fa8c16"
                      : "#52c41a",
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Time Horizon"
                  value={timeHorizon}
                  valueStyle={{ fontSize: 16, color: "#1890ff" }}
                />
              </Col>
            </Row>

            {prediction.recommendations &&
              prediction.recommendations.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <Text strong style={{ fontSize: 13, color: "#262626" }}>
                    💡 AI Recommendations:
                  </Text>
                  <ul
                    style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18 }}
                  >
                    {prediction.recommendations
                      .slice(0, 3)
                      .map((rec, index) => (
                        <li key={index} style={{ marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: "#595959" }}>
                            {rec}
                          </Text>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </Card>
    );
  };

  return (
    <div>
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={2}>AI Load Predictions</Title>
          <Paragraph>
            ML Service Status:
            <Tag
              color={healthStatus?.isConnectionHealthy ? "green" : "red"}
              style={{ marginLeft: 8 }}
            >
              {healthStatus?.isConnectionHealthy ? "Ready" : "Not Ready"}
            </Tag>
            {availableModels.length === 0 && !isDemoMode && (
              <Tag color="orange" style={{ marginLeft: 8 }}>
                No Models Available - Train First
              </Tag>
            )}
            {isDemoMode && (
              <Tag color="purple" style={{ marginLeft: 8 }}>
                🎭 Demo Mode - Simulated Data
              </Tag>
            )}
          </Paragraph>
        </Col>
        <Col>
          <Space wrap>
            <Button
              type={isDemoMode ? "primary" : "default"}
              onClick={() => setIsDemoMode(!isDemoMode)}
              style={{
                background: isDemoMode ? "#722ed1" : undefined,
                borderColor: isDemoMode ? "#722ed1" : undefined,
              }}
            >
              {isDemoMode ? "🎭 Exit Demo" : "🎭 Demo Mode"}
            </Button>
            <Select
              value={selectedMetric}
              onChange={setSelectedMetric}
              style={{ width: 250 }}
              placeholder="Select metric to train"
              disabled={isDemoMode}
            >
              {AVAILABLE_METRICS.map((metric) => {
                const modelCount = getBaseModelsForMetric(
                  availableModels,
                  metric.key
                ).length;
                return (
                  <Option
                    key={metric.key}
                    value={metric.key}
                    title={metric.description}
                  >
                    {metric.label}{" "}
                    {modelCount > 0 && <Tag color="green">{modelCount}</Tag>}
                  </Option>
                );
              })}
            </Select>
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ width: 300 }}
              placeholder="Select model"
              disabled={availableModels.length === 0 || isDemoMode}
              showSearch
              filterOption={(input, option) =>
                option?.children
                  ?.toString()
                  .toLowerCase()
                  .includes(input.toLowerCase()) || false
              }
            >
              {availableModels.length > 0 ? (
                // Group models by metric
                AVAILABLE_METRICS.map((metric) => {
                  const baseModelsForMetric = getBaseModelsForMetric(
                    availableModels,
                    metric.key
                  );
                  if (baseModelsForMetric.length === 0) return null;

                  return (
                    <React.Fragment key={`group-${metric.key}`}>
                      <Option
                        disabled
                        value={`header-${metric.key}`}
                        style={{
                          fontWeight: "bold",
                          backgroundColor: "#f5f5f5",
                        }}
                      >
                        {metric.label} Models
                      </Option>
                      {baseModelsForMetric.map((baseModel) => {
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
                                ? `Complete model set for ${metric.label} (1h, 6h, 24h)`
                                : `Partial model set for ${
                                    metric.label
                                  } (${modelVariants.join(", ")})`
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
                      })}
                    </React.Fragment>
                  );
                })
              ) : (
                <Option disabled value="no-models">
                  No models available - Train a model first
                </Option>
              )}
            </Select>
            <Button
              type="primary"
              onClick={handleTrainModel}
              loading={isTraining}
              disabled={!healthStatus?.isConnectionHealthy || isDemoMode}
            >
              Train Model
            </Button>
            <Button
              onClick={() => {
                if (!isDemoMode) {
                  fetchPredictions();
                  fetchAvailableModels();
                }
              }}
              loading={loading && !isDemoMode}
              disabled={isDemoMode}
            >
              Refresh
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
            <Button
              size="small"
              onClick={() => {
                fetchPredictions();
                fetchAvailableModels();
              }}
            >
              Retry
            </Button>
          }
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Info banner for first-time users */}
      {availableModels.length === 0 && !isDemoMode && (
        <Alert
          message="Welcome to AI Load Predictions!"
          description={
            <div>
              <p>To get started with AI-powered load predictions:</p>
              <ol style={{ marginLeft: 20, marginTop: 8 }}>
                <li>Ensure the ML service is ready (green status above)</li>
                <li>
                  Select a metric to train from the dropdown (e.g., "CPU Usage
                  [%]", "Memory Usage [%]", etc.)
                </li>
                <li>
                  Click the <strong>"Train Model"</strong> button to train your
                  first model
                </li>
                <li>Wait for training to complete (may take a few minutes)</li>
                <li>Once trained, predictions will automatically load</li>
              </ol>
              <p style={{ marginTop: 8 }}>
                <strong>Available Metrics:</strong> CPU Usage [%], Memory Usage
                [%], Overall Load Score, Disk I/O, Network I/O, and more
                specialized load scores.
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>Note:</strong> Training requires historical system data.
                The system automatically collects metrics in the background.
              </p>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      <Row gutter={16} style={{ marginBottom: 24 }}>
        {renderPredictionCard(predictions1h, "1 Hour Prediction")}
        {renderPredictionCard(predictions6h, "6 Hours Prediction")}
        {renderPredictionCard(predictions24h, "24 Hours Prediction")}
      </Row>

      {/* Individual Prediction Charts */}
      <div style={{ marginTop: 32 }}>
        <Title level={3} style={{ marginBottom: 24, color: "#262626" }}>
          📈 AI Prediction Timeline
        </Title>
        <Paragraph style={{ marginBottom: 24, color: "#595959" }}>
          Visualize historical data and AI-powered predictions across different
          time horizons. Charts show confidence intervals and anomaly detection.
        </Paragraph>

        {/* 1 Hour Prediction Chart */}
        {renderPredictionChart(
          chart1hData,
          "1 Hour Forecast",
          predictions1h,
          "1h"
        )}

        {/* 6 Hours Prediction Chart */}
        {renderPredictionChart(
          chart6hData,
          "6 Hours Forecast",
          predictions6h,
          "6h"
        )}

        {/* 24 Hours Prediction Chart */}
        {renderPredictionChart(
          chart24hData,
          "24 Hours Forecast",
          predictions24h,
          "24h"
        )}

        {/* Show message if no charts are available */}
        {chart1hData.length === 0 &&
          chart6hData.length === 0 &&
          chart24hData.length === 0 &&
          !isDemoMode && (
            <Card
              style={{
                textAlign: "center",
                padding: "60px 40px",
                borderRadius: 8,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                color: "white",
                border: "none",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <Title level={3} style={{ color: "white", marginBottom: 16 }}>
                No AI Predictions Available
              </Title>
              <Paragraph
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: 16,
                  marginBottom: 24,
                }}
              >
                Train your first AI model to unlock powerful load forecasting
                capabilities. Our machine learning algorithms will analyze your
                system patterns and provide accurate predictions with confidence
                intervals.
              </Paragraph>
              <Space direction="vertical" size="middle">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleTrainModel}
                  loading={isTraining}
                  style={{
                    background: "rgba(255,255,255,0.2)",
                    borderColor: "rgba(255,255,255,0.3)",
                    color: "white",
                  }}
                >
                  🚀 Start Training AI Model
                </Button>
                <Text style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}>
                  Training typically takes 2-5 minutes
                </Text>
              </Space>
            </Card>
          )}
      </div>
    </div>
  );
};

export default Predictions;
