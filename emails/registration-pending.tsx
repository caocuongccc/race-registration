// emails/registration-pending.tsx - WITH RACE INFO
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

interface RegistrationPendingEmailProps {
  registration: any;
  event: any;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}

export function RegistrationPendingEmail({
  registration,
  event,
  bankInfo,
}: RegistrationPendingEmailProps) {
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

  const trackingUrl = `${process.env.NEXTAUTH_URL || "https://dangkygiaichay.vercel.app"}/registrations/${registration.id}/payment`;

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

          <Text style={heading}>Xác nhận đăng ký thành công! 🎉</Text>

          <Text style={paragraph}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Cảm ơn bạn đã đăng ký tham gia <strong>{event.name}</strong>. Dưới
            đây là thông tin đăng ký của bạn:
          </Text>
          {/* Registration Info */}
          <Section style={infoBox}>
            <Text style={infoTitle}>📋 THÔNG TIN ĐĂNG KÝ</Text>

            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Họ tên:</td>
                  <td style={valueCell}>{registration.fullName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Ngày sinh:</td>
                  <td style={valueCell}>{formatDate(registration.dob)}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Giới tính:</td>
                  <td style={valueCell}>
                    {registration.gender === "MALE" ? "Nam" : "Nữ"}
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{registration.email}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Số điện thoại:</td>
                  <td style={valueCell}>{registration.phone}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Cự ly:</td>
                  <td style={valueCell}>
                    <strong>{registration.distance?.name}</strong>
                  </td>
                </tr>

                {registration.shirtSize && (
                  <>
                    <tr>
                      <td colSpan={2}>
                        <Hr style={hr} />
                      </td>
                    </tr>
                    <tr>
                      <td style={labelCell}>Áo:</td>
                      <td style={valueCell}>
                        {registration.shirtCategory === "MALE"
                          ? "Nam"
                          : registration.shirtCategory === "FEMALE"
                            ? "Nữ"
                            : "Trẻ em"}{" "}
                        -{" "}
                        {registration.shirtType === "SHORT_SLEEVE"
                          ? "Có tay"
                          : "3 lỗ"}{" "}
                        - Size {registration.shirtSize}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </Section>

          {/* Payment Info */}
          <Section style={paymentBox}>
            <Text style={infoTitle}>💳 THÔNG TIN THANH TOÁN</Text>

            <table style={priceTable}>
              <tbody>
                <tr>
                  <td>Phí đăng ký {registration.distance?.name}:</td>
                  <td style={priceCell}>
                    {formatCurrency(registration.raceFee)}
                  </td>
                </tr>
                {registration.shirtFee > 0 && (
                  <tr>
                    <td>Áo kỷ niệm:</td>
                    <td style={priceCell}>
                      {formatCurrency(registration.shirtFee)}
                    </td>
                  </tr>
                )}
                <tr style={totalRow}>
                  <td>
                    <strong>TỔNG CỘNG:</strong>
                  </td>
                  <td style={{ ...priceCell, ...totalPrice }}>
                    {formatCurrency(registration.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* QR Code */}
            {registration.qrPaymentUrl && (
              <Section style={qrSection}>
                <Text style={qrText}>Quét mã QR để thanh toán:</Text>
                <Img
                  src={registration.qrPaymentUrl}
                  alt="QR thanh toán"
                  width="250"
                  height="250"
                  style={qrCode}
                />

                <Text style={transferInfo}>
                  <strong>Hoặc chuyển khoản thủ công:</strong>
                  <br />
                  Ngân hàng: <strong>{bankInfo.bankName}</strong>
                  <br />
                  Số TK: <strong>{bankInfo.accountNumber}</strong>
                  <br />
                  Chủ TK: <strong>{bankInfo.accountHolder}</strong>
                  <br />
                  Số tiền:{" "}
                  <strong>{formatCurrency(registration.totalAmount)}</strong>
                  <br />
                  Nội dung:{" "}
                  <strong>
                    {registration.phone}
                    {registration.shirtCategory &&
                      ` ${registration.shirtCategory}`}
                    {registration.shirtSize && ` ${registration.shirtSize}`}
                  </strong>
                </Text>

                <Text style={warningText}>
                  ⚠️ Vui lòng ghi CHÍNH XÁC nội dung chuyển khoản:{" "}
                  <strong>
                    {registration.phone}
                    {registration.shirtCategory &&
                      ` ${registration.shirtCategory}`}
                    {registration.shirtSize && ` ${registration.shirtSize}`}
                  </strong>
                </Text>
              </Section>
            )}
          </Section>
          {/* ✅ NEW: Event Info Card */}
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
                      CCCD/CMND (bản chính) + Mã QR thanh toán
                    </td>
                  </tr>
                </tbody>
              </table>

              <Section style={racePackNote}>
                <Text style={racePackNoteText}>
                  💡 <strong>Lưu ý:</strong> Chỉ VĐV đã thanh toán mới được nhận
                  race pack. Vui lòng hoàn tất thanh toán trước khi đến nhận.
                </Text>
              </Section>
            </Section>
          )}

          {/* Tracking Link Card */}
          <Section style={trackingBox}>
            <Text style={trackingTitle}>🔍 THEO DÕI ĐĂNG KÝ CỦA BẠN</Text>
            <Text style={trackingText}>
              Truy cập link dưới đây để xem chi tiết và trạng thái thanh toán:
            </Text>
            <a href={trackingUrl} style={trackingButton}>
              📋 Xem Thông Tin Đăng Ký
            </a>
            <Text style={trackingNote}>
              Lưu lại link này để theo dõi trạng thái thanh toán và số BIB
            </Text>
          </Section>

          {/* Notes */}
          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                <strong>Hoàn tất thanh toán</strong> để đăng ký được xác nhận
              </li>
              <li>Sau khi thanh toán, bạn sẽ nhận email xác nhận kèm số BIB</li>
              {event.racePackLocation && (
                <li>
                  <strong>Nhận race pack:</strong> {event.racePackLocation}
                  {event.racePackTime && ` - ${event.racePackTime}`}
                </li>
              )}
              <li>
                <strong>Ngày thi đấu:</strong> {formatDate(event.date)} tại{" "}
                {event.location}
              </li>
              {event.websiteUrl && (
                <li>
                  <strong>📱 Tham gia nhóm Zalo:</strong>{" "}
                  <a href={event.websiteUrl} style={linkStyle}>
                    Nhấn vào đây để tham gia
                  </a>{" "}
                  - Nhận thông tin cập nhật và kết nối với runners khác
                </li>
              )}
              <li>
                <strong>Theo dõi trạng thái:</strong>{" "}
                <a href={trackingUrl} style={linkStyle}>
                  Xem tại đây
                </a>
              </li>
              <li>
                Nếu không nhận được email xác nhận sau thanh toán, kiểm tra hộp
                thư spam
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
            {event.facebookUrl && <>👥 Facebook: {event.facebookUrl}</>}
          </Text>

          <Text style={footer}>
            Chúc bạn có một trải nghiệm tuyệt vời! 🏃‍♂️
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

const heading = {
  fontSize: "24px",
  fontWeight: "bold",
  textAlign: "center" as const,
  color: "#2563eb",
  margin: "20px 0",
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

const trackingBox = {
  backgroundColor: "#dbeafe",
  padding: "24px",
  borderRadius: "12px",
  margin: "24px 0",
  border: "2px solid #3b82f6",
  textAlign: "center" as const,
};

const trackingTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1e40af",
  margin: "0 0 12px",
};

const trackingText = {
  fontSize: "14px",
  color: "#1e3a8a",
  margin: "0 0 16px",
};

const trackingButton = {
  display: "inline-block",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "12px 32px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: "bold" as const,
  fontSize: "16px",
  margin: "8px 0",
};

const trackingNote = {
  fontSize: "12px",
  color: "#64748b",
  margin: "12px 0 0",
};

const linkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
};

const paymentBox = {
  backgroundColor: "#eff6ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #2563eb",
};

const infoTitle = {
  fontSize: "18px",
  fontWeight: "bold",
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

const priceTable = {
  width: "100%",
  fontSize: "16px",
  marginTop: "16px",
};

const priceCell = {
  textAlign: "right" as const,
  fontWeight: "500" as const,
};

const totalRow = {
  borderTop: "2px solid #2563eb",
  paddingTop: "12px",
};

const totalPrice = {
  fontSize: "20px",
  color: "#2563eb",
  fontWeight: "bold" as const,
};

const qrSection = {
  textAlign: "center" as const,
  marginTop: "24px",
};

const qrText = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#1f2937",
  marginBottom: "16px",
};

const qrCode = {
  margin: "0 auto 20px",
  border: "2px solid #e5e7eb",
  borderRadius: "8px",
};

const transferInfo = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
  backgroundColor: "#ffffff",
  padding: "16px",
  borderRadius: "8px",
  margin: "20px 0",
};

const warningText = {
  fontSize: "14px",
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  padding: "12px",
  borderRadius: "6px",
  fontWeight: "500" as const,
};

const noteBox = {
  backgroundColor: "#fffbeb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #fbbf24",
};

const noteTitle = {
  fontSize: "16px",
  fontWeight: "bold" as const,
  color: "#92400e",
  margin: "0 0 12px",
};

const noteList = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#78350f",
  paddingLeft: "20px",
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const footer = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#6b7280",
  textAlign: "center" as const,
  margin: "20px 0",
};
