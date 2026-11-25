import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  RotateCcw,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { authService } from '../services/authService';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { OtpVerificationCard } from '../components/OtpVerificationCard';
import { GlassSurface, VidaButton } from '../components/ui/DesignPrimitives';

type LoginFlowMode = 'login' | 'forgot' | 'otp' | 'reset' | 'reset-success';

interface LoginPageProps {
  initialMode?: 'login' | 'forgot';
}

function evaluateStrength(pw: string): {
  label: string;
  score: number;
  colorClass: string;
} {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;

  if (pw.length === 0) return { label: '', score: 0, colorClass: 'bg-[#DDF3E9]' };
  if (score <= 1) return { label: 'Weak', score: 1, colorClass: 'bg-red-400' };
  if (score === 2) return { label: 'Fair', score: 2, colorClass: 'bg-amber-400' };
  if (score === 3) return { label: 'Good', score: 3, colorClass: 'bg-[#159B79]' };
  return { label: 'Strong', score: 4, colorClass: 'bg-[#123C35]' };
}

// Shared input class — light themed
const inputCls =
  'vc-input';

const inputPwCls =
  'min-h-[44px] w-full rounded-xl border-[1.5px] border-[rgba(18,60,53,0.2)] bg-white pr-11 pl-3.5 text-sm text-[#202B29] placeholder:text-[#9BAAA5] focus:border-[#159B79] focus:outline-none focus:ring-2 focus:ring-[#159B79]/15 transition-colors';

const labelCls = 'text-xs font-semibold text-[#3D5450]';

