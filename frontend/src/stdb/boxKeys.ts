export type BoxKeyHandlers = {
  badgeTap: (uid: string) => Promise<void>;
  panic: () => Promise<void>;
  leadCode: (code: string) => Promise<void>;
};
