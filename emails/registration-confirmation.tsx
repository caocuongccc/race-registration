// emails/registration-confirmation.tsx
// UPDATED: Beautiful layout for batch emails with CID QR

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
  Hr,
} from "@react-email/components";

interface Props {
  registration: {
    fullName: string;
    bibNumber: string;
    email: string;
    phone?: string;
    bibName?: string;
    shirtCategory?: string;
    shirtType?: string;
    shirtSize?: string;
    finisherShirtCategory?: string;
    finisherShirtType?: string;
    finisherShirtSize?: string;
  };
  event: {
    name: string;
    date: Date;
    location?: string;
    logoUrl?: string;
    racePackLocation?: string;
    racePackTime?: string;
    hotline?: string;
    emailSupport?: string;
    facebookUrl?: string;
  };
  distance: {
    name: string;
  };
  shirt?: {
    category: string;
    type: string;
    size: string;
  };
}

export function RegistrationConfirmationEmail({
  registration,
  event,
  distance,
  shirt,
}: Props) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };
  const shirtCategoryText =
    registration.shirtCategory === "MALE"
      ? "Nam"
      : registration.shirtCategory === "FEMALE"
        ? "Ná»¯"
        : registration.shirtCategory === "KID"
          ? "Tráº» em"
          : registration.shirtCategory || "";
  const shirtTypeText =
    registration.shirtType === "SHORT_SLEEVE"
      ? "T-shirt"
      : registration.shirtType === "TANK_TOP"
        ? "Singlet"
        : registration.shirtType || "";

  return (
    <Html>
      <Head />
      <Preview>
        Thanh toÃ¡n thÃ nh cÃ´ng - {event.name} - BIB {registration.bibNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          {event.logoUrl && (
            <Section style={{ textAlign: "center", marginBottom: "24px" }}>
              <Img
                src={event.logoUrl}
                alt={event.name}
                width="160"
                height="auto"
                style={{ margin: "0 auto" }}
              />
            </Section>
          )}

          {/* Success Header */}
          <Section style={successHeader}>
            <Text style={successIcon}>✅</Text>
            <Heading style={h1}>Đăng ký thành công!</Heading>
          </Section>

          {/* Greeting */}
          <Text style={text}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={text}>
            Cảm ơn bạn đã đăng ký tham gia <strong>{event.name}</strong>. Thông
            tin đăng ký của bạn đã được xác nhận và thanh toán thành công.
          </Text>

          {/* BIB Number - Big and Bold */}
          <Section style={bibBox}>
            <Text style={bibTitle}>🎯 Số BIB của bạn</Text>
            <Text style={bibNumber}>{registration.bibNumber}</Text>
            <Text style={bibNote}>
              Vui lòng ghi nhớ số BIB để nhận race pack
            </Text>
          </Section>

          {/* Event Info */}
          <Section style={eventBox}>
            <Text style={sectionTitle}>📅 Thông tin sự kiện</Text>
            <table style={{ width: "100%", marginTop: "12px" }}>
              <tbody>
                <tr>
                  <td style={labelCell}>Sự kiện:</td>
                  <td style={valueCell}>{event.name}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Ngày thi đấu:</td>
                  <td style={valueCell}>
                    <strong>{formatDate(event.date)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Cự ly:</td>
                  <td style={valueCell}>{distance.name}</td>
                </tr>
                {event.location && (
                  <tr>
                    <td style={labelCell}>Địa điểm:</td>
                    <td style={valueCell}>{event.location}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Registration Info */}
          <div style={infoBox2}>
            <Text style={sectionTitle}>👤 Thông tin</Text>
            <div style={{ marginTop: "12px" }}>
              <div style={row}>
                <span style={label}>Họ tên:</span>
                <span style={value}>{registration.fullName}</span>
              </div>
              <div style={row}>
                <span style={label}>Email:</span>
                <span style={value}>{registration.email}</span>
              </div>
              <div style={row}>
                <span style={label}>SĐT:</span>
                <span style={value}>{registration.phone}</span>
              </div>
              {registration.shirtSize && (
                <div style={row}>
                  <span style={label}>Áo racekit:</span>
                  <span style={value}>
                    {shirtCategoryText} - {shirtTypeText} - Size{" "}
                    {registration.shirtSize}
                  </span>
                </div>
              )}
              {registration.finisherShirtSize && (
                <div style={row}>
                  <span style={label}>Áo finish:</span>
                  <span style={value}>
                    {registration.finisherShirtCategory === "MALE"
                      ? "Nam"
                      : registration.finisherShirtCategory === "FEMALE"
                        ? "Ná»¯"
                        : registration.finisherShirtCategory === "KID"
                          ? "Kid"
                          : "Áo"}
                    {" - "}
                    {registration.finisherShirtType === "SHORT_SLEEVE"
                      ? "T-shirt"
                      : registration.finisherShirtType === "TANK_TOP"
                        ? "Singlet"
                        : registration.finisherShirtType || ""}
                    {" - Size "}
                    {registration.finisherShirtSize}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code Section */}
          <Section style={qrSection}>
            <Text style={qrTitle}>📱 QR Code Check-in</Text>
            <Text style={qrDescription}>
              Xuất trình QR code này khi nhận race pack và check-in ngày thi đấu
            </Text>

            {/* ✅ CID Reference */}
            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <Img
                src="cid:qrcheckin"
                alt={`QR Code - BIB ${registration.bibNumber}`}
                width="300"
                height="300"
                style={{
                  display: "block",
                  margin: "0 auto",
                  border: "3px solid #cbd5e1",
                  borderRadius: "12px",
                  backgroundColor: "#ffffff",
                  padding: "10px",
                }}
              />
            </div>

            <Text style={qrHint}>
              💡 <strong>Lưu lại email này</strong> hoặc chụp ảnh QR code để sử
              dụng khi check-in
            </Text>
          </Section>

          {/* Race Pack Info */}
          {event.racePackLocation && (
            <Section style={racePackBox}>
              <Text style={sectionTitle}>📦 Nhận race pack</Text>
              <table style={{ width: "100%", marginTop: "12px" }}>
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
                  <tr>
                    <td style={labelCell}>Mang theo:</td>
                    <td style={valueCell}>
                      <strong>CCCD/CMND + QR Code (email này)</strong>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* Important Notes */}
          <div style={noteBox}>
            <Text style={noteTitle}>⚠️ Lưu ý</Text>
            <div style={{ marginTop: "8px" }}>
              <div style={noteItem}>
                • Nhớ BIB: <strong>{registration.bibNumber}</strong>
              </div>
              <div style={noteItem}>• Mang CCCD + QR code</div>
              <div style={noteItem}>• Đến sớm 30 phút</div>
            </div>
          </div>

          {/* Divider */}
          <Hr style={hr} />

          {/* Contact Info */}
          {(event.hotline || event.emailSupport || event.facebookUrl) && (
            <Section style={contactBox}>
              <Text style={contactTitle}>📞 Liên hệ hỗ trợ</Text>
              <table style={{ width: "100%" }}>
                <tbody>
                  {event.hotline && (
                    <tr>
                      <td style={contactItem}>Hotline: {event.hotline}</td>
                    </tr>
                  )}
                  {event.emailSupport && (
                    <tr>
                      <td style={contactItem}>Email: {event.emailSupport}</td>
                    </tr>
                  )}
                  {event.facebookUrl && (
                    <tr>
                      <td style={contactItem}>Facebook: {event.facebookUrl}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Section>
          )}

          {/* Footer */}
          <Text style={footer}>
            Chúc bạn có một trải nghiệm tuyệt vời và đạt được mục tiêu của mình!
            🎯
            <br />
            Hẹn gặp lại bạn tại {event.name}! 🏃‍♂️🏃‍♀️
          </Text>

          <Text style={footerSmall}>
            Trân trọng,
            <br />
            <strong>Ban tổ chức {event.name}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ==================== STYLES (Same as payment-confirmed) ====================

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px",
  maxWidth: "560px",
  width: "100%",
};

const successHeader = {
  textAlign: "center" as const,
  padding: "0 20px",
  marginBottom: "20px",
};

const successIcon = {
  fontSize: "40px",
  margin: "16px 0 0 0",
};

const h1 = {
  color: "#16a34a",
  fontSize: "24px",
  fontWeight: "700",
  margin: "8px 0 0 0",
  textAlign: "center" as const,
  lineHeight: "1.3",
};

const text = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "22px",
  padding: "0 20px",
  margin: "10px 0",
};

const bibBox = {
  background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
  border: "3px solid #3b82f6",
  borderRadius: "12px",
  margin: "20px 20px",
  padding: "20px 16px",
  textAlign: "center" as const,
};

const bibTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#1e40af",
  margin: "0",
};

const bibNumber = {
  fontSize: "40px",
  fontWeight: "900",
  color: "#2563eb",
  fontFamily: "'Courier New',monospace",
  margin: "8px 0",
  letterSpacing: "3px",
};

const bibNote = {
  fontSize: "12px",
  color: "#64748b",
  margin: "12px 0 0 0",
  fontStyle: "italic",
};

const eventBox = {
  background: "#fef3c7",
  border: "2px solid #fde047",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const registrationBox = {
  background: "#f3f4f6",
  border: "2px solid #d1d5db",
  borderRadius: "12px",
  margin: "24px 40px",
  padding: "24px",
};

const sectionTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#1f2937",
  margin: "0 0 4px 0",
};

const labelCell = {
  padding: "6px 12px 6px 0",
  color: "#6b7280",
  fontSize: "14px",
  width: "35%",
  verticalAlign: "top" as const,
};

const valueCell = {
  padding: "6px 0",
  color: "#111827",
  fontSize: "14px",
  fontWeight: "500" as const,
  verticalAlign: "top" as const,
};

const qrTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#1e40af",
  margin: "0 0 8px 0",
};

const contactTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#374151",
  margin: "0 0 12px 0",
};

const contactItem = {
  fontSize: "14px",
  color: "#6b7280",
  padding: "4px 0",
  lineHeight: "22px",
};

const row = {
  display: "block",
  marginBottom: "8px",
  wordWrap: "break-word" as const,
  fontSize: "13px",
};

const label = {
  color: "#6b7280",
  fontWeight: "600",
  marginRight: "6px",
  display: "inline-block",
  minWidth: "60px",
};

const value = {
  color: "#111827",
  fontWeight: "500",
  wordWrap: "break-word" as const,
};

const infoBox2 = {
  background: "#f3f4f6",
  border: "2px solid #d1d5db",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const racePackBox = {
  background: "#eff6ff",
  border: "2px solid #93c5fd",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const noteBox = {
  background: "#fef2f2",
  border: "2px solid #fca5a5",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const contactBox = {
  margin: "0 20px 20px 20px",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 20px",
};

const qrSection = {
  margin: "20px 20px",
  padding: "16px",
  background: "#fafafa",
  border: "2px dashed #cbd5e1",
  borderRadius: "10px",
  textAlign: "center" as const,
};

const qrDescription = {
  fontSize: "13px",
  color: "#64748b",
  margin: "4px 0 0 0",
};

const qrHint = {
  fontSize: "12px",
  color: "#475569",
  background: "#fef3c7",
  padding: "10px",
  borderRadius: "6px",
  margin: "12px auto 0",
  display: "inline-block",
  maxWidth: "90%",
};

const noteTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#991b1b",
  margin: "0",
};

const noteItem = {
  fontSize: "12px",
  lineHeight: "20px",
  color: "#7f1d1d",
  marginBottom: "6px",
};

const footer = {
  color: "#6b7280",
  fontSize: "13px",
  textAlign: "center" as const,
  padding: "0 20px",
  lineHeight: "20px",
  margin: "16px 0",
};

const footerSmall = {
  color: "#9ca3af",
  fontSize: "12px",
  textAlign: "center" as const,
  padding: "0 20px",
  lineHeight: "18px",
  margin: "8px 0 0 0",
};
