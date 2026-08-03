import { Body, Container, Head, Hr, Html, Img, Section, Text } from "@react-email/components";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " đ";

export function KidRunRegistrationEmail({
  application,
  campaign,
  secretCode,
  paid = false,
}: {
  application: any;
  campaign: any;
  secretCode?: string;
  paid?: boolean;
}) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={title}>{paid ? "Đã xác nhận thanh toán áo" : "Đăng ký Kid Run thành công"}</Text>
          <Text style={subtitle}>{campaign.name}</Text>
          {!paid && (
            <Text>
              Hồ sơ <strong>{application.publicCode}</strong> đã được xác nhận. Dưới đây là toàn bộ BIB của gia đình.
            </Text>
          )}
          {!paid && application.participants?.map((participant: any, index: number) => (
            <Section key={participant.id} style={bibBox}>
              <Text style={bibTitle}>BIB {index + 1}: {participant.bibNumber}</Text>
              <Text style={line}>Họ tên: <strong>{participant.fullName}</strong></Text>
              <Text style={line}>Năm sinh: {participant.birthYear}</Text>
              <Text style={line}>Nhóm tuổi: {participant.category?.name}</Text>
              <Text style={line}>Cự ly: {participant.category?.distanceLabel}</Text>
            </Section>
          ))}
          {!paid && (
            <Section style={qrBox}>
              <Text style={{ fontWeight: 700, marginTop: 0 }}>Một QR nhận BIB cho cả gia đình</Text>
              <Img src="cid:qrcheckin" width="240" height="240" alt="QR nhận BIB" style={{ margin: "0 auto" }} />
              <Text style={{ color: "#475569", fontSize: "13px" }}>BTC quét mã này để xem và bàn giao toàn bộ BIB trong hồ sơ.</Text>
            </Section>
          )}
          {application.shirts?.length > 0 && (
            <Section style={shirtBox}>
              <Text style={{ fontWeight: 700, marginTop: 0 }}>Áo đã đăng ký</Text>
              {application.shirts.map((shirt: any) => {
                const participant = shirt.category === "KID"
                  ? application.participants?.find((item: any) => item.id === shirt.participantId)
                  : null;
                return (
                  <Text key={shirt.id} style={line}>
                    {participant ? `${participant.fullName}: ` : "Người lớn: "}{shirt.styleName} - Size {shirt.size} × {shirt.quantity} - {money(shirt.totalPrice)}
                  </Text>
                );
              })}
              <Hr />
              <Text style={{ fontWeight: 700 }}>Tổng tiền áo: {money(application.shirtTotalAmount)}</Text>
              {!paid && <Text style={{ color: "#b45309" }}>Đăng ký chạy và BIB đã có hiệu lực. Áo chỉ được ghi nhận sản xuất sau khi có email xác nhận thanh toán thành công.</Text>}
            </Section>
          )}
          {secretCode && (
            <Section style={secretBox}>
              <Text style={{ margin: 0 }}>Mã bí mật tra cứu hồ sơ</Text>
              <Text style={secret}>{secretCode}</Text>
            </Section>
          )}
          <Text style={footer}>Liên hệ BTC: {campaign.contactPhone || campaign.contactEmail || "Theo thông tin chương trình"}</Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: "#f4f7f5", fontFamily: "Arial, sans-serif", padding: "24px 8px" };
const container = { backgroundColor: "#fff", maxWidth: "640px", padding: "28px", border: "1px solid #dfe7e2" };
const title = { color: "#176b45", fontSize: "24px", fontWeight: 700, margin: "0 0 8px" };
const subtitle = { color: "#475569", marginTop: 0 };
const bibBox = { border: "1px solid #dbe5df", padding: "14px", margin: "10px 0" };
const bibTitle = { margin: "0 0 8px", color: "#075985", fontSize: "18px", fontWeight: 700 };
const line = { margin: "5px 0" };
const qrBox = { textAlign: "center" as const, backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "18px", margin: "18px 0" };
const shirtBox = { backgroundColor: "#fff7ed", border: "1px solid #fed7aa", padding: "16px", margin: "18px 0" };
const secretBox = { textAlign: "center" as const, backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "16px" };
const secret = { margin: "8px 0 0", fontSize: "28px", fontWeight: 700, letterSpacing: "4px" };
const footer = { marginTop: "24px", color: "#64748b", fontSize: "13px" };