import { defineConfig } from 'vite';

export default defineConfig({
	test: {
		include: ['src/server/**/*.test.ts'],
		fileParallelism: false
	}
});
