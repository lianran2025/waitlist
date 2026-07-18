'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      console.log('Starting logout...');
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Logout response status:', response.status);
      const data = await response.json();
      console.log('Logout response data:', data);

      if (response.ok && data.success) {
        console.log('Logout successful, redirecting to login...');
        // 强制清除所有可能的缓存
        window.location.href = '/login';
      } else {
        console.error('Logout failed:', data.message);
        alert('退出登录失败: ' + (data.message || '未知错误'));
      }
    } catch (error) {
      console.error('Logout error:', error);
      alert('退出登录出错: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="fixed right-3 top-3 z-40 flex items-center rounded-full bg-red-600 p-3 text-white shadow-lg transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:right-4 sm:top-4 sm:space-x-2 sm:rounded-lg sm:px-4 sm:py-2"
      title="退出登录"
      aria-label={isLoading ? '正在退出登录' : '退出登录'}
    >
      <ArrowRightOnRectangleIcon className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">
        {isLoading ? '退出中...' : '退出'}
      </span>
    </button>
  );
}
