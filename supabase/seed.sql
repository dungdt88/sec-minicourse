-- Local development only. Hosted projects are set up with scripts/bootstrap.ts.
insert into teams (slug, name) values ('default', 'Đội Magic') on conflict (slug) do nothing;
