"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "@/components/bottom-nav";
import { bottomTabs } from "@/data/mock-data";
import type { TabId } from "@/types";
import {
  LEARNING_CATEGORIES,
  LEARNING_STAGES,
  LEARNING_ITEMS,
  LEARNING_FORMATS,
  getCategory,
  getStage,
  getFormat,
  getDailyRecommendation,
  getRelatedTodayTasks,
  getRelatedLearningForTask,
  mockTasksToday,
  DEFAULT_PRACTICE_WORDS,
  type LearningItem,
  type LearningCategoryId,
  type LearningStageId,
  type LearningFormatId,
} from "@/data/learning";
import {
  loadCheckins,
  markCheckin,
  hasCheckedInToday,
  loadRead,
  markRead,
  loadNotes,
  addNote,
  loadApplied,
  incApplied,
  calcStreak,
  computeBadges,
} from "@/data/learning";

type Stage = "home" | "list" | "detail" | "mine";
type FilterKind = "category" | "stage" | "format" | null;

// ---------------------------------------------------------------- 立体书封面
function BookCover({
  title,
  author,
  gradient,
  width = 70,
  height = 98,
  showAuthor = true,
}: {
  title: string;
  author: string;
  gradient: string;
  width?: number;
  height?: number;
  showAuthor?: boolean;
}) {
  return (
    <div
      className="relative rounded-r-md rounded-l-sm shadow-md overflow-hidden flex flex-col justify-between p-2 border-l-4 border-black/15 flex-shrink-0"
      style={{
        width,
        height,
        background: `linear-gradient(160deg, ${gradient})`,
      }}
    >
      {/* 书脊高光 */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-black/10" />
      <div className="absolute left-1.5 top-0 h-full w-px bg-white/20" />
      <div className="pl-1.5">
        <p
          className="text-white font-extrabold leading-tight"
          style={{ fontSize: width > 80 ? 14 : 11 }}
        >
          {title}
        </p>
      </div>
      {showAuthor && (
        <p className="text-white/75 text-[8px] pl-1.5 leading-tight truncate">
          {author}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 通用缩略封面
function CoverThumb({ item, size = 70 }: { item: LearningItem; size?: number }) {
  const f = getFormat(item.format);
  if (item.format === "book" && item.book) {
    return (
      <BookCover
        title={item.title}
        author={item.book.author}
        gradient={item.book.coverGradient || item.book.coverColor}
        width={size}
        height={size * 1.4}
      />
    );
  }
  const c = getCategory(item.category);
  // 课程 / 视频 / 文章 / 音频 / 手册 / 直播：渐变卡 + emoji
  const bg =
    item.format === "series"
      ? "#7c3aed,#a78bfa"
      : item.format === "video"
      ? "#db2777,#f472b6"
      : item.format === "audio"
      ? "#0ea5e9,#38bdf8"
      : item.format === "live"
      ? "#ea580c,#fb923c"
      : `${c.color},${c.color}bb`;
  return (
    <div
      className="relative rounded-xl shadow-md flex items-center justify-center flex-shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size * 1.4,
        background: `linear-gradient(160deg, ${bg})`,
      }}
    >
      <span className="text-3xl drop-shadow">{item.emoji || f.emoji}</span>
      <span className="absolute bottom-1 right-1 text-[8px] text-white/90 bg-black/25 rounded px-1">
        {f.name}
      </span>
      {(item.format === "video" || item.format === "series") && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-base">
            ▶
          </span>
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- 横滑卡片（书/课程）
function TrackCard({
  item,
  onClick,
}: {
  item: LearningItem;
  onClick: () => void;
}) {
  const f = getFormat(item.format);
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-32 text-left active:scale-95 transition-all"
    >
      <div className="relative">
        <CoverThumb item={item} size={78} />
        {item.book && (
          <span className="absolute top-1 left-1 text-[9px] font-bold text-white bg-rose-500/90 rounded px-1.5 py-0.5 shadow">
            ♥ {item.book.recommendPct}%
          </span>
        )}
      </div>
      <p className="text-[11px] font-bold text-gray-800 leading-tight mt-1.5 line-clamp-2 h-8">
        {item.title}
      </p>
      <p className="text-[9px] text-gray-400 mt-0.5">
        {item.book ? item.book.author : f.name} · {item.durationLabel}
      </p>
    </button>
  );
}

// ---------------------------------------------------------------- 列表卡片（通用）
function ListRow({ item, onClick }: { item: LearningItem; onClick: () => void }) {
  const c = getCategory(item.category);
  const f = getFormat(item.format);
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-left active:scale-[0.99] transition-all"
    >
      <CoverThumb item={item} size={50} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2">{item.summary}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${c.color}1a`, color: c.color }}
          >
            {c.name}
          </span>
          <span className="text-[10px] text-gray-400">
            {f.emoji} {f.name} · {item.durationLabel}
          </span>
          {item.book && (
            <span className="text-[10px] text-rose-500 font-semibold">
              ♥ {item.book.recommendPct}%
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function DailyLearningPage() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center text-gray-400 text-sm">加载中…</div>}>
      <DailyLearningInner />
    </Suspense>
  );
}

function DailyLearningInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialItem = searchParams.get("item");
  const validInitial =
    initialItem && LEARNING_ITEMS.some((i) => i.id === initialItem) ? initialItem : "";
  const [stage, setStage] = useState<Stage>(validInitial ? "detail" : "home");
  const [filterKind, setFilterKind] = useState<FilterKind>(null);
  const [filterId, setFilterId] = useState<string>("");
  const [detailId, setDetailId] = useState<string>(validInitial);
  const [catTab, setCatTab] = useState<LearningCategoryId | "recommend">("recommend");
  const [query, setQuery] = useState<string>("");
  const [checkedIn, setCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setCheckedIn(hasCheckedInToday());
    setStreak(calcStreak());
  }, []);

  const showToast = useCallback((m: string) => {
    setToast(m);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const todayRelated = useMemo(() => {
    const seen = new Set<string>();
    const out: { item: LearningItem; taskWord: string }[] = [];
    mockTasksToday.forEach((t) => {
      getRelatedLearningForTask(t).forEach((item) => {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          out.push({ item, taskWord: t.targetWord });
        }
      });
    });
    return out;
  }, []);

  const featured = useMemo(() => getDailyRecommendation("adapt"), []);

  // 首页轨道：按内容形态分组（静态属性，渲染期确定，不触发 hydration 问题）
  const books = useMemo(
    () => LEARNING_ITEMS.filter((i) => i.format === "book"),
    []
  );
  const courses = useMemo(
    () => LEARNING_ITEMS.filter((i) => i.format === "series" || i.format === "video" || i.format === "audio" || i.format === "live" || i.format === "pdf"),
    []
  );
  const articles = useMemo(
    () => LEARNING_ITEMS.filter((i) => i.format === "article"),
    []
  );
  const hotList = useMemo(
    () =>
      [...LEARNING_ITEMS]
        .filter((i) => i.book || i.featured)
        .sort((a, b) => (b.book?.recommendPct || 0) - (a.book?.recommendPct || 0))
        .slice(0, 6),
    []
  );

  const handleTabChange = (tab: TabId) => {
    if (tab === "profile") router.push("/parent/settings");
    else if (tab === "hearing") router.push("/parent/hearing-test");
    else if (tab === "learning") setStage("home");
    else router.push("/parent");
  };

  const openFilter = (kind: FilterKind, id: string) => {
    setFilterKind(kind);
    setFilterId(id);
    setStage("list");
  };

  const listItems = useMemo(() => {
    if (filterKind === "category")
      return LEARNING_ITEMS.filter((i) => i.category === filterId);
    if (filterKind === "stage")
      return LEARNING_ITEMS.filter((i) => i.stage === filterId);
    if (filterKind === "format")
      return LEARNING_ITEMS.filter((i) => i.format === filterId);
    return LEARNING_ITEMS;
  }, [filterKind, filterId]);

  const listTitle =
    filterKind === "category"
      ? getCategory(filterId as LearningCategoryId).name
      : filterKind === "stage"
      ? getStage(filterId as LearningStageId).name + " · 阶梯课程"
      : filterKind === "format"
      ? getFormat(filterId as LearningFormatId).name + " · 全部"
      : "全部内容";

  const handleCheckin = () => {
    markCheckin();
    setCheckedIn(true);
    setStreak(calcStreak());
    showToast("📚 今日学习打卡完成！");
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 md:px-6 pt-5">
        <div className="md:max-w-2xl md:mx-auto">
          <AnimatePresence mode="wait">
            {stage === "home" && (
              <HomeScreen
                key="home"
                checkedIn={checkedIn}
                streak={streak}
                onCheckin={handleCheckin}
                featured={featured}
                todayRelated={todayRelated}
                books={books}
                courses={courses}
                articles={articles}
                hotList={hotList}
                catTab={catTab}
                onCatTab={setCatTab}
                query={query}
                onQuery={setQuery}
                onOpenItem={(id) => {
                  setDetailId(id);
                  setStage("detail");
                }}
                onCategory={(id) => openFilter("category", id)}
                onStage={(id) => openFilter("stage", id)}
                onFormat={(id) => openFilter("format", id)}
                onMine={() => setStage("mine")}
              />
            )}
            {stage === "list" && (
              <ListScreen
                key="list"
                title={listTitle}
                items={listItems}
                onBack={() => setStage("home")}
                onOpenItem={(id) => {
                  setDetailId(id);
                  setStage("detail");
                }}
              />
            )}
            {stage === "detail" && (
              <DetailScreen
                key={`detail-${detailId}`}
                itemId={detailId}
                router={router}
                onBack={() => setStage("list")}
                onHome={() => setStage("home")}
                onOpenItem={(id) => {
                  setDetailId(id);
                  setStage("detail");
                }}
                onGotoParent={() => router.push("/parent")}
                onApplied={() => {
                  incApplied();
                  showToast("🎯 已去练习，学以致用 +1");
                }}
                onCheckin={handleCheckin}
                showToast={showToast}
              />
            )}
            {stage === "mine" && (
              <MineScreen
                key="mine"
                onBack={() => setStage("home")}
                onOpenItem={(id) => {
                  setDetailId(id);
                  setStage("detail");
                }}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomNav activeTab="learning" onTabChange={handleTabChange} tabs={bottomTabs} />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto"
          >
            <div className="bg-indigo-600 text-white rounded-2xl px-5 py-3 shadow-xl text-sm text-center">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =================================================================== 首页
function HomeScreen({
  checkedIn,
  streak,
  onCheckin,
  featured,
  todayRelated,
  books,
  courses,
  articles,
  hotList,
  onOpenItem,
  onCategory,
  onStage,
  onFormat,
  onMine,
  catTab,
  onCatTab,
  query,
  onQuery,
}: {
  checkedIn: boolean;
  streak: number;
  onCheckin: () => void;
  featured: LearningItem;
  todayRelated: { item: LearningItem; taskWord: string }[];
  books: LearningItem[];
  courses: LearningItem[];
  articles: LearningItem[];
  hotList: LearningItem[];
  onOpenItem: (id: string) => void;
  onCategory: (id: LearningCategoryId) => void;
  onStage: (id: LearningStageId) => void;
  onFormat: (id: LearningFormatId) => void;
  onMine: () => void;
  catTab: LearningCategoryId | "recommend";
  onCatTab: (id: LearningCategoryId | "recommend") => void;
  query: string;
  onQuery: (q: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      {/* 顶部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-800">每日学习</h1>
          <p className="text-sm text-gray-500 mt-0.5">家长专业赋能 · 边学边练</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">连续学习</p>
          <p className="text-lg font-extrabold text-indigo-600">🔥 {streak} 天</p>
        </div>
      </div>

      {/* 搜索栏 */}
      <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm border border-gray-100">
        <span className="text-base">🔍</span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="搜索康复知识、训练技巧…"
          className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-300 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => onQuery("")}
            className="text-xs text-gray-400 active:scale-95"
          >
            清除
          </button>
        )}
      </div>

      {/* 分类 Tab（百词斩式） */}
      <div className="mt-3 -mx-4 px-4 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 w-max">
          <button
            onClick={() => onCatTab("recommend")}
            className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
              catTab === "recommend"
                ? "bg-gray-800 text-white"
                : "bg-white text-gray-500 border border-gray-100"
            }`}
          >
            推荐
          </button>
          {LEARNING_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => onCatTab(c.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                catTab === c.id
                  ? "text-white"
                  : "bg-white text-gray-500 border border-gray-100"
              }`}
              style={catTab === c.id ? { background: c.color } : undefined}
            >
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* 打卡条 */}
      <button
        onClick={onCheckin}
        disabled={checkedIn}
        className={`w-full mt-3 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] ${
          checkedIn
            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
            : "bg-indigo-500 text-white hover:bg-indigo-600"
        }`}
      >
        {checkedIn ? "✅ 今日已打卡，继续加油！" : "📚 今日学习打卡"}
      </button>

      {/* 学与练联动 */}
      {todayRelated.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>🎯</span> 结合今日训练 · 边学边练
          </p>
          <div className="space-y-2">
            {todayRelated.map(({ item, taskWord }) => {
              const c = getCategory(item.category);
              return (
                <button
                  key={item.id}
                  onClick={() => onOpenItem(item.id)}
                  className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-left active:scale-[0.99] transition-all"
                >
                  <CoverThumb item={item} size={42} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{item.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      今日练「{taskWord}」→ 配套学习
                    </p>
                  </div>
                  <span className="text-xs text-indigo-500 font-semibold">去学习 ›</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {catTab === "recommend" && query === "" && (
        <>
          {/* 每日推荐（今日精选） */}
          <div className="mt-5">
            <p className="text-sm font-bold text-gray-700 mb-2">🎯 今日精选</p>
        <button
          onClick={() => onOpenItem(featured.id)}
          className="w-full rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 p-4 text-left shadow-md active:scale-[0.99] transition-all flex items-center gap-3"
        >
          <CoverThumb item={featured} size={58} />
          <div className="flex-1">
            <p className="text-white font-extrabold text-base">{featured.title}</p>
            <p className="text-indigo-100 text-xs mt-1 line-clamp-2">{featured.summary}</p>
            <p className="text-indigo-200 text-[10px] mt-2">
              {getFormat(featured.format).emoji} {getFormat(featured.format).name} · {featured.durationLabel}
            </p>
          </div>
        </button>
      </div>

      {/* 康复阶段书单（横滑） */}
      <div className="mt-5">
        <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
          <span>🗂️</span> 康复阶段书单
          <span className="text-[10px] font-normal text-gray-400 ml-1">按阶段挑内容 ›</span>
        </p>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
          {LEARNING_STAGES.map((s, idx) => {
            const stageEmoji = ["🌱", "🌿", "🌳", "🚀"][idx];
            const cnt = LEARNING_ITEMS.filter((i) => i.stage === s.id).length;
            return (
              <button
                key={s.id}
                onClick={() => onStage(s.id)}
                className="flex-shrink-0 w-28 text-left active:scale-95 transition-all"
              >
                <div
                  className="rounded-2xl h-28 flex flex-col items-center justify-center text-white shadow-sm"
                  style={{ background: `linear-gradient(160deg, ${s.color}, ${s.color}bb)` }}
                >
                  <span className="text-3xl">{stageEmoji}</span>
                  <p className="text-sm font-bold mt-1">{s.name}</p>
                  <p className="text-[10px] text-white/80">{cnt} 篇内容</p>
                </div>
                <p className="text-[10px] text-gray-400 mt-1 text-center leading-tight">{s.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 横滑：绘本精选 */}
      {books.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>📚</span> 绘本精选
            <span className="text-[10px] font-normal text-gray-400 ml-1">左右滑动 ›</span>
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {books.map((b) => (
              <TrackCard key={b.id} item={b} onClick={() => onOpenItem(b.id)} />
            ))}
          </div>
        </div>
      )}

      {/* 横滑：家长课程 / 视频 */}
      {courses.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>🎓</span> 家长课程 & 视频
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {courses.map((c) => (
              <TrackCard key={c.id} item={c} onClick={() => onOpenItem(c.id)} />
            ))}
          </div>
        </div>
      )}

      {/* 横滑：康复图文 */}
      {articles.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>📄</span> 康复图文
          </p>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
            {articles.map((a) => (
              <TrackCard key={a.id} item={a} onClick={() => onOpenItem(a.id)} />
            ))}
          </div>
        </div>
      )}

      {/* 热门榜单 */}
      <div className="mt-5">
        <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
          <span>🔥</span> 热门榜单
        </p>
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 p-2 space-y-1">
          {hotList.map((it, idx) => (
            <button
              key={it.id}
              onClick={() => onOpenItem(it.id)}
              className="w-full flex items-center gap-3 rounded-xl p-2 active:scale-[0.99] hover:bg-gray-50 transition-all text-left"
            >
              <span
                className={`text-base font-extrabold w-5 text-center ${
                  idx === 0 ? "text-rose-500" : idx === 1 ? "text-orange-500" : idx === 2 ? "text-amber-500" : "text-gray-300"
                }`}
              >
                {idx + 1}
              </span>
              <CoverThumb item={it} size={38} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{it.title}</p>
                <p className="text-[10px] text-gray-400">
                  {it.book ? `${it.book.readers} 人在读` : getFormat(it.format).name}
                </p>
              </div>
              {it.book && (
                <span className="text-[10px] text-rose-500 font-semibold">♥ {it.book.recommendPct}%</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 分类 & 阶梯入口 */}
      <div className="mt-5">
        <p className="text-sm font-bold text-gray-700 mb-2">🗂️ 按内容形态浏览</p>
        <div className="grid grid-cols-4 gap-2">
          {LEARNING_FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => onFormat(f.id)}
              className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center active:scale-95 transition-all"
            >
              <span className="text-2xl">{f.emoji}</span>
              <p className="text-[11px] font-bold text-gray-700 mt-1">{f.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-sm font-bold text-gray-700 mb-2">🪜 按康复阶段浏览</p>
        <div className="space-y-2">
          {LEARNING_STAGES.map((s) => (
            <button
              key={s.id}
              onClick={() => onStage(s.id)}
              className="w-full flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-left active:scale-[0.99] transition-all"
            >
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: `${s.color}1a`, color: s.color }}
              >
                {s.name}
              </span>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 我的书架入口 */}
      <button
        onClick={onMine}
        className="w-full mt-5 py-3 rounded-2xl bg-white text-indigo-600 text-sm font-semibold border border-indigo-100 hover:bg-indigo-50 active:scale-[0.98] transition-all"
      >
        📖 我的书架 · 读过的绘本 / 听过的课程
      </button>
        </>
      )}

      {/* 分类 / 搜索 信息流 */}
      {query.trim() !== "" ? (
        <div className="mt-5">
          <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>🔍</span> 搜索 “{query.trim()}” 的结果
          </p>
          <div className="space-y-3">
            {(() => {
              const q = query.trim().toLowerCase();
              const results = LEARNING_ITEMS.filter(
                (i) =>
                  i.title.toLowerCase().includes(q) ||
                  i.summary.toLowerCase().includes(q) ||
                  getCategory(i.category).name.includes(query.trim()) ||
                  (i.book?.tags.some((t) => t.toLowerCase().includes(q)) ?? false)
              );
              if (!results.length)
                return (
                  <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
                    <span className="text-3xl">🐰</span>
                    <p className="text-xs text-gray-400 mt-2">没有找到相关内容，换个词试试～</p>
                  </div>
                );
              return results.map((it) => (
                <ListRow key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
              ));
            })()}
          </div>
        </div>
      ) : catTab !== "recommend" ? (
        <div className="mt-5">
          {(() => {
            const cat = LEARNING_ITEMS.filter((i) => i.category === catTab);
            const top = cat.slice(0, 8);
            return (
              <>
                <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                  <span>{getCategory(catTab).emoji}</span> {getCategory(catTab).name} · 精选
                </p>
                <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                  {top.map((it) => (
                    <TrackCard key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
                  ))}
                </div>
                <p className="text-sm font-bold text-gray-700 mb-2 mt-4">
                  全部 {getCategory(catTab).name}（{cat.length}）
                </p>
                <div className="space-y-3">
                  {cat.map((it) => (
                    <ListRow key={it.id} item={it} onClick={() => onOpenItem(it.id)} />
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      ) : null}
    </motion.div>
  );
}

// =================================================================== 列表
function ListScreen({
  title,
  items,
  onBack,
  onOpenItem,
}: {
  title: string;
  items: LearningItem[];
  onBack: () => void;
  onOpenItem: (id: string) => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <button onClick={onBack} className="text-sm text-gray-400 mb-2">
        ← 返回
      </button>
      <h2 className="text-xl font-extrabold text-gray-800 mb-3">{title}</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <ListRow key={item.id} item={item} onClick={() => onOpenItem(item.id)} />
        ))}
      </div>
    </motion.div>
  );
}

// =================================================================== 详情
function DetailScreen({
  itemId,
  router,
  onBack,
  onHome,
  onOpenItem,
  onGotoParent,
  onApplied,
  onCheckin,
  showToast,
}: {
  itemId: string;
  router: ReturnType<typeof useRouter>;
  onBack: () => void;
  onHome: () => void;
  onOpenItem: (id: string) => void;
  onGotoParent: () => void;
  onApplied: () => void;
  onCheckin: () => void;
  showToast: (m: string) => void;
}) {
  const item = LEARNING_ITEMS.find((i) => i.id === itemId)!;
  const c = getCategory(item.category);
  const s = getStage(item.stage);
  const f = getFormat(item.format);
  const author = item.author;
  const certified = item.certified;
  const recommendPct = item.recommendPct ?? item.book?.recommendPct;
  const readers = item.readers ?? item.book?.readers;
  const qaList = item.qa ?? [];
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState<ReturnType<typeof loadNotes>>([]);
  const [read, setRead] = useState(false);
  const [onShelf, setOnShelf] = useState(false);

  useEffect(() => {
    const readMap = loadRead();
    setNotes(loadNotes().filter((n) => n.itemId === itemId));
    setRead(!!readMap[itemId]);
    setOnShelf(!!readMap[itemId]);
  }, [itemId]);

  const relatedTasks = getRelatedTodayTasks(item);
  const sameCat = LEARNING_ITEMS.filter(
    (i) => i.category === item.category && i.id !== item.id
  ).slice(0, 3);

  const isBook = item.format === "book" && !!item.book;
  const startUrl = isBook ? item.book!.readUrl : item.externalUrl;

  const handleAddShelf = () => {
    if (!onShelf) {
      markRead(itemId);
      setOnShelf(true);
      setRead(true);
      onCheckin();
      showToast("📖 已加入我的书架");
    }
  };

  const handleStart = () => {
    if (startUrl) {
      window.open(startUrl, "_blank", "noopener,noreferrer");
      handleAddShelf();
    } else {
      handleAddShelf();
    }
  };

  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    addNote(itemId, item.title, noteText.trim());
    setNotes(loadNotes().filter((n) => n.itemId === itemId));
    setNoteText("");
    showToast("📝 笔记已保存");
  };

  const handleGotoPractice = (overrideWords?: string[]) => {
    onApplied();
    // 语音练习双入口（方案 §5）：所有需孩子参与的学习内容均可跳转声线实验室（daily 模式）
    const words =
      overrideWords && overrideWords.length
        ? overrideWords
        : item.voice_keywords && item.voice_keywords.length
        ? item.voice_keywords
        : item.relatedKeywords && item.relatedKeywords.length
        ? item.relatedKeywords
        : DEFAULT_PRACTICE_WORDS;
    const params = new URLSearchParams({
      mode: "daily",
      source: "learning_page",
      contentId: item.id,
      title: item.title,
      words: words.join(","),
    });
    router.push(`/parent/voice-lab?${params.toString()}`);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <button onClick={onBack} className="text-sm text-gray-400 mb-2">
        ← 返回
      </button>

      {/* 书籍头部：立体封面 + 信息 */}
      {isBook ? (
        <div className="rounded-2xl p-4 shadow-md bg-white border border-gray-100">
          <div className="flex gap-4">
            <BookCover
              title={item.title}
              author={item.book!.author}
              gradient={item.book!.coverGradient || item.book!.coverColor}
              width={92}
              height={128}
            />
            <div className="flex-1 min-w-0">
              <p className="font-extrabold text-lg leading-snug text-gray-800">{item.title}</p>
              <p className="text-xs text-gray-500 mt-1">{item.book!.author}</p>
              {item.book!.publisher && (
                <p className="text-[11px] text-gray-400">{item.book!.publisher}</p>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {item.book!.tags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    #{t}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                <span>♥ 推荐 {item.book!.recommendPct}%</span>
                <span>👀 {item.book!.readers} 人在读</span>
                <span>📊 {item.book!.difficulty}</span>
              </div>
            </div>
          </div>
          {item.book!.priceNote && (
            <p className="text-[11px] text-gray-400 mt-2">📍 {item.book!.priceNote}</p>
          )}
        </div>
      ) : (
        <div
          className="rounded-2xl p-4 text-white shadow-md flex items-center gap-3"
          style={{ background: `linear-gradient(135deg, ${c.color}, ${c.color}bb)` }}
        >
          <CoverThumb item={item} size={56} />
          <div className="flex-1">
            <p className="font-extrabold text-lg leading-snug">{item.title}</p>
            <p className="text-white/80 text-[11px] mt-1">
              {c.name} · {s.name} · {f.emoji} {f.name} · {item.durationLabel}
            </p>
          </div>
        </div>
      )}

      {item.sourceLabel && (
        <p className="text-[11px] text-gray-400 mt-2">
          来源：{item.sourceLabel}
          {isBook ? "（点击「开始阅读」跳转购买/试读，不转存）" : "（外部精选资源，点击跳转官方页面，不转存）"}
        </p>
      )}

      {/* 作者 + 认证专家徽章 */}
      {author && (
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs text-gray-500">{author}</p>
          {certified && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold border border-blue-100">
              👨‍⚕️ 认证专家
            </span>
          )}
        </div>
      )}

      {/* 三数据卡：康复阶段 / 推荐值 / 学习人数 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-extrabold text-indigo-600">{s.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">康复阶段</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-extrabold text-rose-500">
            {recommendPct != null ? `${recommendPct}%` : "—"}
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5">推荐值</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-sm font-extrabold text-amber-500">{readers ?? "—"}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">学习人数</p>
        </div>
      </div>

      <p className="text-sm text-gray-600 mt-3 leading-relaxed">{item.summary}</p>

      {/* 书籍：简介 / 作者简介 / 书评 */}
      {isBook && (
        <>
          <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 space-y-2">
            <p className="text-xs font-bold text-gray-700 mb-1">📖 内容简介</p>
            {item.book!.intro.map((p, i) => (
              <p key={i} className="text-sm text-gray-700 leading-relaxed">
                {p}
              </p>
            ))}
          </div>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-700 mb-1">✍️ 作者简介</p>
            <p className="text-sm text-gray-700 leading-relaxed">{item.book!.authorIntro}</p>
          </div>
          <div className="mt-3 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <p className="text-xs font-bold text-gray-700 mb-2">💬 读者评价</p>
            <div className="space-y-3">
              {item.book!.reviews.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-base flex-shrink-0">
                    {r.avatar}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-700">{r.name}</p>
                      <p className="text-[11px] text-amber-500">{"★".repeat(r.rating)}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{r.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* 非书 · 正文 */}
      {!isBook && item.body && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100 space-y-2">
          {item.body.map((p, i) => (
            <p key={i} className="text-sm text-gray-700 leading-relaxed">
              {p}
            </p>
          ))}
          {item.keyPoints && (
            <div className="mt-2">
              <p className="text-xs font-bold text-gray-600 mb-1.5">✨ 关键要点</p>
              <ul className="space-y-1">
                {item.keyPoints.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span style={{ color: c.color }}>●</span>
                    <span>{k}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {item.tips && (
            <div className="mt-2 rounded-xl bg-amber-50 p-2.5">
              {item.tips.map((t, i) => (
                <p key={i} className="text-[11px] text-amber-700 leading-relaxed">
                  💡 {t}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 家长笔记 · 答疑区（差异化核心） */}
      {qaList.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
            <span>💡</span> 家长笔记 · 答疑区
            <span className="text-[10px] font-normal text-gray-400">{qaList.length} 条家长提问</span>
          </p>
          <div className="space-y-3">
            {qaList.map((q, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-start gap-2">
                  <span className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-sm flex-shrink-0">
                    {q.parentAvatar}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-gray-600">{q.parentName}</p>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{q.parentText}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 p-2.5">
                  <span className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm flex-shrink-0">
                    👨‍⚕️
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-blue-600">治疗师回复</p>
                    <p className="text-xs text-gray-700 mt-0.5 leading-relaxed">{q.therapistText}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">
            有疑问？在下方笔记区写下你的问题，治疗师会定期回复～
          </p>
        </div>
      )}

      {/* 今日关联训练 */}
      {relatedTasks.length > 0 && (
        <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm border border-indigo-100">
          <p className="text-xs font-bold text-indigo-600 mb-2">📋 今日关联训练</p>
          <div className="space-y-2">
            {relatedTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-xl bg-indigo-50 px-3 py-2">
                <div>
                  <p className="text-xs font-bold text-gray-700">
                    {t.scene} · 🎯 {t.targetWord}
                  </p>
                  <p className="text-[10px] text-gray-400">{t.instruction}</p>
                </div>
                <button
                  onClick={() => handleGotoPractice([t.targetWord])}
                  className="text-xs font-bold text-indigo-600 bg-white rounded-full px-3 py-1.5 shadow-sm active:scale-95"
                >
                  去练习 ›
                </button>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-2">学完去做今日训练，学以致用～</p>
        </div>
      )}

      {/* 语音练习入口（方案 §5：所有需孩子参与的内容均有，跳转声线实验室 daily 模式） */}
      <button
        onClick={() => handleGotoPractice()}
        className="mt-4 w-full py-3 rounded-2xl text-sm font-bold shadow-sm bg-amber-500 text-white hover:bg-amber-600 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
      >
        🎙️ 带孩子一起练（语音练习）
      </button>

      {/* 开始阅读 / 加书架 按钮 */}
      <div className="mt-4 flex gap-2">
        {startUrl ? (
          <button
            onClick={handleStart}
            className="flex-1 py-3 rounded-2xl text-sm font-bold shadow-sm bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all"
          >
            {isBook ? "📖 开始阅读 / 购买" : "🔗 去学习 / 查看"}
          </button>
        ) : (
          <button
            onClick={handleAddShelf}
            className="flex-1 py-3 rounded-2xl text-sm font-bold shadow-sm bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all"
          >
            📚 加入书架
          </button>
        )}
        <button
          onClick={handleAddShelf}
          disabled={onShelf}
          className={`flex-1 py-3 rounded-2xl text-sm font-bold shadow-sm transition-all active:scale-[0.98] ${
            onShelf
              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
              : "bg-white text-indigo-600 border border-indigo-100"
          }`}
        >
          {onShelf ? "✅ 已在书架" : "📚 加入书架"}
        </button>
      </div>

      {/* 笔记 */}
      <div className="mt-4 rounded-2xl bg-white p-3 shadow-sm border border-gray-100">
        <p className="text-xs font-bold text-gray-600 mb-2">📝 学习笔记</p>
        <textarea
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          placeholder="记下你的心得、或想问治疗师的问题…"
          className="w-full h-20 rounded-xl bg-gray-50 border border-gray-200 p-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:border-indigo-300"
        />
        <button
          onClick={handleSaveNote}
          className="w-full mt-2 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold active:scale-[0.98] transition-all"
        >
          保存笔记
        </button>
        {notes.length > 0 && (
          <div className="mt-3 space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="rounded-xl bg-gray-50 p-2.5">
                <p className="text-xs text-gray-700">{n.text}</p>
                <p className="text-[10px] text-gray-400 mt-1">{n.date}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 相关推荐 */}
      {sameCat.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-bold text-gray-700 mb-2">🔗 相关推荐</p>
          <div className="space-y-2">
            {sameCat.map((i) => (
              <button
                key={i.id}
                onClick={() => onOpenItem(i.id)}
                className="w-full flex items-center gap-2 rounded-xl bg-white p-2.5 shadow-sm border border-gray-100 text-left active:scale-[0.99]"
              >
                <CoverThumb item={i} size={34} />
                <span className="text-xs font-semibold text-gray-700 truncate">{i.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onHome}
        className="w-full mt-4 py-3 rounded-2xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 active:scale-[0.98] transition-all"
      >
        返回首页
      </button>
    </motion.div>
  );
}

// =================================================================== 我的书架
function MineScreen({
  onBack,
  onOpenItem,
}: {
  onBack: () => void;
  onOpenItem: (id: string) => void;
}) {
  const [badges] = useState(computeBadges());
  const [streak, setStreak] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [readItems, setReadItems] = useState<{ item: LearningItem; date: string }[]>([]);
  const [notes, setNotes] = useState<ReturnType<typeof loadNotes>>([]);

  useEffect(() => {
    setStreak(calcStreak());
    setTotalDays(Object.keys(loadCheckins()).length);
    const readMap = loadRead();
    const arr = Object.keys(readMap)
      .map((id) => {
        const it = LEARNING_ITEMS.find((x) => x.id === id);
        return it ? { item: it, date: readMap[id] } : null;
      })
      .filter(Boolean) as { item: LearningItem; date: string }[];
    // 按日期倒序
    arr.sort((a, b) => (a.date < b.date ? 1 : -1));
    setReadItems(arr);
    setNotes(loadNotes());
  }, []);

  // 按形态分组
  const groups = useMemo(() => {
    const g: { key: LearningFormatId; label: string; emoji: string; items: { item: LearningItem; date: string }[] }[] = [];
    (["book", "series", "video", "article", "audio", "pdf", "live"] as LearningFormatId[]).forEach((fk) => {
      const items = readItems.filter((r) => r.item.format === fk);
      if (items.length) {
        const f = getFormat(fk);
        g.push({ key: fk, label: f.name, emoji: f.emoji, items });
      }
    });
    return g;
  }, [readItems]);

  return (
    <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
      <button onClick={onBack} className="text-sm text-gray-400 mb-2">
        ← 返回
      </button>
      <h2 className="text-xl font-extrabold text-gray-800">📖 我的书架</h2>
      <p className="text-xs text-gray-400 mt-0.5">读过的绘本 · 听过的课程 · 学过的图文，都在这里</p>

      {/* 数据卡 */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-lg font-extrabold text-indigo-600">🔥 {streak}</p>
          <p className="text-[10px] text-gray-400">连续天数</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-lg font-extrabold text-emerald-600">{totalDays}</p>
          <p className="text-[10px] text-gray-400">累计学习</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-lg font-extrabold text-rose-600">{readItems.length}</p>
          <p className="text-[10px] text-gray-400">架中书目</p>
        </div>
      </div>

      {/* 书架分组 */}
      {readItems.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100 text-center mt-4">
          <span className="text-4xl">📚</span>
          <p className="text-sm text-gray-400 mt-2">书架还是空的</p>
          <p className="text-[11px] text-gray-300 mt-1">去首页挑一本绘本或课程，点「加入书架」吧</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div key={g.key}>
              <p className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                <span>{g.emoji}</span> {g.label}
                <span className="text-[10px] font-normal text-gray-400">({g.items.length})</span>
              </p>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4">
                {g.items.map(({ item, date }) => (
                  <button
                    key={item.id}
                    onClick={() => onOpenItem(item.id)}
                    className="flex-shrink-0 w-24 text-left active:scale-95 transition-all"
                  >
                    <div className="relative">
                      <CoverThumb item={item} size={72} />
                      <span className="absolute bottom-0 left-0 right-0 text-[8px] text-white bg-black/55 px-1 py-0.5 truncate">
                        {date.slice(5)}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-gray-800 leading-tight mt-1 line-clamp-2 h-7">
                      {item.title}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 徽章墙 */}
      <p className="text-sm font-bold text-gray-700 mt-5 mb-2">🏅 我的徽章</p>
      <div className="grid grid-cols-3 gap-2">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`rounded-2xl p-3 text-center border ${
              b.unlocked
                ? "bg-gradient-to-b from-amber-50 to-white border-amber-200"
                : "bg-gray-50 border-gray-100"
            }`}
          >
            <span className={`text-3xl ${b.unlocked ? "" : "grayscale opacity-40"}`}>
              {b.emoji}
            </span>
            <p className="text-[11px] font-bold text-gray-700 mt-1">{b.name}</p>
            <p className="text-[9px] text-gray-400 mt-0.5 leading-tight">
              {b.unlocked ? b.desc : b.progress}
            </p>
          </div>
        ))}
      </div>

      {/* 笔记 */}
      <p className="text-sm font-bold text-gray-700 mt-5 mb-2">📝 我的笔记（{notes.length}）</p>
      {notes.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100 text-center">
          <span className="text-3xl">✍️</span>
          <p className="text-xs text-gray-400 mt-2">还没有笔记，去学习时记一笔吧</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => onOpenItem(n.itemId)}
              className="w-full text-left rounded-2xl bg-white p-3 shadow-sm border border-gray-100 active:scale-[0.99]"
            >
              <p className="text-xs font-bold text-indigo-600">{n.itemTitle}</p>
              <p className="text-xs text-gray-700 mt-1">{n.text}</p>
              <p className="text-[10px] text-gray-400 mt-1">{n.date}</p>
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
