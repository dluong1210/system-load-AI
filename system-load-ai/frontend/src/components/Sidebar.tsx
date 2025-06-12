import React from "react";
import { Layout, Menu } from "antd";
import { Link, useLocation } from "react-router-dom";
import {
  DashboardOutlined,
  LineChartOutlined,
  BarChartOutlined,
  SettingOutlined,
  FileTextOutlined,
  ApiOutlined,
} from "@ant-design/icons";

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const location = useLocation();

  const menuItems = [
    {
      key: "/",
      icon: <DashboardOutlined />,
      label: <Link to="/">Dashboard</Link>,
    },
    // {
    //   key: "/metrics",
    //   icon: <LineChartOutlined />,
    //   label: <Link to="/metrics">System Metrics</Link>,
    // },
    {
      key: "/predictions",
      icon: <BarChartOutlined />,
      label: <Link to="/predictions">Predictions</Link>,
    },
    {
      key: "/optimization",
      icon: <SettingOutlined />,
      label: <Link to="/optimization">Resource Optimization</Link>,
    },
    {
      key: "/reports",
      icon: <FileTextOutlined />,
      label: <Link to="/reports">Reports</Link>,
    },
    {
      key: "/connection-test",
      icon: <ApiOutlined />,
      label: <Link to="/connection-test">Connection Test</Link>,
    },
  ];

  return (
    <Sider width={200} theme="light">
      <div
        style={{
          height: 64,
          margin: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img src="/viettel_logo.png" alt="App Logo" style={{ height: 32 }} />
      </div>
      <Menu
        mode="inline"
        selectedKeys={[location.pathname]}
        style={{ height: "100%", borderRight: 0 }}
        items={menuItems}
      />
    </Sider>
  );
};

export default Sidebar;
