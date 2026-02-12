import React from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/app/components/ui/button';
import { useAuth } from '@/app/lib/auth-context';
import { User, LogOut, Menu } from 'lucide-react';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/app/components/ui/sheet';
import { ImageWithFallback } from '@/app/components/figma/ImageWithFallback';

interface HeaderProps {
  showAuth?: boolean;
}

export function Header({ showAuth = true }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const getDashboardLink = () => {
    if (!user) return '/';
    if (user.role === 'patient') return '/patient/dashboard';
    if (user.role === 'doctor') return '/doctor/dashboard';
    if (user.role === 'admin') return '/admin/dashboard';
    return '/';
  };

  const getProfileLink = () => {
    if (!user) return '/';
    if (user.role === 'patient') return '/patient/profile';
    if (user.role === 'doctor') return '/doctor/profile';
    return '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
        <Link to="/" className="flex items-center space-x-2">
          <ImageWithFallback
            src="https://utlwa.com/wp-content/uploads/2025/11/logo.png"
            alt="UTLWA Logo"
            className="h-8 w-auto"
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label="Open profile menu" className="gap-2 px-3">
                  <span className="max-w-32 truncate text-sm">{user.name}</span>
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-56 z-[70]">
                <DropdownMenuLabel className="font-medium">
                  {user.name}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pt-0">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={getDashboardLink()}>Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getProfileLink()}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : showAuth ? (
            <>
              <Link to="/login">
                <Button variant="ghost">Log in</Button>
              </Link>
              <Link to="/register">
                <Button>Register</Button>
              </Link>
            </>
          ) : null}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" aria-label="Open profile menu" className="gap-2 px-3">
                  <span className="max-w-24 truncate text-sm">{user.name}</span>
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-56 z-[70]">
                <DropdownMenuLabel className="font-medium">
                  {user.name}
                </DropdownMenuLabel>
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal pt-0">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={getDashboardLink()}>Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={getProfileLink()}>Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <nav className="flex flex-col gap-4 mt-8">
                  {showAuth ? (
                    <>
                      <Link to="/login">
                        <Button variant="ghost" className="w-full">
                          Log in
                        </Button>
                      </Link>
                      <Link to="/register">
                        <Button className="w-full">Register</Button>
                      </Link>
                    </>
                  ) : null}
                </nav>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  );
}
