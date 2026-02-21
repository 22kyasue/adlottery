-- Trigger to automatically create a public user record when a new user signs up via Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, vibe_chips, vibe_coins, is_shadowbanned)
  values (new.id, 0, 0, false);
  return new;
end;
$$ language plpgsql security definer;

-- Trigger definition
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
