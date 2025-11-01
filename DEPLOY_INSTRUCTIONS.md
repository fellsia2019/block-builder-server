# Пошаговая инструкция по деплою Block Builder License Server

## 📋 Этап 1: Настройка GitHub Secrets

1. Откройте репозиторий на GitHub
2. Перейдите: `Settings` → `Secrets and variables` → `Actions`
3. Нажмите `New repository secret`

### Секрет 1: VDS_HOST
```
Name: VDS_HOST
Value: vds.server1
```
(или IP адрес вашего сервера)

### Секрет 2: VDS_USER
```
Name: VDS_USER
Value: root
```
(или ваш username для SSH)

### Секрет 3: VDS_SSH_KEY (приватный SSH ключ)

**Вариант А: Использовать существующий ключ (проще)**

Если у вас уже есть SSH ключ, которым вы подключаетесь к серверу:

```bash
# На вашем ЛОКАЛЬНОМ компьютере (Windows PowerShell или Git Bash)
# Найдите ваш приватный ключ (обычно в ~/.ssh/ или C:\Users\YourUser\.ssh\)
# Это файл БЕЗ расширения .pub (например: id_rsa, id_ed25519, id_ecdsa)

# Windows PowerShell:
cat ~/.ssh/id_ed25519
# или
type C:\Users\YourUser\.ssh\id_rsa

# Linux/Mac:
cat ~/.ssh/id_ed25519
# или
cat ~/.ssh/id_rsa
```

Скопируйте **ВСЁ** содержимое приватного ключа (НЕ .pub файл!)
- Должен начинаться с `-----BEGIN OPENSSH PRIVATE KEY-----` или `-----BEGIN RSA PRIVATE KEY-----`
- Должен заканчиваться `-----END OPENSSH PRIVATE KEY-----` или `-----END RSA PRIVATE KEY-----`

**Убедитесь, что публичный ключ уже добавлен на сервер:**
```bash
# Проверьте, что можете подключиться
ssh vds.server1

# Если подключаетесь без пароля - значит ключ уже настроен ✅
```

**Вариант Б: Создать отдельный ключ для CI/CD (рекомендуется для безопасности)**

Откройте терминал на вашем **ЛОКАЛЬНОМ компьютере** и выполните:

```bash
# Windows (Git Bash или PowerShell):
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Нажмите Enter для сохранения
# Можете оставить пароль пустым (или установить - на ваше усмотрение)
```

**Добавьте публичный ключ на сервер:**

```bash
# Скопируйте публичный ключ на сервер
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub vds.server1

# Или вручную: покажите публичный ключ
cat ~/.ssh/github_actions_deploy.pub
# Затем на сервере добавьте его в ~/.ssh/authorized_keys
```

**Скопируйте приватный ключ:**

```bash
# Покажите приватный ключ
cat ~/.ssh/github_actions_deploy
```

Скопируйте **ВСЁ** содержимое (включая строки `-----BEGIN OPENSSH PRIVATE KEY-----` и `-----END OPENSSH PRIVATE KEY-----`)

---

**В GitHub создайте секрет:**
```
Name: VDS_SSH_KEY
Value: <вставьте весь приватный ключ (из Варианта А или Б)>
```

### Секрет 4: VDS_SSH_PORT (опционально)
```
Name: VDS_SSH_PORT
Value: 22
```
Только если используете нестандартный порт SSH

---

## 🖥️ Этап 2: Подготовка сервера

Подключитесь к серверу:

```bash
ssh vds.server1
```

### 2.1. Установка Docker (если еще не установлен)

**Для Ubuntu/Debian (рекомендуемый способ - через официальный репозиторий Docker):**

```bash
# Удалите старый docker-compose если установлен (чтобы избежать конфликтов)
sudo apt remove -y docker-compose

# Установите Docker из официального репозитория
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Добавьте официальный GPG ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Добавьте репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установите Docker Engine и Docker Compose v2
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker

# Добавьте пользователя в группу docker (чтобы не использовать sudo)
sudo usermod -aG docker $USER

# Перелогиньтесь или выполните:
newgrp docker
```

**Альтернативный способ (быстрый, но может не иметь последней версии):**

```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Docker
sudo apt install -y docker.io

# Установка Docker Compose v2 как плагин
sudo apt install -y docker-compose-plugin

# Запуск Docker
sudo systemctl start docker
sudo systemctl enable docker

# Добавьте пользователя в группу docker
sudo usermod -aG docker $USER
newgrp docker
```

**Для CentOS/RHEL:**
```bash
sudo yum install -y docker docker-compose
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
newgrp docker
```

### 2.2. Проверка установки

