// emails/race-pack-info.tsx
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

interface RacePackInfoEmailProps {
  registration: any;
}

export function RacePackInfoEmail({ registration }: RacePackInfoEmailProps) {
  const event = registration.event;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
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

          <Section style={announcementBanner}>
            <Text style={announcementIcon}>📢</Text>
            <Text style={announcementTitle}>
              THÔNG TIN QUAN TRỌNG TRƯỚC NGÀY THI ĐẤU
            </Text>
          </Section>

          <Text style={greeting}>
            Xin chào <strong>{registration.fullName}</strong>,
          </Text>

          <Text style={paragraph}>
            Chỉ còn vài ngày nữa là đến ngày thi đấu của{" "}
            <strong>{event.name}</strong>! Chúng tôi gửi đến bạn những thông tin
            quan trọng để chuẩn bị cho ngày thi đấu.
          </Text>

          {/* BIB Number Reminder */}
          <Section style={bibReminderBox}>
            <Text style={bibReminderTitle}>🏃 SỐ BIB CỦA BẠN</Text>
            <Text style={bibReminderNumber}>{registration.bibNumber}</Text>
            <Text style={bibReminderNote}>
              Vui lòng ghi nhớ số BIB này!
            </Text>
          </Section>

          {/* Race Pack Collection */}
          {event.racePackLocation && (
            <Section style={infoBox}>
              <Text style={sectionTitle}>📦 NHẬN RACE PACK</Text>
              
              <table style={infoTable}>
                <tbody>
                  <tr>
                    <td style={iconCell}>📍</td>
                    <td style={labelCell}>Địa điểm:</td>
                    <td style={valueCell}>{event.racePackLocation}</td>
                  </tr>
                  {event.racePackTime && (
                    <tr>
                      <td style={iconCell}>🕐</td>
                      <td style={labelCell}>Thời gian:</td>
                      <td style={valueCell}>{event.racePackTime}</td>
                    </tr>
                  )}
                  <tr>
                    <td style={iconCell}>🎒</td>
                    <td style={labelCell}>Mang theo:</td>
                    <td style={valueCell}>
                      • CCCD/CMND (bản chính)
                      <br />• Mã QR check-in (trong email xác nhận thanh toán)
                    </td>
                  </tr>
                </tbody>
              </table>

              <Section style={warningBox}>
                <Text style={warningText}>
                  ⚠️ <strong>Lưu ý:</strong> Chỉ người đăng ký mới được nhận race
                  pack. Không được ủy quyền cho người khác nhận thay.
                </Text>
              </Section>
            </Section>
          )}

          {/* Race Day Schedule */}
          <Section style={raceDayBox}>
            <Text style={sectionTitle}>🏁 LỊCH TRÌNH NGÀY THI ĐẤU</Text>

            <div style={dateHighlight}>
              <Text style={dateText}>{formatDate(event.date)}</Text>
              <Text style={locationText}>📍 {event.location}</Text>
            </div>

            {event.raceDaySchedule ? (
              <div
                style={scheduleContent}
                dangerouslySetInnerHTML={{ __html: event.raceDaySchedule }}
              />
            ) : (
              <table style={scheduleTable}>
                <tbody>
                  <tr>
                    <td style={timeCell}>05:00 - 06:00</td>
                    <td style={activityCell}>Check-in & Tập trung</td>
                  </tr>
                  <tr>
                    <td style={timeCell}>06:00 - 06:15</td>
                    <td style={activityCell}>Khởi động tập thể</td>
                  </tr>
                  <tr>
                    <td style={timeCell}>06:30</td>
                    <td style={activityCell}>Xuất phát 21km</td>
                  </tr>
                  <tr>
                    <td style={timeCell}>07:00</td>
                    <td style={activityCell}>Xuất phát 10km & 5km</td>
                  </tr>
                  <tr>
                    <td style={timeCell}>09:00</td>
                    <td style={activityCell}>Trao giải & Kết thúc</td>
                  </tr>
                </tbody>
              </table>
            )}
          </Section>

          {/* Parking Info */}
          {event.parkingInfo && (
            <Section style={infoBox}>
              <Text style={sectionTitle}>🅿️ THÔNG TIN ĐỖ XE</Text>
              <Text style={paragraph}>{event.parkingInfo}</Text>
            </Section>
          )}

          {/* Important Notes */}
          <Section style={tipsBox}>
            <Text style={sectionTitle}>💡 CHUẨN BỊ TRƯỚC NGÀY THI ĐẤU</Text>
            
            <Section style={tipSection}>
              <Text style={tipTitle}>👕 Trang phục</Text>
              <ul style={tipList}>
                <li>Mặc trang phục thể thao thoải mái, thấm hút mồ hôi tốt</li>
                <li>Giày chạy bộ đã quen thuộc (không mang giày mới)</li>
                <li>Đội mũ/băng đô để chống nắng</li>
              </ul>
            </Section>

            <Section style={tipSection}>
              <Text style={tipTitle}>🎒 Cần mang theo</Text>
              <ul style={tipList}>
                <li>Nước uống (BTC sẽ cung cấp nước tại các trạm)</li>
                <li>Khăn lau mồ hôi</li>
                <li>Kem chống nắng</li>
                <li>Điện thoại đầy pin để liên lạc khẩn cấp</li>
              </ul>
            </Section>

            <Section style={tipSection}>
              <Text style={tipTitle}>⚠️ An toàn</Text>
              <ul style={tipList}>
                <li>Ngủ đủ giấc trước ngày thi đấu</li>
                <li>Ăn nhẹ trước khi chạy ít nhất 1-2 tiếng</li>
                <li>Không uống rượu bia trước ngày thi đấu</li>
                <li>
                  Nếu cảm thấy không khỏe, hãy dừng lại và báo tình nguyện viên
                </li>
                <li>Không sử dụng tai nghe khi chạy</li>
              </ul>
            </Section>
          </Section>

          {/* Your Info Summary */}
          <Section style={summaryBox}>
            <Text style={sectionTitle}>📋 THÔNG TIN CỦA BẠN</Text>
            <table style={summaryTable}>
              <tbody>
                <tr>
                  <td style={summaryLabel}>Họ tên:</td>
                  <td style={summaryValue}>{registration.fullName}</td>
                </tr>
                <tr>
                  <td style={summaryLabel}>Số BIB:</td>
                  <td style={summaryValue}>
                    <strong style={{ color: "#2563eb", fontSize: "18px" }}>
                      {registration.bibNumber}
                    </strong>
                  </td>
                </tr>
                <tr>
                  <td style={summaryLabel}>Cự ly:</td>
                  <td style={summaryValue}>{registration.distance.name}</td>
                </tr>
                {registration.shirtSize && (
                  <tr>
                    <td style={summaryLabel}>Áo:</td>
                    <td style={summaryValue}>
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

          {/* Footer */}
          <Hr style={hr} />

          <Text style={footer}>
            Chúc bạn có một trải nghiệm tuyệt vời và đạt được mục tiêu của mình! 🎯🏃‍♂️
          </Text>

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

const announcementBanner = {
  backgroundColor: "#1e40af",
  padding: "20px",
  borderRadius: "8px",
  textAlign: "center" as const,
  margin: "20px 0",
};

const announcementIcon = {
  fontSize: "32px",
  margin: "0",
};

const announcementTitle = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#ffffff",
  margin: "8px 0 0",
  letterSpacing: "1px",
};

const greeting = {
  fontSize: "16px",
  color: "#374151",
  margin: "20px 0 8px",
};

const paragraph = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#374151",
  margin: "16px 0",
};

const bibReminderBox = {
  backgroundColor: "#dbeafe",
  padding: "24px",
  borderRadius: "12px",
  textAlign: "center" as const,
  margin: "24px 0",
  border: "3px solid #2563eb",
};

const bibReminderTitle = {
  fontSize: "14px",
  fontWeight: "600" as const,
  color: "#1e40af",
  margin: "0 0 12px",
};

const bibReminderNumber = {
  fontSize: "48px",
  fontWeight: "bold" as const,
  color: "#2563eb",
  margin: "0",
  letterSpacing: "3px",
};

const bibReminderNote = {
  fontSize: "14px",
  color: "#64748b",
  margin: "12px 0 0",
};

const infoBox = {
  backgroundColor: "#f0f9ff",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #bae6fd",
};

const raceDayBox = {
  backgroundColor: "#fef2f2",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "2px solid #fca5a5",
};

const tipsBox = {
  backgroundColor: "#f0fdf4",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #bbf7d0",
};

const summaryBox = {
  backgroundColor: "#fef3c7",
  padding: "20px",
  borderRadius: "8px",
  margin: "20px 0",
  border: "1px solid #fbbf24",
};

const sectionTitle = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#111827",
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
  verticalAlign: "top" as const,
  width: "100px",
  fontWeight: "500" as const,
};

