
// В файле api.js
import bcrypt from 'bcrypt';
import { User, Model } from './mongodb.js';
import axios from "axios"

export async function registerUser(req, res) {
  try {
    const { username, password } = req.body;

    // Проверка, существует ли пользователь с таким именем пользователя
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return res.send("Пользователь с таким именем уже существует");
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание нового пользователя в базе данных
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();

    // Дополнительная логика для установки сессии и куков
    req.session.user = newUser; // Пример сохранения пользователя в сессии
    res.cookie("user", newUser.username); // Пример установки куки

    res.redirect("/main.html");
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Internal Server Error');
  }
}

export async function loginUser(req, res) {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
  
    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (passwordMatch) {
        // Дополнительная логика для установки сессии и куков
        req.session.user = user; // Пример сохранения пользователя в сессии
        res.cookie('user', user.username); // Пример установки куки
  
        // Отправляем редирект с параметром isAuthenticated
        res.redirect(`/main.html?isAuthenticated=true`);
      } else {
        res.send('Неверный пароль');
      }
    } else {
      res.send('Пользователь не найден');
    }
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Internal Server Error');
  }
}

export async function getModels(req, res) {
  try {
    const models = await Model.find();
    const modelUrls = models.map((model) => model.modelUrl);
    console.log('Models retrieved successfully:', modelUrls);
    res.json({ modelsurl: modelUrls });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}




