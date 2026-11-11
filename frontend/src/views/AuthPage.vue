<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthView from '../components/auth/AuthView.vue'
import {
  getCaptcha,
  getCurrentUser,
  login,
  register,
  requestPasswordReset,
  resetPassword,
} from '../api/auth'

type AuthMode = 'login' | 'register' | 'forgot'

const PATH_BY_MODE: Record<AuthMode, string> = {
  login: '/login',
  register: '/register',
  forgot: '/forgot-password',
}

const route = useRoute()
const router = useRouter()

const routeMode = computed<AuthMode>(() =>
  route.path === '/register' ? 'register' : route.path === '/forgot-password' ? 'forgot' : 'login',
)
const mode = computed<AuthMode>({
  get: () => routeMode.value,
  set: value => void router.push(PATH_BY_MODE[value]),
})

const email = ref('')
const account = ref('')
const password = ref('')
const displayName = ref('')
const code = ref('')
const captchaId = ref('')
const captchaCode = ref('')
const captchaImage = ref('')
const error = ref('')
const notice = ref('')
const loading = ref(false)

async function refreshCaptcha() {
  const result = await getCaptcha()
  captchaId.value = result.captchaId
  captchaImage.value = result.image
  captchaCode.value = ''
}

void refreshCaptcha()

watch(
  () => route.path,
  () => {
    error.value = ''
    notice.value = ''
    password.value = ''
  },
)

function redirectTarget() {
  return typeof route.query.redirect === 'string' ? route.query.redirect : '/workbench'
}

async function submit() {
  error.value = ''
  notice.value = ''
  loading.value = true

  try {
    if (mode.value === 'register') {
      await register({ email: email.value, password: password.value, displayName: displayName.value })
    } else if (mode.value === 'forgot') {
      const result = await resetPassword({
        email: email.value,
        code: code.value,
        password: password.value,
      })
      password.value = ''
      code.value = ''
      await router.replace('/login')
      notice.value = result.message
      return
    } else {
      await login({
        account: account.value,
        password: password.value,
        captchaId: captchaId.value,
        captchaCode: captchaCode.value,
      })
      await refreshCaptcha()
    }

    await getCurrentUser()
    await router.replace(redirectTarget())
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '认证失败，请稍后重试'
    if (mode.value === 'login') await refreshCaptcha()
  } finally {
    loading.value = false
  }
}

async function sendCode() {
  error.value = ''
  notice.value = ''
  try {
    const result = await requestPasswordReset(email.value)
    notice.value = result.message
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '验证码发送失败'
  }
}
</script>
<template>
  <AuthView v-model:mode="mode" v-model:email="email" v-model:account="account" v-model:password="password"
    v-model:display-name="displayName" v-model:code="code" v-model:captcha-code="captchaCode"
    :captcha-image="captchaImage" :error="error" :notice="notice" :loading="loading"
    @refresh-captcha="refreshCaptcha" @submit="submit" @request-code="sendCode" />
</template>
