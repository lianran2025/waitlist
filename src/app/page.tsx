import Link from 'next/link';
import { DocumentTextIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <h1 className="text-4xl font-bold mb-12 text-gray-800">功能选择</h1>
      <div className="flex gap-8">
        <Link 
          href="/new-project" 
          className="group relative block p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-white transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100 hover:border-blue-100 text-center w-80 transform hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors duration-300">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-xl font-semibold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
              证书生成工具
            </div>
            <div className="text-gray-500 group-hover:text-gray-600">
              批量生成证书、支持探头异常处理
            </div>
          </div>
        </Link>

        <Link 
          href="/companies" 
          className="group relative block p-8 rounded-2xl bg-white hover:bg-gradient-to-br hover:from-blue-50 hover:to-white transition-all duration-300 shadow-lg hover:shadow-xl border border-gray-100 hover:border-blue-100 text-center w-80 transform hover:-translate-y-1"
        >
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative">
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors duration-300">
                <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="text-xl font-semibold mb-2 text-gray-800 group-hover:text-blue-600 transition-colors duration-300">
              探头厂家信息列表
            </div>
            <div className="text-gray-500 group-hover:text-gray-600">
              管理和新增品牌及型号信息
            </div>
          </div>
        </Link>
      </div>
    </main>
  );
}
