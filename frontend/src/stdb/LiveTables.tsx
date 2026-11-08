import { createContext, useContext, type ReactNode } from 'react';
import type { Identity, Infer } from 'spacetimedb';
import type AccessRequestRow from '../module_bindings/access_request_table';
import type BadgeRow from '../module_bindings/badge_table';
import type BoxStatusRow from '../module_bindings/box_status_table';
import type ConsoleRegRow from '../module_bindings/console_reg_table';
import type MemberRow from '../module_bindings/member_table';
import type RegisterModeRow from '../module_bindings/register_mode_table';
import type SystemStateRow from '../module_bindings/system_state_table';
import type { ReducerBag } from './storeBridge';

export type Badge = Infer<typeof BadgeRow>;
export type AccessRequest = Infer<typeof AccessRequestRow>;
export type Member = Infer<typeof MemberRow>;
export type BoxStatus = Infer<typeof BoxStatusRow>;
export type SystemState = Infer<typeof SystemStateRow>;
export type ConsoleReg = Infer<typeof ConsoleRegRow>;
export type RegisterMode = Infer<typeof RegisterModeRow>;

export type LiveTables = {
  identity: Identity | null;
  systemState: SystemState | undefined;
  boxStatus: BoxStatus | undefined;
  members: readonly Member[];
  badges: readonly Badge[];
  accessRequests: readonly AccessRequest[];
  consoleReg: ConsoleReg | undefined;
  registerMode: RegisterMode | undefined;
  reducers: ReducerBag;
};

const Ctx = createContext<LiveTables | null>(null);

export function LiveTablesProvider({ value, children }: { value: LiveTables; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLiveTables() {
  return useContext(Ctx);
}
