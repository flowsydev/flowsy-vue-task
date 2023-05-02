import TaskState from "./task-state";

export interface TaskEventContext<A = undefined, R = undefined> {
  state: TaskState;
  argument?: A;
  result?: R | undefined;
  error?: any;
}

export type TaskEventCallback<A = undefined, R = undefined> = (
  context: TaskEventContext<A, R>
) => Promise<any>;

export type TaskEventHook<A = undefined, R = undefined> = (
  fn: TaskEventCallback<A, R>
) => void;
