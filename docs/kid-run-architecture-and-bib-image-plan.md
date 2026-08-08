# Kid Run: kiến trúc hiện tại và kế hoạch ảnh BIB

## Mục đích

Tài liệu này là bản lề kỹ thuật cho các thay đổi tiếp theo của luồng bán/đăng ký BIB Kid. Khi sửa tính năng, ưu tiên giữ nguyên ranh giới: trang công khai gọi API, API điều phối nghiệp vụ, Prisma giữ dữ liệu, lớp email chỉ dựng và gửi thông báo.

## Nền tảng và cấu trúc

- Next.js 16 App Router, React 18, TypeScript và Tailwind CSS 4.
- Prisma 6 quản lý dữ liệu; PostgreSQL được thể hiện qua SQL migration và truy vấn khóa quota.
- Email dựng bằng React Email, gửi qua lớp Gmail-first.
- QR check-in sinh ở server dưới dạng PNG/data URL.

Các điểm vào chính:

- `app/kid-run/[slug]/page.tsx`: landing, form đăng ký và màn hình success.
- `app/kid-run/[slug]/lookup/page.tsx`: tra cứu hồ sơ bằng email/điện thoại và mã bí mật.
- `app/api/kid-run-campaigns/[slug]/route.ts`: dữ liệu campaign công khai, quota và trạng thái mở.
- `app/api/kid-run-campaigns/[slug]/applications/route.ts`: validate, cấp BIB, tạo hồ sơ, QR và kích hoạt email.
- `lib/kid-run-service.ts`: mã hồ sơ, mã bí mật, token QR, nội dung chuyển khoản và nghiệp vụ thanh toán.
- `lib/kid-run-email.ts`: tải hồ sơ, dựng QR, gửi mail và ghi log.
- `emails/kid-run-registration.tsx`: template email đăng ký/BIB/thanh toán áo.
- `prisma/schema.prisma`: các model Kid Run từ `KidRunCampaign` đến email/webhook log.
- `app/admin/dashboard/kid-run`: quản trị campaign, phân nhóm, xuất dữ liệu, gửi BIB và check-in.

## Luồng đăng ký hiện tại

1. Trang tải campaign theo slug, chỉ lộ dữ liệu công khai và tính quota từ các nhóm đang hoạt động.
2. Người dùng nhập phụ huynh, một hoặc nhiều bé, áo tùy chọn, xem và chấp thuận waiver.
3. API kiểm tra email/điện thoại/ngày sinh/nhóm tuổi/quota/áo và waiver.
4. Transaction mức `Serializable` giảm quota theo nhóm bằng câu lệnh cập nhật có điều kiện, tăng số BIB kế tiếp, tạo hồ sơ, participant và áo.
5. Mỗi bé được cấp BIB ngay theo `bibPrefix + số 4 chữ số`.
6. API trả hồ sơ công khai, mã bí mật, QR check-in gia đình và thông tin thanh toán áo nếu có.
7. `after()` gửi email ngoài response; kết quả gửi được ghi vào `KidRunEmailLog`.
8. UI đổi tại chỗ sang màn hình success và tiếp tục polling trạng thái thanh toán áo mỗi 10 giây nếu cần.

## Nguyên tắc cần giữ

- Không cấp số BIB ở client; quota và số thứ tự chỉ được thay đổi trong transaction server.
- Không trả `secretCodeHash`, `bibQrToken`, IP hoặc user-agent ra client.
- Một hồ sơ có một QR nhận BIB gia đình; mỗi participant có một số BIB.
- Ảnh BIB là dữ liệu trình bày có thể tái tạo, không phải nguồn sự thật. Nguồn sự thật vẫn là participant, category và bibNumber trong DB.
- Email client không chạy JavaScript và hỗ trợ CSS hạn chế; ảnh gửi mail phải là URL HTTPS ổn định hoặc CID attachment.
- Không đưa data URL dung lượng lớn vào JSON response/email nếu có thể dùng URL ảnh đã render và cache.

## Kế hoạch hiển thị ảnh BIB trong email và trang success

### 1. Chốt đặc tả bốn mẫu

