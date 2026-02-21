-- Auto-create a public.users row when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, vibe_chips, vibe_coins, is_shadowbanned)
  values (new.id, 0, 0, false);
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if present, then create
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
