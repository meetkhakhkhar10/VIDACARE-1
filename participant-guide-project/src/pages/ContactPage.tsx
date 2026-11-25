import React, { useRef, useState } from 'react';
import { Mail, MapPin, Phone } from 'lucide-react';
import { useVidaCare } from '../context/VidaCareContext';
import {
  GlassSurface,
  SectionHeading,
  VidaButton,
} from '../components/ui/DesignPrimitives';

export const ContactPage: React.FC = () => {
  const { submitContactMessage } = useVidaCare();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const submitLockRef = useRef(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitLockRef.current) return;
    if (
      !name.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !message.trim()
    ) {
      setError('Please complete your name, a valid email, and your inquiry.');
      return;
    }
    submitLockRef.current = true;
    setError('');
    submitContactMessage({
      name,
      email,
      subject: 'Care Liaison Inquiry',
      message,
    });
    setSubmitted(true);
  };

  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <SectionHeading
              kicker="Care Liaison Desk"
              title="Speak with Our Clinical Support Team"
              description="Questions regarding campaign verification, hospital billing coordination, or supporter receipts are answered within one business day."
            />

            <GlassSurface className="flex flex-col gap-4 p-6 text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-teal-300 shrink-0" aria-hidden="true" />
                <span>support@vidacare.org</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-teal-300 shrink-0" aria-hidden="true" />
                <span className="font-mono tabular-nums">+1 (800) 555-0194</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-teal-300 shrink-0" aria-hidden="true" />
                <span>240 Beacon Clinical Way, Boston, MA</span>
              </div>
            </GlassSurface>
          </div>

          <div className="lg:col-span-7">
            <GlassSurface className="p-8">
              {submitted ? (
                <div className="flex flex-col items-start gap-4 py-6">
                  <p className="text-xs font-medium tracking-[0.14em] text-teal-300">
                    Message Received
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-slate-50">
                    Thank you for reaching out, {name}.
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-300/85">
                    Our clinical support desk has logged your inquiry in this
                    frontend preview and will respond to {email}.
                  </p>
                  <VidaButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      submitLockRef.current = false;
                      setSubmitted(false);
                      setName('');
                      setEmail('');
                      setMessage('');
                    }}
                  >
                    Send Another Message
                  </VidaButton>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-name" className="text-xs font-medium text-slate-300">
                        Your Name
                      </label>
                      <input
                        id="contact-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="contact-email" className="text-xs font-medium text-slate-300">
                        Email Address
                      </label>
                      <input
                        id="contact-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="min-h-[44px] rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="contact-message" className="text-xs font-medium text-slate-300">
                      How can we assist?
                    </label>
                    <textarea
                      id="contact-message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Share details regarding a patient campaign, hospital partnership, or donation receipt..."
                      className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-teal-400/60 focus:outline-none focus:ring-2 focus:ring-teal-400/25"
                    />
                  </div>

                  {error && (
                    <p role="alert" className="text-xs text-amber-300">
                      {error}
                    </p>
                  )}

                  <div>
                    <VidaButton type="submit" variant="primary">
                      Send Message
                    </VidaButton>
                  </div>
                </form>
              )}
            </GlassSurface>
          </div>
        </div>
      </div>
    </section>
  );
};
