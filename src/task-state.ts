export const TaskStates = {
  Idle: "Idle",
  Executing: "Executing",
  Completed: "Completed",
  Failed: "Failed",
  Aborted: "Aborted"
} as const;

type TaskState = typeof TaskStates[keyof typeof TaskStates];

export default TaskState;
