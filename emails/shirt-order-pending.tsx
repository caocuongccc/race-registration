// emails/shirt-order-pending.tsx - NEW EMAIL TEMPLATE
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

interface ShirtOrderPendingEmailProps {
  order: any;
  event: any;
  qrPaymentUrl?: string;
}

export function ShirtOrderPendingEmail({
  order,
  event,
  qrPaymentUrl,
}: ShirtOrderPendingEmailProps) {
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

          <Section style={headerBox}>
            <Text style={headerIcon}>📦</Text>
            <Text style={headerTitle}>ĐƠN HÀNG MUA ÁO KỶ NIỆM</Text>
            <Text style={headerSubtitle}>Chờ thanh toán</Text>
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
                Đây là đơn hàng mua áo kỷ niệm không kèm số BIB đăng ký thi đấu.
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

          {/* Payment Instructions */}
          <Section style={paymentBox}>
            <Text style={paymentTitle}>💳 HƯỚNG DẪN THANH TOÁN</Text>

            {qrPaymentUrl && (
              <div style={{ textAlign: "center", margin: "20px 0" }}>
                <Text style={paragraph}>
                  <strong>Quét mã QR để thanh toán:</strong>
                </Text>
                <Img
                  src={qrPaymentUrl}
                  alt="QR Payment"
                  width="300"
                  style={{ margin: "10px auto", border: "2px solid #e5e7eb" }}
                />
              </div>
            )}

            <Text style={paymentSubtitle}>Hoặc chuyển khoản thủ công:</Text>

            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Ngân hàng:</td>
                  <td style={valueCell}>
                    <strong>{event.bankName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Số tài khoản:</td>
                  <td style={valueCell}>
                    <strong>{event.bankAccount}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Chủ tài khoản:</td>
                  <td style={valueCell}>
                    <strong>{event.bankHolder}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Số tiền:</td>
                  <td style={valueCell}>
                    <strong style={{ color: "#2563eb" }}>
                      {formatCurrency(order.totalAmount)}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Nội dung CK:</td>
                  <td style={valueCell}>
                    <strong style={{ color: "#dc2626" }}>
                      {order.registration?.phone} {order.orderType}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Important Notes */}
          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                <strong>⚠️ Ghi CHÍNH XÁC nội dung chuyển khoản</strong> để hệ
                thống tự động xác nhận
              </li>
              <li>
                Sau khi chuyển khoản, đơn hàng sẽ được xác nhận trong vòng 24h
              </li>
              <li>Bạn sẽ nhận email xác nhận khi thanh toán được duyệt</li>
              {event.racePackLocation && (
                <li>
                  <strong>📦 Nhận hàng:</strong> {event.racePackLocation}
                  {event.racePackTime && ` - ${event.racePackTime}`}
                </li>
              )}
              <li>Mang theo CCCD/CMND khi đến nhận áo</li>
              {isStandalone && (
                <li style={{ color: "#7c3aed", fontWeight: "600" }}>
                  🎽 Đây là áo mua riêng, KHÔNG bao gồm quyền tham gia thi đấu
                </li>
              )}
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

const headerBox = {
  textAlign: "center" as const,
  backgroundColor: "#f3f4f6",
  padding: "24px",
  borderRadius: "12px",
  margin: "20px 0",
  border: "2px solid #d1d5db",
};

const headerIcon = {
  fontSize: "48px",
  margin: "0",
};

const headerTitle = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#111827",
  margin: "8px 0 4px",
};

const headerSubtitle = {
  fontSize: "16px",
  color: "#f59e0b",
  margin: "0",
  fontWeight: "600" as const,
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
  backgroundColor: "#fef3c7",
  padding: "20px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #fbbf24",
};

const paymentTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#78350f",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const paymentSubtitle = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#78350f",
  margin: "16px 0 12px",
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