```bash
docker --version
docker compose version
# или (если используется старый формат):
docker-compose --version
```

**Если `docker compose` не работает:**

Если у вас установлен старый `docker-compose` (с дефисом), который выдает ошибку с `distutils`, или пакет `docker-compose-plugin` не найден, выполните:

```bash
# Удалите старый docker-compose
sudo apt remove -y docker-compose

# Добавьте официальный репозиторий Docker (если еще не добавлен)
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# Добавьте GPG ключ Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Добавьте репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновите список пакетов
sudo apt update

# Установите Docker Compose v2
sudo apt install -y docker-compose-plugin

# Проверьте:
docker compose version
```

**Альтернатива: Установка вручную (если репозиторий не помог):**

```bash
# Удалите старый docker-compose
sudo apt remove -y docker-compose

# Скачайте и установите Docker Compose v2 вручную
DOCKER_COMPOSE_VERSION="v2.24.0"
sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-linux-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Создайте симлинк для docker compose (без дефиса)
sudo ln -s /usr/local/bin/docker-compose /usr/local/bin/docker
# Или просто используйте docker-compose вместо docker compose

# Проверьте:
docker-compose --version
# или если создали симлинк:
docker compose version
```

### 2.3. Создание директории для проекта

```bash
# Создайте директорию
sudo mkdir -p /opt/bb-license-server
sudo chown $USER:$USER /opt/bb-license-server

# Проверьте права
ls -la /opt/ | grep bb-license-server
```

### 2.4. Настройка firewall (если используется)

**Проверьте какой firewall установлен:**

```bash
# Проверьте ufw
which ufw
sudo ufw status

# Проверьте firewalld
which firewall-cmd
sudo firewall-cmd --state

# Проверьте iptables
which iptables
sudo iptables -L -n
```

**Для Ubuntu/Debian с ufw (если установлен):**

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw reload
```

**Для CentOS/RHEL с firewalld:**

```bash
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

**Если firewall не установлен или отключен:**

Многие VPS провайдеры настраивают firewall на уровне панели управления (например, в консоли провайдера). В этом случае:
- Проверьте настройки firewall в панели управления вашего VPS провайдера
- Убедитесь что порты 22, 80, 443 открыты
- Или пропустите этот шаг, если firewall не используется

**Установить ufw (если нужно):**

```bash
sudo apt update
sudo apt install -y ufw
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

---

## 📤 Этап 3: Первый деплой через GitHub Actions

### 3.1. Закоммитьте и запушьте изменения

**Важно:** Если `server-bb` находится в отдельном git репозитории:

```bash
# Перейдите в директорию server-bb
cd d:\dev\bb\server-bb

# Добавьте файлы (workflow должен быть в корне репозитория server-bb)
# Если .github/workflows/ еще нет, создайте:
mkdir -p .github/workflows

# Скопируйте или создайте workflow файл в .github/workflows/deploy.yml
# (файл должен быть в корне репозитория server-bb)

# Добавьте файлы
git add .
git add .github/workflows/

# Закоммитьте
git commit -m "Add GitHub Actions CI/CD deployment"

# Запушьте в master
git push origin master
```

**Если у вас монорепозиторий (все проекты в одном репозитории):**

```bash
# Убедитесь что вы в корне проекта
cd d:\dev\bb

# Добавьте файлы
git add .github/workflows/deploy-server-bb.yml
git add server-bb/

# Закоммитьте
git commit -m "Add GitHub Actions CI/CD for server-bb"

# Запушьте в master
git push origin master
```

### 3.2. Проверка workflow

1. Откройте репозиторий на GitHub
2. Перейдите во вкладку `Actions`
3. Вы увидите запущенный workflow `Deploy Block Builder License Server`
4. Дождитесь завершения (первые несколько шагов могут занять время)

### 3.3. Обработка ошибки .env

**ВНИМАНИЕ:** При первом деплое workflow может завершиться с ошибкой, потому что `.env` файл отсутствует. Это нормально!

После первого деплоя выполните на сервере:

```bash
ssh vds.server1
cd /opt/bb-license-server

# Создайте .env из примера
cp .env.production.example .env

# Отредактируйте .env
nano .env
# или
vi .env
```

**Обязательно настройте:**

```bash
# Критически важно изменить эти значения:

DB_PASSWORD=YOUR_STRONG_PASSWORD_HERE        # Сгенерируйте сильный пароль!
JWT_SECRET=YOUR_VERY_LONG_RANDOM_SECRET_KEY  # Минимум 32 символа, случайная строка!
CORS_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

**Как сгенерировать безопасные значения:**

