/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Focus Traveller 旅途视觉令牌（阶段五 E）
        ft: {
          mist: "#F5EFE6", // 晨雾米 · 页面底色
          paper: "#FBF7F0", // 卡片纸色
          sand: "#EADBC4", // 浅沙 · 分隔线
          pine: "#6B8F71", // 远山绿 · 已完成/成功
          pineDeep: "#557A5C", // 深松绿 · hover
          dusk: "#E8A87C", // 夕橙 · 当前站点/强调
          duskDeep: "#D9986A", // 深夕橙 · hover
          trail: "#8B6F47", // 旅径棕 · 路径/图标
          night: "#2E4057", // 夜晚深蓝
          nightSoft: "#48607F", // 夜空浅蓝
          // —— 全新主色板（按用户确认的 FT 升级方案）——
          cream: "#FAF6F0", // 全局奶油画布
          warm: "#F0EBE3", // 输入框/次级背景
          borderWarm: "#E8E0D4", // 温暖边框/分割线
          blue: "#4A90B6", // 主色：主按钮、导航
          blueDark: "#3A7CA5", // 渐变深端/按下态
          blueLight: "#E8F1F8", // 轻量高亮/标签底
          coral: "#E8956A", // 强调：录音按钮、评分、重要提醒
          coralDeep: "#D98A52", // 珊瑚深端
          success: "#7DB9A8", // 完成态正向反馈（柔和青绿）
          ink: "#3D3D3D", // 正文暖黑（非纯黑）
          inkSoft: "#8C8C8C", // 次级文字
        },
      },
      fontFamily: {
        // 旅途圆润标题字（无外部字体依赖，系统圆体栈兜底）
        display: [
          '"Baloo 2"',
          '"M PLUS Rounded 1c"',
          '"PingFang SC"',
          '"Noto Sans SC"',
          "ui-rounded",
          "system-ui",
          "sans-serif",
        ],
        // 标题/品牌：Nunito / Quicksand（圆润现代）
        head: [
          '"Nunito"',
          '"Quicksand"',
          '"Baloo 2"',
          '"PingFang SC"',
          '"Noto Sans SC"',
          "ui-rounded",
          "system-ui",
          "sans-serif",
        ],
        // 手写装饰：Caveat（拉丁）+ 系统中文手写体兜底
        hand: ['"Caveat"', '"Xingkai SC"', '"STXingkai"', '"Segoe Script"', "cursive"],
        // 正文：Inter / PingFang SC
        sans: [
          '"Inter"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"PingFang SC"',
          '"Noto Sans SC"',
          '"Microsoft YaHei"',
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "slide-up": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-down": {
          "0%": { transform: "translateY(-100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "progress-fill": {
          "0%": { width: "0%" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.3s ease-out",
        "slide-down": "slide-down 0.3s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "progress-fill": "progress-fill 0.8s ease-out",
      },
      boxShadow: {
        card: "0 4px 20px rgba(74,144,182,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        btn: "0 4px 16px rgba(74,144,182,0.25)",
        nav: "0 8px 32px rgba(74,144,182,0.3)",
        illust: "0 8px 24px rgba(212,165,116,0.15)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
