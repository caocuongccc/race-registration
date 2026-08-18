import { Body, Container, Head, Heading, Hr, Html, Img, Section, Text } from "@react-email/components";

export function KidRunBibPickupEmail({ application, posterUrl }: { application: any; posterUrl: string }) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Img src={posterUrl} alt="Thông báo thời gian nhận BIB Mid-Autumn Kids Runs" width="620" style={poster} />
          <Section style={hero}>
            <Text style={eyebrow}>MID-AUTUMN KIDS RUNS</Text>
            <Heading style={heading}>THÔNG BÁO THỜI GIAN NHẬN BIB</Heading>
          </Section>
          <Section style={content}>
            <Text style={paragraph}>Kính gửi phụ huynh <strong>{application.guardianName}</strong>,</Text>
            <Text style={paragraph}>Ban tổ chức trân trọng thông báo thời gian và địa điểm nhận RaceKit của các bé tham gia Mid-Autumn Kids Runs.</Text>
            <Section style={infoBox}>
              <Text style={infoTitle}>📍 Địa điểm nhận BIB</Text>
              <Text style={infoText}><strong>Cửa hàng Goya Đà Nẵng</strong><br />264 Điện Biên Phủ, Đà Nẵng</Text>
              <Text style={infoTitle}>🗓️ Thời gian</Text>
              <Text style={infoText}><strong>Thứ Sáu, ngày 21/08/2026:</strong> 17:00 – 19:00<br /><strong>Thứ Bảy, ngày 22/08/2026:</strong> 09:00 – 11:00 và 14:00 – 17:30</Text>
            </Section>
            <Heading as="h2" style={subheading}>BIB của gia đình</Heading>
            {application.participants.map((participant: any) => (
              <Section key={participant.id} style={bibBox}>
                <Text style={bibNumber}>BIB {participant.bibNumber}</Text>
                <Text style={bibText}>{participant.fullName} · {participant.category.name}</Text>
              </Section>
            ))}
            <Heading as="h2" style={subheading}>RaceKit của bé gồm</Heading>
            <Text style={paragraph}>🎽 BIB chạy · 🥛 Sữa VitaDairy · 💧 Nước suối Uni · 🎟️ Voucher từ nhà tài trợ</Text>
            <Section style={warningBox}>
              <Text style={warningText}><strong>Vui lòng xuất trình mã QR nhận BIB đính kèm email này</strong> cho tình nguyện viên. Phụ huynh vui lòng kiểm tra kỹ họ tên và số BIB trước khi rời quầy.</Text>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>Mã hồ sơ: {application.publicCode}<br />Trân trọng,<br />Ban tổ chức Mid-Autumn Kids Runs</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = { backgroundColor: "#f3f7f1", fontFamily: "Arial, sans-serif", margin: 0, padding: "24px 8px" };
const container = { backgroundColor: "#ffffff", borderRadius: "12px", margin: "0 auto", maxWidth: "620px", overflow: "hidden" as const };
const poster = { display: "block", height: "auto", maxWidth: "100%", width: "100%" };
const hero = { backgroundColor: "#075f37", padding: "32px 24px", textAlign: "center" as const };
const eyebrow = { color: "#ffc600", fontSize: "14px", fontWeight: "700", letterSpacing: "1.5px", margin: "0 0 8px" };
const heading = { color: "#ffffff", fontSize: "28px", lineHeight: "1.25", margin: 0 };
const content = { padding: "28px 24px" };
const paragraph = { color: "#26352d", fontSize: "16px", lineHeight: "1.65", margin: "0 0 16px" };
const infoBox = { backgroundColor: "#fff8cc", border: "1px solid #f0cf42", borderRadius: "10px", padding: "18px", margin: "20px 0" };
const infoTitle = { color: "#075f37", fontSize: "17px", fontWeight: "700", margin: "0 0 6px" };
const infoText = { color: "#26352d", fontSize: "16px", lineHeight: "1.6", margin: "0 0 16px" };
const subheading = { color: "#075f37", fontSize: "20px", margin: "24px 0 12px" };
const bibBox = { border: "1px solid #c8ddcf", borderRadius: "8px", margin: "0 0 10px", padding: "12px 16px" };
const bibNumber = { color: "#075f37", fontSize: "20px", fontWeight: "700", margin: "0 0 4px" };
const bibText = { color: "#405249", fontSize: "15px", margin: 0 };
const warningBox = { backgroundColor: "#edf8f1", borderLeft: "4px solid #07834d", padding: "14px 16px", margin: "22px 0" };
const warningText = { color: "#174c31", fontSize: "15px", lineHeight: "1.6", margin: 0 };
const hr = { borderColor: "#dde6e0", margin: "24px 0" };
const footer = { color: "#66756d", fontSize: "14px", lineHeight: "1.6", margin: 0 };