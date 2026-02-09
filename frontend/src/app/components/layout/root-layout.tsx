import React from 'react';
import { Outlet } from 'react-router';
import { Header } from '@/app/components/layout/header';

export function RootLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
