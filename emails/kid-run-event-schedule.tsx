import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Section,
  Text,
} from "@react-email/components";

export function KidRunEventScheduleEmail({
  mapImageUrl,
}: {
  mapImageUrl: string;
}) {
  return (
    <Html>
      <Head />
      <Body style={body}>
        <Container style={container}>
          <Img
            src={mapImageUrl}
            alt="Sơ đồ Mid-Autumn Kids Run 2026"
            width="640"
            style={image}
          />
          <Section style={content}>
            <Text style={eyebrow}>MID-AUTUMN KIDS RUN 2026</Text>
            <Heading style={heading}>SƠ ĐỒ & TIMELINE CHƯƠNG TRÌNH</Heading>
            <Text style={paragraph}>
              Ba mẹ ơi, Kids Run 2026 sắp bắt đầu rồi! Để các bé có mặt đúng giờ
              và tham gia thật thuận lợi, BTC gửi đến ba mẹ sơ đồ khu vực Sân
              vận động và timeline chương trình.
            </Text>

            <Heading as="h2" style={subheading}>
              Timeline chương trình
            </Heading>
            <Section style={timelineBox}>
              <Text style={timeline}>
                <strong>05:30</strong> – Tập trung, ổn định các bé
              </Text>
              <Text style={timeline}>
                <strong>06:15</strong> – Khai mạc chương trình
              </Text>
              <Text style={timeline}>
                <strong>06:30</strong> – Nhóm 5–6 tuổi xuất phát
              </Text>
              <Text style={timeline}>
                <strong>06:50</strong> – Nhóm 7–8 tuổi xuất phát
              </Text>
              <Text style={timeline}>
                <strong>07:10</strong> – Nhóm 9–10 tuổi xuất phát
              </Text>
              <Text style={timeline}>
                <strong>07:30</strong> – Nhóm 11–12 tuổi xuất phát
              </Text>
              <Text style={timeline}>
                <strong>08:00</strong> – Công khai ủng hộ & tổng kết chương
                trình
              </Text>
            </Section>

            <Section style={locationBox}>
              <Text style={locationTitle}>📍 Địa điểm</Text>
              <Text style={paragraph}>Sân vận động phường Hòa Khánh</Text>
              <Link
                href="https://maps.app.goo.gl/okSGn3RgA8EtVQqs8"
                style={mapLink}
              >
                Mở chỉ đường Google Maps
              </Link>
            </Section>

            <Heading as="h2" style={subheading}>
              Ba mẹ lưu ý
            </Heading>
            <Text style={note}>
              • Nhớ mang theo BIB chạy cho bé. BIB là cơ sở để tham gia và nhận
              medal khi hoàn thành.
            </Text>
            <Text style={note}>
              • Sau khi tập trung, ba mẹ vui lòng theo hướng dẫn của BTC để đưa
              bé về đúng khu vực nhóm tuổi.
            </Text>
            <Text style={note}>
              • Hãy xem kỹ sơ đồ Sân vận động trong poster để chủ động di chuyển
              khi đến sự kiện.
            </Text>

            <Section style={messageBox}>
              <Text style={message}>
                Mỗi em nhỏ hoàn thành một vòng chạy là thêm một bước chạy yêu
                thương được lan tỏa.
              </Text>
            </Section>

            <Text style={closing}>
              Hẹn gặp các runner nhí vào sáng <strong>23/08/2026</strong>!
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              Trân trọng,
              <br />
              Ban tổ chức Mid-Autumn Kids Run 2026
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f1f6f2",
  fontFamily: "Arial, sans-serif",
  margin: 0,
  padding: "24px 8px",
};
const container = {
  backgroundColor: "#ffffff",
  borderRadius: "12px",
  margin: "0 auto",
  maxWidth: "640px",
  overflow: "hidden" as const,
};
const image = {
  display: "block",
  height: "auto",
  maxWidth: "100%",
  width: "100%",
};
const content = { padding: "28px 24px" };
const eyebrow = {
  color: "#087240",
  fontSize: "14px",
  fontWeight: "700",
  letterSpacing: "1.4px",
  margin: "0 0 8px",
};
const heading = {
  color: "#064e2d",
  fontSize: "28px",
  lineHeight: "1.3",
  margin: "0 0 20px",
};
const subheading = {
  color: "#087240",
  fontSize: "20px",
  margin: "24px 0 12px",
};
const paragraph = {
  color: "#2d3d34",
  fontSize: "16px",
  lineHeight: "1.65",
  margin: "0 0 14px",
};
const timelineBox = {
  backgroundColor: "#f6f1c9",
  border: "1px solid #e4cf50",
  borderRadius: "10px",
  padding: "16px 18px",
};
const timeline = {
  color: "#263b2e",
  fontSize: "15px",
  lineHeight: "1.55",
  margin: "0 0 8px",
};
const locationBox = {
  backgroundColor: "#edf8f1",
  borderLeft: "4px solid #07834d",
  margin: "22px 0",
  padding: "16px",
};
const locationTitle = {
  color: "#075f37",
  fontSize: "18px",
  fontWeight: "700",
  margin: "0 0 6px",
};
const mapLink = {
  color: "#075f37",
  fontSize: "15px",
  fontWeight: "700",
  textDecoration: "underline",
};
const note = {
  color: "#2d3d34",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 10px",
};
const messageBox = {
  backgroundColor: "#075f37",
  borderRadius: "10px",
  margin: "24px 0",
  padding: "18px",
};
const message = {
  color: "#ffffff",
  fontSize: "16px",
  fontStyle: "italic",
  lineHeight: "1.6",
  margin: 0,
  textAlign: "center" as const,
};
const closing = {
  color: "#075f37",
  fontSize: "18px",
  lineHeight: "1.6",
  margin: "20px 0",
  textAlign: "center" as const,
};
const hr = { borderColor: "#dce7df", margin: "24px 0" };
const footer = {
  color: "#66756d",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: 0,
};
