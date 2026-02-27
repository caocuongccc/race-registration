// emails/payment-confirmed.tsx
// QUICK FIX: Shorter text to prevent overflow

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

interface PaymentConfirmedEmailProps {
  registration: any;
  event: any;
}

export function PaymentConfirmedEmail({
  registration,
  event,
}: PaymentConfirmedEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  return (
    <Html>
      <Head />
      <Preview>
        Thanh toán thành công - {event.name} - BIB {registration.bibNumber}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Logo */}
          {event.logoUrl && (
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <Img
                src={event.logoUrl}
                alt={event.name}
                width="160"
                style={{ maxWidth: "100%" }}
              />
            </div>
          )}

          {/* Success Header */}
          <div style={successHeader}>
            <Text style={successIcon}>✅</Text>
            <Heading style={h1}>Thanh toán thành công!</Heading>
          </div>

          {/* Greeting */}
          <Text style={text}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={text}>
            Chúng tôi đã nhận thanh toán của bạn cho{" "}
            <strong>{event.name}</strong>.
          </Text>

          {/* BIB Number */}
          <div style={bibBox}>
            <Text style={bibTitle}>🎯 Số BIB</Text>
            <Text style={bibNumber}>{registration.bibNumber}</Text>
            <Text style={bibNote}>Ghi nhớ số BIB này</Text>
          </div>

          {/* Payment Info */}
          <div style={infoBox}>
            <Text style={sectionTitle}>💳 Thanh toán</Text>
            <div style={{ marginTop: "12px" }}>
              <div style={row}>
                <span style={label}>Số tiền:</span>
                <span style={value}>
                  {formatCurrency(registration.totalAmount)}
                </span>
              </div>
              <div style={row}>
                <span style={label}>Thời gian:</span>
                <span style={value}>
                  {formatDateTime(registration.paymentDate)}
                </span>
              </div>
              <div style={row}>
                <span style={label}>Trạng thái:</span>
                <span
                  style={{ ...value, color: "#16a34a", fontWeight: "bold" }}
                >
                  ✓ Đã thanh toán
                </span>
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div style={eventBox}>
            <Text style={sectionTitle}>📅 Sự kiện</Text>
            <div style={{ marginTop: "12px" }}>
              <div style={row}>
                <span style={label}>Tên:</span>
                <span style={value}>{event.name}</span>
              </div>
              <div style={row}>
                <span style={label}>Ngày:</span>
                <span style={value}>{formatDate(event.date)}</span>
              </div>
              <div style={row}>
                <span style={label}>Cự ly:</span>
                <span style={value}>{registration.distance?.name}</span>
              </div>
            </div>
          </div>

          {/* Runner Info */}
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
                  <span style={label}>Áo:</span>
                  <span style={value}>
                    {registration.shirtCategory === "MALE" ? "Nam" : "Nữ"} -
                    Size {registration.shirtSize}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <div style={qrBox}>
            <Text style={qrTitle}>📱 QR Check-in</Text>
            <Text style={qrDesc}>Xuất trình QR này khi nhận race pack</Text>

            <div style={{ textAlign: "center", margin: "16px 0" }}>
              <Img
                src="cid:qrcheckin"
                alt={`QR Code - BIB ${registration.bibNumber}`}
                width="260"
                height="260"
                style={{
                  border: "3px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "8px",
                  backgroundColor: "#fff",
                  maxWidth: "100%",
                }}
              />
            </div>

            <div style={qrHint}>💡 Lưu email này hoặc chụp QR</div>
          </div>

          {/* Race Pack */}
          {event.racePackLocation && (
            <div style={packBox}>
              <Text style={sectionTitle}>📦 Nhận race pack</Text>
              <div style={{ marginTop: "12px" }}>
                <div style={row}>
                  <span style={label}>Nơi:</span>
                  <span style={value}>{event.racePackLocation}</span>
                </div>
                {event.racePackTime && (
                  <div style={row}>
                    <span style={label}>Giờ:</span>
                    <span style={value}>{event.racePackTime}</span>
                  </div>
                )}
                <div style={row}>
                  <span style={label}>Mang:</span>
                  <span style={value}>
                    <strong>CCCD + QR code</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
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

          {/* Contact */}
          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 20px" }} />

          <div style={{ margin: "0 20px 20px 20px" }}>
            <Text style={contactTitle}>📞 Liên hệ</Text>
            {event.hotline && (
              <div style={contactItem}>Hotline: {event.hotline}</div>
            )}
            {event.emailSupport && (
              <div style={contactItem}>Email: {event.emailSupport}</div>
            )}
          </div>

          {/* Footer */}
          <Text style={footer}>
            Chúc bạn có trải nghiệm tuyệt vời! 🏃
            <br />
            <strong>BTC {event.name}</strong>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// ==================== STYLES ====================

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
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
};

const text = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "22px",
  padding: "0 20px",
  margin: "10px 0",
};

const bibBox = {
  background: "linear-gradient(135deg, #dbeafe, #bfdbfe)",
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
  margin: "0",
};

const infoBox = {
  background: "#f0fdf4",
  border: "2px solid #86efac",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const eventBox = {
  background: "#fef3c7",
  border: "2px solid #fde047",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const infoBox2 = {
  background: "#f3f4f6",
  border: "2px solid #d1d5db",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const packBox = {
  background: "#eff6ff",
  border: "2px solid #93c5fd",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
};

const sectionTitle = {
  fontSize: "15px",
  fontWeight: "700",
  color: "#1f2937",
  margin: "0",
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

const qrBox = {
  margin: "20px 20px",
  padding: "16px",
  background: "#fafafa",
  border: "2px dashed #cbd5e1",
  borderRadius: "10px",
  textAlign: "center" as const,
};

const qrTitle = {
  fontSize: "16px",
  fontWeight: "700",
  color: "#1e40af",
  margin: "0",
};

const qrDesc = {
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

const noteBox = {
  background: "#fef2f2",
  border: "2px solid #fca5a5",
  borderRadius: "10px",
  margin: "16px 20px",
  padding: "16px",
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

const contactTitle = {
  fontSize: "14px",
  fontWeight: "700",
  color: "#374151",
  margin: "0 0 8px 0",
};

const contactItem = {
  fontSize: "12px",
  color: "#6b7280",
  marginBottom: "4px",
};

const footer = {
  color: "#6b7280",
  fontSize: "13px",
  textAlign: "center" as const,
  padding: "0 20px",
  lineHeight: "20px",
  margin: "16px 0",
};
