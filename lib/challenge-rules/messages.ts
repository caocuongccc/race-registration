import type { ChallengeRuleFailure } from "./engine";

function formatPace(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  return `${minutes}:${String(rounded % 60).padStart(2, "0")}/km`;
}

export function formatChallengeRuleFailureVi(failure: ChallengeRuleFailure): string {
  const details = failure.details ?? {};

  switch (failure.code) {
    case "OUTSIDE_EVENT_PERIOD":
      return "Hoạt động nằm ngoài thời gian diễn ra sự kiện.";
    case "NOT_ENROLLED_AT_ACTIVITY_START":
      return "Bạn không còn tham gia sự kiện tại thời điểm bắt đầu hoạt động.";
    case "ACTIVITY_TYPE_NOT_ALLOWED":
      return `Loại hoạt động ${String(details.sportType ?? "này")} không được sự kiện chấp nhận.`;
    case "MANUAL_ACTIVITY_NOT_ALLOWED":
      return "Hoạt động nhập thủ công không được ghi nhận.";
    case "OUTDOOR_ACTIVITY_REQUIRED":
      return "Sự kiện chỉ ghi nhận hoạt động chạy hoặc đi bộ ngoài trời.";
    case "GPS_REQUIRED":
      return "Hoạt động không có dữ liệu GPS.";
    case "GPS_STREAM_REQUIRED":
      return "Dữ liệu GPS chưa đủ chi tiết để xác minh tracklog.";
    case "HEART_RATE_REQUIRED":
      return "Hoạt động không có dữ liệu nhịp tim. Vui lòng kiểm tra thiết bị và quyền chia sẻ dữ liệu sức khỏe trên Strava.";
    case "HEART_RATE_STREAM_REQUIRED":
      return "Hoạt động chưa chia sẻ dữ liệu nhịp tim chi tiết.";
    case "DISTANCE_TOO_SHORT":
      return `Quãng đường ${Number(details.actualMeters ?? 0) / 1000} km ngắn hơn mức tối thiểu ${Number(details.minimumMeters ?? 0) / 1000} km.`;
    case "OUTSIDE_ALLOWED_TIME_WINDOW":
      return "Hoạt động bắt đầu hoặc kết thúc ngoài khung giờ được phép.";
    case "PACE_AVERAGE_TOO_FAST":
      return `Pace trung bình ${formatPace(Number(details.actualSecondsPerKm ?? 0))} nhanh hơn giới hạn.`;
    case "PACE_AVERAGE_TOO_SLOW":
      return `Pace trung bình ${formatPace(Number(details.actualSecondsPerKm ?? 0))} chậm hơn giới hạn.`;
    case "PACE_SPLIT_TOO_FAST":
      return `Km thứ ${details.split} có pace ${formatPace(Number(details.actualSecondsPerKm ?? 0))}, nhanh hơn giới hạn.`;
    case "PACE_SPLIT_TOO_SLOW":
      return `Km thứ ${details.split} có pace ${formatPace(Number(details.actualSecondsPerKm ?? 0))}, chậm hơn giới hạn.`;
  }
}

export function formatChallengeRuleFailuresVi(failures: ChallengeRuleFailure[]): string[] {
  return failures.map(formatChallengeRuleFailureVi);
}

