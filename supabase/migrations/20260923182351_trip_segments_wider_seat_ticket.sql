-- A flight with several passengers has one `seat` and one `ticket_number` field that hold ALL of
-- their values, comma-separated ("12A, 12B, 12C"; up to 9 passengers). The original limits (16 / 32
-- characters) only fit a single passenger, so widen them. Same shape as before: NULL, or non-blank
-- (plain `btrim()` only strips U+0020, hence the explicit whitespace set) and within the limit.

alter table public.trip_segments
  drop constraint trip_segments_seat_len,
  drop constraint trip_segments_ticket_len;

alter table public.trip_segments
  add constraint trip_segments_seat_len check (seat is null
                                               or (char_length(seat) <= 64
                                                   and btrim(seat, E' \t\r\n') <> '')),
  add constraint trip_segments_ticket_len check (ticket_number is null
                                                 or (char_length(ticket_number) <= 160
                                                     and btrim(ticket_number, E' \t\r\n') <> ''));
