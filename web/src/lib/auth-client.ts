import { createAuthClient } from "better-auth/react"
import { adminClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL, // The base URL of your auth server
  plugins: [
    adminClient()
  ],
  // Required for cross-origin authentication on mobile browsers (especially iOS Safari)
  // Without this, mobile browsers may fail with "Load failed" error
  fetchOptions: {
    credentials: 'include',
  },
})
