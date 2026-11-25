# Автопроверки

Нужны Node.js и Playwright (`npm i -D playwright`).

1. Запусти сервер: `python3 -m http.server 8123` в корне проекта.
2. `node tests/qa-workouts.js` — проходит каждый день каждой программы в режиме гида до итогов.
3. `node tests/qa-screens.js` — открывает все экраны при всех сочетаниях уровня, цели и пола и ищет `undefined`/`NaN`/ошибки.

Другой адрес: `URL=https://.../index.html node tests/qa-screens.js`.
