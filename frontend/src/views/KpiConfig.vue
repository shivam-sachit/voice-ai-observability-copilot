<script setup>
// KPI Config — AI-suggested KPIs the user edits and confirms (the hybrid flow). Built in Task 11.
defineProps({ id: String })
</script>

<template>
  <section>
    <h1>KPI Configuration</h1>
    <p class="stub">
      Agent <code>{{ id }}</code> — the Copilot proposes KPIs from the agent's script and you
      confirm/edit them here. Built in Task 11.
    </p>
  </section>
</template>

<style scoped>
.stub { color: #6b7280; }
</style>
