const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/** Keys offered in the forms: the 12 majors followed by the 12 minors. Stored as free text. */
export const MUSICAL_KEYS: string[] = [...NOTES, ...NOTES.map((n) => `${n}m`)];
