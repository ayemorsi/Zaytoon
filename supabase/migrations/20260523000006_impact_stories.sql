-- Impact stories table: nonprofit-submitted updates shown on the Impact tab
create table impact_stories (
  id uuid primary key default gen_random_uuid(),
  nonprofit_id uuid references nonprofits(id) on delete cascade,
  emoji text not null,
  title text not null,
  body text not null,
  cause_tag text not null,
  created_at timestamptz default now()
);

alter table impact_stories enable row level security;
create policy "Public read" on impact_stories for select using (true);

-- Seed stories for the 5 seed nonprofits (resolved by name so UUIDs don't need to be known)
do $$
declare
  nid uuid;
begin
  select id into nid from nonprofits where name = 'Islamic Relief USA';
  if nid is not null then
    insert into impact_stories (nonprofit_id, emoji, title, body, cause_tag, created_at) values
      (nid, '🍞', 'Fresh Bread for 50 Families',
       'Your round-ups helped run our community kitchen for an extra day, providing warm meals to 50 local families in need.',
       'Food Security', now() - interval '2 days'),
      (nid, '🏥', 'Mobile Clinic Serves Rural Village',
       'Accumulated sadaqah funded a mobile medical clinic visit, providing free check-ups and medicines to 120 families.',
       'Medical Aid', now() - interval '9 days');
  end if;

  select id into nid from nonprofits where name = 'Helping Hand for Relief & Development';
  if nid is not null then
    insert into impact_stories (nonprofit_id, emoji, title, body, cause_tag, created_at) values
      (nid, '👶', 'School Supplies for 80 Orphans',
       'Thanks to collective round-ups, we delivered backpacks filled with notebooks, pencils, and supplies to 80 children in our care.',
       'Orphan Support', now() - interval '4 days'),
      (nid, '🌾', 'Food Packages Before Eid',
       'We distributed 200 food parcels to vulnerable families just before Eid, ensuring no one celebrated on an empty stomach.',
       'Food Security', now() - interval '14 days');
  end if;

  select id into nid from nonprofits where name = 'Zakat Foundation of America';
  if nid is not null then
    insert into impact_stories (nonprofit_id, emoji, title, body, cause_tag, created_at) values
      (nid, '🏠', 'Emergency Shelter for Displaced Families',
       'Your spare change helped us provide temporary shelter kits to 30 refugee families displaced by recent flooding.',
       'Refugees', now() - interval '6 days'),
      (nid, '💊', 'Medicine for 500 Patients',
       'A batch of donations covered the cost of essential medications for 500 patients at our partner clinics this month.',
       'Medical Aid', now() - interval '20 days');
  end if;

  select id into nid from nonprofits where name = 'Penny Appeal USA';
  if nid is not null then
    insert into impact_stories (nonprofit_id, emoji, title, body, cause_tag, created_at) values
      (nid, '📚', 'New Supplies for the Semester',
       'Collective round-ups fully funded notebooks, pencils, and learning materials for two classrooms at our partner school.',
       'Education', now() - interval '1 week'),
      (nid, '💧', 'Clean Water for a Village',
       'A new hand-pump well was installed in a rural community, giving 400 residents access to clean drinking water year-round.',
       'Clean Water', now() - interval '18 days');
  end if;

  select id into nid from nonprofits where name = 'Masjid Al-Nour Foundation';
  if nid is not null then
    insert into impact_stories (nonprofit_id, emoji, title, body, cause_tag, created_at) values
      (nid, '🕌', 'Quran Classes for 30 Youth',
       'Your donations helped us launch a weekend Quran memorization program for 30 children in our community.',
       'Masjids', now() - interval '3 days'),
      (nid, '📖', 'Friday Khutbah Outreach Expanded',
       'We were able to live-stream Friday prayers to 500+ households who cannot attend in person, alhamdulillah.',
       'Masjids', now() - interval '10 days');
  end if;
end $$;
