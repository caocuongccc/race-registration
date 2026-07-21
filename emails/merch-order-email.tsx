import { Body, Container, Head, Hr, Html, Img, Section, Text } from "@react-email/components";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(value) + " đ";

export function MerchOrderEmail({ order, campaign, secretCode, qrPaymentUrl, bankInfo, paid = false }: {
  order: any; campaign: any; secretCode?: string; qrPaymentUrl?: string | null; bankInfo?: any; paid?: boolean;
}) {
  return (
    <Html><Head /><Body style={main}><Container style={container}>
      <Text style={title}>{paid ? "Đã nhận thanh toán" : "Đặt áo thành công"}</Text>
      <Text style={subtitle}>{campaign.name}</Text>
      <Text>Xin chào <strong>{order.fullName}</strong>, mã đơn của bạn là <strong>{order.publicCode}</strong>.</Text>
      <Section style={orderBox}>
        <Text style={{ margin: 0, fontWeight: 700 }}>Chi tiết đơn hàng</Text>
        {order.items.map((item: any) => (
          <Text key={item.id} style={{ margin: "8px 0 0" }}>
            {item.styleName} - {item.category === "MALE" ? "Nam" : item.category === "FEMALE" ? "Nữ" : "Trẻ em"} - {item.type === "SHORT_SLEEVE" ? "T-shirt" : "Singlet"} - Size {item.size} × {item.quantity}: {money(item.totalPrice)}
          </Text>
        ))}
        <Hr /><Text style={{ margin: 0, fontWeight: 700 }}>Tổng cộng: {money(order.totalAmount)}</Text>
      </Section>
      {secretCode && <Section style={secretBox}>
        <Text style={{ margin: 0, color: "#9a3412" }}>Mã bí mật để tra cứu đơn hàng</Text>
        <Text style={secret}>{secretCode}</Text>
        <Text style={{ marginBottom: 0, fontSize: "13px", color: "#7c2d12" }}>Không chia sẻ mã này cho người khác.</Text>
      </Section>}
      {!paid && bankInfo && <Section style={{ marginTop: "20px" }}>
        <Text style={{ fontWeight: 700 }}>Thông tin thanh toán</Text>
        {qrPaymentUrl && <Img src={qrPaymentUrl} width="280" alt="QR thanh toán" style={{ margin: "0 auto 16px" }} />}
        <Text>Ngân hàng: <strong>{bankInfo.bankName}</strong><br />Số tài khoản: <strong>{bankInfo.accountNumber}</strong><br />Chủ tài khoản: <strong>{bankInfo.accountName}</strong><br />Nội dung: <strong>{order.transferContent}</strong></Text>
        {campaign.requireOnlinePayment ? <Text style={{ color: "#b91c1c", fontWeight: 700 }}>Vui lòng không thay đổi nội dung chuyển khoản để hệ thống tự động nhận diện.</Text> : <Text style={{ color: "#92400e", fontWeight: 700 }}>Vui lòng ghi đúng nội dung chuyển khoản để ban tổ chức đối soát nhanh.</Text>}
      </Section>}
      <Text style={footer}>Tra cứu tại: {process.env.NEXT_PUBLIC_APP_URL || "https://dangkygiaichay.vercel.app"}/merch/{campaign.slug}</Text>
    </Container></Body></Html>
  );
}

const main = { backgroundColor: "#f4f7f5", fontFamily: "Arial, sans-serif", padding: "24px 8px" };
const container = { backgroundColor: "#ffffff", maxWidth: "640px", padding: "28px", border: "1px solid #dfe7e2" };
const title = { color: "#176b45", fontSize: "24px", fontWeight: 700, margin: "0 0 8px" };
const subtitle = { color: "#475569", marginTop: 0 };
const orderBox = { backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "16px", margin: "18px 0" };
const secretBox = { backgroundColor: "#fff7ed", border: "1px solid #fed7aa", padding: "16px", textAlign: "center" as const };
const secret = { margin: "8px 0 0", fontSize: "28px", fontWeight: 700, letterSpacing: "4px" };
const footer = { marginTop: "24px", color: "#64748b", fontSize: "13px" };
