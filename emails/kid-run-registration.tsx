import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Section,
  Text,
} from "@react-email/components";

const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + " đ";

export function KidRunRegistrationEmail({
  application,
  campaign,
  secretCode,
  paid = false,
  payment,
}: {
  application: any;
  campaign: any;
  secretCode?: string;
  paid?: boolean;
  payment?: any;
}) {
  const bibIssued =
    Boolean(application.participants?.length) &&
    application.participants.every((participant: any) => participant.bibNumber);
  const title = paid
    ? "Đã xác nhận thanh toán áo"
    : bibIssued
      ? "Đăng ký chạy thành công"
      : "Đã nhận hồ sơ Mid-Autumn Kids Runs";
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={titleStyle}>{title}</Text>
          <Text style={subtitle}>{campaign.name}</Text>
          {!paid && (
            <Section style={registrationBox}>
              <Text style={registrationHeading}>Thông tin người đăng ký</Text>
              <Text style={summaryLine}>
                Phụ huynh/người giám hộ: <strong>{application.guardianName}</strong>
              </Text>
              <Text style={summaryLine}>
                Số điện thoại: <strong>{application.phone}</strong>
              </Text>
              <Text style={summaryLine}>
                Email: <strong>{application.email}</strong>
              </Text>
              <Text style={summaryLine}>
                Mua kèm áo: {" "}
                <strong>{application.shirtTotalAmount > 0 ? "Có" : "Không"}</strong>
              </Text>
            </Section>
          )}
          {!paid && !bibIssued && (
            <Section style={pendingBox}>
              <Text style={{ marginTop: 0 }}>
                <strong>
                  Hồ sơ {application.publicCode} đã được ghi nhận.
                </strong>
              </Text>
              <Text>
                Ban tổ chức sẽ rà soát năm sinh, xếp nhóm tuổi và cấp BIB sau
                khi chốt danh sách. Email số BIB và QR nhận BIB chung sẽ được
                gửi sau.
              </Text>
            </Section>
          )}
          {!paid && bibIssued && (
            <Section style={introBox}>
              <Text style={{ margin: 0, color: "#166534" }}>
                Thông tin BIB đã được cấp. Vui lòng lưu ảnh BIB và QR nhận BIB
                bên dưới.
              </Text>
            </Section>
          )}
          {!paid &&
            application.participants?.map((participant: any, index: number) => (
              <Section key={participant.id} style={bibBox}>
                {bibIssued && (
                  <Img
                    src={`cid:kidbib-${participant.id}`}
                    width="580"
                    alt={`BIB ${participant.bibNumber} - ${participant.fullName}`}
                    style={{ width: "100%", height: "auto", marginBottom: "12px" }}
                  />
                )}
                <Text style={bibTitle}>
                  {bibIssued
                    ? `${participant.fullName} · BIB ${participant.bibNumber}`
                    : `Bé ${index + 1}: ${participant.fullName}`}
                </Text>
                {bibIssued && (
                  <Text style={line}>
                    Họ tên: <strong>{participant.fullName}</strong>
                  </Text>
                )}
                <Text style={line}>Năm sinh: {participant.birthYear}</Text>
                <Text style={line}>
                  {bibIssued
                    ? `Nhóm tuổi: ${participant.category.name} · ${participant.category.distanceLabel}`
                    : "Nhóm tuổi: Chờ Ban tổ chức phân bổ"}
                </Text>
              </Section>
            ))}
          {!paid && bibIssued && (
            <Section style={qrBox}>
              <Text style={{ fontWeight: 700, marginTop: 0 }}>
                QR nhận BIB
              </Text>
              <Img
                src="cid:qrcheckin"
                width="240"
                height="240"
                alt="QR nhận BIB"
                style={{ margin: "0 auto" }}
              />
              <Text style={{ color: "#475569", fontSize: "13px" }}>
                Xuất trình mã QR này để nhận toàn bộ BIB của gia đình.
              </Text>
            </Section>
          )}
          {!paid && payment && application.shirtTotalAmount > 0 && (
            <Section style={paymentBox}>
              <Text style={{ fontWeight: 700, marginTop: 0 }}>
                Thanh toán áo tự nguyện
              </Text>
              <Text>
                Quét QR để thanh toán{" "}
                <strong>{money(application.shirtTotalAmount)}</strong>.
              </Text>
              <Img
                src={payment.qrPaymentUrl}
                width="260"
                height="260"
                alt="QR thanh toán áo"
                style={{ margin: "0 auto" }}
              />
              <Text style={line}>
                Ngân hàng: <strong>{payment.bankInfo.bankName}</strong>
              </Text>
              <Text style={line}>
                Số tài khoản: <strong>{payment.bankInfo.accountNumber}</strong>
              </Text>
              <Text style={line}>
                Chủ tài khoản: <strong>{payment.bankInfo.accountName}</strong>
              </Text>
              <Text style={line}>
                Nội dung: <strong>{payment.transferContent}</strong>
              </Text>
              <Text style={{ color: "#b45309", fontSize: "13px" }}>
                Không thay đổi nội dung chuyển khoản để hệ thống tự động nhận
                diện.
              </Text>
            </Section>
          )}
          {application.shirts?.length > 0 && (
            <Section style={shirtBox}>
              <Text style={{ fontWeight: 700, marginTop: 0 }}>
                Áo đã đăng ký
              </Text>
              {application.shirts.map((shirt: any) => {
                const participant =
                  shirt.category === "KID"
                    ? application.participants?.find(
                        (item: any) => item.id === shirt.participantId,
                      )
                    : null;
                return (
                  <Text key={shirt.id} style={line}>
                    {participant ? `${participant.fullName}: ` : "Người lớn: "}
                    {shirt.styleName} - Size {shirt.size} × {shirt.quantity} -{" "}
                    {money(shirt.totalPrice)}
                  </Text>
                );
              })}
              <Hr />
              <Text style={{ fontWeight: 700 }}>
                Tổng tiền áo: {money(application.shirtTotalAmount)}
              </Text>
              {!paid && (
                <Text style={{ color: "#b45309" }}>
                  Áo chỉ được ghi nhận sản xuất sau khi có email xác nhận thanh
                  toán thành công.
                </Text>
              )}
            </Section>
          )}
          {secretCode && (
            <Section style={secretBox}>
              <Text style={{ margin: 0 }}>Mã bí mật tra cứu hồ sơ</Text>
              <Text style={secret}>{secretCode}</Text>
              <Text style={{ color: "#475569", fontSize: "13px" }}>
                Vui lòng lưu lại mã này để tra cứu hồ sơ.
              </Text>
            </Section>
          )}
          <Text style={footer}>
            Liên hệ BTC:{" "}
            {campaign.contactPhone ||
              campaign.contactEmail ||
              "Theo thông tin chương trình"}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f4f7f5",
  fontFamily: "Arial, sans-serif",
  padding: "24px 8px",
};
const container = {
  backgroundColor: "#fff",
  maxWidth: "640px",
  padding: "28px",
  border: "1px solid #dfe7e2",
};
const titleStyle = {
  color: "#176b45",
  fontSize: "24px",
  fontWeight: 700,
  margin: "0 0 8px",
};
const subtitle = { color: "#475569", marginTop: 0 };
const registrationBox = {
  backgroundColor: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "16px",
  margin: "16px 0",
};
const registrationHeading = {
  color: "#0f172a",
  fontWeight: 700,
  margin: "0 0 10px",
};
const summaryLine = {
  color: "#475569",
  fontSize: "14px",
  margin: "5px 0",
};
const introBox = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "12px",
  padding: "14px",
  margin: "16px 0",
};
const pendingBox = {
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "16px",
  margin: "18px 0",
};
const bibBox = {
  border: "1px solid #dbe5df",
  padding: "14px",
  margin: "10px 0",
};
const bibTitle = {
  margin: "0 0 8px",
  color: "#075985",
  fontSize: "18px",
  fontWeight: 700,
};
const line = { margin: "5px 0" };
const qrBox = {
  textAlign: "center" as const,
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  padding: "18px",
  margin: "18px 0",
};
const paymentBox = {
  textAlign: "center" as const,
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "16px",
  margin: "18px 0",
};
const shirtBox = {
  backgroundColor: "#fff7ed",
  border: "1px solid #fed7aa",
  padding: "16px",
  margin: "18px 0",
};
const secretBox = {
  textAlign: "center" as const,
  backgroundColor: "#eff6ff",
  border: "1px solid #bfdbfe",
  padding: "16px",
};
const secret = {
  margin: "8px 0 0",
  fontSize: "28px",
  fontWeight: 700,
  letterSpacing: "4px",
};
const footer = { marginTop: "24px", color: "#64748b", fontSize: "13px" };
