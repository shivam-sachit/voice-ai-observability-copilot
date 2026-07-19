import { defineStore } from 'pinia'
import { api } from '../api/client.js'

// Owns the fleet-wide aggregate shown on the overview. Wired in Task 9.
export const useFleetStore = defineStore('fleet', {
  state: () => ({ summary: null, loading: false }),
  actions: {
    // async fetchSummary() { this.loading = true; this.summary = await api.get('/fleet'); this.loading = false }
  },
})
