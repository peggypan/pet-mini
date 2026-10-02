import type { ReactNode } from 'react';

interface PageIntroProps {
  title: string;
  description?: string;
  extra?: ReactNode;
}

export function PageIntro({ title, description, extra }: PageIntroProps) {
  return (
    <div className="page-intro" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {extra}
    </div>
  );
}
