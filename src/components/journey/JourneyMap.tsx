"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";

export interface JourneyStation {
  id: string;
  kind: "task" | "learn" | "voice";
  title: string;
  subtitle: string;
  icon: string;
  done: boolean;
  href?: string;
  onAction?: () => void;
  actionLabel?: string;
  /** 次要动作（如任务站的「陪练」入口或「标记完成」快捷） */
  secondaryHref?: string;
  secondaryOnAction?: () => void;
  secondaryLabel?: string;
}

interface JourneyMapProps {
  dateLabel: string;
  doneCount: number;
  totalCount: number;
  streakDays: number;
  stations: JourneyStation[];
}

// ---- Focus Traveller 旅途几何参数（设计像素） ----
const VIEW_W = 360;
const CX = VIEW_W / 2;
const AMP = 72; // 蜿蜒振幅
const TOP = 44; // 起点距顶
const SPACING = 96; // 站点间距
const END_GAP = 44; // 终点（营地）余量

type SceneId = "day" | "warm" | "dusk" | "night";

const SCENES: Record<
  SceneId,
  { grad: string; title: string; sub: string; onDark: boolean; sky: string }
> = {
  day: {
    grad: "ft-scene-day",
    title: "#3E5C4B",
    sub: "#6E7F72",
    onDark: false,
    sky: "🌤️",
  },
  warm: {
    grad: "ft-scene-warm",
    title: "#6B5335",
    sub: "#8A7A68",
    onDark: false,
    sky: "☀️",
  },
  dusk: {
    grad: "ft-scene-dusk",
    title: "#5A3A28",
    sub: "#7A5240",
    onDark: false,
    sky: "🌇",
  },
  night: {
    grad: "ft-scene-night",
    title: "#F5EFE6",
    sub: "#C9D4E2",
    onDark: true,
    sky: "🌙",
  },
};

function sceneByHour(h: number): SceneId {
  if (h >= 5 && h < 11) return "day";
  if (h >= 11 && h < 17) return "warm";
  if (h >= 17 && h < 20) return "dusk";
  return "night";
}

