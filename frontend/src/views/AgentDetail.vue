<script setup>
// Agent Detail — KPI breakdown, aggregated recommendations, and the call list. Built in Task 10.
defineProps({ id: String })
</script>

<template>
  <section>
    <h1>Agent Detail</h1>
    <p class="stub">
      Agent <code>{{ id }}</code> — KPI health breakdown, recommendations, and call list land
      in Task 10.
    </p>
    <RouterLink :to="`/agents/${id}/kpis`">Configure KPIs →</RouterLink>
  </section>
</template>

<style scoped>
.stub { color: #6b7280; }
</style>
