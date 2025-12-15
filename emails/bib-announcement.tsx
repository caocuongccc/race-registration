// emails/payment-received-no-bib.tsx
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

interface PaymentReceivedNoBibEmailProps {
  registration: any;
  event: any;
}

export function PaymentReceivedNoBibEmail({
  registration,
  event,
}: PaymentReceivedNoBibEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

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

          <Section style={successBadge}>
            <Text style={successIcon}>✅</Text>
            <Text style={successTitle}>ĐÃ NHẬN THANH TOÁN!</Text>
          </Section>

          <Text style={paragraph}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Chúng tôi đã nhận được thanh toán của bạn cho sự kiện{" "}
            <strong>{event.name}</strong>.
          </Text>

          <Section style={infoBox}>
            <Text style={infoTitle}>💰 THÔNG TIN THANH TOÁN</Text>
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Họ tên:</td>
                  <td style={valueCell}>{registration.fullName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Cự ly:</td>
                  <td style={valueCell}>{registration.distance.name}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Số tiền:</td>
                  <td style={valueCell}>
                    <strong>{formatCurrency(registration.totalAmount)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Trạng thái:</td>
                  <td style={paidStatus}>Đã thanh toán ✓</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Section style={bibPendingBox}>
            <Text style={bibPendingTitle}>📋 THÔNG BÁO VỀ SỐ BIB</Text>
            <Text style={bibPendingText}>
              Số BIB (số áo) của bạn sẽ được công bố trong thời gian tới.
              <br />
              <br />
              Ban tổ chức sẽ gửi email thông báo số BIB khi đã hoàn tất việc
              phân chia và sắp xếp.
              <br />
              <br />
              Vui lòng theo dõi email để nhận thông tin số BIB của mình.
            </Text>
          </Section>

          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý</Text>
            <ul style={noteList}>
              <li>Đăng ký của bạn đã được xác nhận thành công</li>
              <li>Bạn sẽ nhận email thông báo số BIB trong thời gian tới</li>
              <li>Khi nhận được số BIB, bạn sẽ có thể tải mã QR check-in</li>
              <li>
                Nếu có thắc mắc, vui lòng liên hệ hotline: {event.hotline}
              </li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            Cảm ơn bạn đã đăng ký tham gia! 🏃‍♂️
            <br />
            <br />
            <strong>Ban tổ chức {event.name}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Styles (giữ nguyên như payment-confirmed.tsx, thêm)
const bibPendingBox = {
  backgroundColor: "#fef3c7",
  padding: "24px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #f59e0b",
  textAlign: "center" as const,
};

const bibPendingTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#92400e",
  margin: "0 0 16px",
};

const bibPendingText = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#78350f",
  margin: "0",
};

// ... (copy các styles khác từ payment-confirmed.tsx)

// ============================================
// emails/bib-announcement.tsx
// ============================================

interface BibAnnouncementEmailProps {
  registration: any;
}

export function BibAnnouncementEmail({
  registration,
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

          {registration.qrCheckinUrl && (
            <Section style={qrSection}>
              <Text style={qrTitle}>📱 MÃ QR CHECK-IN</Text>
              <Img
                src={registration.qrCheckinUrl}
                alt="QR Check-in"
                width="250"
                height="250"
                style={qrCode}
              />
              <Text style={qrInstruction}>
                💡 Xuất trình mã này khi nhận race pack và check-in
              </Text>
            </Section>
          )}

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

// ... (reuse styles từ payment-confirmed.tsx)
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
const paidStatus = {
  ...valueCell,
  color: "#16a34a",
  fontWeight: "bold" as const,
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
const successBadge = {
  textAlign: "center" as const,
  backgroundColor: "#dcfce7",
  padding: "24px",
  borderRadius: "12px",
  margin: "20px 0",
  border: "2px solid #16a34a",
};
const successIcon = { fontSize: "48px", margin: "0" };
const successTitle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#15803d",
  margin: "8px 0 0",
};
const noteBox = {
  backgroundColor: "#fef2f2",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #fca5a5",
};
const noteTitle = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#991b1b",
  margin: "0 0 12px",
};
const noteList = {
  fontSize: "14px",
  lineHeight: "24px",
  color: "#7f1d1d",
  paddingLeft: "20px",
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
