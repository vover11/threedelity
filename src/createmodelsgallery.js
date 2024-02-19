import * as THREE from 'https://cdn.skypack.dev/three@0.131.2/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.131.2/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@v0.119.0/examples/jsm/controls/OrbitControls.js';
import axios from "axios"



export  const loadModels = async () => {
    try {
        const modelsResponse = await axios.get('/models');
        const modelsData = modelsResponse.data;

        const modelContainer = document.getElementById('container3d');
        const screenshotFolder = '/screenshot_folder/'; // Укажите путь к папке, где будут сохраняться снимки


        const modelPromises = modelsData.modelsurl.map(async (modelUrl, index) => {
            return new Promise(async (resolve) => {
                const categoryMatch = modelUrl.match(/\/models\/(.+?)\//);
                const category = categoryMatch ? categoryMatch[1] : 'Unknown';

                const modelInfoResponse = await axios.get('/modelInfo', {
                    params: {
                        modelUrl: modelUrl,
                    },
                });

                const modelInfo = modelInfoResponse.data;

                const container = document.createElement('div');
                container.classList.add('threed');
                container.dataset.modelUrl = modelUrl;


                const ratingContainer = document.createElement('div');
                ratingContainer.classList.add('rating-container');
                for (let i = 1; i <= 5; i++) {
                    const star = document.createElement('span');
                    star.textContent = '☆';
                    star.classList.add('star');
                    star.dataset.rating = i;
                    star.addEventListener('click', handleRatingClick);
                    ratingContainer.appendChild(star);
                }
                container.appendChild(ratingContainer);

                const preloader = document.createElement('div');
                preloader.classList.add('preloader');
                container.appendChild(preloader);

                const canvas = document.createElement('canvas');
                const canvasId = `canvas_${index}`; // Создаем уникальный id для canvas
                canvas.id = canvasId;
                canvas.classList.add('canvas');
                canvas.dataset.modelUrl = modelUrl; // Сохраняем modelUrl в dataset
                container.appendChild(canvas);

                // Создайте кнопку и добавьте ей текст "3D"
                const button3D = document.createElement('button');
                button3D.textContent = '3D';
                button3D.classList.add('canvasbutton3d');
                container.appendChild(button3D);

                const buttonlike = document.createElement('button');
                buttonlike.textContent = '❤';
                buttonlike.classList.add('canvasbuttonlike');
                container.appendChild(buttonlike);

                const modelInfoDiv = document.createElement('div');
                modelInfoDiv.classList.add('model-info');
                modelInfoDiv.innerHTML = `
                    <p class="category">${category}</p>
                    <h3>${modelInfo.name}</h3>
                    <p>${modelInfo.description}</p>
                    <p class="price">₽${modelInfo.price}</p>
                    <p class="fileSize">Размер модели: ${modelInfo.fileSize} bytes</p>
                `;
                container.appendChild(modelInfoDiv);

                const buttonscont = document.createElement('div');
                buttonscont.classList.add('buttonscont');
                container.appendChild(buttonscont);

                const buyButton = document.createElement('button');
                buyButton.textContent = 'Купить';
                buyButton.classList.add('buyButton');
                buttonscont.appendChild(buyButton);

                const infoButton = document.createElement('button');
                infoButton.textContent = 'Подробнее';
                infoButton.classList.add('infoButton');
                buttonscont.appendChild(infoButton);

                const gltfLoader = new GLTFLoader();
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
                const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
                renderer.setClearColor(0xD3D3D3, 1); // где 0xF8F8FF - цвет в формате 0xRRGGBB, а второй аргумент - прозрачность (1 для полностью непрозрачного фона)
                renderer.outputEncoding = THREE.sRGBEncoding;
                renderer.toneMapping = THREE.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.5;
                renderer.shadowMap.enabled = true;

                camera.position.z = 3;
                renderer.setSize(300, 300);

                const gltf = await gltfLoader.loadAsync(modelUrl);
                const modelObject = gltf.scene;
                scene.add(modelObject);

                // animateModel(modelObject);

                const light = new THREE.PointLight(0xFFFFFF);
                light.position.set(5, 5, 5);
                scene.add(light);

                const controls = new OrbitControls(camera, canvas);
                controls.target.set(0, 0, 0); // Целевая точка, вокруг которой будет вращаться камера
                camera.position.set(0, 0, 3); // Начальное положение камеры
                camera.lookAt(controls.target); // Обязательно смотреть на целевую точку

                function render() {
                    requestAnimationFrame(render);
                    renderer.render(scene, camera);
                    controls.update(); // Обновляем контролы для данной модели

                }
                render();

                // Создание снимка после того, как модель загружена и отображена
                const screenshotFilename = `screenshot_${index}.png`;
                saveScreenshot(renderer, scene, camera, screenshotFolder + screenshotFilename, modelObject, container);

                modelContainer.appendChild(container);

                resolve();
                
            });
        });

        await Promise.all(modelPromises);
    } catch (error) {
        console.error('Error loading models:', error);
    }
};

loadModels();



// Функция для сохранения снимка с моделью
const saveScreenshot = (renderer, scene, camera, filename, model, container) => {
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight);

    renderer.setRenderTarget(renderTarget);
    renderer.render(scene, camera);

    // // Если есть модель, добавьте её на сцену
    // if (model) {
    //     scene.add(model);
    // }

    const dataURL = renderer.domElement.toDataURL('image/png');

    axios
        .post('/saveScreenshot', { dataURL, filename })
        .then((response) => {
            console.log('Снимок успешно сохранен1: ', response.data);
            // Создайте изображение и добавьте его в контейнер
            const image = document.createElement('img');
            image.classList.add('previewimg');
            image.src = dataURL;
            // Получите ссылку на третий дочерний элемент контейнера (предположим, что это второй элемент в контейнере)
            const thirdChild = container.children[2];

            // Вставьте изображение после третьего дочернего элемента
            container.insertBefore(image, thirdChild.nextSibling);

            // Добавьте data-model-url атрибут с URL модели
            const modelUrl = container.dataset.modelUrl;
            image.setAttribute('data-model-url', modelUrl);

            //     // Если есть модель, удалите её со сцены
            //     if (model) {
            //         scene.remove(model);
            //     }
            // })
            // .catch((error) => {
            //     console.error('Ошибка сохранения снимка: ', error);
            //     // Если есть модель, удалите её со сцены
            //     if (model) {
            //         scene.remove(model);
            //     }
            renderer.setRenderTarget(null);
        });
};

