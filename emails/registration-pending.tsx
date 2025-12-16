// emails/registration-pending.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Img,
  Hr,
  Row,
  Column,
} from "@react-email/components";

interface RegistrationPendingEmailProps {
  registration: any;
  event: any;
  bankInfo: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
  isNewUser?: boolean;
  temporaryPassword?: string;
}

export function RegistrationPendingEmail({
  registration,
  event,
  bankInfo,
  isNewUser,
  temporaryPassword,
}: RegistrationPendingEmailProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN").format(new Date(date));
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

          <Text style={heading}>Xác nhận đăng ký thành công! 🎉</Text>

          <Text style={paragraph}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Cảm ơn bạn đã đăng ký tham gia <strong>{event.name}</strong>. Dưới
            đây là thông tin đăng ký của bạn:
          </Text>
          {/* NEW: Account Information Section */}
          {isNewUser && temporaryPassword && (
            <Section style={accountBox}>
              <Text style={accountTitle}>🔐 THÔNG TIN TÀI KHOẢN</Text>
              <Text style={accountText}>
                Chúng tôi đã tạo tài khoản để bạn theo dõi thông tin đăng ký:
              </Text>
              <table style={accountTable}>
                <tbody>
                  <tr>
                    <td style={accountLabel}>Email đăng nhập:</td>
                    <td style={accountValue}>{registration.email}</td>
                  </tr>
                  <tr>
                    <td style={accountLabel}>Mật khẩu tạm thời:</td>
                    <td style={accountPassword}>{temporaryPassword}</td>
                  </tr>
                </tbody>
              </table>
              <Text style={accountNote}>
                ⚠️ Vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên tại:{" "}
                <strong>{process.env.NEXTAUTH_URL}/login</strong>
              </Text>
            </Section>
          )}
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

          {/* Payment Info - Always show */}
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

            {/* QR Code - Always show */}
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
                    {registration.phone} {registration.shirtCategory}{" "}
                    {registration.shirtType} {registration.shirtSize}
                  </strong>
                </Text>

                <Text style={warningText}>
                  ⚠️ Vui lòng ghi CHÍNH XÁC nội dung chuyển khoản:{" "}
                  <strong>
                    {registration.phone} {registration.shirtCategory}{" "}
                    {registration.shirtType} {registration.shirtSize}
                  </strong>
                </Text>
              </Section>
            )}
          </Section>

          {/* Notes */}
          <Section style={noteBox}>
            <Text style={noteTitle}>📌 LƯU Ý QUAN TRỌNG</Text>
            <ul style={noteList}>
              <li>
                Sau khi chuyển khoản thành công, bạn sẽ nhận email xác nhận kèm
                số BIB trong vòng 5-10 phút (nếu tự động) hoặc sau khi BTC xác
                nhận.
              </li>
              <li>
                Nếu không nhận được email, vui lòng kiểm tra hộp thư spam hoặc
                liên hệ hotline.
              </li>
              <li>Đơn đăng ký chỉ được xác nhận khi thanh toán thành công.</li>
              <li>
                Không hoàn tiền trong mọi trường hợp sau khi đã thanh toán.
              </li>
            </ul>
          </Section>

          {/* Footer */}
          <Hr style={hr} />

          <Text style={footer}>
            <strong>Liên hệ hỗ trợ:</strong>
            <br />
            📞 Hotline: {event.hotline}
            <br />
            📧 Email: {event.emailSupport}
            <br />
            👥 Facebook: {event.facebookUrl}
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
};

const labelCell = {
  padding: "8px 0",
  color: "#6b7280",
  width: "40%",
};

const valueCell = {
  padding: "8px 0",
  color: "#111827",
  fontWeight: "500" as const,
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

// Add new styles
const accountBox = {
  backgroundColor: "#eff6ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #3b82f6",
};

const accountTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1e40af",
  margin: "0 0 12px",
  textAlign: "center" as const,
};

const accountText = {
  fontSize: "14px",
  color: "#374151",
  margin: "0 0 16px",
  textAlign: "center" as const,
};

const accountTable = {
  width: "100%",
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  padding: "16px",
};

const accountLabel = {
  fontSize: "14px",
  color: "#6b7280",
  padding: "8px 0",
};

const accountValue = {
  fontSize: "14px",
  color: "#111827",
  fontWeight: "600" as const,
  padding: "8px 0",
};

const accountPassword = {
  fontSize: "18px",
  color: "#2563eb",
  fontWeight: "bold" as const,
  fontFamily: "monospace",
  padding: "8px 0",
  letterSpacing: "2px",
};

const accountNote = {
  fontSize: "13px",
  color: "#dc2626",
  backgroundColor: "#fef2f2",
  padding: "12px",
  borderRadius: "6px",
  marginTop: "12px",
  border: "1px solid #fca5a5",
};
