import React from "react";
import { Typography } from "antd";

const { Title } = Typography;

const SystemMetrics: React.FC = () => {
  return (
    <div>
      <Title level={2}>System Metrics</Title>
      <p>Detailed system metrics will be displayed here.</p>
      {/* Placeholder for charts and data */}
    </div>
  );
};

export default SystemMetrics;
