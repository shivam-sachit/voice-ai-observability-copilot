import { defineStore } from 'pinia'
import { api } from '../api/client.js'

// Owns transcripts + their analyses (per agent, and the currently-open call). Wired in Task 9.
export const useCallsStore = defineStore('calls', {
  state: () => ({ byAgent: {}, current: null, loading: false }),
  actions: {
    // async fetchForAgent(agentId) { this.byAgent[agentId] = await api.get(`/calls?agentId=${agentId}`) }
    // async fetchOne(id)           { this.current = await api.get(`/calls/${id}`) }
  },
})
