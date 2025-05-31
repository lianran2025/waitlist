import Link from 'next/link';
import { DocumentTextIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-800">功能选择</h1>
      <div className="flex flex-col md:flex-row gap-4 md:gap-8 w-full max-w-3xl">
        <Link href="/new-project" className="block w-full max-w-xs mx-auto md:mx-0 p-6 md:p-8 rounded-xl shadow-lg bg-white hover:bg-blue-50 transition border border-gray-200 text-center">
          <div className="flex flex-col items-center">
            <DocumentTextIcon className="h-10 w-10 text-blue-500 mb-2" />
            <div className="text-lg md:text-xl font-semibold mb-1">证书生成工具</div>
            <div className="text-gray-500 text-sm md:text-base">批量生成证书、支持探头异常处理</div>
          </div>
        </Link>
        <Link href="/companies" className="block w-full max-w-xs mx-auto md:mx-0 p-6 md:p-8 rounded-xl shadow-lg bg-white hover:bg-blue-50 transition border border-gray-200 text-center">
          <div className="flex flex-col items-center">
            <BuildingOfficeIcon className="h-10 w-10 text-green-500 mb-2" />
            <div className="text-lg md:text-xl font-semibold mb-1">探头厂家信息列表</div>
            <div className="text-gray-500 text-sm md:text-base">管理和新增品牌及型号信息</div>
          </div>
        </Link>
      </div>
    </main>
  );
}
