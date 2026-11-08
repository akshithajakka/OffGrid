import { USE_MOCK } from '../stdb/config';
import { mockStore } from './storeMock';
import { spacetimeStore } from './storeSpacetime';

export { KIND_LABEL, SOURCE_LABEL, KIND_TO_STATUS } from './storeMock';
export type { ReportInput } from './storeMock';
export const store = USE_MOCK ? mockStore : spacetimeStore;
