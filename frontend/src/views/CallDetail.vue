<script setup>
// Call Detail — transcript with highlighted "Use Action" segments + per-KPI verdicts. Built in Task 10.
defineProps({ id: String })
</script>

<template>
  <section>
    <h1>Call Detail</h1>
    <p class="stub">
      Call <code>{{ id }}</code> — the transcript with highlighted Use-Action segments,
      per-KPI verdicts, findings, and recommendations land in Task 10.
    </p>
  </section>
</template>

<style scoped>
.stub { color: #6b7280; }
</style>
