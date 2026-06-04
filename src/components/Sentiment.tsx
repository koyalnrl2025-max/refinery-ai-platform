'use client';

type SentimentType = 'pos' | 'neu' | 'neg';

interface SentimentProps {
  type: SentimentType;
}

const labels: Record<SentimentType, string> = {
  pos: 'Positive',
  neu: 'Neutral',
  neg: 'Negative',
};

export default function Sentiment({ type }: SentimentProps) {
  return (
    <span className="chip" style={{ gap: 6 }}>
      <span className={`sent ${type}`} />
      {labels[type]}
    </span>
  );
}
