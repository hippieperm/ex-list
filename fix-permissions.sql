-- Supabase 권한 문제 해결을 위한 SQL

-- 기존 정책 삭제
drop policy if exists "read_all" on public.items;
drop policy if exists "read_all" on public.buyers;
drop policy if exists "read_all" on public.orders;
drop policy if exists "write_auth" on public.items;
drop policy if exists "write_auth" on public.buyers;
drop policy if exists "write_auth" on public.orders;

-- 모든 사용자에게 읽기 권한 부여
create policy "Allow all read" on public.items for select using (true);
create policy "Allow all read" on public.buyers for select using (true);
create policy "Allow all read" on public.orders for select using (true);

-- 모든 사용자에게 쓰기 권한 부여 (테스트용)
create policy "Allow all insert" on public.items for insert with check (true);
create policy "Allow all insert" on public.buyers for insert with check (true);
create policy "Allow all insert" on public.orders for insert with check (true);

-- anon 역할에 테이블 접근 권한 부여
grant usage on schema public to anon;
grant select, insert, update, delete on public.items to anon;
grant select, insert, update, delete on public.buyers to anon;
grant select, insert, update, delete on public.orders to anon;

-- 시퀀스 권한 부여
grant usage, select on all sequences in schema public to anon;

