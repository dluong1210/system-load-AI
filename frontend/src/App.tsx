import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "antd";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Predictions from "./pages/Predictions";
import ResourceOptimization from "./pages/ResourceOptimization";
import Reports from "./pages/Reports";
import SystemConnection from "./components/SystemConnection";

const { Content } = Layout;

const App: React.FC = () => {
  return (
    <Router>
      <Layout style={{ minHeight: "100vh" }}>
        <Sidebar />
        <Layout>
          <Content
            style={{ margin: "24px 16px", padding: 24, background: "#fff" }}
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/optimization" element={<ResourceOptimization />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/connection-test" element={<SystemConnection />} />
            </Routes>
          </Content>
        </Layout>
      </Layout>
    </Router>
  );
};

export default App;
