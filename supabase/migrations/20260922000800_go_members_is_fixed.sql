-- Músicos fixos: pré-selecionados na criação de uma gig, além dos sócios (donos da banda).
alter table public.go_members add column is_fixed boolean not null default false;
