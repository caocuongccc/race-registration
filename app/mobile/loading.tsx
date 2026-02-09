// app/mobile/loading.tsx - Global Loading for Mobile
import { Loader2 } from "lucide-react";

export default function MobileLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Đang tải...</p>
      </div>
    </div>
  );
}
