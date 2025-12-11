# 🚀 Инструкция по деплою ChatRoom

## Быстрый старт

### 1. MongoDB Atlas (5 минут)

1. Зарегистрируйтесь: https://www.mongodb.com/cloud/atlas/register
2. Создайте FREE кластер (M0 Sandbox)
3. Database Access → Add User (запишите username и password)
4. Network Access → Add IP → Allow from Anywhere (0.0.0.0/0)
5. Получите строку подключения:
   - Connect → Connect your application
   - Скопируйте URI: `mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/chatroom`
   - Замените `<password>` на реальный пароль

### 2. Деплой на Render (Backend)

1. Зарегистрируйтесь: https://render.com
2. Подключите GitHub
3. New + → Web Service → выберите репозиторий
4. Настройки:
   ```
   Name: chatroom-backend
   Region: Frankfurt
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   Instance Type: Free
   ```
5. Environment Variables:
   ```
   MONGODB_URI = ваша_строка_подключения_из_atlas
   FRONTEND_URL = https://ваш-frontend.vercel.app (добавите после)
   ```
6. Create Web Service
7. Скопируйте URL: `https://chatroom-backend.onrender.com`

### 3. Деплой на Vercel (Frontend)

1. Зарегистрируйтесь: https://vercel.com
2. Add New → Project → Import Git Repository
3. Выберите ваш репозиторий
4. Настройки:
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   ```
5. Environment Variables:
   ```
   VITE_BACKEND_URL = https://chatroom-backend.onrender.com
   ```
6. Deploy
7. Скопируйте URL: `https://chatroom.vercel.app`

### 4. Финальная настройка

1. Вернитесь в Render
2. Environment → Обновите `FRONTEND_URL` на ваш URL Vercel
3. Сервис автоматически перезапустится

## ✅ Готово!

Ваш ChatRoom доступен по адресу: `https://chatroom.vercel.app`

## 🔄 Автоматические обновления

Каждый `git push` автоматически обновит приложение!

```bash
git add .
git commit -m "Update features"
git push
```

## 🐛 Устранение проблем

### Backend не работает
- Проверьте логи в Render Dashboard
- Убедитесь что MONGODB_URI корректен
- Проверьте Root Directory = backend

### Frontend не подключается
- Проверьте VITE_BACKEND_URL в Vercel
- Убедитесь что backend URL доступен
- Проверьте CORS (FRONTEND_URL в Render)

### MongoDB ошибки
- Проверьте пароль в строке подключения
- IP должен быть 0.0.0.0/0 в Network Access
- Пользователь должен иметь права read/write

## 📞 Поддержка

Возникли проблемы? Проверьте:
1. Логи в Render: Dashboard → Logs
2. Console в браузере: F12 → Console
3. Network в браузере: F12 → Network → WS
