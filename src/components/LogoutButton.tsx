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
      className="fixed top-4 right-4 flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="退出登录"
    >
      <ArrowRightOnRectangleIcon className="h-4 w-4" />
      <span className="hidden sm:inline">
        {isLoading ? '退出中...' : '退出'}
      </span>
    </button>
  );
} 