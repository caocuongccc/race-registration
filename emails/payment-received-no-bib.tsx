// emails/payment-received-no-bib.tsx - WITH RACE INFO
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
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
  const finisherShirtCategoryText =
    registration.finisherShirtCategory === "MALE"
      ? "Nam"
      : registration.finisherShirtCategory === "FEMALE"
        ? "Ná»¯"
        : registration.finisherShirtCategory === "KID"
          ? "Tráº» em"
          : registration.finisherShirtCategory || "";
  const finisherShirtTypeText =
    registration.finisherShirtType === "SHORT_SLEEVE"
      ? "T-shirt"
      : registration.finisherShirtType === "TANK_TOP"
        ? "Singlet"
        : registration.finisherShirtType || "";

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
            Xin chÃ o <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Chúng tôi đã nhận được thanh toán của bạn cho sự kiện{" "}
            <strong>{event.name}</strong>.
          </Text>

          {/* âœ… NEW: Event Info Card */}
          <Section style={eventInfoBox}>
            <Text style={eventInfoTitle}>📅 THÔNG TIN SỰ KIỆN</Text>

            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={iconCell}>🏁</td>
                  <td style={labelCell}>Ngày thi đấu:</td>
                  <td style={valueCell}>
                    <strong style={{ color: "#dc2626" }}>
                      {formatDate(event.date)}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={iconCell}>📍</td>
                  <td style={labelCell}>Địa điểm:</td>
                  <td style={valueCell}>{event.location}</td>
                </tr>
                {event.address && (
                  <tr>
                    <td style={iconCell}></td>
                    <td style={labelCell}>Địa chỉ:</td>
                    <td style={valueCell}>{event.address}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

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
                {registration.shirtSize && (
                  <tr>
                    <td style={labelCell}>Áo racekit:</td>
                    <td style={valueCell}>
                      {shirtCategoryText} - {shirtTypeText} - Size{" "}
                      {registration.shirtSize}
                    </td>
                  </tr>
                )}
                {registration.finisherShirtSize && (
                  <tr>
                    <td style={labelCell}>Áo finish:</td>
                    <td style={valueCell}>
                      {finisherShirtCategoryText} - {finisherShirtTypeText} -
                      Size {registration.finisherShirtSize}
                    </td>
                  </tr>
                )}
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

          {/* ✅ NEW: Race Pack Info */}
          {event.racePackLocation && (
            <Section style={racePackBox}>
              <Text style={racePackTitle}>📦 THÔNG TIN NHẬN RACE PACK</Text>

              <table style={infoTable}>
                <tbody>
                  <tr>
                    <td style={iconCell}>📍</td>
                    <td style={labelCell}>Địa điểm:</td>
                    <td style={valueCell}>
                      <strong>{event.racePackLocation}</strong>
                    </td>
                  </tr>
                  {event.racePackTime && (
                    <tr>
                      <td style={iconCell}>🕐</td>
                      <td style={labelCell}>Thời gian:</td>
                      <td style={valueCell}>
                        <strong>{event.racePackTime}</strong>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={iconCell}>🎒</td>
                    <td style={labelCell}>Mang theo:</td>
                    <td style={valueCell}>
                      CCCD/CMND (bản chính) + Mã QR check-in (trong email thông
                      báo số BIB)
                    </td>
                  </tr>
                </tbody>
              </table>

              <Section style={racePackNote}>
                <Text style={racePackNoteText}>
                  💡 <strong>Lưu ý:</strong> Bạn cần có số BIB mới được nhận
                  race pack. Vui lòng chờ email thông báo số BIB trước khi đến
                  nhận.
                </Text>
              </Section>
            </Section>
          )}

          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                <strong>✓ Đã xác nhận thanh toán thành công</strong>
              </li>
              <li>
                <strong>⏳ Đang chờ công bố số BIB</strong> - Bạn sẽ nhận email
                thông báo số BIB trong thời gian tới
              </li>
              {event.racePackLocation && (
                <li>
                  <strong>📦 Nhận race pack:</strong> {event.racePackLocation}
                  {event.racePackTime && ` - ${event.racePackTime}`}
                </li>
              )}
              <li>
                <strong>🏁 Ngày thi đấu:</strong> {formatDate(event.date)} tại{" "}
                {event.location}
              </li>
              {event.websiteUrl && (
                <li>
                  <strong>📱 Tham gia nhóm Zalo:</strong>{" "}
                  <a href={event.websiteUrl} style={linkStyle}>
                    Nhấn vào đây để tham gia
                  </a>{" "}
                  - Nhận cập nhật số BIB và thông tin mới nhất
                </li>
              )}
              <li>
                Khi nhận được số BIB, bạn sẽ có thể tải mã QR check-in từ email
              </li>
              <li>
                Nếu có thắc mắc, vui lòng liên hệ hotline:{" "}
                {event.hotline || "Xem thông tin bên dưới"}
              </li>
            </ul>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            <strong>Liên hệ hỗ trợ:</strong>
            <br />
            {event.hotline && (
              <>
                📞 Hotline: {event.hotline}
                <br />
              </>
            )}
            {event.emailSupport && (
              <>
                📧 Email: {event.emailSupport}
                <br />
              </>
            )}
            {event.facebookUrl && (
              <>
                👥 Facebook: {event.facebookUrl}
                <br />
              </>
            )}
            {event.websiteUrl && (
              <>
                💬 Nhóm Zalo:{" "}
                <a href={event.websiteUrl} style={linkStyle}>
                  Tham gia ngay
                </a>
              </>
            )}
          </Text>

          <Text style={footer}>
            Cảm ơn bạn đã đăng ký tham gia! 🏃‍♂️
            <br />
            <br />
            Trân trọng,
            <br />
            <strong>Ban tổ chức {event.name}</strong>
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
  padding: "20px",
  maxWidth: "600px",
  borderRadius: "8px",
};

const logo = {
  margin: "0 auto 20px",
  display: "block",
};

const successBadge = {
  textAlign: "center" as const,
  backgroundColor: "#dcfce7",
  padding: "24px",
  borderRadius: "12px",
  margin: "20px 0",
  border: "2px solid #16a34a",
};

const successIcon = {
  fontSize: "48px",
  margin: "0",
};

const successTitle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#15803d",
  margin: "8px 0 0",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "16px 0",
};

// ✅ NEW: Event Info Styles
const eventInfoBox = {
  backgroundColor: "#fef2f2",
  padding: "20px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "3px solid #dc2626",
};

const eventInfoTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#991b1b",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

// ✅ NEW: Race Pack Styles
const racePackBox = {
  backgroundColor: "#f0f9ff",
  padding: "20px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #0ea5e9",
};

const racePackTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#0c4a6e",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const racePackNote = {
  backgroundColor: "#fef3c7",
  padding: "12px",
  borderRadius: "8px",
  marginTop: "16px",
  border: "1px solid #fbbf24",
};

const racePackNoteText = {
  fontSize: "14px",
  color: "#78350f",
  margin: "0",
  lineHeight: "20px",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
};

const infoTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1f2937",
  margin: "0 0 16px",
};

const infoTable = {
  width: "100%",
  fontSize: "14px",
  lineHeight: "24px",
};

const iconCell = {
  width: "30px",
  verticalAlign: "top" as const,
  fontSize: "18px",
};

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

const linkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
  fontWeight: "500" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "20px 0",
};
