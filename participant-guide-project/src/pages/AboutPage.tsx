import React from 'react';
import {
  GlassSurface,
  SectionHeading,
  VidaButton,
} from '../components/ui/DesignPrimitives';

const STANDARDS = [
  {
    index: '01.',
    title: 'Hospital-First Verification',
    detail:
      'Before any campaign opens to community contributions, VidaCare confirms treatment plans and billing contacts directly with accredited care centers.',
  },
  {
    index: '02.',
    title: 'Transparent Fee Stewardship',
    detail:
      'Over 97% of every gift goes straight toward clinical expenses, surgical care, and post-operative recovery—never opaque platform markups.',
  },
  {
    index: '03.',
    title: 'Dignity in Patient Storytelling',
    detail:
      'Families retain full control over medical privacy while sharing verified clinical progress with people who care.',
  },
];

export const AboutPage: React.FC = () => {
  return (
    <section className="py-12 sm:py-16">
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Our Mission"
          title="Together, We Make Healing Possible."
          description="VidaCare was founded on a simple conviction: no family should navigate critical medical bills alone or in clinical uncertainty."
        />

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STANDARDS.map((item) => (
            <GlassSurface key={item.index} className="flex flex-col gap-3 p-7">
              <span className="font-mono text-sm font-medium text-teal-300">
                {item.index}
              </span>
              <h2 className="font-display text-xl font-semibold text-slate-50">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-slate-300/85">
                {item.detail}
              </p>
            </GlassSurface>
          ))}
        </div>

        <GlassSurface className="mt-10 flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div className="max-w-xl">
            <h3 className="font-display text-2xl font-semibold text-slate-50">
              Partnering with hospitals and care navigators
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300/85">
              Reach out to our clinical liaison team to verify a patient fund or
              learn more about our direct hospital settlement architecture.
            </p>
          </div>
          <VidaButton to="/contact" variant="primary">
            Contact Care Team
          </VidaButton>
        </GlassSurface>
      </div>
    </section>
  );
};
