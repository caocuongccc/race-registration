// emails/shirt-order-confirmed.tsx
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

interface ShirtOrderConfirmedEmailProps {
  order: any;
  event: any;
}

export function ShirtOrderConfirmedEmail({
  order,
  event,
}: ShirtOrderConfirmedEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const isStandalone = order.orderType === "STANDALONE";

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
            <Text style={successTitle}>XÁC NHẬN ĐẶT HÀNG THÀNH CÔNG!</Text>
          </Section>

          <Text style={paragraph}>
            Xin chào{" "}
            <strong>{order.registration?.fullName || "Quý khách"}</strong>,
          </Text>

          <Text style={paragraph}>
            Cảm ơn bạn đã đặt hàng áo kỷ niệm cho sự kiện{" "}
            <strong>{event.name}</strong>.
          </Text>

          {isStandalone && (
            <Section style={standaloneNote}>
              <Text style={standaloneText}>
                🎽 <strong>Đơn hàng mua áo riêng</strong>
                <br />
                Bạn đã đặt mua áo kỷ niệm không kèm số BIB đăng ký thi đấu.
              </Text>
            </Section>
          )}

          {/* Event Info */}
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
              </tbody>
            </table>
          </Section>

          {/* Order Details */}
          <Section style={orderBox}>
            <Text style={infoTitle}>🛍️ CHI TIẾT ĐƠN HÀNG</Text>

            <table style={orderTable}>
              <thead>
                <tr style={tableHeader}>
                  <th style={thLeft}>Sản phẩm</th>
                  <th style={thCenter}>SL</th>
                  <th style={thRight}>Đơn giá</th>
                  <th style={thRight}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item: any, idx: number) => (
                  <tr key={idx} style={tableRow}>
                    <td style={tdLeft}>
                      {item.shirt.category === "MALE"
                        ? "Áo Nam"
                        : item.shirt.category === "FEMALE"
                          ? "Áo Nữ"
                          : "Áo Trẻ em"}{" "}
                      - {item.shirt.type === "SHORT_SLEEVE" ? "Có tay" : "3 lỗ"}{" "}
                      - Size {item.shirt.size}
                    </td>
                    <td style={tdCenter}>{item.quantity}</td>
                    <td style={tdRight}>{formatCurrency(item.unitPrice)}</td>
                    <td style={tdRight}>{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
                <tr style={totalRow}>
                  <td colSpan={3} style={totalLabelCell}>
                    <strong>TỔNG CỘNG:</strong>
                  </td>
                  <td style={totalValueCell}>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Payment Info */}
          <Section style={paymentBox}>
            <Text style={paymentTitle}>💰 THÔNG TIN THANH TOÁN</Text>
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Trạng thái:</td>
                  <td style={paidStatus}>✓ Đã thanh toán</td>
                </tr>
                <tr>
                  <td style={labelCell}>Số tiền:</td>
                  <td style={valueCell}>
                    <strong>{formatCurrency(order.totalAmount)}</strong>
                  </td>
                </tr>
                {order.paymentDate && (
                  <tr>
                    <td style={labelCell}>Thời gian:</td>
                    <td style={valueCell}>
                      {new Date(order.paymentDate).toLocaleString("vi-VN")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Pickup Info */}
          {event.racePackLocation && (
            <Section style={pickupBox}>
              <Text style={pickupTitle}>📦 THÔNG TIN NHẬN HÀNG</Text>

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
                      CCCD/CMND (bản chính)
                      {!isStandalone && order.registration?.bibNumber && (
                        <> + Số BIB: {order.registration.bibNumber}</>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>

              <Section style={pickupNote}>
                <Text style={pickupNoteText}>
                  💡 <strong>Lưu ý:</strong> Vui lòng mang theo CCCD và thông
                  tin đơn hàng này khi đến nhận áo.
                  {isStandalone && (
                    <>
                      <br />
                      Đây là đơn hàng MUA ÁO RIÊNG, không có BIB đăng ký thi
                      đấu.
                    </>
                  )}
                </Text>
              </Section>
            </Section>
          )}

          {/* Important Notes */}
          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                <strong>✓ Đơn hàng đã được xác nhận thanh toán</strong>
              </li>
              {event.racePackLocation && (
                <li>
                  <strong>📦 Nhận hàng:</strong> {event.racePackLocation}
                  {event.racePackTime && ` - ${event.racePackTime}`}
                </li>
              )}
              <li>
                <strong>🏁 Ngày sự kiện:</strong> {formatDate(event.date)} tại{" "}
                {event.location}
              </li>
              <li>Mang theo CCCD/CMND khi đến nhận áo</li>
              {isStandalone && (
                <li className="text-purple-700 font-medium">
                  🎽 Đây là áo mua riêng, không bao gồm quyền tham gia thi đấu
                </li>
              )}
              <li>
                Nếu có thắc mắc, vui lòng liên hệ hotline:{" "}
                {event.hotline || "Xem thông tin bên dưới"}
              </li>
            </ul>
          </Section>

          {/* Footer */}
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
          </Text>

          <Text style={footer}>
            Cảm ơn bạn đã ủng hộ! 🎽
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

const standaloneNote = {
  backgroundColor: "#f3e8ff",
  padding: "16px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #a855f7",
};

const standaloneText = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b21a8",
  margin: "0",
};

const eventInfoBox = {
  backgroundColor: "#fef2f2",
  padding: "20px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #dc2626",
};

const eventInfoTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#991b1b",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const orderBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #e5e7eb",
};

const paymentBox = {
  backgroundColor: "#dcfce7",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #16a34a",
};

const paymentTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#15803d",
  margin: "0 0 16px",
};

const pickupBox = {
  backgroundColor: "#f0f9ff",
  padding: "20px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #0ea5e9",
};

const pickupTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#0c4a6e",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const pickupNote = {
  backgroundColor: "#fef3c7",
  padding: "12px",
  borderRadius: "8px",
  marginTop: "16px",
  border: "1px solid #fbbf24",
};

const pickupNoteText = {
  fontSize: "14px",
  color: "#78350f",
  margin: "0",
  lineHeight: "20px",
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

const orderTable = {
  width: "100%",
  fontSize: "14px",
  borderCollapse: "collapse" as const,
  marginTop: "16px",
};

const tableHeader = {
  backgroundColor: "#f3f4f6",
  borderBottom: "2px solid #e5e7eb",
};

const thLeft = {
  padding: "12px 8px",
  textAlign: "left" as const,
  fontWeight: "600" as const,
};

const thCenter = {
  padding: "12px 8px",
  textAlign: "center" as const,
  fontWeight: "600" as const,
};

const thRight = {
  padding: "12px 8px",
  textAlign: "right" as const,
  fontWeight: "600" as const,
};

const tableRow = {
  borderBottom: "1px solid #f3f4f6",
};

const tdLeft = {
  padding: "12px 8px",
  verticalAlign: "top" as const,
};

const tdCenter = {
  padding: "12px 8px",
  textAlign: "center" as const,
  verticalAlign: "top" as const,
};

const tdRight = {
  padding: "12px 8px",
  textAlign: "right" as const,
  verticalAlign: "top" as const,
};

const totalRow = {
  borderTop: "2px solid #2563eb",
  backgroundColor: "#eff6ff",
};

const totalLabelCell = {
  padding: "12px 8px",
  textAlign: "right" as const,
  fontSize: "16px",
};

const totalValueCell = {
  padding: "12px 8px",
  textAlign: "right" as const,
  fontSize: "18px",
  color: "#2563eb",
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
