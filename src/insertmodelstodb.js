import path from "path";
import { Model } from "./mongodb.js";
import bodypraser from "body-parser";
import fs from "fs";
import { fileURLToPath } from 'url';

// Функция для получения размера файла
const getFileSize = (filePath) => {
  const stats = fs.statSync(filePath);
  const fileSizeInBytes = stats.size;
  return fileSizeInBytes;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const insertModelsToDB = async (categoryFolder) => {
    const modelsPath = path.join(__dirname, 'models', categoryFolder);

  try {
    const modelFolders = fs.readdirSync(modelsPath);
    const insertPromises = modelFolders.map(async (modelFolder) => {
      const modelFolderPath = path.join(modelsPath, modelFolder);
      const gltfFilePath = path.join(modelFolderPath, "model.gltf");
      const modelUrl = `/models/${categoryFolder}/${modelFolder}/model.gltf`;

      // Получаем размер файла gltf
      const gltfFileSize = getFileSize(gltfFilePath);
      console.log("File size:", gltfFileSize);
      console.log("File path:", gltfFilePath);

      // Проверяем, существует ли модель с таким URL в базе данных
      const existingModel = await Model.findOne({ modelUrl });

      if (!existingModel && fs.existsSync(gltfFilePath)) {
        // Чтение файла txt с характеристиками
        const txtUrl = path.join(modelFolderPath, "model.txt");

        if (fs.existsSync(txtUrl)) {
          // Проверяем, существует ли файл
          try {
            const txtData = fs.readFileSync(txtUrl, "utf8");
            const lines = txtData.split("\n");

            // Объект для хранения характеристик
            const modelInfo = {};

            // Разбор данных из файла txt
            lines.forEach((line) => {
              const [key, value] = line.split(":");
              if (key && value) {
                modelInfo[key.trim()] = value.trim();
              }
            });

            // Создание модели и сохранение характеристик в MongoDB
            const model = new Model({
              modelUrl,
              category: categoryFolder, // Добавляем категорию модели
              name: modelInfo.name || "",
              fileSize: gltfFileSize,
              price: parseFloat(modelInfo.price) || 0,
              description: modelInfo.description || "",
              rating: 0, // Устанавливаем начальное значение рейтинга
              ratingsCount: 0, // Устанавливаем начальное значение количества оценок
            });

            await model.save();
          } catch (error) {
            console.error("Error reading model.txt:", error);
          }
        } else {
          // Если файл отсутствует
          const model = new Model({
            modelUrl,
            category: categoryFolder, // Добавляем категорию модели
            fileSize: gltfFileSize,
            rating: 0, // Устанавливаем начальное значение рейтинга
            ratingsCount: 0, // Устанавливаем начальное значение количества оценок
          });

          await model.save();
        }
      }
    });

    await Promise.all(insertPromises);
    console.log("Models inserted successfully.");
  } catch (error) {
    console.error("Error inserting models into the database:", error);
  }
};

// Вызываем функцию для вставки моделей при запуске сервера для категорий
insertModelsToDB("small objects");
insertModelsToDB("abstract objects");
insertModelsToDB("mech objects");
insertModelsToDB("words objects");
