# Orange Data — production

Используется библиотека [node-orangedata](https://github.com/orangedata-official/node-orangedata).

ИНН: **290124976119**, ключ: **290124976119_40633**

Сертификаты и ключи для продакшен-фискализации (api.orangedata.ru:12003).

## Файлы (по умолчанию)

| Файл | Назначение |
|------|------------|
| `290124976119_40633.crt` | Клиентский сертификат (TLS) |
| `290124976119_40633.key` | Приватный ключ сертификата |
| `290124976119_40633.pfx` | PFX (альтернатива crt+key) |
| `client_ca.crt` | CA-сертификат |
| `rsa_private.pem` | Ключ для подписи X-Signature |
| `rsa_2048_public_key.xml` | Публичный ключ — загрузить в ЛК Orange Data для регистрации |

## Ключ подписи (rsa_private.pem)

Orange Data выдаёт `rsa_2048_private_key.xml`. Конвертация в PEM:

```bash
# Положите rsa_2048_private_key.xml в orange_prod/
npx tsx scripts/convert-xml-key-to-pem.ts prod
```

Создастся `orange_prod/rsa_private.pem`.

## Проверка (боевая среда)

```bash
npx tsx scripts/test-orangedata.ts
```
