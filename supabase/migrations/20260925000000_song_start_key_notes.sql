-- Tom pedido à harmonia para iniciar a música (ex: a música é em C mas começa em Am) e observações livres.
alter table public.songs add column start_key text;
alter table public.songs add column notes text;
