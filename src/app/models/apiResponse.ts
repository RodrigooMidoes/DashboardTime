import { TimeLog } from "./timelog"

export interface ApiResponse {
  data: {
    timelogs: {
      count: number,
      pageInfo: {
        hasNextPage: boolean,
        endCursor: string
      },
      nodes: TimeLog[]
    }
  }
}