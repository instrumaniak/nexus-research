import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/theme-toggle';
import { register, getErrorMessage } from '@/api/auth.api';

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ username, email, password });
      setSubmitted(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
        {submitted ? (
          <div className="flex flex-col items-center text-center py-4">
            <div className="w-[44px] h-[44px] rounded-full bg-success/10 flex items-center justify-center mb-5">
              <Check className="text-success" size={20} />
            </div>
            <h2 className="text-xl font-semibold mb-2">Request submitted</h2>
            <p className="text-sm text-foreground/80 leading-relaxed mb-6">
              Your account is <span className="font-medium text-warning">pending approval</span>. An
              administrator will review your request. You'll receive an email once approved.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>
              Back to Sign in
            </Button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1 mb-6">
              <h2 className="text-xl font-semibold">Create an account</h2>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-primary cursor-pointer hover:underline font-medium bg-transparent border-0 p-0"
                >
                  Sign in
                </button>
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-[13px] text-destructive">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  placeholder="alice"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full mt-2"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Requesting…
                  </span>
                ) : (
                  'Request access'
                )}
              </Button>
            </form>
          </>
        )}
      </div>

      <div className="mt-8">
        <ThemeToggle />
      </div>
    </div>
  );
}

export default RegisterPage;