const valueCell = {
  padding: "8px 0",
  color: "#111827",
  verticalAlign: "top" as const,
};

const warningBox = {
  backgroundColor: "#fef2f2",
  padding: "12px",
  borderRadius: "6px",
  marginTop: "16px",
  border: "1px solid #fca5a5",
};

const warningText = {
  fontSize: "14px",
  color: "#991b1b",
  margin: "0",
  lineHeight: "20px",
};

const dateHighlight = {
  textAlign: "center" as const,
  padding: "16px",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  marginBottom: "16px",
  border: "2px solid #f87171",
};

const dateText = {
  fontSize: "20px",
  fontWeight: "bold" as const,
  color: "#dc2626",
  margin: "0 0 4px",
};

const locationText = {
  fontSize: "16px",
  color: "#6b7280",
  margin: "0",
};

const scheduleTable = {
  width: "100%",
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  overflow: "hidden" as const,
};

const timeCell = {
  padding: "12px 16px",
  backgroundColor: "#fef2f2",
  fontWeight: "bold" as const,
  color: "#dc2626",
  width: "140px",
  borderBottom: "1px solid #fee2e2",
};

const activityCell = {
  padding: "12px 16px",
  color: "#374151",
  borderBottom: "1px solid #fee2e2",
};

const scheduleContent = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#374151",
};

const tipSection = {
  marginBottom: "16px",
};

const tipTitle = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#065f46",
  margin: "0 0 8px",
};

const tipList = {
  fontSize: "14px",
  lineHeight: "22px",
  color: "#064e3b",
  paddingLeft: "20px",
  margin: "0",
};

const summaryTable = {
  width: "100%",
  fontSize: "14px",
};

const summaryLabel = {
  padding: "8px 0",
  color: "#78350f",
  fontWeight: "500" as const,
  width: "100px",
};

const summaryValue = {
  padding: "8px 0",
  color: "#92400e",
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
  margin: "16px 0",
};