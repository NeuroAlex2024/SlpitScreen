# Скрипт для загрузки звуковых файлов

# Создаем временную директорию
$tempDir = "temp_assets"
New-Item -ItemType Directory -Force -Path $tempDir

# Функция для загрузки файла
function Download-File {
    param (
        [string]$url,
        [string]$outputPath
    )
    Write-Host "Загрузка $url в $outputPath"
    try {
        Invoke-WebRequest -Uri $url -OutFile $outputPath
        Write-Host "Успешно загружен $outputPath"
    }
    catch {
        Write-Host "Ошибка при загрузке $url : $_"
    }
}

# Музыкальные треки
$musicFiles = @{
    "chase.mp3" = "https://raw.githubusercontent.com/username/analog-game/main/assets/music/chase.mp3"
    "stealth.mp3" = "https://raw.githubusercontent.com/username/analog-game/main/assets/music/stealth.mp3"
    "victory.mp3" = "https://raw.githubusercontent.com/username/analog-game/main/assets/music/victory.mp3"
    "defeat.mp3" = "https://raw.githubusercontent.com/username/analog-game/main/assets/music/defeat.mp3"
}

# Звуковые эффекты (оставляем рабочие)
$soundFiles = @{
    "ghost.mp3" = "https://cdn.pixabay.com/audio/2022/10/16/audio_12b6b2b6e2.mp3" # Ghost effect
    "boost.mp3" = "https://cdn.pixabay.com/audio/2022/10/16/audio_12b6b2b6e2.mp3" # Boost (тот же для примера)
    "wall_hit.mp3" = "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9b4b7e.mp3" # Wall hit
    "catch.mp3" = "https://cdn.pixabay.com/audio/2022/03/15/audio_115b9b4b7e.mp3" # Catch (тот же для примера)
}

# Создание директорий
if (!(Test-Path -Path "assets/music")) { New-Item -ItemType Directory -Force -Path "assets/music" }
if (!(Test-Path -Path "assets/sounds")) { New-Item -ItemType Directory -Force -Path "assets/sounds" }

# Загрузка музыкальных треков
foreach ($file in $musicFiles.GetEnumerator()) {
    Download-File -url $file.Value -outputPath "assets/music/$($file.Key)"
}

# Загрузка звуковых эффектов
foreach ($file in $soundFiles.GetEnumerator()) {
    Download-File -url $file.Value -outputPath "assets/sounds/$($file.Key)"
}

# Удаление временной директории
Remove-Item -Path $tempDir -Recurse -Force

Write-Host "Загрузка завершена!" 