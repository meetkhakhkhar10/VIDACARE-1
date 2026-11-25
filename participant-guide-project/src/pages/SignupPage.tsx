import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  HeartHandshake,
  Stethoscope,
  X,
} from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import { authService } from '../services/authService';
import { AuthSplitLayout } from '../components/AuthSplitLayout';
import { OtpVerificationCard } from '../components/OtpVerificationCard';
import { GlassSurface, VidaButton } from '../components/ui/DesignPrimitives';

type SignupStep = 'form' | 'otp' | 'success';
type RegistrationRole = 'Donor' | 'Patient/Fundraiser';

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

const inputCls =
  'vc-input';

const inputPwCls =
  'min-h-[44px] w-full rounded-xl border-[1.5px] border-[rgba(18,60,53,0.2)] bg-white pr-10 pl-3.5 text-sm text-[#202B29] placeholder:text-[#9BAAA5] focus:border-[#159B79] focus:outline-none focus:ring-2 focus:ring-[#159B79]/15 transition-colors';

const labelCls = 'text-xs font-semibold text-[#3D5450]';

export const SignupPage: React.FC = () => {
  const { isEmailRegistered, registerAccount, getDashboardPathForRole } =
    useVidaCare();
  const navigate = useNavigate();

  const [step, setStep] = useState<SignupStep>('form');
  const [role, setRole] = useState<RegistrationRole>('Donor');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    mobile?: string;
    password?: string;
    confirmPassword?: string;
    terms?: string;
    form?: string;
  }>({});

  const strength = evaluateStrength(password);

  const validateSignup = (): boolean => {
    const nextErrors: typeof errors = {};

    if (!fullName.trim() || fullName.trim().length < 2) {
      nextErrors.fullName = 'Please enter your full name.';
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      nextErrors.email = 'Please enter a valid email address.';
    } else if (isEmailRegistered(cleanEmail)) {
      nextErrors.email =
        'This email is already registered. Please sign in instead.';
    }

    const digitsOnly = mobile.replace(/[\s\-()+]/g, '');
    if (digitsOnly.length < 10 || digitsOnly.length > 13 || !/^\d+$/.test(digitsOnly)) {
      nextErrors.mobile = 'Please enter a valid 10-digit mobile number.';
    }

    if (password.length < 8) {
      nextErrors.password = 'Password must be at least 8 characters long.';
    } else if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      nextErrors.password =
        'Include at least one letter and one number for basic strength.';
    }

    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptedTerms) {
      nextErrors.terms = 'Please accept the Terms and Conditions to continue.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateSignup()) return;
    setStep('otp');
  };

  const handleOtpVerified = async () => {
    // Attempt registration with backend service
    try {
      await authService.userRegister(fullName, email, mobile, password, role);
    } catch {
      // Continue to local sync
    }

    const res = registerAccount({
      fullName,
      email,
      phone: mobile,
      password,
      role,
    });

    if (!res.ok || !res.user) {
      setErrors({ form: res.error || 'Could not complete registration.' });
      setStep('form');
      return;
    }

    setStep('success');
  };

  return (
    <AuthSplitLayout
      eyebrow="Join VidaCare"
      headline="Together, We Make Healing Possible."
      description="Register as a compassionate donor or a patient family starting a verified medical care fund."
      imageUrl="/src/assets/images/campaign_neuro_rehab_1795448745124.jpg"
      imageAlt="Healthcare therapist walking beside a recovering patient in a rehabilitation studio"
    >
      <div className="w-full rounded-2xl bg-white border border-[rgba(18,60,53,0.1)] shadow-[0_4px_24px_-4px_rgba(18,60,53,0.1)] p-7 sm:p-10">
        {step === 'form' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Create Account
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Get Started with VidaCare
              </h1>
              <p className="text-sm text-[#71807A]">
                Choose your role and verify with our simulated OTP step.
              </p>
            </div>

            {errors.form && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                <span>{errors.form}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} noValidate className="flex flex-col gap-4">
              {/* Role Selector */}
              <div className="flex flex-col gap-2">
                <span className={labelCls}>Register As</span>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setRole('Donor')}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                      role === 'Donor'
                        ? 'border-[#159B79] bg-[#DDF3E9]/60'
                        : 'border-[rgba(18,60,53,0.15)] bg-white hover:border-[#159B79]/40 hover:bg-[#DDF3E9]/20'
                    }`}
                  >
                    <HeartHandshake
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        role === 'Donor' ? 'text-[#159B79]' : 'text-[#71807A]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${role === 'Donor' ? 'text-[#123C35]' : 'text-[#202B29]'}`}>Donor</p>
                      <p className="text-[11px] text-[#71807A]">
                        Support patients &amp; track receipts
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('Patient/Fundraiser')}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                      role === 'Patient/Fundraiser'
                        ? 'border-[#123C35] bg-[#DDF3E9]/60'
                        : 'border-[rgba(18,60,53,0.15)] bg-white hover:border-[#123C35]/40 hover:bg-[#DDF3E9]/20'
                    }`}
                  >
                    <Stethoscope
                      className={`mt-0.5 h-4 w-4 shrink-0 ${
                        role === 'Patient/Fundraiser'
                          ? 'text-[#123C35]'
                          : 'text-[#71807A]'
                      }`}
                      aria-hidden="true"
                    />
                    <div>
                      <p className={`text-sm font-semibold ${role === 'Patient/Fundraiser' ? 'text-[#123C35]' : 'text-[#202B29]'}`}>
                        Patient / Fundraiser
                      </p>
                      <p className="text-[11px] text-[#71807A]">
                        Raise verified medical funds
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label htmlFor="signup-name" className={labelCls}>
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder="Jordan Avery"
                    className={inputCls}
                  />
                  {errors.fullName && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-email" className={labelCls}>
                    Email Address
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder="name@example.com"
                    className={inputCls}
                  />
                  {errors.email && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {errors.email}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-mobile" className={labelCls}>
                    Mobile Number
                  </label>
                  <input
                    id="signup-mobile"
                    type="tel"
                    value={mobile}
                    onChange={(e) => {
                      setMobile(e.target.value);
                      if (errors.mobile) setErrors((p) => ({ ...p, mobile: undefined }));
                    }}
                    placeholder="+91 98765 43210"
                    className={`${inputCls} font-mono`}
                  />
                  {errors.mobile && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {errors.mobile}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-password" className={labelCls}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password) setErrors((p) => ({ ...p, password: undefined }));
                      }}
                      placeholder="Min 8 chars, letters & numbers"
                      className={inputPwCls}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute top-1/2 right-2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#71807A] hover:text-[#123C35] transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" aria-hidden="true" />
                      ) : (
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {password && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="grid flex-1 grid-cols-4 gap-1">
                        {[1, 2, 3, 4].map((stepIdx) => (
                          <span
                            key={stepIdx}
                            className={`h-1.5 rounded-full ${
                              stepIdx <= strength.score
                                ? strength.colorClass
                                : 'bg-[#DDF3E9]'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-[#71807A]">
                        {strength.label}
                      </span>
                    </div>
                  )}

                  {errors.password && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {errors.password}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="signup-confirm" className={labelCls}>
                    Confirm Password
                  </label>
                  <input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword) {
                        setErrors((p) => ({ ...p, confirmPassword: undefined }));
                      }
                    }}
                    placeholder="Re-enter password"
                    className={inputCls}
                  />
                  {errors.confirmPassword && (
                    <p role="alert" className="text-xs text-red-600 font-medium">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="inline-flex cursor-pointer items-start gap-2.5 text-xs text-[#71807A]">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (errors.terms) setErrors((p) => ({ ...p, terms: undefined }));
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-[#159B79]/40 bg-white text-[#159B79] focus:ring-[#159B79]/20 accent-[#159B79]"
                  />
                  <span>
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTermsModal(true)}
                      className="font-semibold text-[#159B79] underline underline-offset-2 hover:text-[#123C35]"
                    >
                      VidaCare Terms and Conditions
                    </button>{' '}
                    and acknowledge this is a frontend mock authentication preview.
                  </span>
                </label>
                {errors.terms && (
                  <p role="alert" className="text-xs text-red-600 font-medium">
                    {errors.terms}
                  </p>
                )}
              </div>

              <VidaButton type="submit" variant="primary" className="mt-1 w-full">
                Create Account
              </VidaButton>
            </form>

            <p className="border-t vc-hairline pt-4 text-center text-xs text-[#71807A]">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#159B79] transition-colors hover:text-[#123C35]"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}

        {step === 'otp' && (
          <OtpVerificationCard
            title="Verify Your Contact"
            subtitle="Complete your simulated OTP check for"
            destinationLabel={`${email} · ${mobile}`}
            verifyLabel="Verify & Complete Signup"
            onBack={() => setStep('form')}
            onVerified={handleOtpVerified}
          />
        )}

        {step === 'success' && (
          <div className="flex flex-col items-start gap-5 py-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#DDF3E9] bg-[#DDF3E9] text-[#159B79]">
              <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
                Account Created
              </p>
              <h1 className="font-display text-3xl font-bold text-[#123C35]">
                Welcome to VidaCare, {fullName}.
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[#71807A]">
              Your <span className="font-semibold text-[#123C35]">{role}</span>{' '}
              demo account is saved in LocalStorage and signed in. Continue to
              your personalized dashboard.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <VidaButton
                type="button"
                variant="primary"
                onClick={() => navigate(getDashboardPathForRole(role))}
              >
                Go to {role === 'Patient/Fundraiser' ? 'Fundraiser' : 'Donor'}{' '}
                Dashboard
              </VidaButton>
              <VidaButton to="/campaigns" variant="secondary">
                Browse Campaigns
              </VidaButton>
            </div>
          </div>
        )}
      </div>

      {/* Terms Modal — light themed */}
      {showTermsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#123C35]/40 p-4 backdrop-blur-sm"
          onClick={() => setShowTermsModal(false)}
        >
          <GlassSurface className="w-full max-w-lg p-6 sm:p-8">
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex flex-col gap-4"
            >
              <div className="flex items-start justify-between gap-4 border-b vc-hairline pb-3">
                <h2
                  id="terms-modal-title"
                  className="font-display text-xl font-bold text-[#123C35]"
                >
                  VidaCare Preview Terms &amp; Conditions
                </h2>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(false)}
                  aria-label="Close terms dialog"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(18,60,53,0.15)] text-[#71807A] hover:text-[#123C35] hover:bg-[#DDF3E9] transition-colors"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <p className="text-sm leading-relaxed text-[#71807A]">
                VidaCare is currently running in frontend-only simulation mode.
                Demo accounts, OTP checks, and mock donations are stored in your
                browser's LocalStorage solely for interface verification. No real
                SMS, email verification, or financial transactions occur.
              </p>
              <div className="flex justify-end pt-2">
                <VidaButton
                  type="button"
                  variant="primary"
                  onClick={() => {
                    setAcceptedTerms(true);
                    setShowTermsModal(false);
                  }}
                >
                  Accept &amp; Close
                </VidaButton>
              </div>
            </div>
          </GlassSurface>
        </div>
      )}
    </AuthSplitLayout>
  );
};
