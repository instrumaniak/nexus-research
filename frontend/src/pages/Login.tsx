import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuthStore } from '@/stores/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login('user@example.com', 'password');
    navigate('/chat');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-[370px] flex flex-col items-center mb-8">
        <div className="w-10 h-10 mb-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <span className="text-xl font-bold text-primary">N</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Nexus</h1>
        <p className="text-muted-foreground text-sm">AI Research Assistant</p>
      </div>

      <div className="w-full max-w-[370px] bg-card border border-border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col gap-1 mb-6">
          <h2 className="text-xl font-semibold">Sign in</h2>
          <p className="text-sm text-muted-foreground">
            No account?{' '}
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="text-primary cursor-pointer hover:underline font-medium bg-transparent border-0 p-0"
            >
              Request access
            </button>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="name@example.com" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <span className="text-xs text-muted-foreground cursor-pointer hover:underline hover:text-foreground">
                Forgot?
              </span>
            </div>
            <Input id="password" type="password" />
          </div>

          <Button type="submit" variant="default" size="lg" className="w-full mt-2">
            Sign in
          </Button>
        </form>
      </div>

      <div className="mt-8">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default LoginPage;
