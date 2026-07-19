import { defineStore } from 'pinia'
import { api } from '../api/client.js'

// Owns the agent list and lookups. Actions are wired to the API in Task 9.
export const useAgentsStore = defineStore('agents', {
  state: () => ({ agents: [], loading: false, error: null }),
  getters: {
    byId: (state) => (id) => state.agents.find((a) => a.id === id) ?? null,
  },
  actions: {
    // async fetchAgents() { this.loading = true; this.agents = await api.get('/agents'); this.loading = false }
    // async sync()        { await api.post('/agents/sync'); await this.fetchAgents() }
  },
})
