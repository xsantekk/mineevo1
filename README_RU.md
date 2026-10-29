# «Глубокая шахта» — перенос с Netlify на Cloudflare Pages

В архив включены:
- `public/index.html` — опубликованная HTML-игра из ZIP Netlify;
- `functions/api/leaderboard.ts` — Cloudflare Pages Function для `GET` и `POST /api/leaderboard`;
- `migrations/0001_create_players.sql` — схема базы Cloudflare D1;
- этот файл с инструкцией.

## Важные ограничения архива

ZIP, который скачан из Netlify, содержит код сайта, функцию Netlify и SQL-миграции, но не содержит самих записей базы данных. Поэтому код рейтинга переносится, но старые записи игроков автоматически не переносятся. Для переноса существующего топа понадобится экспорт данных из исходной базы Netlify.

## Развёртывание

### 1. Создайте GitHub-репозиторий
Создайте новый пустой репозиторий, например `glubokaya-shahta-cloudflare`, и загрузите в него содержимое этого архива с сохранением структуры папок.

### 2. Создайте Cloudflare D1
Войдите в https://dash.cloudflare.com/ → **Workers & Pages** → **D1 SQL Database** → **Create database**. Назовите базу `glubokaya-shahta-db`.

Откройте созданную базу → **Console** и выполните весь SQL из `migrations/0001_create_players.sql`.

### 3. Создайте Pages-проект из Git
Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**. Выберите репозиторий.

Настройки сборки:
- Framework preset: `None`
- Build command: оставить пустым
- Build output directory: `public`
- Root directory: пусто (корень репозитория)

Подтвердите деплой.

### 4. Подключите D1 к функции
Откройте проект Pages → **Settings** → **Bindings** → **Add** → **D1 database**.
- Variable name: `DB` (важно: точно `DB`, заглавными буквами)
- Database: `glubokaya-shahta-db`

Сохраните настройки и выполните **Redeploy** проекта. Функция должна обслуживать `/api/leaderboard`.

### 5. Проверка
Откройте адрес `https://ИМЯ-ПРОЕКТА.pages.dev/api/leaderboard`.
Если всё подключено, ожидается JSON-массив, например `[]`, а не HTML-страница или ошибка 500/503.

После этого откройте главную страницу, введите уникальный никнейм и проверьте, что он сохраняется в рейтинге.

## Как обновлять игру с телефона
После подключения GitHub можно обновлять только `public/index.html`: откройте файл в репозитории, нажмите Edit (карандаш), замените содержимое, затем Commit changes. Cloudflare автоматически запустит новый деплой. Не удаляйте папки `functions` и `migrations`, если хотите сохранить рейтинг.

## Почему нельзя просто загрузить ZIP через Direct Upload
Cloudflare Pages Direct Upload через панель не поддерживает Pages Functions. Для сохранения серверной части проект нужно развернуть через Git-интеграцию или Wrangler CLI. См. официальные документы:
- https://developers.cloudflare.com/pages/migrations/migrating-from-netlify/
- https://developers.cloudflare.com/pages/functions/get-started/
- https://developers.cloudflare.com/pages/functions/bindings/

## Примечание о безопасности и честности рейтинга
Как и исходная Netlify-функция, этот API принимает игровые показатели от клиента. Проверяются формат и диапазоны, но это не античит: технически пользователь может отправить поддельный уровень/баланс. Для обычного публичного рейтинга это базовый вариант, а не защищённая игровая экономика.
