import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface DistanceDetail {
  distanceId: string;
  distanceName: string;
  bibPrefix: string;
  price: number;
  total: number;
  paid: number;
  pending: number;
  failed: number;
  paidPercentage: number;
  totalRevenue: number;
}

interface Props {
  distanceDetails: DistanceDetail[];
}

export function DistanceDetailsTable({ distanceDetails }: Props) {
  if (!distanceDetails || distanceDetails.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📊 Chi tiết theo cự ly</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-500 py-8">
            Chưa có dữ liệu đăng ký
          </p>
        </CardContent>
      </Card>
    );
  }

  const totals = distanceDetails.reduce(
    (acc, d) => ({
      total: acc.total + d.total,
      paid: acc.paid + d.paid,
      pending: acc.pending + d.pending,
      failed: acc.failed + d.failed,
      totalRevenue: acc.totalRevenue + d.paid * d.price,
    }),
    { total: 0, paid: 0, pending: 0, failed: 0, totalRevenue: 0 },
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>📊 Chi tiết theo cự ly</span>
          <span className="text-sm font-normal text-gray-600">
            Chỉ đếm đăng ký đã thanh toán
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Cự ly
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  BIB Prefix
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Giá
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                  Thành Tiền
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-600" />
                    Đã TT
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-yellow-600" />
                    Chờ
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  <div className="flex items-center justify-center gap-1">
                    <XCircle className="w-3 h-3 text-red-600" />
                    Lỗi
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  Tổng
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                  % Đã TT
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {distanceDetails.map((distance) => (
                <tr key={distance.distanceId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {distance.distanceName}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <code className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-mono">
                      {distance.bibPrefix}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {formatCurrency(distance.price)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-gray-700">
                    {formatCurrency(distance.price * distance.paid)}
                  </td>
                  {/* Paid */}
                  <td className="px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                      <CheckCircle className="w-3 h-3" />
                      {distance.paid}
                    </span>
                  </td>

                  {/* Pending */}
                  <td className="px-4 py-3 text-center">
                    {distance.pending > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold">
                        <Clock className="w-3 h-3" />
                        {distance.pending}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Failed */}
                  <td className="px-4 py-3 text-center">
                    {distance.failed > 0 ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-semibold">
                        <XCircle className="w-3 h-3" />
                        {distance.failed}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-center">
                    <span className="text-lg font-bold text-gray-900">
                      {distance.total}
                    </span>
                  </td>

                  {/* Percentage */}
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${distance.paidPercentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
                        {distance.paidPercentage}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Totals Row */}
              <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                <td className="px-4 py-3 text-gray-900" colSpan={3}>
                  TỔNG CỘNG
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold">
                    <CheckCircle className="w-3 h-3" />
                    {totals.totalRevenue > 0
                      ? formatCurrency(totals.totalRevenue)
                      : "0đ"}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-bold">
                    <CheckCircle className="w-3 h-3" />
                    {totals.paid}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-200 text-yellow-800 rounded-full text-sm font-bold">
                    <Clock className="w-3 h-3" />
                    {totals.pending}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {totals.failed > 0 ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-200 text-red-800 rounded-full text-sm font-bold">
                      <XCircle className="w-3 h-3" />
                      {totals.failed}
                    </span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-xl font-bold text-blue-900">
                    {totals.total}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-bold text-blue-900">
                    {totals.total > 0
                      ? Math.round((totals.paid / totals.total) * 100)
                      : 0}
                    %
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
