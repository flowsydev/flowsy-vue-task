# Flowsy Vue Task

Run async actions and keep track of their execution state and results in your Vue applications.

## Install
```shell
npm install --save @flowsydev/vue-task
```

## Usage

```vue
<script setup lang="ts">
import { toRefs } from "vue";
import useTask from "@flowsydev/vue-task";

// Action required: sum numbers from 'start' to 'end'

// Action argument type
interface SumArgument {
  start: number;
  end: number;
}

// Action
function sum(argument: SumArgument): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    let s = 0;
    for (let i = argument.start; i <= argument.end; i++) {
      s += i;
    }
    // Simulate time-consuming task
    setTimeout(() => {
      if (s % 2 !== 0) reject(new Error(`Invalid sum: ${s}`));
      resolve(s);
    }, 2000);
  });
}

// Prepare task
const task = useTask<SumArgument, number>(
  sum,
  {
    tag: "SumNumbers",
    argument: { start: 0, end: 0 }, // Initial argument value
    canExecute: (a?: SumArgument) => (a && (a.end > a.start)) || false  // Optional validation
  });

// Available properties and functions
const {
  argument, // SumArgument
  execute, // sum(argument)
  isExecuting, // boolean
  isCompleted, // boolean
  isFailed, // boolean
  result, // number
  error // any
} = toRefs(task);
</script>

<template>
  <div>
    <template v-if="argument">
      <div>
        <label for="start">Start:&nbsp;&nbsp;</label>
        <input v-model="argument.start" name="start" type="number">
      </div>
      <div>
        <label for="end">End:&nbsp;&nbsp;</label>
        <input v-model="argument.end" name="end" type="number">
      </div>
    </template>
    <div>
      <button :disabled="isExecuting" @click="execute()">Execute</button>
    </div>
    <div v-if="isExecuting">
      Executing...
    </div>
    <div v-else-if="isCompleted" style="color: green;">
      Sum = {{ result }}
    </div>
    <div v-else-if="isFailed" style="color: red;">
      {{ error.message }}
    </div>
    <hr style="margin-top: 2rem; margin-bottom: 2rem;">
    <pre>{{ task }}</pre>
  </div>
</template>

```
