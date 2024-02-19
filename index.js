import express from "express";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import ejs from "ejs";
import bcrypt from "bcrypt";
import session from "express-session";
import cookieParser from "cookie-parser";
import crypto from "crypto";
import fetch from "node-fetch";
import bodyParser from "body-parser";
import { loginUser, registerUser } from "./src/api.js";
import { User, Model } from "./src/mongodb.js";
import { insertModelsToDB } from "./src/insertmodelstodb.js";
import { getModels } from "./src/api.js";
import { fileURLToPath } from "url";
import { dirname } from "path";
import fs from "fs";
import multer from "multer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Загрузка переменных из файла .env
dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// Включаем CORS
app.use(cors());

app.use(express.static("public"));
app.use(express.static("models"));
app.use(express.static("uploads"));
app.use(bodyParser.json());
app.use("/models", express.static(path.join(__dirname, "models")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.login.html"));
});

app.listen(port, () => {
  console.log(`Сервер запущен на порту ${port}`);
});

app.get("/api/users", async (req, res) => {
  try {
    // Извлечение данных из MongoDB
    const users = await User.find();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Генерация случайного секретного ключа
const secretKey = crypto.randomBytes(32).toString("hex");

app.use(cookieParser());
app.use(session({ secret: secretKey, resave: true, saveUninitialized: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post("/register", registerUser);

app.post("/login", loginUser);

app.get("/models", getModels);

// Добавляем маршрут для выхода
app.get("/logout", (req, res) => {
  // Удаляем сессию
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      res.status(500).send("Internal Server Error");
    } else {
      // Устанавливаем куку с истекшим сроком действия
      res.cookie("user", "", { expires: new Date(0) });

      // Перенаправляем на страницу входа
      res.redirect("/index.login.html");
    }
  });
});

// Добавьте новый маршрут для получения данных пользователя

// Обновленный маршрут /get-user-data
app.get("/get-user-data", async (req, res) => {
  // Проверка наличия сессии или куков
  if (!req.session.user && !req.cookies.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Получение текущего пользователя из сессии или куков
  const currentUser = req.session.user || { username: req.cookies.user };

  try {
    // Запрос контента для текущего пользователя из базы данных
    const user = await User.findOne({ username: currentUser.username });

    if (user) {
      const userData = {
        userId: user._id, // Добавляем userId
        username: user.username,
        favoriteModels: user.favoriteModels || [], // Добавляем избранные модели
        content: user.content || ["https://example.com/test-link"], // Добавляем контент пользователя
      };

      // Отправка данных пользователя в формате JSON
      res.json(userData);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/modelInfo", async (req, res) => {
  const modelUrl = req.query.modelUrl;

  try {
    console.log("Request for model info:", modelUrl);

    // Добавим вывод в консоль, чтобы увидеть, какие пути передаются
    const model = await Model.findOne({ modelUrl });
    console.log("Model found in the database:", model);

    if (!model) {
      console.log("Model not found");
      return res.status(404).json({ error: "Model not found" });
    }

    const { name, price, description, rating, fileSize } = model;
    console.log("Model info retrieved successfully:", {
      name,
      price,
      description,
      rating,
      fileSize,
    });

    res.json({ name, price, description, rating, fileSize });
  } catch (error) {
    console.error("Error fetching model info:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// В обработчике маршрута /favoriteModelsInfo
app.get("/favoriteModelsInfo", async (req, res) => {
  const userId = req.query.userId;

  try {
    console.log("Request for favorite models info for user:", userId);

    if (!userId) {
      return res.status(400).json({ error: "UserId is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const modelUrls = user.favoriteModels || [];
    const models = await Model.find({ modelUrl: { $in: modelUrls } });

    console.log("Favorite models found for user:", models);

    const modelsInfo = models.map((model) => {
      const { modelUrl, category, name, price, description, rating, fileSize } =
        model;
      return { modelUrl, category, name, price, description, rating, fileSize };
    });

    res.json(modelsInfo);
  } catch (error) {
    console.error("Error fetching favorite models info:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/saveScreenshot", (req, res) => {
  const { dataURL, filename } = req.body;
  const filePath = path.join(__dirname, filename); // Используем абсолютный путь к файлу

  // Преобразуйте dataURL в бинарные данные
  const data = dataURL.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(data, "base64");

  // Сохраните данные в файл
  fs.writeFile(filePath, buffer, (err) => {
    if (err) {
      console.error("Ошибка сохранения снимка: ", err);
      res.status(500).json({ error: "Ошибка сохранения снимка" });
    } else {
      console.log("Снимок успешно сохранен2: ", filename);
      res.json({ success: true });
    }
  });
});

// Предполагая, что вы используете Express.js для сервера
app.post("/likeModel", async (req, res) => {
  const { userId, modelUrl } = req.body;

  try {
    // Обновление списка избранных моделей пользователя в базе данных
    await User.updateOne(
      { _id: userId },
      { $addToSet: { favoriteModels: modelUrl } }
    );

    res.status(200).send("Модель успешно лайкнута");
  } catch (error) {
    console.error("Ошибка при постановке лайка модели:", error);
    res.status(500).send("Внутренняя ошибка сервера");
  }
});

// Создаем middleware для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Указываем папку, куда будут сохраняться загруженные файлы
    cb(null, path.join(__dirname, "uploads"));
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileExtension = path.extname(file.originalname);
    cb(null, file.fieldname + "-" + uniqueSuffix + fileExtension);
  },
});

// Подключаем middleware к multer
const upload = multer({ storage });

app.post("/upload", upload.single("fileInput"), async (req, res) => {
  try {
    console.log("Cookies:", req.cookies);
    const username = req.cookies.user;

    if (username) {
      // Используем модель User для поиска пользователя в базе данных
      const user = await User.findOne({ username });

      if (user) {
        const userId = user._id;
        const userFolderPath = path.join(__dirname, "uploads", username);

        // Создаем папку для пользователя, если её нет
        if (!fs.existsSync(userFolderPath)) {
          fs.mkdirSync(userFolderPath);
        }

        // Проверяем, что req.file определен и содержит необходимые свойства
        if (req.file && req.file.path && req.file.originalname) {
          // Получаем информацию о загруженном файле
          const filePath = req.file.path;
          const originalName = req.file.originalname;

          // Создаем папку для модели, используя оригинальное имя файла
          const modelFolderPath = path.join(userFolderPath, originalName);
          if (!fs.existsSync(modelFolderPath)) {
            fs.mkdirSync(modelFolderPath);
          }

          // Перемещаем файл в папку модели
          const newFilePath = path.join(modelFolderPath, originalName);
          fs.renameSync(filePath, newFilePath);

          // Перенаправляем на main.html после успешной загрузки файла
          res.redirect("/main.html");
          return; // Выходим из функции, чтобы избежать отправки дополнительного JSON-ответа
        } else {
          res.status(400).json({ success: false, message: "Invalid file or file properties" });
        }
      } else {
        res.status(404).json({ success: false, message: "User not found" });
      }
    } else {
      res.status(404).json({ success: false, message: "Username not found in cookies" });
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});