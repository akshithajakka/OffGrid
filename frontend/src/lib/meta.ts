import type { DataStatus, DeskStatus, SysStatus, Tone } from '../data/types';
import type { TaskLane } from './select';

type ChipStyle = { label: string; cls: string };
const RED = 'bg-[#2A0E0C] text-[#FF6A5F] border-[#B3221B]';
const RED_SOLID = 'bg-[#C8261D] text-white border-[#C8261D]';
const AMBER = 'bg-[#2A2008] text-[#F5B83D] border-[#8A6516]';
const BLUE = 'bg-[#0E1A33] text-[#7BAEFF] border-[#2457B8]';
const GREEN = 'bg-[#0E2417] text-[#5BD08A] border-[#1E6B3C]';
const GRAY = 'bg-[#1C1C21] text-[#D6D6DC] border-[#55555E]';
export const CHIP = { RED, RED_SOLID, AMBER, BLUE, GREEN, GRAY, GOLD: 'bg-gold text-[#1A1206] border-gold' };

export const SYS_CHIP: Record<SysStatus, ChipStyle> = {
  encrypted: { label: 'Encrypted', cls: RED_SOLID }, down: { label: 'Down', cls: RED },
  suspected: { label: 'Suspected', cls: AMBER }, contained: { label: 'Contained', cls: BLUE },
  working: { label: 'Working', cls: GREEN }, unchecked: { label: 'Unchecked', cls: GRAY },
};
export const LANE_CHIP: Record<TaskLane, ChipStyle> = {
  anyone: { label: 'Open to anyone', cls: GRAY }, waiting: { label: 'Waiting for OK', cls: AMBER },
  escalated: { label: 'Escalated', cls: RED }, progress: { label: 'In progress', cls: BLUE }, done: { label: 'Done', cls: GREEN },
};
export const DATA_CHIP: Record<DataStatus, ChipStyle> = {
  unknown: { label: 'Unknown', cls: GRAY }, locked: { label: 'Locked', cls: RED_SOLID },
  possible_exfil: { label: 'Exfiltrated?', cls: RED }, exfiltrated: { label: 'Exfiltrated', cls: RED_SOLID }, safe: { label: 'Safe', cls: GREEN },
};
export const DESK: Record<DeskStatus, { code: string; label: string; cls: string; hex: string }> = {
  infected: { code: 'I', label: 'Infected', cls: 'bg-[#C8261D] text-white', hex: '#C8261D' },
  suspected: { code: 'S', label: 'Suspected', cls: 'bg-[#D99A2B] text-[#1A1206]', hex: '#D99A2B' },
  contained: { code: 'C', label: 'Contained', cls: 'bg-[#2F6FE0] text-white', hex: '#2F6FE0' },
  clean: { code: 'OK', label: 'Clean', cls: 'bg-[#2E8B47] text-white', hex: '#2E8B47' },
  unchecked: { code: '—', label: 'Unchecked', cls: 'bg-[#3A3A42] text-[#D6D6DC]', hex: '#3A3A42' },
};
export const SYS_HEX: Record<SysStatus, string> = {
  encrypted: '#C8261D', down: '#E5483D', suspected: '#D99A2B', contained: '#2F6FE0', working: '#2E8B47', unchecked: '#55555E',
};
export const TONE_BG: Record<Tone, string> = {
  red: 'bg-[#C8261D]', amber: 'bg-[#D99A2B]', blue: 'bg-[#2F6FE0]', green: 'bg-[#2E8B47]', gray: 'bg-[#8F8F99]',
};
