// emails/payment-confirmed.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Button,
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
      day: "2-digit",
      month: "2-digit",
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
      <Body style={main}>
        <Container style={container}>
          {event.logoUrl && (
            <Img src={event.logoUrl} alt={event.name} width="200" style={logo} />
          )}

          {/* Success Badge */}
          <Section style={successBadge}>
            <Text style={successIcon}>✅</Text>
            <Text style={successTitle}>THANH TOÁN THÀNH CÔNG!</Text>
          </Section>

          <Text style={paragraph}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Chúc mừng! Chúng tôi đã nhận được thanh toán của bạn. Đăng ký tham gia{" "}
            <strong>{event.name}</strong> của bạn đã được xác nhận.
          </Text>

          {/* BIB Number Highlight */}
          <Section style={bibBox}>
            <Text style={bibLabel}>🏃 SỐ BIB CỦA BẠN</Text>
            <Text style={bibNumber}>{registration.bibNumber}</Text>
            <Text style={bibNote}>
              Vui lòng ghi nhớ số BIB để nhận race pack
            </Text>
          </Section>

          {/* Payment Details */}
          <Section style={infoBox}>
            <Text style={infoTitle}>💰 CHI TIẾT THANH TOÁN</Text>
            
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Số tiền:</td>
                  <td style={valueCell}>
                    <strong>{formatCurrency(registration.totalAmount)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Thời gian:</td>
                  <td style={valueCell}>
                    {formatDateTime(registration.paymentDate)}
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Trạng thái:</td>
                  <td style={paidStatus}>Đã thanh toán</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Registration Summary */}
          <Section style={summaryBox}>
            <Text style={infoTitle}>📋 THÔNG TIN ĐĂNG KÝ</Text>
            
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Họ tên:</td>
                  <td style={valueCell}>{registration.fullName}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Số BIB:</td>
                  <td style={valueCell}>
                    <strong style={{ color: "#2563eb" }}>
                      {registration.bibNumber}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Cự ly:</td>
                  <td style={valueCell}>{registration.distance?.name}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Email:</td>
                  <td style={valueCell}>{registration.email}</td>
                </tr>
                <tr>
                  <td style={labelCell}>Số điện thoại:</td>
                  <td style={valueCell}>{registration.phone}</td>
                </tr>
                
                {registration.shirtSize && (
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
                )}
              </tbody>
            </table>
          </Section>

          {/* Check-in QR Code */}
          <Section style={qrSection}>
            <Text style={qrTitle}>📱 MÃ QR CHECK-IN</Text>
            <Text style={qrSubtitle}>
              Xuất trình mã QR này khi nhận race pack và check-in ngày thi đấu
            </Text>
            
            {registration.qrCheckinUrl && (
              <Img
                src={registration.qrCheckinUrl}
                alt="QR Check-in"
                width="250"
                height="250"
                style={qrCode}
              />
            )}
            
            <Text style={qrInstruction}>
              💡 <strong>Lưu lại ảnh QR này</strong> hoặc mang theo email khi đến
              nhận race pack
            </Text>
          </Section>

          {/* Race Pack Info */}
          {event.racePackLocation && (
            <Section style={racePackBox}>
              <Text style={infoTitle}>📦 THÔNG TIN NHẬN RACE PACK</Text>
              
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
                  <tr>
                    <td style={labelCell}>Mang theo:</td>
                    <td style={valueCell}>
                      CCCD/CMND + Mã QR (trên email này)
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>
          )}

          {/* Race Day Info */}
          <Section style={raceDayBox}>
            <Text style={infoTitle}>🏁 THÔNG TIN NGÀY THI ĐẤU</Text>
            
            <table style={infoTable}>
              <tbody>
                <tr>
                  <td style={labelCell}>Ngày thi đấu:</td>
                  <td style={valueCell}>
                    <strong>{formatDate(event.date)}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={labelCell}>Địa điểm:</td>
                  <td style={valueCell}>{event.location}</td>
                </tr>
                {event.address && (
                  <tr>
                    <td style={labelCell}>Địa chỉ:</td>
                    <td style={valueCell}>{event.address}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {event.raceDaySchedule && (
              <Section style={scheduleBox}>
                <Text style={scheduleTitle}>📅 Lịch trình:</Text>
                <div
                  style={scheduleContent}
                  dangerouslySetInnerHTML={{ __html: event.raceDaySchedule }}
                />
              </Section>
            )}
          </Section>

          {/* Important Notes */}
          <Section style={noteBox}>
            <Text style={noteTitle}>⚠️ LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                <strong>Nhớ số BIB: {registration.bibNumber}</strong> - Đây là số
                thứ tự của bạn trong giải
              </li>
              <li>
                Mang theo CCCD/CMND và mã QR trên email này khi nhận race pack
              </li>
              <li>Đến sớm ít nhất 30 phút trước giờ xuất phát để check-in</li>
              <li>Mặc trang phục thể thao phù hợp, mang theo nước uống</li>
              <li>Tuân thủ hướng dẫn của BTC và tình nguyện viên</li>
              <li>
                Không sử dụng tai nghe khi chạy để đảm bảo an toàn
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
            Chúc bạn có một mùa giải thành công và đạt được mục tiêu của mình! 🎯
          </Text>

          <Text style={footer}>
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

const bibNote = {
  fontSize: "14px",
  color: "#64748b",
  margin: "12px 0 0",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
};

const summaryBox = {
  backgroundColor: "#fefce8",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #fbbf24",
};

const racePackBox = {
  backgroundColor: "#f0f9ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #38bdf8",
};

const raceDayBox = {
  backgroundColor: "#fef2f2",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #f87171",
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

const scheduleBox = {
  backgroundColor: "#ffffff",
  padding: "16px",
  borderRadius: "6px",
  marginTop: "16px",
};

const scheduleTitle = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#374151",
  margin: "0 0 8px",
};

const scheduleContent = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#4b5563",
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
  margin: "16px 0",
};