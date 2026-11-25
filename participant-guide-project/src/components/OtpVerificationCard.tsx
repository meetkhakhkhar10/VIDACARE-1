import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { VidaButton } from './ui/DesignPrimitives';

interface OtpVerificationCardProps {
  title: string;
  subtitle: string;
  destinationLabel: string;
  onVerified: () => void;
  onBack: () => void;
  verifyLabel?: string;
}

function generateDemoOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export const OtpVerificationCard: React.FC<OtpVerificationCardProps> = ({
  title,
  subtitle,
  destinationLabel,
  onVerified,
  onBack,
  verifyLabel = 'Verify Code',
}) => {
  const [simulatedCode, setSimulatedCode] = useState<string>(generateDemoOtp);
  const [otpInput, setOtpInput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [resendNotice, setResendNotice] = useState<string>('');
  const [cooldown, setCooldown] = useState<number>(30);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const verifiedLockRef = useRef<boolean>(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const handleResend = () => {
    const next = generateDemoOtp();
    verifiedLockRef.current = false;
    setIsVerifying(false);
    setSimulatedCode(next);
    setOtpInput('');
    setError('');
    setResendNotice(`New simulated code generated: ${next}`);
    setCooldown(30);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifiedLockRef.current || isVerifying) return;
    const cleaned = otpInput.trim();
    if (!/^\d{6}$/.test(cleaned)) {
      setError('Please enter the 6-digit numeric verification code.');
      return;
    }
    if (cleaned !== simulatedCode && cleaned !== '123456') {
      setError('Invalid simulated OTP code. Check the preview code shown above.');
      return;
    }
    verifiedLockRef.current = true;
    setIsVerifying(true);
    setError('');
    onVerified();
  };

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-semibold text-[#71807A] transition-colors hover:text-[#123C35]"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Back</span>
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.14em] text-[#159B79] uppercase">
          Simulated OTP Verification
        </p>
        <h1 className="font-display text-3xl font-bold text-[#123C35]">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-[#71807A]">
          {subtitle}{' '}
          <span className="font-semibold text-[#202B29]">{destinationLabel}</span>
        </p>
      </div>

      {/* Explicit Frontend Simulation Notice */}
      <div className="rounded-xl border border-[#159B79]/30 bg-[#DDF3E9]/60 p-4 text-xs leading-relaxed">
        <div className="flex items-start gap-2.5">
          <ShieldAlert
            className="mt-0.5 h-4 w-4 shrink-0 text-[#159B79]"
            aria-hidden="true"
          />
          <div className="flex flex-1 flex-col gap-2 text-[#123C35]">
            <p>
              <strong>Frontend Demo Simulation:</strong> No real SMS or email
              is sent. Enter simulated code{' '}
              <span className="font-mono font-bold bg-[#DDF3E9] px-1.5 py-0.5 rounded text-[#123C35]">
                {simulatedCode}
              </span>{' '}
              (or <span className="font-mono font-semibold">123456</span>).
            </p>
            <div>
              <button
                type="button"
                onClick={() => {
                  setOtpInput(simulatedCode);
                  setError('');
                }}
                className="rounded-lg border border-[#159B79]/40 bg-white px-3 py-1 text-[11px] font-semibold text-[#123C35] hover:bg-[#DDF3E9] transition-colors"
              >
                Auto-fill {simulatedCode}
              </button>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="otp-code-input" className="text-xs font-semibold text-[#3D5450]">
            6-Digit Verification Code
          </label>
          <input
            id="otp-code-input"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otpInput}
            onChange={(e) => {
              setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6));
              if (error) setError('');
            }}
            placeholder="000000"
            className="vc-input text-center font-mono text-xl tracking-[0.45em] min-h-[52px]"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600 font-medium">
            {error}
          </p>
        )}

        {resendNotice && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[#159B79]">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{resendNotice}</span>
          </p>
        )}

        <VidaButton type="submit" variant="primary" disabled={isVerifying} className="w-full">
          {verifyLabel}
        </VidaButton>
      </form>

      <div className="flex items-center justify-between border-t vc-hairline pt-4 text-xs text-[#71807A]">
        <span>Didn't see the simulated code?</span>
        <button
          type="button"
          disabled={cooldown > 0}
          onClick={handleResend}
          className="inline-flex items-center gap-1.5 font-semibold text-[#159B79] transition-colors hover:text-[#123C35] disabled:opacity-50 disabled:pointer-events-none"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Simulated OTP'}
          </span>
        </button>
      </div>
    </div>
  );
};
