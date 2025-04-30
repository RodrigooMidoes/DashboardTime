export interface TimeLog {
  project: {
    id: string
    fullPath: string
  }
  issue: {
    id: string
  }
  timeSpent: number
  spentAt: string
  user: {
    id: string
    username: string
  }
}