import { computed, reactive, ref, toRaw, UnwrapNestedRefs } from "vue";
import { TaskEventCallback, TaskEventContext, type TaskEventHook } from "./task-event";
import { TaskStates } from "./task-state";
import type TaskState from "./task-state";

export type TaskAction<A, R> = (argument?: A) => Promise<R>;
export type AbortAction<A> = (argument?: A) => void;

export interface Task<A, R> {
  tag?: string;
  state: TaskState;

  argument: A;

  canExecute: boolean;
  execute: TaskAction<A, R>;

  canAbort: boolean;
  abort: () => void;

  canReset: boolean;
  reset: () => void;

  isIdle: boolean;
  isExecuting: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isAborting: boolean;
  isAborted: boolean;
  isFinished: boolean;

  onIdle: TaskEventHook<A, R>;
  onExecuting: TaskEventHook<A, R>;
  onCompleted: TaskEventHook<A, R>;
  onFailed: TaskEventHook<A, R>;
  onAborted: TaskEventHook<A, R>;
  onFinished: TaskEventHook<A, R>;

  result?: R;
  error?: any;
}

export interface TaskOptions<A> {
  tag?: string | { (): string };

  createArgument?: () => A;

  canExecute?: (argument?: A) => boolean;

  abort?: AbortAction<A>;
}

export interface GlobalOptions {
  debug?: boolean;
}

const globalOptions: GlobalOptions = {
  debug: false
};

export function configureTasks(options: GlobalOptions) {
  globalOptions.debug = options.debug;
}

export type ReactiveTask<A, R> = UnwrapNestedRefs<Task<A, R>>;

