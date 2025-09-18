-- 경매 데이터베이스 스키마

-- 필요한 확장 프로그램 활성화
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";

-- 품목 테이블
create table public.items (
  id bigint primary key generated always as identity,
  name_ko text not null,
  category text default '경매품목',
  created_at timestamptz default now()
);

-- 구매자/출품자 테이블
create table public.buyers (
  id bigint primary key generated always as identity,
  full_name text not null,
  note text default '',
  created_at timestamptz default now()
);

-- 주문/거래 테이블
create table public.orders (
  id bigint primary key generated always as identity,
  buyer_id bigint references public.buyers(id) on delete cascade,
  item_id bigint references public.items(id) on delete cascade,
  qty integer default 1,
  price numeric(12,2) default 0,
  purchased_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 한국어 초성 추출 함수
create or replace function public.ko_initials(s text)
returns text language plpgsql immutable as $$
declare
  i int;
  ch int;
  base int := 44032;       -- '가'
  choseong text[] := array[
    'ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'
  ];
  res text := '';
  code int;
  idx int;
begin
  if s is null then return null; end if;
  for i in 1..char_length(s) loop
    code := ascii(substr(s,i,1));
    if code between 44032 and 55203 then
      idx := (code - base) / 588 + 1; -- 초성 index (1..19)
      res := res || choseong[idx];
    elsif substr(s,i,1) ~ '[A-Za-z0-9]' then
      -- 영문/숫자는 그대로(초성 검색 보조용)
      res := res || lower(substr(s,i,1));
    end if;
  end loop;
  return res;
end $$;

-- 검색 정규화 함수 (unaccent 없이)
create or replace function public.norm(s text)
returns text language sql immutable as $$
  select lower(regexp_replace(s, '\s+', '', 'g'));
$$;

-- 통합 검색용 뷰
create view public.search_keys as
select 
  'item' as kind,
  i.id,
  i.name_ko as title,
  i.category,
  norm(i.name_ko) as norm_text,
  ko_initials(i.name_ko) as initials
from public.items i
union all
select 
  'buyer' as kind,
  b.id,
  b.full_name as title,
  b.note as category,
  norm(b.full_name) as norm_text,
  ko_initials(b.full_name) as initials
from public.buyers b
union all
select 
  'order' as kind,
  o.id,
  (i.name_ko || ' (' || b.full_name || ')') as title,
  ('수량: ' || o.qty || ', 가격: ' || o.price || '원') as category,
  norm(i.name_ko || ' ' || b.full_name) as norm_text,
  ko_initials(i.name_ko || ' ' || b.full_name) as initials
from public.orders o
join public.items i on i.id = o.item_id
join public.buyers b on b.id = o.buyer_id;

-- 인덱스 생성
create index idx_items_name_ko on public.items using gin (name_ko gin_trgm_ops);
create index idx_items_norm on public.items (norm(name_ko));
create index idx_buyers_name on public.buyers using gin (full_name gin_trgm_ops);
create index idx_buyers_norm on public.buyers (norm(full_name));
create index idx_orders_created_at on public.orders (created_at desc);

-- 통합 검색 함수
create or replace function public.search_entities(query text)
returns table (
  kind text,
  id bigint,
  title text,
  category text,
  rank real
) language plpgsql as $$
declare
  nq text := norm(query);
  iq text := ko_initials(query);
begin
  return query
  with qn as (select nq, iq),
  filtered as (
    select 
      sk.kind,
      sk.id,
      sk.title,
      sk.category,
      case 
        -- 정확한 매치 (가중치 1.0)
        when norm_text = (select nq from qn) then 1.0
        -- 정확한 초성 매치 (가중치 0.9)
        when initials = (select iq from qn) then 0.9
        -- 시작 부분 매치 (가중치 0.8)
        when norm_text like (select nq from qn) || '%' then 0.8
        -- 초성으로 시작 (가중치 0.7)
        when initials like (select iq from qn) || '%' then 0.7
        -- 부분 매치 (가중치 0.6)
        when norm_text like '%' || (select nq from qn) || '%' then 0.6
        -- 초성 부분 매치 (가중치 0.5)
        when initials like '%' || (select iq from qn) || '%' then 0.5
        else 0.0
      end as rank
    from search_keys sk, qn
    where 
      norm_text like '%' || nq || '%'
      or initials like '%' || iq || '%'
  )
  select 
    f.kind,
    f.id,
    f.title,
    f.category,
    f.rank
  from filtered f
  where f.rank > 0
  order by f.rank desc, f.title
  limit 50;
end $$;

-- RLS 정책 설정
alter table public.items enable row level security;
alter table public.buyers enable row level security;
alter table public.orders enable row level security;

-- 읽기 권한 (모든 사용자)
create policy "read_all" on items for select using (true);
create policy "read_all" on buyers for select using (true);
create policy "read_all" on orders for select using (true);

-- 쓰기 권한 (인증된 사용자)
create policy "write_auth" on items for insert with check (true);
create policy "write_auth" on buyers for insert with check (true);
create policy "write_auth" on orders for insert with check (true);

-- RPC 함수 실행 권한
grant execute on function public.search_entities(text) to anon;
grant execute on function public.ko_initials(text) to anon;
grant execute on function public.norm(text) to anon;