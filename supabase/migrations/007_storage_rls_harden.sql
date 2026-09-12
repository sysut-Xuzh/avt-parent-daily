-- 收紧 storage.objects SELECT 策略
-- 目的：解决 "broad SELECT policy on storage.objects" 安全警告
-- 效果：只允许已登录用户列出文件列表；已公开的录音文件通过 public URL 播放不受影响

DROP POLICY IF EXISTS "public_view" ON storage.objects;

CREATE POLICY "auth_view" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio-recordings'
    AND auth.role() = 'authenticated'
  );
