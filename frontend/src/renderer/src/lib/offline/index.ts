export {
  drainOutbox,
  ensureDeskSnapshot,
  getDeskSyncStatus,
  loadMergedAttendance,
  loadMergedBorrows,
  recordAttendanceScan,
  recordBorrowScan,
} from "./desk"
export {
  getLastOnline,
  probeApiHealth,
  subscribeConnectivity,
} from "./connectivity"
export { subscribeSyncStatus, isSyncing } from "./sync-worker"
export type { DeskSyncStatus } from "./types"
export {
  rankAttendanceLocal,
  rankBorrowsByCollegeLocal,
  rankBorrowsByOrgLocal,
  summarizeAttendanceLocal,
  summarizeBorrowsLocal,
} from "./local-stats"
