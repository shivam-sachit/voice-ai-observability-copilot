<script setup>
// App shell: a simple top bar + the routed view. Real design lands in Tasks 10–11.
</script>

<template>
  <div class="app">
    <header class="topbar">
      <strong>Voice AI Observability Copilot</strong>
      <nav>
        <RouterLink to="/">Fleet</RouterLink>
      </nav>
    </header>
    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style>
/* Minimal, neutral skeleton styling — replaced with the real design system in Tasks 10–11. */
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; color: #1a1a1a; }
.topbar {
  display: flex; align-items: center; gap: 1.5rem;
  padding: 0.75rem 1.25rem; border-bottom: 1px solid #e5e7eb;
}
.topbar nav a { color: #2563eb; text-decoration: none; }
.content { padding: 1.25rem; max-width: 1100px; }
</style>
