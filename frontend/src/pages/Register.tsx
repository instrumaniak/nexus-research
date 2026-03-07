import { isAxiosError } from 'axios';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { register } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

export default function Register() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailPattern = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);

  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: Record<string, string> = {};
    if (!username.trim()) {
      nextErrors.username = 'Username is required';
    }
    if (!email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!emailPattern.test(email)) {
      nextErrors.email = 'Enter a valid email address';
    }
    if (!password.trim()) {
      nextErrors.password = 'Password is required';
    } else if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(nextErrors);
    setServerError(null);
    setSuccessMessage(null);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({ username, email, password });
      setSuccessMessage('Account created — awaiting admin approval');
      setUsername('');
      setEmail('');
      setPassword('');
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 409) {
        setServerError('Email or username already in use');
      } else {
        setServerError('Registration failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(135deg,_#0f172a,_#111827_50%,_#020617)] px-4 py-12 text-slate-50">
      <div className="mx-auto max-w-4xl rounded-[2rem] border border-slate-800 bg-slate-950/70 p-8 shadow-2xl shadow-amber-950/10 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Request access</p>
        <h1 className="mt-4 font-serif text-4xl">Create a Nexus account</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
          Registration creates a pending account. A superadmin must approve it before you can log
          in.
        </p>

        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit} noValidate>
          <Field
            id="username"
            label="Username"
            type="text"
            value={username}
            onChange={setUsername}
            error={errors.username}
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            error={errors.email}
          />
          <div className="md:col-span-2">
            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
            />
          </div>

          {serverError ? (
            <p className="md:col-span-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {serverError}
            </p>
          ) : null}
          {successMessage ? (
            <p className="md:col-span-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {successMessage}
            </p>
          ) : null}

          <div className="md:col-span-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-full bg-amber-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? 'Submitting...' : 'Create account'}
            </button>

            <p className="text-sm text-slate-400">
              Already approved?{' '}
              <Link to="/login" className="font-medium text-amber-200 hover:text-amber-100">
                Log in
              </Link>
            </p>
          </div>
        </form>
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
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none transition placeholder:text-slate-600 focus:border-amber-300"
      />
      {error ? <span className="mt-2 block text-sm text-rose-300">{error}</span> : null}
    </label>
  );
}
