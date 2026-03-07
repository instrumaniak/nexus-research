import { isAxiosError } from 'axios';
import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { login } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export default function Login() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const storeLogin = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }

    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    }

    setErrors(nextErrors);
    setServerError(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await login({
        email,
        password,
      });

      storeLogin(response.accessToken, response.user);
      navigate('/chat');
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          setServerError('Invalid email or password');
        } else if (
          error.response?.status === 403 &&
          error.response?.data &&
          typeof error.response.data === 'object'
        ) {
          const message = (error.response.data as { message?: string }).message;
          if (message === 'Account pending approval') {
            setServerError('Your account is pending approval');
          } else if (message === 'Account suspended') {
            setServerError('Your account has been suspended');
          } else {
            setServerError(message ?? 'Login failed');
          }
        } else {
          setServerError('Login failed');
        }
      } else {
        setServerError('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Continue your research sessions"
      subtitle="Use your approved Nexus account to resume web-search chat and session history."
    >
      <form className="space-y-5" onSubmit={handleSubmit} noValidate>
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <Field
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />

        {serverError ? (
          <p className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {serverError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Signing in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-sm text-slate-400">
        Need access?{' '}
        <Link to="/register" className="font-medium text-cyan-300 hover:text-cyan-200">
          Request an account
        </Link>
      </p>
    </AuthShell>
  );
}

function AuthShell({
  children,
  eyebrow,
  title,
  subtitle,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_30%),linear-gradient(135deg,_#020617,_#111827_55%,_#1e293b)] px-4 py-12 text-slate-50">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-slate-800 bg-slate-950/60 p-8 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Nexus</p>
          <h1 className="mt-5 max-w-xl font-serif text-5xl leading-tight">
            Research the web with saved context, approvals, and live SSE output.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Phase 1 ships a disciplined core: email auth, approval-gated access, web search chat,
            and session history for every answer.
          </p>
        </section>

        <section className="rounded-[2rem] border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-950/10 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{eyebrow}</p>
          <h2 className="mt-3 font-serif text-3xl">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </section>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <label className="block" htmlFor={id}>
      <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-cyan-400"
      />
      {error ? <span className="mt-2 block text-sm text-rose-300">{error}</span> : null}
    </label>
  );
}
