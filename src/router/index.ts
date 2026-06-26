import { createRouter, createWebHashHistory } from 'vue-router'
import WorkspaceLayout from '@/layouts/WorkspaceLayout'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      component: WorkspaceLayout,
    },
  ],
})

export default router