```bash
# Для DB_PASSWORD и JWT_SECRET можно использовать:
openssl rand -base64 32

# Или онлайн генератор, например: https://randomkeygen.com/
```

### 3.4. Повторный деплой после настройки .env

После настройки `.env` на сервере:

1. **Если server-bb в отдельном репозитории:**
   ```bash
   cd d:\dev\bb\server-bb
   # Сделайте любой коммит (например, добавьте комментарий в README)
   git commit --allow-empty -m "Trigger deployment"
   git push origin master
   ```

2. **Или запустите workflow вручную:**
   - Перейдите в репозиторий `server-bb` на GitHub
   - `Actions` → `Deploy Block Builder License Server` → `Run workflow` → `Run workflow`

---

## ✅ Этап 4: Проверка успешного деплоя

### 4.1. На сервере

```bash
ssh vds.server1
cd /opt/bb-license-server

# Проверьте статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Все контейнеры должны быть в статусе "Up"
```

### 4.2. Проверка health endpoint

```bash
# С сервера
curl http://localhost/health

# Должен вернуть JSON с status: "ok"
```

### 4.3. Проверка логов

```bash
# Посмотреть логи всех сервисов
docker compose -f docker-compose.prod.yml logs

# Посмотреть логи только license-server
docker compose -f docker-compose.prod.yml logs license-server

# Следить за логами в реальном времени
docker compose -f docker-compose.prod.yml logs -f
```

### 4.4. Проверка извне

Откройте в браузере:
```
http://your-server-ip/health
```

Должен вернуться JSON ответ.

---

## 🔄 Последующие деплои

После первого успешного деплоя, все последующие обновления происходят автоматически:

1. **Внесите изменения** в код в папке `server-bb/`
2. **Закоммитьте и запушьте:**
   ```bash
   git add server-bb/
   git commit -m "Your changes"
   git push origin master
   ```
3. **GitHub Actions автоматически:**
   - Соберет новый Docker образ
   - Отправит на сервер
   - Перезапустит контейнеры
   - Проверит health endpoint

4. **Проверьте результат** в GitHub Actions или на сервере

---

## 🛠️ Полезные команды на сервере

```bash
# Статус контейнеров
docker compose -f docker-compose.prod.yml ps

# Логи
docker compose -f docker-compose.prod.yml logs -f

# Перезапуск
docker compose -f docker-compose.prod.yml restart

# Остановка
docker compose -f docker-compose.prod.yml down

# Просмотр используемых образов
docker images | grep bb-license-server

# Очистка старых образов
docker image prune -a

# Подключение к базе данных
docker compose -f docker-compose.prod.yml exec postgres psql -U postgres -d block_builder_licenses

# Проверка места на диске
df -h
docker system df
```

---

## ❌ Решение проблем

### Ошибка подключения SSH в GitHub Actions

**Проблема:** Workflow не может подключиться к серверу

**Решение:**
1. Проверьте, что SSH ключ правильно добавлен в Secrets
2. Проверьте, что публичный ключ добавлен на сервер: `cat ~/.ssh/authorized_keys` на сервере
3. Проверьте firewall: `sudo ufw status` или `sudo firewall-cmd --list-all`

### Ошибка "Database connection failed"

**Проблема:** Сервер не может подключиться к базе данных

**Решение:**
1. Проверьте `.env` файл: `cat /opt/bb-license-server/.env`
2. Проверьте, что контейнер postgres запущен: `docker compose -f docker-compose.prod.yml ps`
3. Проверьте логи postgres: `docker compose -f docker-compose.prod.yml logs postgres`

### Ошибка "image.tar.gz not found"

**Проблема:** Docker образ не был загружен на сервер

**Решение:**
1. Проверьте логи GitHub Actions - шаг "Upload Docker image to server"
2. Проверьте место на диске: `df -h` на сервере
3. Повторите деплой через "Run workflow" в GitHub Actions

### Health check failed

**Проблема:** Контейнеры запущены, но health check не проходит

**Решение:**
1. Подождите немного (контейнеры могут стартовать до 40 секунд)
2. Проверьте логи: `docker compose -f docker-compose.prod.yml logs license-server`
3. Проверьте, что порт 3006 не занят: `sudo netstat -tulpn | grep 3006`

---

## 🔒 Безопасность

- ✅ На сервере нет Git - только Docker
- ✅ SSH ключ хранится зашифрованным в GitHub Secrets
- ✅ `.env` файл не копируется автоматически (нужно настроить вручную)
- ✅ Контейнеры работают от non-root пользователей
- ✅ Используются security headers и rate limiting

---

**Готово!** Теперь каждый push в `master` автоматически задеплоит изменения на сервер.

