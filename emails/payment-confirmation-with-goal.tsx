// emails/payment-confirmation-with-goal.tsx
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface PaymentConfirmationEmailProps {
  registration: {
    fullName: string;
    email: string;
    bibNumber: string;
    totalAmount: number;
    distance: { name: string };
    distanceGoal?: { name: string; targetTime?: number } | null;
    event: { name: string };
  };
}

export function PaymentConfirmationWithGoalEmail({
  registration,
}: PaymentConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Thanh toán thành công - Số BIB {registration.bibNumber}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>🎉 Thanh toán thành công!</Heading>

          <Text style={text}>Xin chào {registration.fullName},</Text>

          <Text style={text}>
            Cảm ơn bạn đã hoàn tất thanh toán cho{" "}
            <strong>{registration.event.name}</strong>.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>Thông tin đăng ký của bạn:</Text>

            <div style={infoRow}>
              <span style={infoLabel}>Số BIB:</span>
              <span style={bibNumber}>{registration.bibNumber}</span>
            </div>

            <div style={infoRow}>
              <span style={infoLabel}>Cự ly:</span>
              <span style={infoValue}>{registration.distance.name}</span>
            </div>

            {/* NEW: Display Goal Information */}
            {registration.distanceGoal && (
              <div style={goalSection}>
                <div style={infoRow}>
                  <span style={infoLabel}>Mục tiêu:</span>
                  <span style={goalName}>{registration.distanceGoal.name}</span>
                </div>
                {registration.distanceGoal.targetTime && (
                  <Text style={goalHint}>
                    ⏱️ Thời gian mục tiêu:{" "}
                    {registration.distanceGoal.targetTime} phút
                  </Text>
                )}
                <Text style={goalHint}>
                  💡 Bạn đã được xếp vào nhóm mục tiêu này. Hãy chuẩn bị tốt để
                  đạt được mục tiêu của mình!
                </Text>
              </div>
            )}

            <div style={infoRow}>
              <span style={infoLabel}>Tổng chi phí:</span>
              <span style={totalAmount}>
                {registration.totalAmount.toLocaleString("vi-VN")} đ
              </span>
            </div>
          </Section>

          <Section style={nextStepsBox}>
            <Text style={nextStepsTitle}>📋 Các bước tiếp theo:</Text>
            <ol style={stepsList}>
              <li>
                Lưu email này để làm bằng chứng thanh toán và thông tin check-in
              </li>
              <li>
                Mã QR check-in đính kèm trong email này - vui lòng lưu lại hoặc
                in ra
              </li>
              <li>
                {registration.distanceGoal
                  ? `Chuẩn bị tốt để đạt được mục tiêu "${registration.distanceGoal.name}"`
                  : "Chuẩn bị tốt cho ngày thi đấu"}
              </li>
              <li>Mang theo CCCD/CMND khi đến nhận race pack và thi đấu</li>
            </ol>
          </Section>

          <Text style={footer}>
            Chúc bạn có một trải nghiệm tuyệt vời tại {registration.event.name}!
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const h1 = {
  color: "#333",
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
  background: "#f4f4f4",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
};

const infoTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "16px",
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "12px",
  paddingBottom: "12px",
  borderBottom: "1px solid #ddd",
};

const infoLabel = {
  fontSize: "14px",
  color: "#666",
};

const infoValue = {
  fontSize: "16px",
  fontWeight: "500",
  color: "#333",
};

const bibNumber = {
  fontSize: "24px",
  fontWeight: "bold",
  color: "#2563eb",
  fontFamily: "monospace",
};

const totalAmount = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#16a34a",
};

const goalSection = {
  background: "#eff6ff",
  border: "2px solid #3b82f6",
  borderRadius: "8px",
  padding: "16px",
  margin: "16px 0",
};

const goalName = {
  fontSize: "16px",
  fontWeight: "bold",
  color: "#1d4ed8",
};

const goalHint = {
  fontSize: "14px",
  color: "#1e40af",
  margin: "8px 0",
  lineHeight: "20px",
};

const nextStepsBox = {
  background: "#fef3c7",
  borderRadius: "8px",
  margin: "24px 40px",
  padding: "24px",
};

const nextStepsTitle = {
  fontSize: "18px",
  fontWeight: "bold",
  marginBottom: "12px",
};

const stepsList = {
  paddingLeft: "20px",
  fontSize: "14px",
  lineHeight: "24px",
};

const footer = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "24px",
  textAlign: "center" as const,
  padding: "0 40px",
  marginTop: "32px",
};