export const LoginPage: React.FC<LoginPageProps> = ({ initialMode = 'login' }) => {
  const {
    rememberedIdentifier,
    authenticateMock,
    findAccountByIdentifier,
    updateAccountPasswordMock,
    getDashboardPathForRole,
    signInMock,
    resetDemoStore,
  } = useVidaCare();
  const navigate = useNavigate();

  const [mode, setMode] = useState<LoginFlowMode>(initialMode);

  useEffect(() => {
    setMode(initialMode);
    setLoginError('');
    setLoginSuccess('');
    setRecoveryError('');
    setResetError('');
  }, [initialMode]);

  // Login form state
  const [identifier, setIdentifier] = useState<string>(rememberedIdentifier);
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(
    Boolean(rememberedIdentifier)
  );
  const [loginError, setLoginError] = useState<string>('');
  const [loginSuccess, setLoginSuccess] = useState<string>('');

  // Forgot & Reset state
  const [recoveryIdentifier, setRecoveryIdentifier] = useState<string>('');
  const [recoveryError, setRecoveryError] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmNewPassword, setConfirmNewPassword] = useState<string>('');
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [resetError, setResetError] = useState<string>('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginSuccess('');

    const trimmedId = identifier.trim();
    if (!trimmedId) {
      setLoginError('Please enter your registered email address or mobile number.');
      return;
    }

    const isEmailAttempt = trimmedId.includes('@');
    if (isEmailAttempt && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedId)) {
      setLoginError('Please enter a valid email address.');
      return;
    }
    if (!isEmailAttempt) {
      const digits = trimmedId.replace(/[\s\-()+]/g, '');
      if (digits.length < 10 || !/^\d+$/.test(digits)) {
        setLoginError('Please enter a valid email address or 10-digit mobile number.');
        return;
      }
    }

    if (!password || password.length < 6) {
      setLoginError('Please enter your password (at least 6 characters).');
      return;
    }

    // Attempt authentication via Google Apps Script Backend service
    try {
      const isAdminAttempt = trimmedId.toLowerCase() === 'admin@vidacare.org';
      const apiRes = isAdminAttempt
        ? await authService.adminLogin(trimmedId, password)
        : await authService.userLogin(trimmedId, password);

      if (apiRes.success && apiRes.data) {
        if (isAdminAttempt) {
          const admin = (apiRes.data as any).admin;
          signInMock(admin || { email: trimmedId, role: 'Admin' }, 'Admin');
          navigate('/admin', { replace: true });
          return;
        } else {
          const userData = (apiRes.data as any).user;
          signInMock(userData || { email: trimmedId }, userData?.role || 'Donor');
          const dest = getDashboardPathForRole(userData?.role || 'Donor');
          navigate(dest, { replace: true });
          return;
        }
      }
    } catch {
      // Fall back to local mock auth
    }

    // Local mock auth fallback
    const result = authenticateMock(trimmedId, password, rememberMe);
    if (!result.ok) {
      setLoginError(result.error || 'Invalid credentials. Please try again.');
      return;
    }
    setLoginSuccess('Sign-in successful. Redirecting to your dashboard…');
    const dest = getDashboardPathForRole(result.user?.role);
    setTimeout(() => navigate(dest, { replace: true }), 400);
  };

  const handleDemoFill = (demoEmail: string, demoPassword: string) => {
    setIdentifier(demoEmail);
    setPassword(demoPassword);
    setLoginError('');
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');
    const trimmed = recoveryIdentifier.trim();
    if (!trimmed) {
      setRecoveryError('Please enter your registered email or mobile number.');
      return;
    }
    const found = findAccountByIdentifier(trimmed);
    if (!found) {
      setRecoveryError(
        'No demo account found for that email or mobile number. Try a demo login or create an account.'
      );
      return;
    }
    setMode('otp');
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (newPassword.length < 8) {
      setResetError('New password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setResetError('Include at least one letter and one number.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    const res = updateAccountPasswordMock(recoveryIdentifier, newPassword);
    if (!res.ok) {
      setResetError(res.error || 'Unable to update password.');
      return;
    }

    setNewPassword('');
    setConfirmNewPassword('');
    setMode('reset-success');
  };

  const newStrength = evaluateStrength(newPassword);

  return (
    <AuthSplitLayout
      eyebrow="VidaCare Portal"
      headline="Compassionate Care Starts With Connection."
      description="Sign in to manage verified medical fundraisers, follow patient recovery updates, or track your community contributions."
      imageUrl="/src/assets/images/campaign_oncology_support_1795448744973.jpg"
      imageAlt="Patient and supportive family member beside a peaceful hospital garden window"
    >
      <div className="w-full rounded-2xl bg-white border border-[rgba(18,60,53,0.1)] shadow-[0_4px_24px_-4px_rgba(18,60,53,0.1)] p-7 sm:p-10">
        {mode === 'login' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Member Sign In
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Welcome Back to VidaCare
              </h1>
              <p className="text-sm text-[#71807A]">
                Sign in with your email address or mobile number.
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="login-identifier"
                  className={labelCls}
                >
                  Email or Mobile Number
                </label>
                <input
                  id="login-identifier"
                  type="text"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="name@example.com or +91 98765 00112"
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="login-password"
                    className={labelCls}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryIdentifier(identifier);
                      setRecoveryError('');
                      setMode('forgot');
                    }}
                    className="text-xs font-semibold text-[#159B79] transition-colors hover:text-[#123C35]"
                  >
                    Forgot Password?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="Enter your password"
                    className={inputPwCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#71807A] hover:text-[#123C35] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs text-[#71807A]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-[#159B79]/40 bg-white text-[#159B79] focus:ring-[#159B79]/20 accent-[#159B79]"
                />
                <span className="font-medium">Remember me on this device</span>
              </label>

              {loginError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccess && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-[#159B79]/30 bg-[#DDF3E9] p-3 text-xs text-[#123C35] font-medium"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#159B79]" aria-hidden="true" />
                  <span>{loginSuccess}</span>
                </div>
              )}

              <VidaButton type="submit" variant="primary" className="mt-1 w-full">
                Sign In
              </VidaButton>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="rounded-xl border border-[rgba(18,60,53,0.12)] bg-[#F0FCF8] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold text-[#71807A] uppercase tracking-wide">
                  Demo Mock Accounts (Frontend Preview Only)
                </p>
                <button
                  type="button"
                  onClick={() => {
                    resetDemoStore();
                    setIdentifier('');
                    setPassword('');
                    setRememberMe(false);
                    setLoginError('');
                    setLoginSuccess(
                      'Demo LocalStorage restored to initial sample records.'
                    );
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#71807A] transition-colors hover:text-[#123C35]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset Demo Data</span>
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoFill('donor@vidacare.org', 'CareDonor@2026')}
                  className="rounded-lg border border-[#159B79]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#159B79] transition-colors hover:bg-[#DDF3E9] hover:border-[#159B79]/60"
                >
                  Donor Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('elena@vidacare.org', 'MayaCare@2026')}
                  className="rounded-lg border border-[#123C35]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#123C35] transition-colors hover:bg-[#DDF3E9] hover:border-[#123C35]/60"
                >
                  Patient/Fundraiser Demo
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoFill('admin@vidacare.org', 'VidaAdmin@2026')}
                  className="rounded-lg border border-amber-500/30 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-50 hover:border-amber-500/60"
                >
                  Admin Demo
                </button>
              </div>
            </div>

            <p className="border-t vc-hairline pt-4 text-center text-xs text-[#71807A]">
              Don't have an account yet?{' '}
              <Link
                to="/signup"
                className="font-semibold text-[#159B79] transition-colors hover:text-[#123C35]"
              >
                Create Account
              </Link>
            </p>
          </div>
        )}

        {mode === 'forgot' && (
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#71807A] transition-colors hover:text-[#123C35]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Back to Login</span>
            </button>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Account Recovery
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Forgot Password
              </h1>
              <p className="text-sm text-[#71807A]">
                Enter your registered email or mobile number to start simulated
                OTP password recovery.
              </p>
            </div>

            <form onSubmit={handleForgotSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="forgot-identifier"
                  className={labelCls}
                >
                  Registered Email or Mobile Number
                </label>
                <input
                  id="forgot-identifier"
                  type="text"
                  value={recoveryIdentifier}
                  onChange={(e) => {
                    setRecoveryIdentifier(e.target.value);
                    if (recoveryError) setRecoveryError('');
                  }}
                  placeholder="donor@vidacare.org"
                  className={inputCls}
                />
              </div>

              {recoveryError && (
                <p role="alert" className="text-xs text-red-600 font-medium">
                  {recoveryError}
                </p>
              )}

              <VidaButton type="submit" variant="primary" className="w-full">
                Send Simulated Recovery OTP
              </VidaButton>
            </form>
          </div>
        )}

        {mode === 'otp' && (
          <OtpVerificationCard
            title="Verify Recovery Code"
            subtitle="Enter the simulated verification code for"
            destinationLabel={recoveryIdentifier}
            verifyLabel="Verify & Reset Password"
            onBack={() => setMode('forgot')}
            onVerified={() => setMode('reset')}
          />
        )}

        {mode === 'reset' && (
          <div className="flex flex-col gap-5">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#71807A] transition-colors hover:text-[#123C35]"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Cancel Reset</span>
            </button>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Create New Password
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Reset Password
              </h1>
              <p className="text-sm text-[#71807A]">
                Choose a new password for{' '}
                <span className="font-semibold text-[#202B29]">
                  {recoveryIdentifier}
                </span>
                .
              </p>
            </div>

            <form onSubmit={handleResetSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="reset-pw" className={labelCls}>
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="reset-pw"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value);
                      if (resetError) setResetError('');
                    }}
                    placeholder="At least 8 characters with letters & numbers"
                    className={inputPwCls}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((s) => !s)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    className="absolute top-1/2 right-2.5 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#71807A] hover:text-[#123C35] transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                </div>

                {newPassword && (
                  <div className="mt-1 flex items-center gap-2">
                    <div className="grid flex-1 grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <span
                          key={step}
                          className={`h-1.5 rounded-full ${
                            step <= newStrength.score
                              ? newStrength.colorClass
                              : 'bg-[#DDF3E9]'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-semibold text-[#71807A]">
                      {newStrength.label}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="reset-confirm-pw"
                  className={labelCls}
                >
                  Confirm New Password
                </label>
                <input
                  id="reset-confirm-pw"
                  type={showNewPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={(e) => {
                    setConfirmNewPassword(e.target.value);
                    if (resetError) setResetError('');
                  }}
                  placeholder="Re-enter new password"
                  className={inputCls}
                />
              </div>

              {resetError && (
                <p role="alert" className="text-xs text-red-600 font-medium">
                  {resetError}
                </p>
              )}

              <VidaButton type="submit" variant="primary" className="w-full">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                <span>Update Password</span>
              </VidaButton>
            </form>
          </div>
        )}

        {mode === 'reset-success' && (
          <div className="flex flex-col items-start gap-5 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#DDF3E9] bg-[#DDF3E9] text-[#159B79]">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Password Updated
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Your demo password has been reset.
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[#71807A]">
              Your updated credential is saved in shared LocalStorage. You can
              now sign in with your new password.
            </p>
            <VidaButton
              type="button"
              variant="primary"
              onClick={() => {
                setIdentifier(recoveryIdentifier);
                setPassword('');
                setMode('login');
              }}
            >
              Return to Login
            </VidaButton>
          </div>
        )}
      </div>
    </AuthSplitLayout>
  );
};