// Catmull-Rom → 三次贝塞尔，生成平滑蜿蜒路径
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x} ${p2.y}`;
  }
  return d;
}

const KIND_LABEL: Record<JourneyStation["kind"], string> = {
  task: "训练任务",
  learn: "今日学习",
  voice: "声线练习",
};

const KIND_BADGE: Record<JourneyStation["kind"], string> = {
  task: "bg-[#EAF1EA] text-[#557A5C]",
  learn: "bg-[#E8F0F6] text-[#4A6C8C]",
  voice: "bg-[#FBF0DD] text-[#A07B3E]",
};

export default function JourneyMap({
  dateLabel,
  doneCount,
  totalCount,
  streakDays,
  stations,
}: JourneyMapProps) {
  const reduceMotion = useReducedMotion();

  const scene = SCENES[sceneByHour(new Date().getHours())];
  const currentIndex = stations.findIndex((s) => !s.done);
  const allDone = stations.length > 0 && currentIndex === -1;
  const progress = totalCount > 0 ? Math.min(doneCount / totalCount, 1) : 0;

  // 站点坐标（含终点营地）
  const points = useMemo(() => {
    const pts = stations.map((_, i) => ({
      x: CX + AMP * Math.sin(i * 1.05 + 0.6),
      y: TOP + i * SPACING,
    }));
    pts.push({ x: CX, y: TOP + stations.length * SPACING }); // 营地
    return pts;
  }, [stations.length]);

  const trailPath = useMemo(() => smoothPath(points), [points]);
  const trailH = TOP + stations.length * SPACING + END_GAP;

  const travelerPt = points[allDone ? points.length - 1 : Math.max(currentIndex, 0)];
  const toPct = (p: { x: number; y: number }) => ({
    left: `${((p.x / VIEW_W) * 100).toFixed(2)}%`,
    top: `${((p.y / trailH) * 100).toFixed(2)}%`,
  });

  // 里程碑：按完成比例点亮 🌱🌿🌳🏆
  const milestoneLit = (m: number) =>
    totalCount > 0 && doneCount >= Math.ceil(((m + 1) / 4) * totalCount);

  return (
    <div className="rounded-3xl shadow-sm border border-ft-sand overflow-hidden bg-ft-paper">
      {/* 场景头：时段渐变 + 远山剪影 */}
      <div className={`relative ${scene.grad} px-5 pt-5 pb-14`}>
        <svg
          className="absolute bottom-0 left-0 w-full h-12"
          viewBox="0 0 360 48"
          preserveAspectRatio="none"
          aria-hidden
        >
          <polygon
            points="0,48 60,18 120,48"
            fill={scene.onDark ? "rgba(251,247,240,0.10)" : "rgba(107,143,113,0.22)"}
          />
          <polygon
            points="80,48 170,6 260,48"
            fill={scene.onDark ? "rgba(251,247,240,0.16)" : "rgba(85,122,92,0.30)"}
          />
          <polygon
            points="220,48 300,14 360,48"
            fill={scene.onDark ? "rgba(251,247,240,0.10)" : "rgba(107,143,113,0.22)"}
          />
        </svg>
        <span className="absolute top-4 right-5 text-2xl" aria-hidden>
          {scene.sky}
        </span>

        <div className="flex items-end justify-between relative">
          <div>
            <p className="text-xs" style={{ color: scene.sub }}>
              {dateLabel} · 今日旅程
            </p>
            <h2
              className="text-2xl font-extrabold font-display mt-0.5"
              style={{ color: scene.title }}
            >
              {allDone ? "🏕️ 抵达今日营地" : "🗺️ 和宝贝出发吧"}
            </h2>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
              scene.onDark ? "bg-white/15 text-[#F5EFE6]" : "bg-white/70 text-ft-ink"
            }`}
          >
            🔥 连续 {streakDays} 天
          </div>
        </div>
      </div>

      {/* 蜿蜒旅程路径（Focus Traveller 粗白公路风：白色路缘 + 渐变路面 + 虚线中线） */}
      <div
        className="relative overflow-hidden"
        style={{
          height: trailH,
          background:
            "linear-gradient(180deg,#E7EFE3 0%,#D9E7D4 55%,#EAF1E5 100%)",
        }}
      >
        {/* 林间点缀 */}
        {[
          { l: "5%", t: "8%" }, { l: "86%", t: "16%" }, { l: "8%", t: "38%" },
          { l: "88%", t: "52%" }, { l: "6%", t: "70%" }, { l: "85%", t: "82%" },
        ].map((p, i) => (
          <span
            key={i}
            className="absolute text-lg opacity-30 select-none"
            style={{ left: p.l, top: p.t }}
            aria-hidden
          >
            {["🌲", "🌳", "🌲", "🌲", "🌿", "🌳"][i]}
          </span>
        ))}

        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${VIEW_W} ${trailH}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="ft-trail-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6B8F71" />
              <stop offset="100%" stopColor="#E8A87C" />
            </linearGradient>
          </defs>
          {/* 白色路缘 */}
          <path
            d={trailPath}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={18}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {/* 已走过的路面 */}
          <motion.path
            d={trailPath}
            fill="none"
            stroke="url(#ft-trail-grad)"
            strokeWidth={10}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            pathLength={1}
            strokeDasharray={1}
            initial={{ strokeDashoffset: 1 }}
            animate={{ strokeDashoffset: 1 - progress }}
            transition={{ duration: reduceMotion ? 0 : 0.8, ease: "easeOut" }}
          />
          {/* 公路虚线中线 */}
          <path
            d={trailPath}
            fill="none"
            stroke="#F7F2E9"
            strokeWidth={2}
            strokeDasharray="7 9"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {/* 旅人（当前位置） */}
        {stations.length > 0 && travelerPt && (
          <motion.div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            initial={toPct(travelerPt)}
            animate={toPct(travelerPt)}
            transition={{ type: "spring", stiffness: 120, damping: 18 }}
          >
            <div className="relative">
              <span
                className={`text-2xl drop-shadow-sm inline-block ${reduceMotion ? "" : "ft-bob"}`}
                role="img"
                aria-label={allDone ? "已抵达营地" : "旅人在路上"}
              >
                {allDone ? "🎒" : "🥾"}
              </span>
              {!allDone && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-1.5 rounded-full bg-ft-ink/15" />
              )}
            </div>
          </motion.div>
        )}

        {/* 站点路标 */}
        {stations.map((s, i) => {
          const pt = points[i];
          const isCurrent = i === currentIndex;
          const leftSide = pt.x < CX; // 路径偏左 → 卡片放右侧
          return (
            <div key={s.id}>
              {/* 路标节点 */}
              <div
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={toPct(pt)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-base border-2 shadow-sm ${
                    s.done
                      ? "bg-[#EAF1EA] border-ft-pine"
                      : isCurrent
                        ? "bg-[#FCEFE3] border-ft-dusk"
                        : "bg-[#F4EEE4] border-[#CFC6B8]"
                  }`}
                  style={
                    isCurrent && !reduceMotion
                      ? { boxShadow: "0 0 0 4px rgba(232,168,124,0.25)" }
                      : undefined
                  }
                >
                  {s.done ? "✅" : s.icon}
                </div>
              </div>

              {/* 站点卡片（左右交替贴路）；外层负责定位，内层做入场动画避免 transform 冲突 */}
              <div
                className={`absolute z-10 w-[44%] -translate-y-1/2 ${
                  leftSide ? "left-[57%]" : "right-[57%]"
                }`}
                style={toPct(pt)}
              >
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08, duration: 0.35 }}
                >
                <div
                  className={`rounded-2xl p-3 border bg-white shadow-sm ${
                    s.done
                      ? "border-[#DCE9DC] opacity-80"
                      : isCurrent
                        ? "border-ft-dusk/60"
                        : "border-[#EEE7DA]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${KIND_BADGE[s.kind]}`}
                    >
                      {KIND_LABEL[s.kind]}
                    </span>
                    {s.done && (
                      <span className="text-[11px] font-semibold text-ft-pine">已完成</span>
                    )}
                  </div>
                  <p className="font-bold text-[13px] mt-1 text-ft-ink leading-snug">
                    {s.title}
                  </p>
                  <p className="text-[11px] mt-0.5 text-ft-inkSoft leading-snug">
                    {s.subtitle}
                  </p>
                  {!s.done && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {s.href ? (
                        <button
                          onClick={() => s.href && (window.location.href = s.href)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-ft-dusk hover:bg-ft-duskDeep transition-colors"
                        >
                          {s.actionLabel || "前往"}
                        </button>
                      ) : (
                        <button
                          onClick={s.onAction}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-ft-pine hover:bg-ft-pineDeep transition-colors"
                        >
                          {s.actionLabel || "标记完成"}
                        </button>
                      )}
                      {s.secondaryHref && (
                        <button
                          onClick={() => s.secondaryHref && (window.location.href = s.secondaryHref)}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: "#EFE7DA", color: "#8A7A68" }}
                        >
                          {s.secondaryLabel || "陪练"}
                        </button>
                      )}
                      {s.secondaryOnAction && (
                        <button
                          onClick={s.secondaryOnAction}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                          style={{ background: "#EFE7DA", color: "#8A7A68" }}
                        >
                          {s.secondaryLabel || "标记完成"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
                </motion.div>
              </div>
            </div>
          );
        })}

        {/* 营地终点旗 */}
        {stations.length > 0 && (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={toPct(points[points.length - 1])}
          >
            <span className={`text-xl ${allDone && !reduceMotion ? "ft-flicker" : ""}`}>
              {allDone ? "🔥" : "🏁"}
            </span>
          </div>
        )}
      </div>

      {/* 营火完成态 / 行程信息 */}
      <div className="px-5 pb-5">
        {allDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-ft-dusk/40 bg-gradient-to-b from-[#FCEFE3] to-ft-paper p-4 text-center"
          >
            <p className="font-display font-extrabold text-ft-ink">
              🏕️ 今日 {totalCount} 站全部走完，宝贝又向前一步！
            </p>
            <p className="text-xs text-ft-inkSoft mt-1">
              营火已点燃，去「今日小结」记下这一程吧 →
            </p>
          </motion.div>
        ) : (
          <div className="flex items-center justify-between text-xs text-ft-inkSoft">
            <span>🥾 已走过 {doneCount} 站</span>
            <span>共 {totalCount} 站 · 营火在终点等你</span>
          </div>
        )}

        {/* 里程碑 */}
        <div className="mt-4 pt-4 border-t border-ft-sand flex items-center justify-between">
          <div className="text-xs text-ft-inkSoft">🏔️ 今日里程碑</div>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((m) => (
              <span
                key={m}
                className="text-base"
                style={{
                  filter: milestoneLit(m) ? "none" : "grayscale(1) opacity(0.35)",
                }}
              >
                {["🌱", "🌿", "🌳", "🏆"][m]}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
