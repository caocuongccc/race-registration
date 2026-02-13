import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Img,
} from "@react-email/components";

interface BatchPaymentEmailProps {
  batch: {
    fileName: string;
    bibRangeStart: string;
    bibRangeEnd: string;
    successCount: number;
    totalShirts: number;
    qrBatchUrl: string;
  };
  event: {
    name: string;
  };
}

export function BatchPaymentConfirmedEmail({
  batch,
  event,
}: BatchPaymentEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Xác nhận thanh toán hàng loạt - {batch.successCount} VĐV
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Xác nhận thanh toán thành công</Heading>

          <Text style={text}>
            Đã xác nhận thanh toán cho <strong>{batch.successCount} VĐV</strong>{" "}
            từ file import <strong>{batch.fileName}</strong> tham gia{" "}
            <strong>{event.name}</strong>.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>📊 Thông tin batch:</Text>

            <div style={infoRow}>
              <span style={infoLabel}>Số BIB:</span>
              <span style={bibRange}>
                {batch.bibRangeStart} - {batch.bibRangeEnd}
              </span>
            </div>

            <div style={infoRow}>
              <span style={infoLabel}>Tổng VĐV:</span>
              <span style={infoValue}>{batch.successCount} người</span>
            </div>

            <div style={infoRow}>
              <span style={infoLabel}>Tổng áo đã đặt:</span>
              <span style={infoValue}>{batch.totalShirts} cái</span>
            </div>
          </Section>

          {/* QR Code for Batch Check-in */}
          <Section style={qrSection}>
            <Text style={qrTitle}>📱 QR Code Nhận Race Pack Hàng Loạt</Text>
            <Text style={qrDescription}>
              Sử dụng QR code này để check-in tất cả VĐV trong batch:
            </Text>
            <div style={qrContainer}>
              <Img
                src={batch.qrBatchUrl}
                alt="Batch QR Code"
                width="300"
                height="300"
                style={qrImage}
              />
            </div>
            <Text style={qrHint}>
              💡 Quét QR này trên thiết bị mobile của BTC để xem danh sách và
              check-in từng VĐV
            </Text>
          </Section>

          <Section style={instructionBox}>
            <Text style={instructionTitle}>📋 Hướng dẫn nhận race pack:</Text>
            <ol style={instructionList}>
              <li>Mang theo QR code này (in ra hoặc lưu trên điện thoại)</li>
              <li>Đến điểm phát race pack</li>
              <li>BTC sẽ quét QR và check-in từng VĐV</li>
              <li>Nhận race pack + áo (nếu có)</li>
            </ol>
          </Section>

          <Text style={footer}>Cảm ơn đã tham gia {event.name}!</Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const h1 = {
  color: "#16a34a",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
  textAlign: "center" as const,
};

const text = {
  color: "#333",
  fontSize: "16px",
  lineHeight: "26px",
  padding: "0 40px",
};

const infoBox = {
  background: "#f0fdf4",
  border: "2px solid #86efac",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
};

const infoTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "16px",
  color: "#15803d",
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "12px",
  paddingBottom: "12px",
  borderBottom: "1px solid #bbf7d0",
};

const infoLabel = {
  fontSize: "14px",
  color: "#166534",
};

const infoValue = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#15803d",
};

const bibRange = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#15803d",
  fontFamily: "monospace",
};

const qrSection = {
  margin: "32px 40px",
  textAlign: "center" as const,
};

const qrTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  color: "#1e40af",
  marginBottom: "8px",
};

const qrDescription = {
  fontSize: "14px",
  color: "#64748b",
  marginBottom: "16px",
};

const qrContainer = {
  display: "flex",
  justifyContent: "center",
  margin: "20px 0",
};

const qrImage = {
  border: "2px solid #e2e8f0",
  borderRadius: "8px",
};

const qrHint = {
  fontSize: "13px",
  color: "#64748b",
  fontStyle: "italic",
  marginTop: "12px",
};

const instructionBox = {
  background: "#fef3c7",
  border: "2px solid #fde047",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
};

const instructionTitle = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#a16207",
  marginBottom: "12px",
};

const instructionList = {
  fontSize: "14px",
  color: "#78350f",
  lineHeight: "24px",
  paddingLeft: "20px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  textAlign: "center" as const,
  marginTop: "32px",
};
