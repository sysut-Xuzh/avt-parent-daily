-- =============================================================
-- AVT 康复圈（社区）后端 Schema
-- 真实用户数据：帖子 / 评论 / 点赞 / 收藏 / 治疗师认证
-- 外键指向 auth.users（Supabase 认证表），保证匿名/真实登录用户都可写入，
-- 不依赖业务 users 表（该表当前为空，登录 upsert 被 RLS 拦截）。
-- =============================================================

-- 1. 帖子表（作者信息做快照冗余，避免 JOIN，也支持系统/演示帖无 user_id）
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'experience'
    CHECK (type IN ('checkin', 'experience', 'therapist', 'qa', 'system')),
  channel TEXT NOT NULL DEFAULT 'mood',
  content TEXT NOT NULL,
  media JSONB DEFAULT '[]'::jsonb,            -- [{kind,caption,gradient,duration}]
  tags TEXT[] DEFAULT '{}',
  stage_tag TEXT,                              -- 作者康复阶段 key（detection/association/...）
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '🙂',
  author_role TEXT DEFAULT 'parent',
  author_verified BOOLEAN DEFAULT false,
  author_org TEXT,
  author_stage_label TEXT,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  favorite_count INT DEFAULT 0,
  share_count INT DEFAULT 0,
  is_negative BOOLEAN DEFAULT false,
  related_task TEXT,
  therapist_reply TEXT,
  status TEXT DEFAULT 'published'
    CHECK (status IN ('published', 'reviewing', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 评论表
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT DEFAULT '🙂',
  author_role TEXT DEFAULT 'parent',
  author_verified BOOLEAN DEFAULT false,
  is_therapist_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 点赞表（唯一约束防重复点赞）
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 4. 收藏表（唯一约束防重复收藏）
CREATE TABLE IF NOT EXISTS collects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 5. 治疗师认证表
CREATE TABLE IF NOT EXISTS therapist_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  real_name TEXT,
  institution TEXT,
  title TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- =============================================================
-- 索引
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes (user_id);
CREATE INDEX IF NOT EXISTS idx_collects_user ON collects (user_id);
CREATE INDEX IF NOT EXISTS idx_therapist_verified ON therapist_verifications (is_verified);

-- =============================================================
-- 行级安全策略（RLS）
-- 原则（与现有 002_rls.sql 一致）：所有人可见已发布内容；仅作者可改/删；
-- 点赞/收藏/评论仅本人可操作。
-- =============================================================
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collects ENABLE ROW LEVEL SECURITY;
ALTER TABLE therapist_verifications ENABLE ROW LEVEL SECURITY;

-- 可重复执行：先删除旧策略
DROP POLICY IF EXISTS "posts_public_read" ON posts;
DROP POLICY IF EXISTS "posts_insert_self" ON posts;
DROP POLICY IF EXISTS "posts_update_self" ON posts;
DROP POLICY IF EXISTS "posts_delete_self" ON posts;
DROP POLICY IF EXISTS "comments_public_read" ON comments;
DROP POLICY IF EXISTS "comments_insert_self" ON comments;
DROP POLICY IF EXISTS "comments_delete_self" ON comments;
DROP POLICY IF EXISTS "likes_self" ON likes;
DROP POLICY IF EXISTS "collects_self" ON collects;
DROP POLICY IF EXISTS "therapist_public_read" ON therapist_verifications;
DROP POLICY IF EXISTS "therapist_insert_self" ON therapist_verifications;
DROP POLICY IF EXISTS "therapist_update_self" ON therapist_verifications;

-- posts：已发布内容对所有人可见
CREATE POLICY "posts_public_read" ON posts
  FOR SELECT USING (status = 'published');
-- posts：登录用户可发自己的帖
CREATE POLICY "posts_insert_self" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- posts：作者可改/删自己的帖
CREATE POLICY "posts_update_self" ON posts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_self" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- comments：所有人可见
CREATE POLICY "comments_public_read" ON comments
  FOR SELECT USING (true);
-- comments：登录用户可发自己的评论
CREATE POLICY "comments_insert_self" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);
-- comments：作者可删自己的评论
CREATE POLICY "comments_delete_self" ON comments
  FOR DELETE USING (auth.uid() = user_id);

-- likes：仅本人可读写
CREATE POLICY "likes_self" ON likes
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- collects：仅本人可读写
CREATE POLICY "collects_self" ON collects
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- therapist_verifications：已认证的治疗师信息公开可见；本人可写
CREATE POLICY "therapist_public_read" ON therapist_verifications
  FOR SELECT USING (is_verified = true OR auth.uid() = user_id);
CREATE POLICY "therapist_insert_self" ON therapist_verifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "therapist_update_self" ON therapist_verifications
  FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================
-- 触发器：点赞 / 收藏 / 评论 计数自动维护
-- =============================================================
CREATE OR REPLACE FUNCTION bump_like_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION bump_favorite_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET favorite_count = favorite_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET favorite_count = GREATEST(0, favorite_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION bump_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSE
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION bump_like_count();

DROP TRIGGER IF EXISTS on_collect_change ON collects;
CREATE TRIGGER on_collect_change
  AFTER INSERT OR DELETE ON collects
  FOR EACH ROW EXECUTE FUNCTION bump_favorite_count();

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION bump_comment_count();

-- =============================================================
-- 种子内容（演示帖 + 评论）。使用美元引号避免中文/符号转义问题。
-- user_id 为 NULL 的演示帖无需 auth 账号即可展示；真实用户登录后发帖会带 user_id。
-- =============================================================

-- 帖子（显式 UUID 便于评论关联）
INSERT INTO posts (id, user_id, type, channel, content, media, tags, stage_tag,
  author_name, author_avatar, author_role, author_verified, author_org, author_stage_label,
  like_count, comment_count, favorite_count, share_count, is_negative, related_task, therapist_reply, created_at)
VALUES
('b0000000-0000-0000-0000-000000000001', NULL, 'checkin', 'checkin',
  $$今天练习「动物叫声辨识」，宝宝第一次主动指向了小狗的卡片！🎉 之前一直没反应，今天突然就对了，眼泪都要出来了。坚持真的有用。$$,
  '[{"kind":"image","caption":"训练现场","gradient":"linear-gradient(135deg,#fbcfe8,#f9a8d4)"},{"kind":"image","caption":"卡片展示","gradient":"linear-gradient(135deg,#bfdbfe,#a5b4fc)"}]'::jsonb,
  ARRAY['今日训练打卡','术后6个月','动物叫声'], 'adapt',
  '张妈妈', '🐰', 'parent', false, NULL, '术后6个月 · 适应期',
  23, 2, 5, 2, false, '动物叫声辨识',
  $$李治疗师：主动指向说明已建立声音—意义联结，建议加入「指认+命名」。$$,
  now() - interval '2 hours'),

('b0000000-0000-0000-0000-000000000002', NULL, 'therapist', 'device',
  $$【每周技巧】声母 b/p 的家庭辨听训练
很多家长反馈孩子 b/p 分不清。今天分享一个厨房就能做的游戏：准备「杯子」和「盘子」，你藏起来一样让孩子听声音找。先只练听，不要求说，降低压力。$$,
  '[{"kind":"video","caption":"03:24 教学短视频","gradient":"linear-gradient(135deg,#c7d2fe,#a5b4fc)","duration":"03:24"}]'::jsonb,
  ARRAY['治疗师专栏','声母训练','家庭游戏'], 'adapt',
  '李治疗师', '🩺', 'therapist', true, '听语康复中心', '认证专家',
  156, 2, 48, 21, false, NULL,
  $$李治疗师：识别阶段稳定后（约术后6-12个月）可引入，以听为主。$$,
  now() - interval '5 hours'),

('b0000000-0000-0000-0000-000000000003', NULL, 'qa', 'mood',
  $$孩子下周要上幼儿园了，焦虑得睡不着。有没有过来人分享下融合经验？特别是怎么和老师沟通孩子的听力情况。$$,
  '[]'::jsonb, ARRAY['心情树洞','融合准备','幼儿园'], 'integrate',
  '王爸爸', '🐻', 'parent', false, NULL, '术后2年 · 融合期',
  45, 1, 12, 3, false, NULL, NULL,
  now() - interval '26 hours'),

('b0000000-0000-0000-0000-000000000004', NULL, 'experience', 'checkin',
  $$分享一个「听觉轰炸」小游戏：洗澡时反复说「水～水～水」，配合水流声，孩子现在一听到开水龙头就笑。每天固定一个场景+一个词，效果比随机说好太多。$$,
  '[{"kind":"image","caption":"浴室场景","gradient":"linear-gradient(135deg,#bae6fd,#7dd3fc)"},{"kind":"image","caption":"互动瞬间","gradient":"linear-gradient(135deg,#a7f3d0,#6ee7b7)"},{"kind":"image","caption":"记录卡","gradient":"linear-gradient(135deg,#fde68a,#fcd34d)"}]'::jsonb,
  ARRAY['经验分享','听觉轰炸','家庭游戏'], 'adapt',
  '刘妈妈', '🐱', 'parent', false, NULL, '术后6个月 · 适应期',
  67, 1, 19, 8, false, NULL, NULL,
  now() - interval '8 hours'),

('b0000000-0000-0000-0000-000000000005', NULL, 'qa', 'device',
  $$刚开机第3天，孩子总去抓处理器，正常吗？怎么固定比较好？晚上睡觉要不要摘？$$,
  '[]'::jsonb, ARRAY['设备养护','初配期','问答'], 'initial',
  '周爸爸', '🐯', 'parent', false, NULL, '术后初配期',
  12, 1, 3, 1, false, NULL,
  $$王治疗师：初期抓挠常见，用固定头带+渐进佩戴；夜间摘下放干燥盒。$$,
  now() - interval '10 hours'),

('b0000000-0000-0000-0000-000000000006', NULL, 'system', 'checkin',
  $$🎉 恭喜 朵朵（术后8个月）完成连续 30 天训练打卡！每一天的坚持，都是通往清晰世界的脚步。下一位连续打卡王会是你吗？$$,
  '[{"kind":"image","caption":"里程碑祝贺","gradient":"linear-gradient(135deg,#fecdd3,#fda4af)"}]'::jsonb,
  ARRAY['系统精选','打卡里程碑'], 'adapt',
  '康复圈小助手', '🎈', 'platform', false, NULL, '平台官方',
  30, 0, 9, 6, false, NULL, NULL,
  now() - interval '30 hours'),

('b0000000-0000-0000-0000-000000000007', NULL, 'experience', 'mood',
  $$今天孩子第一次自己说出了「爸爸」，没有提示，眼泪一下就止不住了。这一年的崩溃都值了。$$,
  '[{"kind":"image","caption":"温馨瞬间","gradient":"linear-gradient(135deg,#fbcfe8,#f9a8d4)"}]'::jsonb,
  ARRAY['心情树洞','提升期','第一次说话'], 'improve',
  '赵妈妈', '🦊', 'parent', false, NULL, '术后1年 · 提升期',
  89, 1, 22, 14, false, NULL, NULL,
  now() - interval '12 hours'),

('b0000000-0000-0000-0000-000000000008', NULL, 'checkin', 'integrate',
  $$今天在公园，孩子主动和小朋友打招呼说「你好」！融合训练慢慢看到成效，老母亲欣慰。$$,
  '[{"kind":"image","caption":"公园社交","gradient":"linear-gradient(135deg,#a7f3d0,#6ee7b7)"}]'::jsonb,
  ARRAY['融合准备','今日训练打卡','社交'], 'integrate',
  '孙妈妈', '🐼', 'parent', false, NULL, '术后2年 · 融合期',
  54, 0, 11, 4, false, NULL, NULL,
  now() - interval '34 hours'),

('b0000000-0000-0000-0000-000000000009', NULL, 'therapist', 'integrate',
  $$开学季融合准备清单（家长版）：
1. 给老师的一页纸：孩子听力情况+设备说明+应急联系人
2. 和孩子练习「我戴了助听器，听不清时会请你重复」
3. 准备 spare 电池/干燥盒放学校
4. 前两周每天和老师简短沟通一次$$,
  '[{"kind":"image","caption":"清单图1","gradient":"linear-gradient(135deg,#fde68a,#fcd34d)"},{"kind":"image","caption":"清单图2","gradient":"linear-gradient(135deg,#bfdbfe,#a5b4fc)"}]'::jsonb,
  ARRAY['融合准备','治疗师专栏','开学季'], 'improve',
  '王治疗师', '🧑‍⚕️', 'therapist', true, '听语康复中心', '认证专家',
  120, 1, 40, 33, false, NULL, NULL,
  now() - interval '50 hours'),

('b0000000-0000-0000-0000-000000000010', NULL, 'experience', 'checkin',
  $$用绘本做辨听游戏的小技巧：读《好饿的毛毛虫》时，把「毛毛虫」这个词说得特别慢、特别清楚，其他词正常语速，孩子很快就学会在这页等这个词了。$$,
  '[{"kind":"image","caption":"绘本共读","gradient":"linear-gradient(135deg,#ddd6fe,#c4b5fd)"},{"kind":"image","caption":"重点词卡","gradient":"linear-gradient(135deg,#fbcfe8,#f9a8d4)"}]'::jsonb,
  ARRAY['经验分享','绘本共读','辨听游戏'], 'adapt',
  '吴妈妈', '🐹', 'parent', false, NULL, '术后6个月 · 适应期',
  41, 1, 13, 5, false, NULL, NULL,
  now() - interval '72 hours'),

('b0000000-0000-0000-0000-000000000011', NULL, 'qa', 'device',
  $$调机后声音好像变小了，正常吗？需要马上回去调吗？$$,
  '[]'::jsonb, ARRAY['设备养护','问答','调机'], 'initial',
  '李妈妈', '🐰', 'parent', false, NULL, '术后初配期',
  9, 1, 2, 0, false, NULL,
  $$李治疗师：短期适应可能，明显变小或抗拒请联系调机师。$$,
  now() - interval '96 hours'),

('b0000000-0000-0000-0000-000000000012', NULL, 'experience', 'mood',
  $$最近真的要崩溃了，感觉孩子戴了助听器还是没反应，是不是我哪里做错了…每天都很焦虑，晚上睡不着。$$,
  '[]'::jsonb, ARRAY['心情树洞','焦虑','适应期'], 'adapt',
  '陈妈妈', '🐥', 'parent', false, NULL, '术后3个月 · 适应期',
  8, 1, 1, 0, true, NULL, NULL,
  now() - interval '6 hours');

-- 评论（关联上面的帖子；user_id 为 NULL 的演示评论也无需账号）
INSERT INTO comments (post_id, user_id, content, author_name, author_avatar, author_role, author_verified, is_therapist_reply, created_at)
VALUES
('b0000000-0000-0000-0000-000000000001', NULL,
  $$太棒了！主动指向说明孩子已经建立了「声音—意义」的联结，这是辨听的重要一步。建议接下来加入「指认+命名」组合，巩固得更快。$$,
  '李治疗师', '🩺', 'therapist', true, true, now() - interval '1 hour'),
('b0000000-0000-0000-0000-000000000001', NULL,
  $$同款感动！我们一起加油💪$$, '刘妈妈', '🐱', 'parent', false, false, now() - interval '40 minutes'),

('b0000000-0000-0000-0000-000000000002', NULL,
  $$请问几岁开始练声母比较好？$$, '王爸爸', '🐻', 'parent', false, false, now() - interval '3 hours'),
('b0000000-0000-0000-0000-000000000002', NULL,
  $$一般孩子在「识别」阶段稳定后（约术后6-12个月）就可以引入，但要以听为主，别急着纠发音。$$,
  '李治疗师', '🩺', 'therapist', true, true, now() - interval '2 hours'),

('b0000000-0000-0000-0000-000000000003', NULL,
  $$提前和老师约一次面谈，把孩子的设备、应急处理方式写一张小卡片给老师，超有用！$$,
  '赵妈妈', '🦊', 'parent', false, false, now() - interval '22 hours'),

('b0000000-0000-0000-0000-000000000004', NULL,
  $$收藏了！明天就试$$, '孙妈妈', '🐼', 'parent', false, false, now() - interval '6 hours'),

('b0000000-0000-0000-0000-000000000005', NULL,
  $$开机初期抓挠很常见，可以用固定头带+逐渐延长佩戴时长来适应。夜间睡眠建议摘下并放入干燥盒，具体以调机师方案为准。$$,
  '王治疗师', '🧑‍⚕️', 'therapist', true, true, now() - interval '9 hours'),

('b0000000-0000-0000-0000-000000000007', NULL,
  $$看哭了😭 替你开心$$, '钱妈妈', '🐹', 'parent', false, false, now() - interval '11 hours'),

('b0000000-0000-0000-0000-000000000009', NULL,
  $$正需要这个，谢谢老师！$$, '王爸爸', '🐻', 'parent', false, false, now() - interval '1 day'),

('b0000000-0000-0000-0000-000000000010', NULL,
  $$我们也在读这本！试试看$$, '张妈妈', '🐰', 'parent', false, false, now() - interval '2 days'),

('b0000000-0000-0000-0000-000000000011', NULL,
  $$调机后短时间内有适应过程是可能的，但如果明显变小或孩子抗拒，建议联系调机师评估，不要自行调大。$$,
  '李治疗师', '🩺', 'therapist', true, true, now() - interval '4 days'),

('b0000000-0000-0000-0000-000000000012', NULL,
  $$抱抱，3个月还在适应期，别给自己太大压力，你已经做得很好了。$$,
  '刘妈妈', '🐱', 'parent', false, false, now() - interval '5 hours');
