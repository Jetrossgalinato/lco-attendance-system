export {
  drainOutbox,
  ensureDeskSnapshot,
  getDeskSyncStatus,
  loadMergedAttendance,
  loadMergedBorrows,
  mergeAttendanceRecords,
  mergeBorrowRecords,
  recordAttendanceScan,
  recordBorrowScan,
  withTimeout,
} from "./desk"
export {
  getLastOnline,
  probeApiHealth,
  subscribeConnectivity,
} from "./connectivity"
export {
  clearFailedOutbox,
  isSyncing,
  subscribeSyncStatus,
} from "./sync-worker"
export type { DeskSyncStatus } from "./types"
export {
  rankAttendanceLocal,
  rankBorrowsByCollegeLocal,
  rankBorrowsByOrgLocal,
  summarizeAttendanceLocal,
  summarizeBorrowsLocal,
} from "./local-stats"
