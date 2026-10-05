-- Las cuentas que ya existían se dan por confirmadas.
--
-- A partir de ahora hay que confirmar el correo para entrar; sin esta línea,
-- todo el que se registró antes se quedaría fuera de su propia cuenta por una
-- comprobación que no existía cuando la creó. Solo afecta a las filas de hoy:
-- las cuentas nuevas nacen con email_verified = false.
UPDATE "user" SET "email_verified" = true WHERE "email_verified" = false;
