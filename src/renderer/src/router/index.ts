import { createRouter, createWebHashHistory } from 'vue-router'
import routes from './routes'
import { useFlags } from '@/store/flags'
import pinia from '@/store/sotre'

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 })
})
const originPush = router.push.bind(router)
const flags = useFlags(pinia)
router.push = (destination) => {
  const previous = Number(router.currentRoute.value.query.count)
  const count = Number.isFinite(previous) && previous > 0 ? Math.floor(previous) + 1 : 1
  // Let Vue Router decode URLs before adding our navigation counter.
  // Splitting the raw query by hand double-encodes search words such as A&B.
  const resolved = typeof destination === 'string' ? router.resolve(destination) : destination
  return originPush({
    ...(typeof destination === 'string'
      ? { path: resolved.path, hash: resolved.hash }
      : destination),
    query: { ...resolved.query, count }
  })
}

router.beforeEach((to) => {
  const count = Number(to.query.count)
  if (!Number.isFinite(count) || count < 1) {
    return { path: to.path, hash: to.hash, query: { ...to.query, count: 1 }, replace: true }
  }
  flags.maxCount = Math.max(flags.maxCount, count)
  return true
})

export default router
