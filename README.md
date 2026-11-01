# VEERO FACEIT Dashboard

Личный сайт-профиль для FACEIT CS2 на ASP.NET Core + HTML/CSS/JavaScript.

## Требования

- .NET 10 SDK
- FACEIT Data API key (тип **Server side**)

## 1. Добавь API-ключ

1. Открой FACEIT Developer Portal: https://developers.faceit.com/
2. Создай приложение в App Studio, затем создай API Key типа **Server side**.
3. В корне проекта скопируй `appsettings.Local.example.json` и назови копию `appsettings.Local.json`.
4. Открой `appsettings.Local.json` и вставь ключ в поле `Faceit.ApiKey`.

Пример:

```json
{
  "Faceit": {
    "ApiKey": "ТВОЙ_КЛЮЧ_СЮДА",
    "Nickname": "-veero",
    "GameId": "cs2",
    "RefreshMinutes": 5
  }
}
```

**Не отправляй API-ключ в чат и не загружай `appsettings.Local.json` в GitHub.** Этот файл уже добавлен в `.gitignore`.

Альтернатива: вместо локального файла можно задать переменную окружения `Faceit__ApiKey`.

## 2. Запуск

Открой терминал в папке проекта и выполни:

```bash
dotnet restore
dotnet run
```

Перейди по адресу, который появится в терминале (обычно `http://localhost:5xxx` или `https://localhost:7xxx`).

## 3. Render

Для Render удобнее использовать Web Service с Docker или .NET runtime, если он доступен в твоём аккаунте.

Добавь Environment Variable:

- Key: `Faceit__ApiKey`
- Value: твой Server-side API key

Также можно задать:
- `Faceit__Nickname` = `-veero`
- `Faceit__GameId` = `cs2`
- `Faceit__RefreshMinutes` = `5`

Не добавляй ключ в HTML, JavaScript или публичный репозиторий.

## Что обновляется

Сервер кэширует результат на 5 минут. Кнопка обновления запрашивает свежие данные сразу. FACEIT API может не возвращать некоторые поля или историю в отдельных случаях — тогда сайт покажет `—`, а не выдуманное значение.

## API

Используются публичные FACEIT Data API endpoints:
- `GET /players?nickname=...&game=cs2`
- `GET /players/{player_id}/stats/cs2`
- `GET /players/{player_id}/history?game=cs2&limit=10`

Документация: https://docs.faceit.com/api/data/
