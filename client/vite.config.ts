import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import svgr from "vite-plugin-svgr";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
	base: "/",
	plugins: [
		react(),
		babel({ presets: [reactCompilerPreset()] }),
		tailwindcss(),
		svgr(),
	],
	build: {
		// The three.js 3D viewer is lazy-loaded into its own ~1.3 MB chunk that
		// only loads when the brain view mounts, so it's fine to exceed 500 kB.
		chunkSizeWarningLimit: 1600,
		rolldownOptions: {
			// Disable the informational [PLUGIN_TIMINGS] report from the build.
			checks: {
				pluginTimings: false,
			},
		},
	},
	server: {
		port: 3000,
		strictPort: true,
		host: "0.0.0.0",
		allowedHosts: ["neuroatlas.info", "www.neuroatlas.info"],
		proxy: {
			"/api": "http://localhost:8000",
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(import.meta.dirname, "./src"),
		},
	},
});