export default function useTask<A = undefined, R = undefined>(
  action: TaskAction<A, R>,
  options?: TaskOptions<A>
): ReactiveTask<A, R> {
  const tag = computed<string | undefined>(() => {
    if (!(options?.tag)) return undefined;
    return typeof options.tag === "function" ? options.tag() : options.tag;
  });

  const argument = ref<A>();
  if (typeof (options?.createArgument) === "function") {
    argument.value = options.createArgument();
  }

  const state = ref<TaskState>(TaskStates.Idle);
  const result = ref<R>();
  const error = ref<any>();

  const isIdle = computed(() => state.value === TaskStates.Idle);
  const isExecuting = computed(() => state.value === TaskStates.Executing);
  const isCompleted = computed(() => state.value === TaskStates.Completed);
  const isFailed = computed(() => state.value === TaskStates.Failed);
  const isAborted = computed(() => state.value === TaskStates.Aborted);
  const isFinished = computed(
    () => isCompleted.value || isFailed.value || isAborted.value
  );

  const canExecute = computed(() =>
    options && typeof options.canExecute === "function"
      ? options.canExecute(argument.value)
      : true
  );
  const canAbort = computed(() => typeof (options?.abort) === "function");

  const onIdleHooks: Array<TaskEventCallback<A, R>> = [];
  const onExecutingHooks: Array<TaskEventCallback<A, R>> = [];
  const onCompletedHooks: Array<TaskEventCallback<A, R>> = [];
  const onFailedHooks: Array<TaskEventCallback<A, R>> = [];
  const onAbortedHooks: Array<TaskEventCallback<A, R>> = [];
  const onFinishedHooks: Array<TaskEventCallback<A, R>> = [];

  function onIdle(fn: TaskEventCallback<A, R>) {
    onIdleHooks.push(fn);
  }

  function onExecuting(fn: TaskEventCallback<A, R>) {
    onExecutingHooks.push(fn);
  }

  function onCompleted(fn: TaskEventCallback<A, R>) {
    onCompletedHooks.push(fn);
  }

  function onFailed(fn: TaskEventCallback<A, R>) {
    onFailedHooks.push(fn);
  }

  function onAborted(fn: TaskEventCallback<A, R>) {
    onAbortedHooks.push(fn);
  }

  function onFinished(fn: TaskEventCallback<A, R>) {
    onFinishedHooks.push(fn);
  }

  function createEventContext<A, R>(): TaskEventContext<A, R> {
    const context = {};
    Object.defineProperty(context, "state", {
      get: () => toRaw(state.value),
      enumerable: true
    });
    Object.defineProperty(context, "argument", {
      get: () => toRaw(argument.value),
      enumerable: true
    });
    Object.defineProperty(context, "result", {
      get: () => toRaw(result.value),
      enumerable: true
    });
    Object.defineProperty(context, "error", {
      get: () => toRaw(error.value),
      enumerable: true
    });
    return context as TaskEventContext<A, R>;
  }

  async function execute(a?: A): Promise<R> {
    if (isExecuting.value)
      throw new Error(tag.value ? `Task ${tag.value} is already executing.` : `Task already executing.`);

    if (a) {
      argument.value = a;
    }

    if (!canExecute.value)
      throw new Error(tag.value ? `Cannot execute task ${tag.value}` : `Cannot execute task.`);

    state.value = TaskStates.Executing;
    result.value = undefined;
    error.value = undefined;
    const eventContext = createEventContext<A, R>();

    const t = tag.value || "Anonymous";
    globalOptions.debug && console.debug(`Task executing [${t}]`, eventContext);
    onExecutingHooks.forEach((fn) =>
      fn(eventContext as TaskEventContext<A, R>)
    );
    try {
      result.value = await action(argument.value);
      state.value = TaskStates.Completed;
    } catch (e: any) {
      error.value = e;
      state.value = TaskStates.Failed;
    } finally {
      if (isCompleted.value) {
        globalOptions.debug && console.debug(`Task completed [${t}]`, eventContext);
        onCompletedHooks.forEach((fn) => fn(eventContext));
      } else if (isFailed.value) {
        console.error(`Task failed [${t}]`, eventContext);
        onFailedHooks.forEach((fn) => fn(eventContext));
      }

      onFinishedHooks.forEach((fn) => fn(eventContext));
    }

    if (error.value)
      throw error.value;

    return result.value!;
  }

  function abort() {
    if (!isExecuting.value || !canAbort.value || !(options?.abort && typeof options?.abort === "function"))
      throw new Error(`Cannot abort task ${tag.value ? tag.value + "." : ""}`.trim())

    state.value = TaskStates.Aborted;
    options.abort(argument.value);
    onAbortedHooks.forEach((fn) => fn(createEventContext<A, R>()));
  }

  function reset() {
    if (isExecuting.value)
      throw new Error(`Cannot reset task ${tag.value ? tag.value + "." : ""}`.trim())

    state.value = TaskStates.Idle;
    if (options?.createArgument) {
      argument.value = options.createArgument();
    } else {
      argument.value = undefined;
    }
    result.value = undefined;
    error.value = undefined;

    onIdleHooks.forEach((fn) => fn(createEventContext<A, R>()));
  }

  const task = {
    execute,
    abort,
    reset,

    onIdle,
    onExecuting,
    onCompleted,
    onFailed,
    onAborted,
    onFinished
  };

  Object.defineProperty(task, "tag", {
    get: () => tag.value,
    enumerable: true
  });

  Object.defineProperty(task, "argument", {
    get: () => argument.value,
    enumerable: true
  });

  Object.defineProperty(task, "state", {
    get: () => state.value,
    enumerable: true
  });

  Object.defineProperty(task, "canExecute", {
    get: () => canExecute.value,
    enumerable: true
  });

  Object.defineProperty(task, "canAbort", {
    get: () => canAbort.value,
    enumerable: true
  });

  Object.defineProperty(task, "isIdle", {
    get: () => isIdle.value,
    enumerable: true
  });

  Object.defineProperty(task, "isExecuting", {
    get: () => isExecuting.value,
    enumerable: true
  });

  Object.defineProperty(task, "isCompleted", {
    get: () => isCompleted.value,
    enumerable: true
  });

  Object.defineProperty(task, "isFailed", {
    get: () => isFailed.value,
    enumerable: true
  });

  Object.defineProperty(task, "isAborted", {
    get: () => isAborted.value,
    enumerable: true
  });

  Object.defineProperty(task, "isFinished", {
    get: () => isFinished.value,
    enumerable: true
  });

  Object.defineProperty(task, "result", {
    get: () => result.value,
    enumerable: true
  });

  Object.defineProperty(task, "error", {
    get: () => error.value,
    enumerable: true
  });

  return reactive(task as Task<A, R>);
}
