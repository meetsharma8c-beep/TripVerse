export interface LocaleBundle {
  translations: Record<string, string>;
  phrases: Record<string, string>;
  dynamicReplacements: Record<number, string>;
}

export const DYNAMIC_PATTERNS: Array<{ source: string; flags: string }> = [
  {
    "source": "\\b(\\d+)\\s+Days?\\s+Trip\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Stops?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Items?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Hours?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Mins?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Activities\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Reviews?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Saved\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Destinations?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Days?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Nights?\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Travelers?\\b",
    "flags": "gi"
  },
  {
    "source": "\\bSuggested\\b",
    "flags": "gi"
  },
  {
    "source": "\\bFrom\\s*~",
    "flags": "gi"
  },
  {
    "source": "\\/person\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+of\\s+(\\d+)\\s+packed\\b",
    "flags": "gi"
  },
  {
    "source": "\\bStep\\s+(\\d+)\\b",
    "flags": "gi"
  },
  {
    "source": "\\bDay\\s+(\\d+)\\b",
    "flags": "gi"
  },
  {
    "source": "\\bSaved\\s+₹?(\\d[\\d,]*)\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d[\\d,]*)\\s+Reviews?\\b",
    "flags": "gi"
  },
  {
    "source": "\\bStep\\s+(\\d+)\\s+of\\s+(\\d+)\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s*km\\s*away\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s*km\\/h\\b",
    "flags": "gi"
  },
  {
    "source": "\\bExit in\\s+([\\d.]+)\\s*km\\b",
    "flags": "gi"
  },
  {
    "source": "\\bIn\\s+([\\d.]+)\\s*km\\b",
    "flags": "gi"
  },
  {
    "source": "\\b(\\d+)\\s+Friends?\\b",
    "flags": "gi"
  },
  {
    "source": "\\bTotal Shared\\b",
    "flags": "gi"
  },
  {
    "source": "\\bSettlement ready\\b",
    "flags": "gi"
  },
  {
    "source": "\\bPlanning only\\b",
    "flags": "gi"
  },
  {
    "source": "\\bExpense Splits\\b",
    "flags": "gi"
  },
  {
    "source": "\\bReal Stored Plan\\b",
    "flags": "gi"
  }
];
