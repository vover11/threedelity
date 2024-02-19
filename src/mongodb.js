import mongoose from "mongoose";

// Подключение к MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/3dmodels", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Определение модели пользователя
export const User = mongoose.model("User", {
  username: String,
  password: String,
  favoriteModels: [String], // Массив для хранения URL избранных моделей
  content: {
    type: [String], // Массив строк для хранения контента
    default: ["https://example.com/test-link"], // Тестовая ссылка по умолчанию
  },
});

// Определение модели Model
export const Model = mongoose.model("Model", {
  modelUrl: String,
  category: String,
  name: String,
  price: Number,
  fileSize: Number,
  description: String,
  rating: { type: Number, default: 0 }, // Устанавливаем значение по умолчанию в 0
  ratingsCount: { type: Number, default: 0 }, // Устанавливаем значение по умолчанию в 0
});