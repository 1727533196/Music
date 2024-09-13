import {createRouter, createWebHashHistory, createWebHistory} from "vue-router";
import routes from "./routes";
import {useFlags} from "@/store/flags";
import pinia from "@/store/sotre";
import {parsePathQuery} from "@/utils";

const router = createRouter({
  history: createWebHashHistory(),
  routes: routes,
  scrollBehavior: () => ({top: 0,})
})
const originPush = router.push
const flags = useFlags(pinia)
router.push = (params) => {
  let to
  let count = +router.currentRoute.value.query.count!
  if(typeof params === 'string') {
    const result = parsePathQuery(params)
    to = {
      path: result.path,
      query: {
        count: ++count,
        ...result.query,
      }
    }
  } else {
    to = {
      ...params,
      query: {
        ...params.query,
        count: ++count
      }
    }
  }
  return originPush(to)
}

router.beforeEach((to, from, next) => {
  const count = to.query.count
  if(!count) {
    next({
      ...to,
      query: {
        ...to.query,
        count: 1,
      }
    })
  } else {
    if(+count > flags.maxCount) {
      flags.maxCount = +count
    }
    next()
  }
})

export default router