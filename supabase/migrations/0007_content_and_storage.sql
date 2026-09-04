-- ============================================================================
-- Login-page content management + a public asset bucket (first Storage use)
-- ============================================================================

create table content_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null,            -- field_note | from_the_hide | on_birding
  body text not null,
  attribution text,
  sort_order int default 0,
  is_active boolean default true,
  created_by uuid references members,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index content_entries_cat on content_entries (category, sort_order);

create table collage_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,        -- object path inside the public-assets bucket
  alt text,
  sort_order int default 0,
  is_active boolean default true,
  created_by uuid references members,
  created_at timestamptz default now()
);

alter table content_entries enable row level security;
alter table collage_images enable row level security;

-- Readable by anyone signed in; the login page itself reads via service role.
create policy content_entries_read on content_entries for select to authenticated using (true);
create policy content_entries_write on content_entries for all to authenticated
  using (is_officer()) with check (is_officer());

create policy collage_images_read on collage_images for select to authenticated using (true);
create policy collage_images_write on collage_images for all to authenticated
  using (is_officer()) with check (is_officer());

grant select, insert, update, delete on content_entries to authenticated, service_role;
grant select, insert, update, delete on collage_images to authenticated, service_role;

-- ---- Storage: public bucket for login collage images ----------------
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

create policy "public-assets read"
  on storage.objects for select
  using (bucket_id = 'public-assets');

create policy "public-assets officer insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'public-assets' and public.is_officer());

create policy "public-assets officer update"
  on storage.objects for update to authenticated
  using (bucket_id = 'public-assets' and public.is_officer())
  with check (bucket_id = 'public-assets' and public.is_officer());

create policy "public-assets officer delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'public-assets' and public.is_officer());

-- ---- Seed the current hardcoded login copy --------------------------
insert into content_entries (category, body, attribution, sort_order) values
('field_note','The Indian Roller is the state bird of Telangana, Andhra Pradesh, Karnataka and Odisha — four states claim the same blue.','Coracias benghalensis · resident, common on wires',0),
('field_note','A Coppersmith Barbet''s call is measured at roughly 108 notes a minute, and it keeps that rate up for several minutes at a stretch.','Psilopogon haemacephalus · resident',1),
('field_note','Painted Storks nest colonially and feed by touch — the half-open bill sweeps through water until it closes on contact.','Mycteria leucocephala · resident, breeds Jul–Oct',2),
('field_note','The Indian Pitta arrives with the monsoon and is heard far more often than it is seen. Its two-note whistle carries at dusk.','Pitta brachyura · breeding visitor',3),
('field_note','Spot-billed Pelicans breed at only a handful of colonies in south India. Nelapattu and Kolleru hold the largest.','Pelecanus philippensis · near-threatened',4),
('field_note','Bar-headed Geese cross the Himalaya on migration, flying at altitudes where oxygen is a third of sea-level.','Anser indicus · winter visitor',5),
('from_the_hide','“Nothing rare here today,” said the member who had left the hide four minutes before the Pitta walked out.','Every walk, ever',0),
('from_the_hide','A birder''s estimate of distance: fifty metres, give or take fifty metres.','Field note, unattributed',1),
('from_the_hide','The bird was almost certainly a warbler. The photograph confirms it was almost certainly a leaf.','WhatsApp group, 6:42 am',2),
('from_the_hide','Two birders, three identifications. The third belongs to whoever brought the flask.','Osman Sagar, any Sunday',3),
('from_the_hide','The rarest bird in Hyderabad is the one that waits until you have packed the scope.','Collected wisdom',4),
('from_the_hide','Attendance at the 5 am meeting point is perfect. Attendance at the 5 pm minutes review is not.','The Secretary',5),
('on_birding','A bird does not sing because it has an answer. It sings because it has a song.','Chinese proverb',0),
('on_birding','In order to see birds it is necessary to become a part of the silence.','Robert Lynd',1),
('on_birding','Birds are indicators of the environment. If they are in trouble, we know we''ll soon be in trouble.','Roger Tory Peterson',2),
('on_birding','The bird of paradise alights only upon the hand that does not grasp.','John Berry',3),
('on_birding','I hope you love birds too. It is economical. It saves going to heaven.','Emily Dickinson',4),
('on_birding','To watch birds is to notice, and to notice is the beginning of care.','Collected, Deccan Birders',5);
