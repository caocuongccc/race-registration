// emails/bib-announcement-inline.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
} from "@react-email/components";

interface BibAnnouncementEmailProps {
  registration: any;
  qrCodeBase64?: string; // NEW: Optional inline QR
}

export function BibAnnouncementEmail({
  registration,
  qrCodeBase64,
}: BibAnnouncementEmailProps) {
  const event = registration.event;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          {event.logoUrl && (
            <Img
              src={event.logoUrl}
              alt={event.name}
              width="200"
              style={logo}
            />
          )}

          <Section style={bibAnnouncementBanner}>
            <Text style={announcementIcon}>🎉</Text>
            <Text style={announcementTitle}>CÔNG BỐ SỐ BIB!</Text>
          </Section>

          <Text style={paragraph}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Số BIB của bạn cho <strong>{event.name}</strong> đã được công bố!
          </Text>

          <Section style={bibBox}>
            <Text style={bibLabel}>🏃 SỐ BIB CỦA BẠN</Text>
            <Text style={bibNumber}>{registration.bibNumber}</Text>
            <Text style={bibNote}>
              Vui lòng ghi nhớ số BIB này khi nhận race pack
            </Text>
          </Section>

          {/* QR CHECK-IN - CID attachment reference */}
          <Section style={qrSection}>
            <Text style={qrTitle}>📱 MÃ QR CHECK-IN</Text>
            <Text style={qrSubtitle}>
              Xuất trình mã này khi nhận race pack và check-in ngày thi đấu
            </Text>
            {/* Reference attachment by CID */}
            <Img
              src={`cid:qr-checkin-${registration.bibNumber}`}
              alt="QR Check-in"
              width="250"
              height="250"
              style={qrCode}
            />

            <Text style={qrInstruction}>
              💡 <strong>Mã QR đã đính kèm</strong> - Tải file đính kèm để in ra
              hoặc lưu vào điện thoại
            </Text>
          </Section>

          <Section style={infoBox}>
            <Text style={infoTitle}>📋 THÔNG TIN CỦA BẠN</Text>
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Số BIB:</td>
                  <td style={valueCell}>
                    <strong style={{ color: "#2563eb", fontSize: "18px" }}>
                      {registration.bibNumber}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Cự ly:</td>
                  <td style={valueCell}>{registration.distance.name}</td>
                </tr>
                {registration.shirtSize && (
                  <tr>
                    <td style={labelCell}>Áo:</td>
                    <td style={valueCell}>
                      {registration.shirtCategory === "MALE" ? "Nam" : "Nữ"} -
                      Size {registration.shirtSize}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {event.racePackLocation && (
            <Section style={racePackBox}>
              <Text style={infoTitle}>📦 NHẬN RACE PACK</Text>
              <table style={infoTable}>
                <tbody>
                  <tr>
                    <td style={labelCell}>Địa điểm:</td>
                    <td style={valueCell}>{event.racePackLocation}</td>
                  </tr>
                  {event.racePackTime && (
                    <tr>
                      <td style={labelCell}>Thời gian:</td>
                      <td style={valueCell}>{event.racePackTime}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            Chúc bạn có một mùa giải thành công! 🎯
            <br />
            <br />
            <strong>Ban tổ chức {event.name}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles (same as before)
const main = { backgroundColor: "#f6f9fc", fontFamily: "sans-serif" };
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "600px",
  borderRadius: "8px",
};
const logo = { margin: "0 auto 20px", display: "block" };
const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "16px 0",
};
const bibAnnouncementBanner = {
  backgroundColor: "#2563eb",
  padding: "24px",
  borderRadius: "12px",
  textAlign: "center" as const,
  margin: "20px 0",
};
const announcementIcon = {
  fontSize: "48px",
  margin: "0",
};
const announcementTitle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#ffffff",
  margin: "8px 0 0",
  letterSpacing: "1px",
};
const bibBox = {
  textAlign: "center" as const,
  backgroundColor: "#eff6ff",
  padding: "32px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "3px solid #2563eb",
};
const bibLabel = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#1e40af",
  margin: "0 0 12px",
};
const bibNumber = {
  fontSize: "56px",
  fontWeight: "bold" as const,
  color: "#2563eb",
  margin: "0",
  letterSpacing: "2px",
};
const bibNote = { fontSize: "14px", color: "#64748b", margin: "12px 0 0" };
const infoBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
};
const racePackBox = {
  backgroundColor: "#f0f9ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #38bdf8",
};
const infoTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1f2937",
  margin: "0 0 16px",
};
const infoTable = { width: "100%", fontSize: "14px" };
const labelCell = {
  padding: "8px 0",
  color: "#6b7280",
  width: "40%",
  verticalAlign: "top" as const,
};
const valueCell = {
  padding: "8px 0",
  color: "#111827",
  fontWeight: "500" as const,
  verticalAlign: "top" as const,
};
const qrSection = {
  textAlign: "center" as const,
  backgroundColor: "#f9fafb",
  padding: "24px",
  borderRadius: "8px",
  margin: "24px 0",
  border: "2px dashed #cbd5e1",
};
const qrTitle = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#1f2937",
  margin: "0 0 8px",
};
const qrSubtitle = {
  fontSize: "14px",
  color: "#6b7280",
  margin: "0 0 20px",
};
const qrCode = {
  margin: "0 auto 20px",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
  backgroundColor: "#ffffff",
  padding: "8px",
};
const qrInstruction = {
  fontSize: "14px",
  color: "#374151",
  backgroundColor: "#fef3c7",
  padding: "12px",
  borderRadius: "6px",
  margin: "0",
};
const hr = { borderColor: "#e5e7eb", margin: "24px 0" };
const footer = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "16px 0",
};