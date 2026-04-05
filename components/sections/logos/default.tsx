import { ReactNode, SVGProps } from "react";

import { siteConfig } from "@/config/site";

import Figma from "../../logos/figma";
import React from "../../logos/react";
import ShadcnUi from "../../logos/shadcn-ui";
import Tailwind from "../../logos/tailwind";
import TypeScript from "../../logos/typescript";
import { Badge } from "../../ui/badge";
import { Section } from "../../ui/section";

interface LogosProps {
  title?: string;
  badge?: ReactNode | false;
  logos?: ReactNode[] | false;
  className?: string;
}

function TechLogo({ image: Image, name }: { image: (props: SVGProps<SVGSVGElement>) => React.JSX.Element; name: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Image className="h-10 w-10" />
      <span className="text-xs text-muted-foreground">{name}</span>
    </div>
  );
}

export default function Logos({
  title = "Built with industry-standard tools and best practices",
  badge = (
    <Badge variant="outline" className="border-brand/30 text-brand">
      Last updated: {siteConfig.stats.updated}
    </Badge>
  ),
  logos = [
    <TechLogo key="figma" image={Figma} name="Figma" />,
    <TechLogo key="react" image={React} name="React" />,
    <TechLogo key="typescript" image={TypeScript} name="TypeScript" />,
    <TechLogo key="shadcn" image={ShadcnUi} name="Shadcn/ui" />,
    <TechLogo key="tailwind" image={Tailwind} name="Tailwind" />,
  ],
  className,
}: LogosProps) {
  return (
    <Section className={className}>
      <div className="max-w-container mx-auto flex flex-col items-center gap-8 text-center">
        <div className="flex flex-col items-center gap-6">
          {badge !== false && badge}
          <h2 className="text-md font-semibold sm:text-2xl">{title}</h2>
        </div>
        {logos !== false && logos.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-8">
            {logos}
          </div>
        )}
      </div>
    </Section>
  );
}
