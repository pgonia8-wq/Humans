import { defineConfig } from "vite"
  import react from "@vitejs/plugin-react"
  import { resolve } from "path"

  export default defineConfig({
    plugins: [react()],
    resolve: {
      dedupe: ["react", "react-dom"]
    },
    build: {
      target: "esnext",
      rollupOptions: {
        input: {
          main: resolve(__dirname, "index.html"),
          admin: resolve(__dirname, "admin.html"),
        },
        output: {
          manualChunks: {
            "vendor-react":    ["react", "react-dom"],
            "vendor-motion":   ["framer-motion"],
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-minikit":  ["@worldcoin/minikit-js"],
            "vendor-icons":    ["lucide-react"],
          }
        }
      },
      chunkSizeWarningLimit: 600
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@supabase/supabase-js"]
    }
  })
