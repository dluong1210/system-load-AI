# Ứng dụng Web dự đoán tải hệ thống và tối ưu hóa sử dụng tài nguyên

Dự án này nhằm xây dựng một ứng dụng web sử dụng trí tuệ nhân tạo (AI/ML) để dự đoán tình trạng tải hệ thống trong tương lai gần. Từ đó, hệ thống sẽ đưa ra hướng dẫn hoặc tự động điều chỉnh tài nguyên phù hợp, nhằm đảm bảo hiệu suất tối ưu và tiết kiệm chi phí vận hành.

## Cấu trúc thư mục

- **/frontend**: Chứa mã nguồn cho giao diện người dùng (ReactJS, Ant Design, Shadcn/ui, Recharts).
- **/backend**: Chứa mã nguồn cho API và logic nghiệp vụ (Java Spring Boot hoặc Python Django).
- **/ml_models**: Chứa mã nguồn và tài liệu liên quan đến các mô hình AI/ML (Facebook Prophet, TensorFlow/Keras, LSTM, XGBoost).
- **/database**: Chứa cấu hình và scripts cho cơ sở dữ liệu (PostgreSQL/MongoDB, Redis Cache).
- **/monitoring**: Chứa cấu hình cho hệ thống giám sát (Prometheus, Grafana).
- **/deployment**: Chứa các tệp cấu hình cho việc triển khai (Docker, Kubernetes, Helm Charts).
