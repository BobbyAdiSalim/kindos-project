import { RouterProvider } from 'react-router';
import { AuthProvider } from '@/app/lib/auth-context';
import { router } from '@/app/routes';
import { Toaster } from '@/app/components/ui/sonner';

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster />
    </AuthProvider>
  );
}