- Chuẩn bị 4 ảnh nền placeholder, một ảnh cho mỗi nhóm BIB; cùng kích thước và vùng an toàn.
- Lập mapping bằng `category.id` hoặc cấu hình trên `KidRunRaceCategory`, không dựa vào tên hiển thị có thể đổi.
- Chốt các trường phủ lên ảnh: số BIB (lớn nhất), họ tên bé, nhóm tuổi/cự ly, ngày sự kiện và mã hồ sơ nếu cần.
- Quy định fallback trung tính khi nhóm chưa có ảnh.

### 2. Mô hình dữ liệu và quản trị

- Khuyến nghị thêm `bibTemplateImageUrl` và `bibTemplateCloudinaryPublicId` vào `KidRunRaceCategory` để mỗi campaign tự cấu hình bốn mẫu.
- Bổ sung upload/xem trước trong admin Kid Run category và migration Prisma.
- API campaign công khai chỉ trả URL template cần cho preview; không trả public ID của nhà cung cấp ảnh.

### 3. Một bộ dựng dùng chung

- Tạo `lib/kid-run-bib-image.ts` nhận participant + campaign + category và trả PNG.
- Render server-side ở kích thước cố định; dùng font hỗ trợ đầy đủ tiếng Việt và tự co/cắt tên dài theo vùng an toàn.
- Tách một cấu hình tọa độ/màu/font cho từng template, tránh hard-code rải rác trong email và UI.
- Tạo khóa cache theo `template version + participant id + updatedAt` để ảnh chỉ render lại khi dữ liệu hoặc mẫu đổi.

### 4. Phân phối ảnh

- Phương án ưu tiên: render PNG, upload Cloudinary, lưu URL/version hoặc cache bền vững; email dùng URL HTTPS.
- Phương án dự phòng: gắn PNG bằng CID attachment tương tự QR hiện tại. Cần mở rộng `sendEmailGmailFirst` để hỗ trợ nhiều attachment định danh.
- Không dùng ảnh HTML-to-canvas ở browser làm nguồn chính vì email cần đúng cùng một kết quả và không nên phụ thuộc thiết bị người đăng ký.

### 5. Tích hợp success và email

- API tạo application trả `bibImageUrl` cho từng participant sau khi render; nếu render chậm, trả trạng thái và endpoint đọc ảnh có cache.
- Tách component `KidRunBibCard` để success hiển thị ảnh, thông tin text dự phòng và nút tải ảnh.
- Email `KidRunRegistrationEmail` hiển thị một ảnh BIB cho từng bé, có alt text chứa số BIB và giữ phần text bên dưới để email chặn ảnh vẫn đọc được.
- Luồng gửi lại BIB trong admin phải tái sử dụng đúng URL/bộ dựng, không có template riêng.

### 6. Độ tin cậy và kiểm thử

- Việc render/upload ảnh không được rollback hồ sơ đã đăng ký thành công; ghi log và cho phép retry.
- Kiểm thử đủ 4 nhóm, tên tiếng Việt dài, nhiều bé trong một hồ sơ, ảnh bị thiếu, email chặn ảnh và màn hình mobile.
- Kiểm tra kích thước email; mục tiêu mỗi ảnh được tối ưu hợp lý và tổng mail không vượt ngưỡng khiến Gmail cắt nội dung.
- Theo dõi lỗi render/upload/email trong log; admin có thao tác tạo lại và gửi lại.

## Thứ tự triển khai đề xuất

1. Chốt 4 asset, kích thước và vùng text.
2. Migration + màn hình cấu hình template theo nhóm.
3. Bộ dựng PNG dùng chung + cache/upload.
4. API trả ảnh participant và component success.
5. Template email + attachment/URL + luồng gửi lại.
6. Test bốn nhóm, mobile và các email client; triển khai có fallback text.

## Tiêu chí hoàn thành

- Cả bốn nhóm hiển thị đúng nền và dữ liệu động không tràn vùng an toàn.
- Ảnh trên success và email là cùng một phiên bản.
- Người dùng vẫn thấy số BIB/thông tin khi ảnh lỗi hoặc email chặn ảnh.
- Đăng ký không thất bại chỉ vì dịch vụ dựng/upload ảnh lỗi.
- Có thể đổi template theo campaign mà không sửa source code.
