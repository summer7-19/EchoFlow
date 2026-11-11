import { createRouter, createWebHistory } from 'vue-router'
import { tokenStorage } from '../api/client'
import AuthPage from '../views/AuthPage.vue'
import WorkbenchPage from '../views/WorkbenchPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: () => (tokenStorage.get() ? '/workbench' : '/login') },
    { path: '/login', component: AuthPage, meta: { guestOnly: true } },
    { path: '/register', component: AuthPage, meta: { guestOnly: true } },
    { path: '/forgot-password', component: AuthPage, meta: { guestOnly: true } },
    { path: '/workbench', component: WorkbenchPage, meta: { requiresAuth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(to => {
  const authenticated = Boolean(tokenStorage.get())

  if (to.meta.requiresAuth && !authenticated) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && authenticated) {
    return '/workbench'
  }
})