// В функции toggleVisibility
function toggleVisibility(previewImage) {
    const container = previewImage.parentElement;
    const canvas = container.querySelector('.canvas');

    // Переключите видимость канваса и previewimg
    if (canvas.style.display === 'none' || canvas.style.display === '') {
        canvas.style.display = 'block';
        previewImage.style.display = 'none';
    } else {
        canvas.style.display = 'none';
        previewImage.style.display = 'block';
    }
}

// Назначаем обработчик события на родительский элемент
const container3d = document.getElementById('container3d');
container3d.addEventListener('click', (event) => {
    if (event.target.classList.contains('previewimg') || event.target.classList.contains('canvasbutton3d')) {
        const button = event.target.classList.contains('canvasbutton3d') ? event.target : event.target.parentElement.querySelector('.canvasbutton3d');
        // Проверяем, что элемент имеет класс 'previewimg' или 'canvasbutton3d'
        toggleVisibility(event.target.classList.contains('previewimg') ? event.target : event.target.parentElement.querySelector('.previewimg'));
        // Переключаем класс 'active' для кнопки
        button.classList.toggle('active');
    }
});

// Перебираем все .previewimg и добавляем data-model-url атрибуты
const previewImages = document.querySelectorAll('.previewimg');
previewImages.forEach((previewImage) => {
    const container = previewImage.parentElement;
    const modelUrl = container.dataset.modelUrl;
    previewImage.setAttribute('data-model-url', modelUrl);
});


const handleRatingClick = async (event) => {
    const star = event.target;
    const modelContainer = star.parentElement.parentElement;

    // Получаем modelUrl из атрибута data
    const modelUrl = modelContainer.dataset.modelUrl;

    const rating = parseInt(star.dataset.rating);

    try {
        const response = await axios.post('/modelRating', {
            modelUrl: modelUrl,
            rating: rating
        });
        const newRating = response.data.rating;

        const ratingDiv = modelContainer.querySelector('.rating-container');
        ratingDiv.textContent = '★'.repeat(newRating);

    } catch (error) {
        console.error('Error updating model rating:', error);
    }
};



const searchButton = document.getElementById('searchButton');
searchButton.addEventListener('click', () => {
    const searchInput = document.getElementById('searchInput').value;
    filterModels(searchInput);
});

const filterModels = (searchQuery) => {
    const modelContainers = document.querySelectorAll('.threed');
    const container3d = document.getElementById('container3d');
    const visibleContainers = [];

    modelContainers.forEach((container) => {
        const modelInfoDiv = container.querySelector('.model-info');
        const modelName = modelInfoDiv.querySelector('h3').textContent;

        if (modelName.toLowerCase().includes(searchQuery.toLowerCase())) {
            container.style.visibility = 'visible';
            visibleContainers.push(container);
        } else {
            container.style.visibility = 'hidden';
        }
    });

    // Удаляем все дочерние элементы из контейнера
    while (container3d.firstChild) {
        container3d.removeChild(container3d.firstChild);
    }

    // Перемещаем видимые контейнеры в начало контейнера
    visibleContainers.forEach((container) => {
        container3d.appendChild(container);
    });
};

console.log('DOMContentLoaded event listener registered');

document.addEventListener('DOMContentLoaded', () => {
    let currentCategory = null;
    const container3d = document.getElementById('container3d');

    document.addEventListener('click', (event) => {
        const clickedElement = event.target;
        if (clickedElement.classList.contains('category')) {
            const selectedCategory = clickedElement.textContent.trim();
            console.log('Выбранная категория:', selectedCategory);

            const modelContainers = document.querySelectorAll('.threed');

            if (currentCategory === selectedCategory) {
                // Если выбрана та же категория, сделать все контейнеры видимыми
                modelContainers.forEach((container) => {
                    container.style.visibility = 'visible';
                });
                currentCategory = null;
            } else {
                modelContainers.forEach((container) => {
                    const modelInfoDiv = container.querySelector('.model-info');
                    if (!modelInfoDiv) return;

                    const modelCategory = modelInfoDiv.querySelector('.category').textContent.trim();

                    if (selectedCategory === modelCategory || selectedCategory === 'All') {
                        container.style.visibility = 'visible';
                    } else {
                        container.style.visibility = 'hidden';
                    }
                });

                currentCategory = selectedCategory;
            }

            // // Удаляем все дочерние элементы из контейнера
            // while (container3d.firstChild) {
            //     container3d.removeChild(container3d.firstChild);
            // }

            // Перемещаем видимые контейнеры в начало контейнера
            modelContainers.forEach((container) => {
                if (container.style.visibility === 'visible') {
                    container3d.appendChild(container);
                }
            });
        }
    });
});