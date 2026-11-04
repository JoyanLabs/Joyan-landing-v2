import { chromium } from '/home/joshrm/.cache/joyan-motion/node_modules/playwright/index.mjs';
const sets = [
  { name: 'headless-gpu-forced', headless: true, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--use-angle=vulkan','--enable-gpu','--ignore-gpu-blocklist','--disable-gpu-sandbox','--use-vulkan=native'] },
  { name: 'headful-display', headless: false, args: ['--enable-unsafe-webgpu','--enable-features=Vulkan','--ignore-gpu-blocklist','--disable-gpu-sandbox'] },
];
for (const s of sets) {
  try {
    const browser = await chromium.launch({ headless: s.headless, args: s.args, env: { ...process.env, VK_ICD_FILENAMES: '/usr/share/vulkan/icd.d/nvidia_icd.json' } });
    const page = await browser.newPage();
    await page.goto('about:blank');
    const got = await page.evaluate(async () => {
      if (!navigator.gpu) return { hasGpu: false };
      const a = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!a) return { adapter: null };
      const i = a.info ?? {};
      return { vendor: i.vendor, architecture: i.architecture, device: i.device, description: i.description, fallback: a.isFallbackAdapter };
    });
    console.log(s.name, JSON.stringify(got));
    await browser.close();
  } catch (e) { console.log(s.name, 'ERR', String(e).slice(0, 300)); }
}
