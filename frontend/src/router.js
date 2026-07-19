import { createRouter, createWebHistory } from 'vue-router'
import FleetOverview from './views/FleetOverview.vue'
import AgentDetail from './views/AgentDetail.vue'
import KpiConfig from './views/KpiConfig.vue'
import CallDetail from './views/CallDetail.vue'

// Four routes, one per screen in the blueprint. `props: true` passes the URL :id as a prop.
export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'fleet', component: FleetOverview },
    { path: '/agents/:id', name: 'agent', component: AgentDetail, props: true },
    { path: '/agents/:id/kpis', name: 'kpis', component: KpiConfig, props: true },
    { path: '/calls/:id', name: 'call', component: CallDetail, props: true },
  ],
})
