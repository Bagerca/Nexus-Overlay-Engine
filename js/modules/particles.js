export function initParticles() {
    const canvas = document.getElementById('bg-canvas');
    const ctx = canvas.getContext('2d');
    
    // Строго задаем размер холста под наш экран
    canvas.width = 1920;
    canvas.height = 1080;

    const particlesArray = [];
    const numberOfParticles = 60; // Количество точек (не делай слишком много, чтобы не грузить OBS)
    
    // Наш синий цвет из темы
    const particleColor = '0, 170, 255'; 

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 2 + 1; // Размер точки от 1 до 3 пикселей
            this.speedX = Math.random() * 0.5 - 0.25; // Очень медленное движение по X
            this.speedY = Math.random() * 0.5 - 0.25; // Очень медленное движение по Y
        }

        update() {
            this.x += this.speedX;
            this.y += this.speedY;

            // Если частица улетает за край экрана — возвращаем её с другой стороны
            if (this.x < 0) this.x = canvas.width;
            if (this.x > canvas.width) this.x = 0;
            if (this.y < 0) this.y = canvas.height;
            if (this.y > canvas.height) this.y = 0;
        }

        draw() {
            ctx.fillStyle = `rgba(${particleColor}, 0.8)`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Создаем частицы
    function init() {
        for (let i = 0; i < numberOfParticles; i++) {
            particlesArray.push(new Particle());
        }
    }

    // Анимация и соединение линиями
    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height); // Очищаем старый кадр
        
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            particlesArray[i].draw();
            
            // Проверяем расстояние между текущей точкой и всеми остальными
            for (let j = i; j < particlesArray.length; j++) {
                const dx = particlesArray[i].x - particlesArray[j].x;
                const dy = particlesArray[i].y - particlesArray[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                // Если точки близко (меньше 150px), рисуем между ними линию
                if (distance < 150) {
                    ctx.beginPath();
                    // Чем ближе точки, тем ярче линия
                    const opacity = 1 - (distance / 150);
                    ctx.strokeStyle = `rgba(${particleColor}, ${opacity * 0.3})`;
                    ctx.lineWidth = 1;
                    ctx.moveTo(particlesArray[i].x, particlesArray[i].y);
                    ctx.lineTo(particlesArray[j].x, particlesArray[j].y);
                    ctx.stroke();
                }
            }
        }
        requestAnimationFrame(animate); // Запускаем следующий кадр
    }

    init();
    animate();
}