import TaskState from "./task-state";

export interface TaskEventContext<A, R> {
  state: TaskState;
  argument?: A;
  result?: R | undefined;
  error?: any;
}

export type TaskEventCallback<A, R> = (
  context: TaskEventContext<A, R>
) => Promise<any>;

export type TaskEventHook<A, R> = (
  fn: TaskEventCallback<A, R>
) => void;
