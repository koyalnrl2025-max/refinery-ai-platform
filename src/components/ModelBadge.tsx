'use client';

import { SparkleIcon } from './icons';

interface ModelBadgeProps {
  model?: string;
}

export default function ModelBadge({ model = 'RefineIQ-4o' }: ModelBadgeProps) {
  return (
    <span className="model-badge">
      <span className="m-ico">
        <SparkleIcon />
      </span>
      {model}
    </span>
  );
}
