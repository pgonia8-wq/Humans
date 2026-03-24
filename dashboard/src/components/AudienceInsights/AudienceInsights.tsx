import { memo } from "react";
import { Globe } from "lucide-react";
import { SectionBlock } from "../primitives/SectionBlock";
import { EmptyStatePremium } from "../primitives/EmptyStatePremium";
import { AnimatedBar } from "../primitives/AnimatedBar";
import type { AudienceGroup } from "../../lib/types";

interface AudienceInsightsProps {
  countries: AudienceGroup[];
  languages: AudienceGroup[];
  interests: AudienceGroup[];
}

export const AudienceInsights = memo(function AudienceInsights({
  countries,
  languages,
  interests,
}: AudienceInsightsProps) {
  const isEmpty = !countries.length && !languages.length;

  return (
    <SectionBlock icon={Globe} title="Audience Insights" iconColor="text-blue-400">
      {isEmpty ? (
        <EmptyStatePremium />
      ) : (
        <div className="space-y-5" data-testid="audience-insights">
          {!!countries.length && (
            <div>
              <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Países</p>
              <div className="space-y-2">
                {countries.map((c, i) => (
                  <AnimatedBar key={c.label} label={c.label} pct={c.pct} delay={i * 0.08} />
                ))}
              </div>
            </div>
          )}
          {!!languages.length && (
            <>
              <div className="h-px bg-white/5" />
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Idiomas</p>
                <div className="space-y-2">
                  {languages.map((l, i) => (
                    <AnimatedBar key={l.label} label={l.label} pct={l.pct} delay={i * 0.08} />
                  ))}
                </div>
              </div>
            </>
          )}
          {!!interests.length && (
            <>
              <div className="h-px bg-white/5" />
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-widest mb-2.5 font-semibold">Intereses</p>
                <div className="space-y-2">
                  {interests.map((t, i) => (
                    <AnimatedBar key={t.label} label={t.label} pct={t.pct} delay={i * 0.08} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </SectionBlock>
  );
});
